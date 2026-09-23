import "server-only";
import { sendMailWithRetry } from "@/lib/mail";

/**
 * Erstatter to tidligere planlagte mails (Supabases egen automatiske
 * invite-mail + en separat "sådan kommer du i gang"-velkomstmail) med ÉN
 * kombineret mail — Supabases egen invite-mail kan ikke bære det ekstra
 * onboarding-indhold, så vi genererer selv invite-linket
 * (admin.generateLink, se lib/customer-application.ts) og sender det
 * igennem Postmark i stedet for at lade Supabase sende automatisk.
 *
 * linkExpiryHours: IKKE hardkodet her — skal afspejle projektets faktiske
 * konfigurerede invite-link-udløb (Supabase Dashboard → Authentication →
 * Email-indstillinger), som ikke kunne bekræftes programmatisk i dette
 * miljø (ingen Management API-adgang). Kaldes i dag med 24, hvilket
 * MATCHER teksten herunder, men er ikke selv bekræftet mod den faktiske
 * projektindstilling — se rapportering til Søren.
 */
export async function sendWelcomeEmail(
  companyName: string,
  email: string,
  actionLink: string,
  linkExpiryHours: number,
): Promise<void> {
  const subject =
    "Velkommen til Bygnors kundeportal — sådan kommer du i gang / Welcome to Bygnor's customer portal — how to get started";

  const body = `Dansk

Hej ${companyName},

Din konto til Bygnors B2B-shop er nu oprettet. Følg disse trin for at komme i gang:

1. Sæt din adgangskode
Sæt din adgangskode her — linket er gyldigt i ${linkExpiryHours} timer:
${actionLink}

2. Download en autenticator-app
For at logge ind skal du bruge to-faktor-godkendelse (2FA) — en ekstra sikkerhedskode ud over din adgangskode. Har du ikke allerede en autenticator-app, anbefaler vi:

Google Authenticator:
App Store: https://apps.apple.com/app/google-authenticator/id388497605
Google Play: https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2

Begge er gratis og tager under et minut at installere.

3. Scan QR-koden
Når du har sat din adgangskode, viser vi dig en QR-kode. Åbn din autenticator-app, vælg "tilføj konto" eller "scan QR-kode", og ret kameraet mod skærmen.

4. Log ind
Herefter er du klar — log ind med din e-mail, adgangskode og den 6-cifrede kode fra din app.

Har du spørgsmål undervejs, er du altid velkommen til at kontakte os på kontakt@bygnor.com.

Med venlig hilsen
Bygnor

—

English

Hi ${companyName},

Your account for Bygnor's B2B shop has been created. Follow these steps to get started:

1. Set your password
Set your password here — this link is valid for ${linkExpiryHours} hours:
${actionLink}

2. Download an authenticator app
To log in, you'll need two-factor authentication (2FA) — an extra security code in addition to your password. If you don't already have an authenticator app, we recommend:

Google Authenticator:
App Store: https://apps.apple.com/app/google-authenticator/id388497605
Google Play: https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2

Both are free and take less than a minute to install.

3. Scan the QR code
Once you've set your password, we'll show you a QR code. Open your authenticator app, select "add account" or "scan QR code," and point your camera at the screen.

4. Log in
You're all set — log in with your email, password, and the 6-digit code from your app.

If you have any questions along the way, feel free to contact us at kontakt@bygnor.com.

Best regards,
Bygnor
`;

  await sendMailWithRetry({ to: [email], subject, body }, `velkomstmail til ${email}`);
}
