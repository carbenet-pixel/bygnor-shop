import { notFound } from "next/navigation";
import { getProductGroupDetail } from "@/lib/catalog";
import { getSalesContactEmail } from "@/lib/contact";
import { GroupVariantView } from "./group-variant-view";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getProductGroupDetail(id);

  if (!result) {
    notFound();
  }

  return (
    <GroupVariantView
      groupName={result.groupName}
      categoryName={result.categoryName}
      members={result.members}
      initialSelectedId={id}
      salesEmail={getSalesContactEmail()}
    />
  );
}
