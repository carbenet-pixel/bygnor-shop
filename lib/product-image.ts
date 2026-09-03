import "server-only";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";

export type ImageUploadResult =
  | { success: true; url: string }
  | { success: false; error: string };

/**
 * Samme konverteringslogik som scripts/import-images.mjs (RGB, max 1600px,
 * kvalitet 85), men til admin-upload af et enkelt billede for et allerede
 * kendt SKU — ingen Artnr-udtræk fra filnavn nødvendigt her.
 */
export async function convertAndUploadProductImage(
  sku: string,
  file: File,
): Promise<ImageUploadResult> {
  let jpegBuffer: Buffer;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    jpegBuffer = await sharp(buffer, { failOn: "none" })
      .flatten({ background: "#ffffff" })
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .toColorspace("srgb")
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch (err) {
    return {
      success: false,
      error: `Kunne ikke konvertere billedet: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const supabaseAdmin = createAdminClient();
  const objectPath = `${sku}.jpg`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("product-images")
    .upload(objectPath, jpegBuffer, { contentType: "image/jpeg", upsert: true });

  if (uploadError) {
    return { success: false, error: `Upload fejlede: ${uploadError.message}` };
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("product-images").getPublicUrl(objectPath);

  return { success: true, url: publicUrl };
}
