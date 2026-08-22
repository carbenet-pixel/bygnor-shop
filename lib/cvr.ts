import "server-only";

export type CvrVerificationResult = {
  valid: boolean;
  companyName?: string;
};

/**
 * Mock — altid gyldig, indtil en rigtig CVR-udbyder er valgt. Skift kun
 * funktionsbody ud; kald-signaturen er tænkt som den stabile grænseflade
 * resten af Fase 2 bygger op imod.
 */
export async function verifyCvr(
  cvrNumber: string,
): Promise<CvrVerificationResult> {
  return {
    valid: true,
    companyName: `Testfirma (CVR ${cvrNumber})`,
  };
}
