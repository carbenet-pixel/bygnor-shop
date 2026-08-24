import { getDiscountGroups } from "@/lib/discount-groups";
import { NewCustomerForm } from "./new-customer-form";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const discountGroups = await getDiscountGroups();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">
        Opret kunde
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        CVR verificeres automatisk. Kunden får en invitation på email til at
        sætte sit eget kodeord — ingen adgangskode oprettes her.
      </p>

      <NewCustomerForm discountGroups={discountGroups} />
    </div>
  );
}
