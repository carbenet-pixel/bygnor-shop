import "server-only";

export type MailMessage = {
  to: string[];
  subject: string;
  body: string;
};

// Skal matche et domæne verificeret i Postmark. Bekræft denne værdi er
// korrekt, før mailen går live.
const FROM_ADDRESS = "noreply@bygnor.com";

/**
 * Sender via Postmarks Email API (https://postmarkapp.com/developer/api/email-api).
 * Kaster ved fejl (manglende token, netværksfejl, ikke-OK svar, eller en
 * Postmark-fejlkode) — kalderen (applyForAccount) fanger og logger allerede
 * dette uden at afbryde selve kundeoprettelsen, samme mønster som ved
 * manglende NOTIFICATION_EMAILS.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const token = process.env.POSTMARK_SERVER_TOKEN;

  if (!token) {
    throw new Error("[sendMail] POSTMARK_SERVER_TOKEN er ikke sat");
  }

  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify({
      From: FROM_ADDRESS,
      To: message.to.join(", "),
      Subject: message.subject,
      TextBody: message.body,
      MessageStream: "outbound",
    }),
  });

  const data: { ErrorCode?: number; Message?: string } | null = await response
    .json()
    .catch(() => null);

  if (!response.ok || (data?.ErrorCode && data.ErrorCode !== 0)) {
    throw new Error(
      `[sendMail] Postmark afviste mailen: status=${response.status} body=${JSON.stringify(data)}`,
    );
  }
}

/**
 * sendMail kaster ved fejl — her fanges det altid, så en mislykket mail
 * aldrig kan vælte den handling der udløste den (ordre, kundeoprettelse).
 * Ét gentagelsesforsøg, derefter tydelig logning af nok info til at sende
 * manuelt. Delt mellem lib/order-mail.ts og lib/welcome-mail.ts — lå
 * oprindeligt kun i order-mail.ts, flyttet hertil da welcome-mail.ts fik
 * brug for den samme logik (ingen duplikeret implementering).
 */
export async function sendMailWithRetry(message: MailMessage, context: string): Promise<void> {
  try {
    await sendMail(message);
    return;
  } catch (err) {
    console.error(`[mail] ${context}: første forsøg fejlede, prøver igen`, err);
  }

  try {
    await sendMail(message);
  } catch (err) {
    console.error(
      `[mail] ${context}: andet forsøg fejlede også — send manuelt. to=${message.to.join(",")} subject="${message.subject}"`,
      err,
    );
  }
}
