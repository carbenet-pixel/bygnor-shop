import { NewCustomerForm } from "./new-customer-form";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { success } = await searchParams;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-slate-900">
        Opret kunde
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        CVR verificeres automatisk. Kunden får en invitation på email til at
        sætte sit eget kodeord — ingen adgangskode oprettes her.
      </p>

      {success === "1" && (
        <div className="mb-6 max-w-xl rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Kunden er oprettet, og invitationsmailen er sendt.
        </div>
      )}

      <NewCustomerForm />
    </div>
  );
}
