// Matcher billeder i import/pido-images-raw/ til products.sku via det
// 5-6-cifrede Artnr forrest i filnavnet, konverterer til webkvalitets-JPG
// og uploader til Storage-bucketen product-images.
//
// Kør: node --env-file=.env.local scripts/import-images.mjs
// Kør uden at ændre noget (kun rapportér matches/konflikter): DRY_RUN=1 node --env-file=.env.local scripts/import-images.mjs
//
// Ved flere filer for samme Artnr: hvis filnavnene (minus Artnr, version og
// filtype) er identiske, er det bare flere versioner af samme billede — den
// højeste "vNN" vælges automatisk. Hvis navnene er tydeligt forskellige, er
// det formentlig to forskellige produkter der fejlagtigt deler Artnr-præfiks
// (set i praksis, fx 105000 = "Gavel" og 105000 = "Pallinredning komplett").
// Den slags konflikter vælges IKKE automatisk — de logges til
// import/image-conflicts.csv til manuel afklaring, og produktets image_url
// røres ikke.

import { readdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const DRY_RUN = process.env.DRY_RUN === "1";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const rawDirPath = fileURLToPath(new URL("../import/pido-images-raw/", import.meta.url));
const conflictsCsvPath = fileURLToPath(new URL("../import/image-conflicts.csv", import.meta.url));

const files = readdirSync(rawDirPath).filter((f) => /\.(tif|tiff|jpg|jpeg|png)$/i.test(f));

const artnrRegex = /^(\d{5,6})\b/;

function normalizeForComparison(filename, artnr) {
  return filename
    .slice(artnr.length)
    .replace(/\.\w+$/, "")
    .replace(/\s*v\d+\s*$/i, "")
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
    .trim();
}

const byArtnr = new Map();
let noArtnr = 0;
for (const f of files) {
  const m = f.match(artnrRegex);
  if (!m) {
    noArtnr++;
    continue;
  }
  const artnr = m[1];
  if (!byArtnr.has(artnr)) byArtnr.set(artnr, []);
  byArtnr.get(artnr).push(f);
}

const { data: products, error: productsError } = await supabase
  .from("products")
  .select("id, sku");
if (productsError) throw new Error(`kunne ikke hente produkter: ${productsError.message}`);
const skuToProduct = new Map(products.map((p) => [p.sku, p]));

let converted = 0;
let unmatched = 0;
const versionNotices = [];
const conflicts = [];
const failures = [];

for (const [artnr, fileList] of byArtnr) {
  const product = skuToProduct.get(artnr);
  if (!product) {
    unmatched++;
    continue;
  }

  let chosen = fileList[0];
  if (fileList.length > 1) {
    const normalized = fileList.map((f) => normalizeForComparison(f, artnr));
    const allSame = normalized.every((n) => n === normalized[0]);

    if (!allSame) {
      conflicts.push({ artnr, sku: product.id, files: fileList });
      continue;
    }

    // Bare flere versioner af samme billede — vælg den højeste "vNN".
    const ranked = fileList
      .map((f) => {
        const vm = f.match(/v(\d+)(?=\.\w+$)/i);
        return { f, v: vm ? parseInt(vm[1], 10) : -1 };
      })
      .sort((a, b) => b.v - a.v);
    chosen = ranked[0].f;
    versionNotices.push(`Artnr ${artnr}: ${fileList.length} versioner (${fileList.join(", ")}) — bruger "${chosen}"`);
  }

  if (DRY_RUN) {
    converted++;
    continue;
  }

  try {
    const buffer = await readFile(path.join(rawDirPath, chosen));
    const jpegBuffer = await sharp(buffer, { failOn: "none" })
      .flatten({ background: "#ffffff" })
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .toColorspace("srgb")
      .jpeg({ quality: 85 })
      .toBuffer();

    const objectPath = `${artnr}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(objectPath, jpegBuffer, { contentType: "image/jpeg", upsert: true });
    if (uploadError) throw new Error(`upload fejlede: ${uploadError.message}`);

    const {
      data: { publicUrl },
    } = supabase.storage.from("product-images").getPublicUrl(objectPath);

    const { error: updateError } = await supabase
      .from("products")
      .update({ image_url: publicUrl })
      .eq("id", product.id);
    if (updateError) throw new Error(`image_url-opdatering fejlede: ${updateError.message}`);

    converted++;
  } catch (err) {
    failures.push(`Artnr ${artnr} ("${chosen}"): ${err.message}`);
  }
}

if (conflicts.length > 0) {
  const csvLines = ["artnr,product_id,candidate_files"];
  for (const c of conflicts) {
    csvLines.push(`${c.artnr},${c.sku},"${c.files.join(" | ")}"`);
  }
  writeFileSync(conflictsCsvPath, csvLines.join("\n") + "\n", "utf-8");
}

console.log(`=== Opsummering${DRY_RUN ? " (DRY RUN — intet ændret)" : ""} ===`);
console.log(`Filer i mappen: ${files.length}`);
console.log(`Konverteret og uploadet: ${converted}`);
console.log(`Filer uden genkendeligt Artnr (5-6 cifre forrest): ${noArtnr}`);
console.log(`Artnr fundet, men matcher intet produkt: ${unmatched}`);
console.log(`Version-heuristik brugt (samme billede, flere vNN): ${versionNotices.length}`);
for (const w of versionNotices) console.log(`  - ${w}`);
console.log(`Konflikter (forskellige produkter, samme Artnr — IKKE ændret, se import/image-conflicts.csv): ${conflicts.length}`);
for (const c of conflicts) console.log(`  - Artnr ${c.artnr}: ${c.files.join(" | ")}`);
console.log(`Fejlede konverteringer/uploads: ${failures.length}`);
for (const f of failures) console.log(`  - ${f}`);
