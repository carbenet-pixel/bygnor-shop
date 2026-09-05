import "server-only";
import crypto from "node:crypto";

// Bekræftet mod https://learn.quickpay.net/tech-talk/api/ og
// https://learn.quickpay.net/tech-talk/payments/link/.
const API_BASE = "https://api.quickpay.net";
const API_VERSION = "v10";
const SITE_URL = "https://bygnor-shop.vercel.app";

// QUICKPAY_AGREEMENT_ID (978962) er kun til reference/dokumentation — selve
// Payment Window API-nøglen er allerede knyttet til den ene aftale, så
// agreement id skal ikke sendes med i selve API-kaldene.

function getApiKey(): string {
  const key = process.env.QUICKPAY_PAYMENT_WINDOW_API_KEY;
  if (!key) {
    throw new Error("[quickpay] QUICKPAY_PAYMENT_WINDOW_API_KEY er ikke sat");
  }
  return key;
}

function authHeader(): string {
  // Quickpay Basic Auth: tomt brugernavn, API-nøglen som password.
  return "Basic " + Buffer.from(`:${getApiKey()}`).toString("base64");
}

async function quickpayRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Accept-Version": API_VERSION,
      "Content-Type": "application/json",
      Authorization: authHeader(),
      ...(init.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `[quickpay] ${init.method ?? "GET"} ${path} fejlede: status=${response.status} body=${JSON.stringify(data)}`,
    );
  }

  return data as T;
}

type QuickpayPayment = { id: number };
type QuickpayLink = { url: string };

export type CreatePaymentResult = {
  paymentId: string;
  linkUrl: string;
};

/**
 * Opretter en betaling og et betalingslink hos Quickpay for en given ordre.
 * autocapture: true — kortet trækkes automatisk ved godkendt betaling,
 * ingen separat manuel capture-handling i denne omgang (bekræftet valg).
 */
export async function createPaymentAndLink(
  orderReference: string,
  amountInOre: number,
): Promise<CreatePaymentResult> {
  const payment = await quickpayRequest<QuickpayPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({ order_id: orderReference, currency: "DKK" }),
  });

  const link = await quickpayRequest<QuickpayLink>(`/payments/${payment.id}/link`, {
    method: "PUT",
    body: JSON.stringify({
      amount: amountInOre,
      continueurl: `${SITE_URL}/shop/checkout/kvittering?order=${orderReference}`,
      cancelurl: `${SITE_URL}/shop/checkout/annulleret?order=${orderReference}`,
      callbackurl: `${SITE_URL}/api/quickpay/callback`,
      autocapture: true,
    }),
  });

  return { paymentId: String(payment.id), linkUrl: link.url };
}

/**
 * Verificerer QuickPay-Checksum-Sha256-headeren på et callback-kald.
 * HMAC-SHA256 af den RÅ, uparsede body med den private nøgle (merchant id
 * 238630) — IKKE Payment Window API-nøglen. Bekræftet mod
 * https://learn.quickpay.net/tech-talk/api/callback/.
 */
export function verifyChecksum(rawBody: string, checksumHeader: string | null): boolean {
  if (!checksumHeader) return false;

  const privateKey = process.env.QUICKPAY_PRIVATE_KEY;
  if (!privateKey) {
    console.error("[quickpay] QUICKPAY_PRIVATE_KEY er ikke sat");
    return false;
  }

  const expected = crypto.createHmac("sha256", privateKey).update(rawBody).digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(checksumHeader, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
