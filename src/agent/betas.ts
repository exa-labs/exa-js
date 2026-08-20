/**
 * Shared Exa-Beta header construction for the agent API surfaces.
 */

export function headersForBetas(
  betas?: string[]
): Record<string, string> | undefined {
  const betaValues = betas?.filter(Boolean);
  if (!betaValues?.length) return undefined;
  return { "Exa-Beta": betaValues.join(",") };
}
