const UDLA_DOMAIN = "udla.edu.co";

/**
 * Solo acepta correos cuyo dominio (tras la @) sea exactamente udla.edu.co.
 * No valida Gmail u otros dominios.
 */
export function isUdlaEmail(raw: string): boolean {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1 || at !== email.indexOf("@")) {
    return false;
  }
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || domain !== UDLA_DOMAIN) {
    return false;
  }
  return true;
}

export function normalizeUdlaEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
