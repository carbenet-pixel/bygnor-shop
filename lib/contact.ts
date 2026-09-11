import "server-only";

/**
 * Samme SALES_NOTIFICATION_EMAIL som lib/order-mail.ts, men non-throwing —
 * bruges til et kunde-synligt "Kontakt os for tilbud"-link, ikke til at
 * sende mail. En manglende/forkert konfigureret env-var må aldrig vælte en
 * produktsides rendering; det skal blot skjule linket i stedet.
 */
export function getSalesContactEmail(): string | null {
  return process.env.SALES_NOTIFICATION_EMAIL?.trim() || null;
}
