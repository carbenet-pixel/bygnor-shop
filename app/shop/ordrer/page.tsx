import { redirect } from "next/navigation";

// Ordrelisten flyttet ind under "Min konto" -> Ordrer-fanen. Redirect for
// gamle bogmærker/links — kun /shop/ordrer/[id] (dybe links til én ordre,
// fx fra en mail) forbliver en selvstændig side.
export default function LegacyOrdersListPage() {
  redirect("/shop/konto/ordrer");
}
