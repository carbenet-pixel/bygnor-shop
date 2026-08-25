import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCvr } from "@/lib/cvr";
import { sendMail } from "@/lib/mail";
import { getDiscountGroups } from "@/lib/discount-groups";

// ---------------------------------------------------------------------------
// Delt kerne — CVR-check, invite, profiles-update, delivery_addresses-insert,
// oprydning ved fejl. Ingen politik om HVILKE værdier der sættes eller
// hvorvidt der notificeres — det afgøres af de to flows nedenfor.
// ---------------------------------------------------------------------------

type CustomerAccountDetails = {
  companyName: string;
  cvrNumber: string;
  contactName: string;
  email: string;
  streetAddress: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string | null;
  paymentMethod: "kort" | "kredit";
  preferredPayment: "kort" | "kredit" | null;
  discountGroup: string;
  individualDiscount: number | null;
  creditLimit: number | null;
  paymentTermsDays: number | null;
  expectedCategory: string | null;
  expectedAnnualVolume: string | null;
  existingCustomer: boolean;
  applicationComment: string | null;
  createdBy: "self_service" | "admin";
  termsAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
};

type CoreErrorCode =
  | "cvr_invalid"
  | "email_taken"
  | "rate_limited"
  | "server_error";

type CoreResult =
  | { success: true; companyName: string }
  | { success: false; error: CoreErrorCode };

async function createCustomerAccount(
  details: CustomerAccountDetails,
): Promise<CoreResult> {
  // DEBUG — remove once the admin-form success/error bug is confirmed fixed.
  console.log(
    `[createCustomerAccount] start createdBy=${details.createdBy} email=${details.email} cvr=${details.cvrNumber}`,
  );

  // 1. Verificér CVR FØRST — opret intet hvis den ikke er gyldig. Det
  // indtastede firmanavn er den autoritative værdi, ikke CVR-opslagets
  // returnerede navn — undgår at en stub (eller senere en rigtig udbyder,
  // hvis den nogensinde returnerer et navn admin bevidst har rettet) tavst
  // overskriver hvad der reelt blev indtastet.
  const cvrResult = await verifyCvr(details.cvrNumber);
  console.log(
    `[createCustomerAccount] verifyCvr result: valid=${cvrResult.valid}`,
  );
  if (!cvrResult.valid) {
    return { success: false, error: "cvr_invalid" };
  }

  const finalCompanyName = details.companyName;

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminClient();
  } catch (err) {
    console.error("[createCustomerAccount] admin client unavailable", err);
    return { success: false, error: "server_error" };
  }

  // 2. Opret auth-brugeren og send invite-mailen. Peger tilbage på den
  // eksisterende reset-password-side, som allerede kan veksle koden til en
  // session og lade brugeren sætte sit første kodeord.
  const { data: inviteData, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(details.email, {
      redirectTo: "https://bygnor-shop.vercel.app/login/reset-password",
    });

  // DEBUG — remove once the admin-form success/error bug is confirmed fixed.
  console.log(
    `[createCustomerAccount] inviteUserByEmail result: userId=${inviteData?.user?.id} error=${inviteError ? JSON.stringify({ message: inviteError.message, code: inviteError.code, status: inviteError.status }) : "null"}`,
  );

  if (inviteError || !inviteData.user) {
    if (inviteError?.code === "email_exists") {
      return { success: false, error: "email_taken" };
    }
    if (
      inviteError?.code === "over_email_send_rate_limit" ||
      inviteError?.code === "over_request_rate_limit"
    ) {
      // Supabase's egen (meget lave) standard-mailkvote, ikke en fejl i
      // selve oprettelsen — reelt fix er en konfigureret SMTP-udbyder.
      return { success: false, error: "rate_limited" };
    }
    console.error(
      "[createCustomerAccount] inviteUserByEmail failed",
      inviteError,
    );
    return { success: false, error: "server_error" };
  }

  const userId = inviteData.user.id;

  // 3. Udfyld profilen og adressen. Trigger'en fra 0001 har allerede oprettet
  // en bar profiles-række for userId, så dette er et update, ikke et insert.
  try {
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        role: "kunde",
        payment_method: details.paymentMethod,
        created_by: details.createdBy,
        company_name: finalCompanyName,
        cvr_number: details.cvrNumber,
        cvr_verified_at: new Date().toISOString(),
        full_name: details.contactName,
        phone: details.phone,
        preferred_payment: details.preferredPayment,
        discount_group: details.discountGroup,
        individual_discount: details.individualDiscount,
        credit_limit: details.creditLimit,
        payment_terms_days: details.paymentTermsDays,
        expected_category: details.expectedCategory,
        expected_annual_volume: details.expectedAnnualVolume,
        existing_customer: details.existingCustomer,
        application_comment: details.applicationComment,
        terms_accepted_at: details.termsAcceptedAt,
        privacy_accepted_at: details.privacyAcceptedAt,
      })
      .eq("id", userId);

    // DEBUG — remove once the admin-form success/error bug is confirmed fixed.
    console.log(
      `[createCustomerAccount] profiles update error=${updateError ? JSON.stringify({ message: updateError.message, code: updateError.code, details: updateError.details, hint: updateError.hint }) : "null"}`,
    );

    if (updateError) throw updateError;

    const { error: addressError } = await supabaseAdmin
      .from("delivery_addresses")
      .insert({
        profile_id: userId,
        street_address: details.streetAddress,
        postal_code: details.postalCode,
        city: details.city,
        country: details.country,
        is_default: true,
      });

    // DEBUG — remove once the admin-form success/error bug is confirmed fixed.
    console.log(
      `[createCustomerAccount] delivery_addresses insert error=${addressError ? JSON.stringify({ message: addressError.message, code: addressError.code, details: addressError.details, hint: addressError.hint }) : "null"}`,
    );

    if (addressError) throw addressError;
  } catch (err) {
    // Oprydning: slet auth-brugeren igen. profiles/delivery_addresses har
    // "on delete cascade" til auth.users, så dette rydder alt op i ét hug.
    // Invite-mailen er allerede sendt og kan ikke trækkes tilbage — klikker
    // brugeren på linket nu, fejler det bare, da brugeren ikke længere findes.
    console.error(
      "[createCustomerAccount] rolling back after partial signup failure",
      err,
    );
    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error(
        "[createCustomerAccount] cleanup deleteUser also failed — orphaned auth user:",
        userId,
        deleteError,
      );
    }
    return { success: false, error: "server_error" };
  }

  // DEBUG — remove once the admin-form success/error bug is confirmed fixed.
  console.log(
    `[createCustomerAccount] success userId=${userId} companyName=${finalCompanyName}`,
  );

  return { success: true, companyName: finalCompanyName };
}

// ---------------------------------------------------------------------------
// Selvbetjent ansøgning (offentlig, via /api/apply) — kort, samtykke
// påkrævet, notifikationsmail til intern liste.
// ---------------------------------------------------------------------------

export type ApplyInput = {
  companyName: string;
  cvrNumber: string;
  contactName: string;
  email: string;
  streetAddress: string;
  postalCode: string;
  city: string;
  country: string;
  phone?: string;
  preferredPayment?: "kort" | "kredit";
  expectedCategory?: string;
  expectedAnnualVolume?: string;
  existingCustomer?: boolean;
  applicationComment?: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
};

export type ApplyErrorCode =
  | "validation_error"
  | "terms_not_accepted"
  | "cvr_invalid"
  | "email_taken"
  | "rate_limited"
  | "server_error";

export type ApplyResult =
  | { success: true }
  | { success: false; error: ApplyErrorCode };

export async function applyForAccount(
  input: ApplyInput,
): Promise<ApplyResult> {
  const {
    companyName,
    cvrNumber,
    contactName,
    email,
    streetAddress,
    postalCode,
    city,
    country,
    phone,
    preferredPayment,
    expectedCategory,
    expectedAnnualVolume,
    existingCustomer,
    applicationComment,
    termsAccepted,
    privacyAccepted,
  } = input;

  if (
    !companyName ||
    !cvrNumber ||
    !contactName ||
    !email ||
    !streetAddress ||
    !postalCode ||
    !city ||
    !country
  ) {
    return { success: false, error: "validation_error" };
  }

  if (
    preferredPayment &&
    preferredPayment !== "kort" &&
    preferredPayment !== "kredit"
  ) {
    return { success: false, error: "validation_error" };
  }

  if (!termsAccepted || !privacyAccepted) {
    return { success: false, error: "terms_not_accepted" };
  }

  const acceptedAt = new Date().toISOString();

  const result = await createCustomerAccount({
    companyName,
    cvrNumber,
    contactName,
    email,
    streetAddress,
    postalCode,
    city,
    country,
    phone: phone || null,
    paymentMethod: "kort",
    preferredPayment: preferredPayment || null,
    // profiles.discount_group er NOT NULL med default 'standard' (0007) —
    // selvbetjening får altid standardgruppen, uden undtagelser.
    discountGroup: "standard",
    individualDiscount: null,
    creditLimit: null,
    paymentTermsDays: null,
    expectedCategory: expectedCategory || null,
    expectedAnnualVolume: expectedAnnualVolume || null,
    existingCustomer: existingCustomer ?? false,
    applicationComment: applicationComment || null,
    createdBy: "self_service",
    termsAcceptedAt: acceptedAt,
    privacyAcceptedAt: acceptedAt,
  });

  if (!result.success) {
    return result;
  }

  // Notifikationsmail — kun ved fuld success, og fejler den, ruller vi ikke
  // ansøgningen tilbage (kontoen er gyldig, det er kun en intern besked).
  const notificationEmails = (process.env.NOTIFICATION_EMAILS ?? "")
    .split(",")
    .map((addr) => addr.trim())
    .filter(Boolean);

  if (notificationEmails.length > 0) {
    try {
      await sendMail({
        to: notificationEmails,
        subject: `Ny ansøgning: ${result.companyName}`,
        body: [
          `Firmanavn: ${result.companyName}`,
          `CVR: ${cvrNumber}`,
          `Kontaktperson: ${contactName}`,
          `Email: ${email}`,
          `Tidspunkt: ${new Date().toISOString()}`,
        ].join("\n"),
      });
    } catch (err) {
      console.error("[applyForAccount] notification email failed", err);
    }
  } else {
    console.warn(
      "[applyForAccount] NOTIFICATION_EMAILS not set — skipping notification email",
    );
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// Manuel oprettelse af admin/superadmin (via /admin/customers/new) — admin
// vælger selv betalingsmetode/rabat/kredit, intet samtykke antages på
// kundens vegne, ingen notifikationsmail.
// ---------------------------------------------------------------------------

export type AdminCreateCustomerInput = {
  companyName: string;
  cvrNumber: string;
  contactName: string;
  email: string;
  streetAddress: string;
  postalCode: string;
  city: string;
  country: string;
  phone?: string;
  paymentMethod: "kort" | "kredit";
  discountGroup?: string;
  individualDiscount?: number;
  creditLimit?: number;
  paymentTermsDays?: number;
};

export type AdminCreateCustomerErrorCode =
  | "validation_error"
  | "cvr_invalid"
  | "email_taken"
  | "rate_limited"
  | "server_error";

export type AdminCreateCustomerResult =
  | { success: true }
  | { success: false; error: AdminCreateCustomerErrorCode };

export async function createCustomerAsAdmin(
  input: AdminCreateCustomerInput,
): Promise<AdminCreateCustomerResult> {
  const {
    companyName,
    cvrNumber,
    contactName,
    email,
    streetAddress,
    postalCode,
    city,
    country,
    phone,
    paymentMethod,
    discountGroup,
    individualDiscount,
    creditLimit,
    paymentTermsDays,
  } = input;

  if (
    !companyName ||
    !cvrNumber ||
    !contactName ||
    !email ||
    !streetAddress ||
    !postalCode ||
    !city ||
    !country
  ) {
    return { success: false, error: "validation_error" };
  }

  if (paymentMethod !== "kort" && paymentMethod !== "kredit") {
    return { success: false, error: "validation_error" };
  }

  if (
    paymentMethod === "kredit" &&
    (creditLimit == null || creditLimit < 0 || paymentTermsDays == null || paymentTermsDays < 0)
  ) {
    return { success: false, error: "validation_error" };
  }

  if (
    individualDiscount != null &&
    (individualDiscount < 0 || individualDiscount > 100)
  ) {
    return { success: false, error: "validation_error" };
  }

  // Dropdown'en i UI'en burde altid sende et gyldigt id, men stol aldrig på
  // klienten — valider mod de faktiske rabatgrupper i stedet for at lade en
  // ugyldig værdi ramme FK-constraintet som en uforklaret server_error.
  const validGroups = await getDiscountGroups();
  const requestedGroup = discountGroup || "standard";
  if (!validGroups.some((group) => group.id === requestedGroup)) {
    return { success: false, error: "validation_error" };
  }

  return createCustomerAccount({
    companyName,
    cvrNumber,
    contactName,
    email,
    streetAddress,
    postalCode,
    city,
    country,
    phone: phone || null,
    paymentMethod,
    preferredPayment: null,
    discountGroup: requestedGroup,
    individualDiscount: individualDiscount ?? null,
    creditLimit: paymentMethod === "kredit" ? (creditLimit ?? null) : null,
    paymentTermsDays:
      paymentMethod === "kredit" ? (paymentTermsDays ?? null) : null,
    expectedCategory: null,
    expectedAnnualVolume: null,
    existingCustomer: false,
    applicationComment: null,
    createdBy: "admin",
    termsAcceptedAt: null,
    privacyAcceptedAt: null,
  });
}
