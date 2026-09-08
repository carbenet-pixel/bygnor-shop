import { redirect } from "next/navigation";

// Ordrer er standardfanen ved landing på /shop/konto — det er det, der
// oftest er relevant at tjekke.
export default function KontoPage() {
  redirect("/shop/konto/ordrer");
}
