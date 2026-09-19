/**
 * Diskrete "vi modtager disse kort"-mærker ved siden af kort-betalings-
 * knappen. Håndtegnede SVG'er i de officielle brandfarver/-former
 * (Mastercards to cirkler, Visas blå kursive ordmærke) — ikke de
 * nedhentede, ophavsretligt beskyttede logofiler fra Visa/Mastercard selv,
 * da vi ikke har adgang til at hente og verificere dem i dette miljø.
 * Genkendelige nok til at signalere tillid, uden at hævde at være de
 * eksakte officielle filer.
 */
export function VisaMark() {
  return (
    <svg
      viewBox="0 0 48 16"
      width="38"
      height="13"
      role="img"
      aria-label="Visa"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="0"
        y="13"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="15"
        fontStyle="italic"
        fontWeight="700"
        fill="#1434CB"
        letterSpacing="-0.5"
      >
        VISA
      </text>
    </svg>
  );
}

export function MastercardMark() {
  return (
    <svg
      viewBox="0 0 40 24"
      width="32"
      height="19"
      role="img"
      aria-label="Mastercard"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="15" cy="12" r="11" fill="#EB001B" />
      <circle cx="25" cy="12" r="11" fill="#F79E1B" />
      <path
        d="M20 3.5a11 11 0 0 1 0 17 11 11 0 0 1 0-17Z"
        fill="#FF5F00"
      />
    </svg>
  );
}

export function PaymentLogos() {
  return (
    <div className="flex items-center gap-2" aria-label="Vi modtager Visa og Mastercard">
      <VisaMark />
      <MastercardMark />
    </div>
  );
}
