import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCvr } from "@/lib/cvr";
import { sendMail } from "@/lib/mail";

export type ApplyInput = {
  companyName: string;
  cvrNumber: string;
  contactName: string;
  email: string;
  streetAddress: string;
  postalCode: string;
  city: string;
  country: string;
  // Valgfrie ansøgningsfelter (0003)
  phone?: string;
  preferredPayment?: "kort" | "kredit";
  expectedCategory?: string;
  expectedAnnualVolume?: string;
  existingCustomer?: boolean;
  applicationComment?: string;
  // Påkrævede samtykker (0003) — API'et stempler selv tidspunktet, klienten
  // sender kun om boksene var afkrydset.
  termsAccepted: boolean;
  privacyAccepted: boolean;
};

export type ApplyErrorCode =
  | "validation_error"
  | "terms_not_accepted"
  | "cvr_invalid"
  | "email_taken"
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

  if (preferredPayment && preferredPayment !== "kort" && preferredPayment !== "kredit") {
    return { success: false, error: "validation_error" };
  }

  if (!termsAccepted || !privacyAccepted) {
    return { success: false, error: "terms_not_accepted" };
  }

  // 1. Verificér CVR FØRST — opret intet hvis den ikke er gyldig.
  const cvrResult = await verifyCvr(cvrNumber);
  if (!cvrResult.valid) {
    return { success: false, error: "cvr_invalid" };
  }

  const finalCompanyName = cvrResult.companyName ?? companyName;

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminClient();
  } catch (err) {
    console.error("[applyForAccount] admin client unavailable", err);
    return { success: false, error: "server_error" };
  }

  // 2. Opret auth-brugeren og send invite-mailen. Peger tilbage på den
  // eksisterende reset-password-side, som allerede kan veksle koden til en
  // session og lade brugeren sætte sit første kodeord.
  const { data: inviteData, error: inviteError } =
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: "https://bygnor-shop.vercel.app/login/reset-password",
    });

  if (inviteError || !inviteData.user) {
    if (inviteError?.code === "email_exists") {
      return { success: false, error: "email_taken" };
    }
    console.error("[applyForAccount] inviteUserByEmail failed", inviteError);
    return { success: false, error: "server_error" };
  }

  const userId = inviteData.user.id;

  // 3. Udfyld profilen og adressen. Trigger'en fra 0001 har allerede oprettet
  // en bar profiles-række for userId, så dette er et update, ikke et insert.
  const acceptedAt = new Date().toISOString();

  try {
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        role: "kunde",
        payment_method: "kort",
        created_by: "self_service",
        company_name: finalCompanyName,
        cvr_number: cvrNumber,
        cvr_verified_at: acceptedAt,
        full_name: contactName,
        phone: phone || null,
        preferred_payment: preferredPayment || null,
        expected_category: expectedCategory || null,
        expected_annual_volume: expectedAnnualVolume || null,
        existing_customer: existingCustomer ?? false,
        application_comment: applicationComment || null,
        terms_accepted_at: acceptedAt,
        privacy_accepted_at: acceptedAt,
      })
      .eq("id", userId);

    if (updateError) throw updateError;

    const { error: addressError } = await supabaseAdmin
      .from("delivery_addresses")
      .insert({
        profile_id: userId,
        street_address: streetAddress,
        postal_code: postalCode,
        city,
        country,
        is_default: true,
      });

    if (addressError) throw addressError;
  } catch (err) {
    // Oprydning: slet auth-brugeren igen. profiles/delivery_addresses har
    // "on delete cascade" til auth.users, så dette rydder alt op i ét hug.
    // Invite-mailen er allerede sendt og kan ikke trækkes tilbage — klikker
    // ansøgeren på linket nu, fejler det bare, da brugeren ikke længere findes.
    console.error(
      "[applyForAccount] rolling back after partial signup failure",
      err,
    );
    const { error: deleteError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error(
        "[applyForAccount] cleanup deleteUser also failed — orphaned auth user:",
        userId,
        deleteError,
      );
    }
    return { success: false, error: "server_error" };
  }

  // 4. Notifikationsmail — kun ved fuld success, og fejler den, ruller vi
  // ikke ansøgningen tilbage (kontoen er gyldig, det er kun en intern besked).
  const notificationEmails = (process.env.NOTIFICATION_EMAILS ?? "")
    .split(",")
    .map((addr) => addr.trim())
    .filter(Boolean);

  if (notificationEmails.length > 0) {
    try {
      await sendMail({
        to: notificationEmails,
        subject: `Ny ansøgning: ${finalCompanyName}`,
        body: [
          `Firmanavn: ${finalCompanyName}`,
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
