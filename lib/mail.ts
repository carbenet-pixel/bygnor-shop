import "server-only";

export type MailMessage = {
  to: string[];
  subject: string;
  body: string;
};

/**
 * Stub — logger mailen i stedet for at sende den, indtil en rigtig
 * mail-udbyder (Resend/Postmark) er valgt. Kald-signaturen er tænkt som den
 * stabile grænseflade resten af appen bygger op imod.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  console.log("[sendMail] STUB — ville have sendt:", JSON.stringify(message, null, 2));
}
