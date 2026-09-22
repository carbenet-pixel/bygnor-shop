import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyChecksum } from "@/lib/quickpay";
import { sendOrderConfirmation, sendQuickpayMismatchAlert } from "@/lib/order-mail";
import { clearPurchasedCartItems } from "@/lib/cart";

type QuickpayCallbackOperation = {
  id?: number;
  type?: string;
  amount?: number;
  pending?: boolean;
  qp_status_code?: string;
};

type QuickpayCallbackPayload = {
  id?: number;
  order_id?: string;
  accepted?: boolean;
  currency?: string;
  test_mode?: boolean;
  operations?: QuickpayCallbackOperation[];
};

type Order = {
  id: string;
  customer_id: string;
  status: string;
  total_amount: number | null;
  order_reference: string | null;
};

/**
 * Alle fire tjek skal holde, før en fuldført capture får lov at markere
 * ordren betalt — genberegnes ALDRIG ud fra klientdata, kun sammenlignet
 * mod hvad ordren allerede fik sat server-side ved oprettelsen (0033).
 * Returnerer en menneskelæselig årsag ved mismatch (bruges i loggen og i
 * alarmmailen), null ved godkendt.
 */
function validateCompletedCapture(
  payload: QuickpayCallbackPayload,
  operation: QuickpayCallbackOperation,
  order: Order,
): string | null {
  if (payload.test_mode !== false) {
    return `test_mode=${payload.test_mode} (forventede false — en test-betaling må aldrig markere en ordre betalt)`;
  }

  if (payload.currency !== "DKK") {
    return `currency=${payload.currency} (forventede DKK)`;
  }

  if (order.total_amount == null) {
    return "ordren har intet total_amount at sammenligne betalingen med";
  }

  const expectedAmountInOre = Math.round(order.total_amount * 100);
  if (operation.amount !== expectedAmountInOre) {
    return `captured beløb=${operation.amount} øre matcher ikke ordrens forventede ${expectedAmountInOre} øre`;
  }

  return null;
}

/**
 * Modtager Quickpays callback efter en betaling. Checksum verificeres over
 * den RÅ body (ikke en genserialiseret JSON, jf. Quickpays dokumentation —
 * ellers matcher HMAC'en ikke).
 *
 * Rækkefølge (audit-fund #7/#8): checksum → rå log i
 * quickpay_callback_events FØR noget som helst andet (en fejl her giver
 * 5xx, så Quickpay retryer — de prøver op til 24 gange med stigende delay
 * ved alt andet end 2xx/302/303) → validering mod den gemte ordre →
 * atomisk, betinget statusskift. Et 2xx-svar betyder herefter altid at vi
 * FAKTISK har gemt callbacket holdbart, ikke bare at vi så det.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const checksumHeader = request.headers.get("quickpay-checksum-sha256");

  if (!verifyChecksum(rawBody, checksumHeader)) {
    console.error("[quickpay-callback] ugyldig eller manglende checksum");
    return NextResponse.json({ error: "invalid checksum" }, { status: 401 });
  }

  let payload: QuickpayCallbackPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("[quickpay-callback] kunne ikke parse body");
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const orderReference = payload.order_id ?? null;
  const quickpayPaymentId = payload.id != null ? String(payload.id) : null;
  const operations = payload.operations ?? [];
  const lastOperation: QuickpayCallbackOperation | undefined = operations[operations.length - 1];
  const operationId = lastOperation?.id != null ? String(lastOperation.id) : null;

  const supabaseAdmin = createAdminClient();

  // Bedste forsøg på at finde ordren, så vi kan sætte order_id på selve
  // log-rækken og bruge den i valideringen bagefter — men en fejl HER
  // (til forskel fra selve log-INSERT'et nedenfor) forhindrer os ikke i at
  // gemme callbacket rå; vi skelner de to fejltyper efter loggen er skrevet.
  let order: Order | null = null;
  let orderLookupFailed = false;

  if (orderReference) {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("id, customer_id, status, total_amount, order_reference")
      .eq("order_reference", orderReference)
      .maybeSingle();

    if (error) {
      console.error("[quickpay-callback] DB-fejl ved ordreopslag", orderReference, error);
      orderLookupFailed = true;
    } else {
      order = data;
    }
  }

  // 1) Rå log FØRST — uafhængigt af om ordren blev fundet. En fejlet
  // INSERT her er den ene skrivning vi IKKE må kvittere som "modtaget"
  // uden den reelt lykkedes (audit-fund #8: DB-fejl gav tidligere 200).
  const { data: eventRow, error: insertError } = await supabaseAdmin
    .from("quickpay_callback_events")
    .insert({
      order_id: order?.id ?? null,
      quickpay_payment_id: quickpayPaymentId,
      operation_id: operationId,
      payload: payload as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (insertError || !eventRow) {
    console.error("[quickpay-callback] kunne ikke logge callback", insertError);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }

  const setOutcome = async (outcome: string) => {
    const { error } = await supabaseAdmin
      .from("quickpay_callback_events")
      .update({ outcome, updated_at: new Date().toISOString() })
      .eq("id", eventRow.id);
    if (error) {
      console.error(
        "[quickpay-callback] kunne ikke opdatere event-outcome",
        eventRow.id,
        outcome,
        error,
      );
    }
  };

  // Callbacket ER nu gemt holdbart. Kunne vi ikke slå ordren op pga. en
  // reel DB-fejl (ikke "findes ikke") — bed Quickpay prøve igen, så vi får
  // en ny chance for at behandle det, når databasen svarer normalt.
  if (orderLookupFailed) {
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }

  if (!orderReference || !order) {
    console.error("[quickpay-callback] ukendt order_reference", orderReference);
    await setOutcome("ignoreret");
    return NextResponse.json({ received: true });
  }

  // 'betalt' er den eneste ægte spærrede sluttilstand — når den er sat,
  // går den aldrig baglæns. 'annulleret' er BEVIDST ikke tjekket her: at
  // beskytte den mod et sent capture-callback hænger sammen med
  // race-conditionen i app/shop/checkout/annulleret/page.tsx (audit-fund
  // #13, håndteres separat) — men IN-listen på selve statusskiftet
  // nedenfor udelukker den alligevel implicit, uden at denne fil behøver
  // at kende til den anden fils logik.
  if (order.status === "betalt") {
    await setOutcome("allerede_behandlet");
    return NextResponse.json({ received: true });
  }

  const isCompletedCapture =
    lastOperation?.type === "capture" &&
    lastOperation.pending === false &&
    lastOperation.qp_status_code === "20000";

  if (isCompletedCapture) {
    // Idempotens: er PRÆCIS denne operation — skopet til denne konkrete
    // betaling, da Quickpays operations[].id kun er unik inden for én
    // betaling, ikke globalt (se migration 0034) — allerede fuldt
    // behandlet tidligere? Tjekkes UAFHÆNGIGT af ordrens nuværende status,
    // så et duplikeret/forsinket callback ikke gensender ordre-
    // bekræftelsen eller rydder kurven en ekstra gang, uanset hvad der er
    // sket med ordren i mellemtiden.
    if (quickpayPaymentId && operationId) {
      const { data: existing } = await supabaseAdmin
        .from("quickpay_callback_events")
        .select("id")
        .eq("quickpay_payment_id", quickpayPaymentId)
        .eq("operation_id", operationId)
        .eq("outcome", "betalt")
        .neq("id", eventRow.id)
        .limit(1)
        .maybeSingle();

      if (existing) {
        await setOutcome("allerede_behandlet");
        return NextResponse.json({ received: true });
      }
    }

    const validationError = validateCompletedCapture(payload, lastOperation, order);

    if (validationError) {
      console.error(
        "[quickpay-callback] callback matcher ikke ordren",
        orderReference,
        validationError,
      );
      await setOutcome("kraever_gennemsyn");
      await sendQuickpayMismatchAlert(order.order_reference, order.id, validationError);
      return NextResponse.json({ received: true });
    }

    // Atomisk, betinget statusskift — WHERE'et ER selve
    // concurrency-sikringen, ingen separat lock nødvendig: to samtidige
    // leverancer for denne ordre kan kun få ÉN til reelt ramme denne
    // UPDATE, den anden får 0 rækker tilbage. 'betaling_fejlet' er
    // bevidst med i listen — lader en ordre der tidligere blev markeret
    // fejlet rette sig selv, hvis Quickpay senere bekræfter capture
    // (audit-fund #7's "kan ikke rettes"-problem).
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: "betalt" })
      .eq("id", order.id)
      .in("status", ["afventer_betaling", "betaling_fejlet"])
      .select("id");

    if (updateError) {
      console.error("[quickpay-callback] kunne ikke opdatere ordre til betalt", updateError);
      await setOutcome("kraever_gennemsyn");
      return NextResponse.json({ error: "internal error" }, { status: 500 });
    }

    if (!updated || updated.length === 0) {
      // Tabte kapløbet mod en anden samtidig levering (eller ordren var i
      // en anden tilstand end forventet, fx allerede annulleret) — ikke en
      // fejl, bare et no-op.
      await setOutcome("allerede_behandlet");
      return NextResponse.json({ received: true });
    }

    await setOutcome("betalt");

    // Kurven ryddes først her — betalingen er nu reelt bekræftet, ikke
    // bare fordi kunden er redirected til continue_url (browseren kan
    // lukkes før den redirect når frem). Kun de FAKTISK bestilte linjer
    // fjernes (audit-fund #14) — en vare kunden har tilføjet i en anden
    // fane mens betalingen var i gang bliver stående.
    const { data: cart } = await supabaseAdmin
      .from("carts")
      .select("id")
      .eq("customer_id", order.customer_id)
      .maybeSingle();

    if (cart) {
      await clearPurchasedCartItems(supabaseAdmin, cart.id, order.id);

      // Callbacket kommer fra Quickpays server, ikke kundens egen browser
      // (refresh() fra next/cache virker kun i en Server Action) —
      // revalidatePath er den eneste vej til at sikre at /shop/kurv og
      // kurv-badge'et viser den ryddede kurv næste gang kunden rent
      // faktisk besøger siden, i stedet for en forældet, cachet version.
      revalidatePath("/shop/kurv");
      revalidatePath("/shop", "layout");
    }

    // Sendes først nu — betalingen er reelt bekræftet, ikke bare igangsat.
    await sendOrderConfirmation(order.id);
    return NextResponse.json({ received: true });
  }

  if (payload.accepted === false) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: "betaling_fejlet" })
      .eq("id", order.id)
      .eq("status", "afventer_betaling")
      .select("id");

    if (updateError) {
      console.error(
        "[quickpay-callback] kunne ikke opdatere ordre til betaling_fejlet",
        updateError,
      );
      await setOutcome("kraever_gennemsyn");
      return NextResponse.json({ error: "internal error" }, { status: 500 });
    }

    await setOutcome(updated && updated.length > 0 ? "betaling_fejlet" : "allerede_behandlet");
    return NextResponse.json({ received: true });
  }

  // Hverken en fuldført capture endnu eller en eksplicit afvisning — en
  // helt normal mellemtilstand (fx kun en authorize-operation, eller en
  // capture der stadig er pending mens auto-capture afsluttes). Intet at
  // gøre ved ordren, ingen alarm — loggen bekræfter blot at vi så den.
  await setOutcome("ignoreret");
  return NextResponse.json({ received: true });
}
