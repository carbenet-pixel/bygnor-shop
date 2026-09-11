import { notFound } from "next/navigation";
import { getProductGroupDetail } from "@/lib/catalog";
import { getSalesContactEmail } from "@/lib/contact";
import { GroupVariantView } from "./group-variant-view";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ avdeling?: string; underkategori?: string; q?: string }>;
}) {
  const { id } = await params;
  const [result, { avdeling, underkategori, q }] = await Promise.all([
    getProductGroupDetail(id),
    searchParams,
  ]);

  if (!result) {
    notFound();
  }

  // Bevarer den katalogvisning (afdeling/underkategori/søgning) brugeren kom
  // fra, så "Tilbage til katalog" lander dem samme sted, ikke standard-
  // visningen — se ../catalog-browser.tsx, som sender disse med som query-
  // parametre når man klikker ind på et produkt. Uden nogen af dem (fx et
  // direkte link til produktsiden) falder det bare tilbage til /shop/katalog.
  const backParams = new URLSearchParams();
  if (avdeling) backParams.set("avdeling", avdeling);
  if (underkategori) backParams.set("underkategori", underkategori);
  if (q) backParams.set("q", q);
  const backQueryString = backParams.toString();
  const backHref = backQueryString ? `/shop/katalog?${backQueryString}` : "/shop/katalog";

  return (
    <GroupVariantView
      groupName={result.groupName}
      categoryName={result.categoryName}
      members={result.members}
      initialSelectedId={id}
      salesEmail={getSalesContactEmail()}
      backHref={backHref}
      backQueryString={backQueryString}
    />
  );
}
