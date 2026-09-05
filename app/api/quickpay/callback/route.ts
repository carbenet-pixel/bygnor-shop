import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyChecksum } from "@/lib/quickpay";
import { sendOrderConfirmation } from "@/lib/order-mail";

type QuickpayCallbackPayload = {
  order_id?: string;
  accepted?: boolean;
  operations?: { type?: string }[];
};

/**
 * Modtager Quickpays callback efter en betaling. Checksum verificeres over
 * den RÅ body (ikke en genserialiseret JSON, jf. Quickpays dokumentation —
 * ellers matcher HMAC'en ikke). Svarer altid 2xx når checksummen er gyldig,
 * uanset om vi kunne matche/behandle ordren, så Quickpay ikke bliver ved
 * med at gentage kaldet.
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

  const orderReference = payload.order_id;
  if (!orderReference) {
    return NextResponse.json({ received: true });
  }

  const supabaseAdmin = createAdminClient();

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, customer_id, status")
    .eq("order_reference", orderReference)
    .maybeSingle();

  if (orderError || !order) {
    console.error("[quickpay-callback] ukendt order_reference", orderReference, orderError);
    return NextResponse.json({ received: true });
  }

  // Allerede afgjort — undgå at genbehandle ved gentagne callbacks
  // (Quickpay kan sende flere, fx et for authorize og et for capture).
  if (order.status === "betalt" || order.status === "betaling_fejlet") {
    return NextResponse.json({ received: true });
  }

  const operations = payload.operations ?? [];
  const lastOperation = operations[operations.length - 1];

  if (payload.accepted === true && lastOperation?.type === "capture") {
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: "betalt" })
      .eq("id", order.id);

    if (updateError) {
      console.error("[quickpay-callback] kunne ikke opdatere ordre til betalt", updateError);
      return NextResponse.json({ received: true });
    }

    // Kurven ryddes først her — betalingen er nu reelt bekræftet, ikke
    // bare fordi kunden er redirected til continueurl (browseren kan lukkes
    // før den redirect når frem).
    const { data: cart } = await supabaseAdmin
      .from("carts")
      .select("id")
      .eq("customer_id", order.customer_id)
      .maybeSingle();

    if (cart) {
      await supabaseAdmin.from("cart_items").delete().eq("cart_id", cart.id);
    }

    // Sendes først nu — betalingen er reelt bekræftet, ikke bare igangsat.
    await sendOrderConfirmation(order.id);
  } else if (payload.accepted === false) {
    await supabaseAdmin.from("orders").update({ status: "betaling_fejlet" }).eq("id", order.id);
  }

  return NextResponse.json({ received: true });
}
