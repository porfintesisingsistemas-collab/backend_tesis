import { createHmac, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { errors as joseErrors } from "jose";

const AUD = "registro";
const ISS = "integrales-amazonia";

let cachedKey: Uint8Array | null = null;

function getSecretString(): string {
  const s = process.env.JWT_REGISTRATION_SECRET?.trim();
  if (!s || s.length < 32) {
    throw new Error(
      "JWT_REGISTRATION_SECRET debe existir en .env y tener al menos 32 caracteres.",
    );
  }
  return s;
}

function getSigningKey(): Uint8Array {
  if (!cachedKey) {
    cachedKey = new TextEncoder().encode(getSecretString());
  }
  return cachedKey;
}

function proofHex(email: string, code: string): string {
  return createHmac("sha256", getSecretString())
    .update(`${email}:${code}`)
    .digest("hex");
}

export function assertRegistrationJwtConfigured(): void {
  getSecretString();
}

export async function createRegistrationJwt(
  email: string,
  code: string,
): Promise<string> {
  const key = getSigningKey();
  const proof = proofHex(email, code);

  return await new SignJWT({ proof })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setAudience(AUD)
    .setIssuer(ISS)
    .setExpirationTime("15m")
    .sign(key);
}

export async function verifyRegistrationJwt(
  token: string,
  email: string,
  codeDigits: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      audience: AUD,
      issuer: ISS,
      algorithms: ["HS256"],
    });

    const sub = typeof payload.sub === "string" ? payload.sub : "";
    if (sub !== email) {
      return {
        ok: false,
        message:
          "El token no coincide con el correo. Vuelve a enviar el codigo a este correo.",
      };
    }

    const proof = payload.proof;
    if (typeof proof !== "string") {
      return { ok: false, message: "Token de registro invalido." };
    }

    const expectedBuf = Buffer.from(proofHex(email, codeDigits), "hex");
    const proofBuf = Buffer.from(proof, "hex");
    if (expectedBuf.length !== proofBuf.length) {
      return { ok: false, message: "Codigo de verificacion incorrecto." };
    }
    if (!timingSafeEqual(expectedBuf, proofBuf)) {
      return { ok: false, message: "Codigo de verificacion incorrecto." };
    }

    return { ok: true };
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) {
      return {
        ok: false,
        message: "El codigo expiro. Solicita uno nuevo con Enviar codigo al correo.",
      };
    }
    return {
      ok: false,
      message:
        "Token de registro invalido o vencido. Solicita un codigo nuevo.",
    };
  }
}
