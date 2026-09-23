import Image from "next/image";

/**
 * Officielle Visa/Mastercard-mærker fra Clearhaus' gratis acceptance-logo-
 * pakke (clearhaus.com/resources/assets/acceptance-logos.zip), gemt
 * uændrede som public/images/visa.svg og mastercard.svg — ingen omfarvning,
 * beskæring eller sammensætning med andre grafiske elementer, jf.
 * Clearhaus' brugsbetingelser for logoerne. Begge vises i samme højde
 * (bredden følger hver logos egen native proportion — visa.svg er 71×45,
 * mastercard.svg er 70×45), som er den krævede "ligestor visning" når de
 * to mærker vises sammen.
 */
export function PaymentLogos() {
  return (
    <div className="flex items-center gap-3" aria-label="Vi modtager Visa og Mastercard">
      <Image src="/images/visa.svg" alt="Visa" width={71} height={45} className="h-6 w-auto" />
      <Image
        src="/images/mastercard.svg"
        alt="Mastercard"
        width={70}
        height={45}
        className="h-6 w-auto"
      />
    </div>
  );
}
