import crypto from "node:crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { isUdlaEmail, normalizeUdlaEmail } from "./emailUdla.js";
import { pool } from "./db.js";
import { isMailConfigured, sendRegistrationCode } from "./mail.js";
import { createRegistrationJwt, verifyRegistrationJwt } from "./regJwt.js";

const GENEROS = new Set([
  "masculino",
  "femenino",
  "otro",
  "prefiero_no_decir",
]);

export const authRouter = Router();

authRouter.post("/register/send-code", async (req, res) => {
  const { email: rawEmail } = req.body as { email?: unknown };

  if (typeof rawEmail !== "string") {
    res.status(400).json({ ok: false, message: "Correo requerido." });
    return;
  }

  if (!isMailConfigured()) {
    res.status(503).json({
      ok: false,
      message: "El servidor no tiene configurado el envio de correo (SMTP).",
    });
    return;
  }

  const email = normalizeUdlaEmail(rawEmail);
  if (!isUdlaEmail(email)) {
    res.status(400).json({
      ok: false,
      message: "El correo debe ser institucional (@udla.edu.co).",
    });
    return;
  }

  try {
    const { rows: existing } = await pool.query<{ id: number }>(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [email],
    );
    if (existing.length > 0) {
      res.status(409).json({
        ok: false,
        message: "Ya existe una cuenta con ese correo.",
      });
      return;
    }

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const registrationToken = await createRegistrationJwt(email, code);

    await sendRegistrationCode(email, code);
    res.json({
      ok: true,
      registrationToken,
      message:
        "Revisa tu correo institucional (y la carpeta spam); enviamos un codigo de 6 digitos.",
    });
  } catch (err) {
    console.error("[auth] send-code:", err);
    res.status(502).json({
      ok: false,
      message:
        "No se pudo enviar el correo. Verifica SMTP o intenta de nuevo mas tarde.",
    });
  }
});

authRouter.post("/register", async (req, res) => {
  const {
    email: rawEmail,
    nombre,
    genero,
    celular,
    programa,
    semestre,
    password,
    verificationCode,
    registrationToken,
  } = req.body as Record<string, unknown>;

  if (
    typeof rawEmail !== "string" ||
    typeof nombre !== "string" ||
    typeof genero !== "string" ||
    typeof celular !== "string" ||
    typeof programa !== "string" ||
    typeof password !== "string" ||
    typeof verificationCode !== "string" ||
    typeof registrationToken !== "string"
  ) {
    res.status(400).json({
      ok: false,
      message: "Faltan campos o el formato no es valido.",
    });
    return;
  }

  const email = normalizeUdlaEmail(rawEmail);
  if (!isUdlaEmail(email)) {
    res.status(400).json({
      ok: false,
      message: "El correo debe ser institucional (@udla.edu.co).",
    });
    return;
  }

  if (!GENEROS.has(genero)) {
    res.status(400).json({ ok: false, message: "Genero no valido." });
    return;
  }

  const sem = Number(semestre);
  if (!Number.isInteger(sem) || sem < 1 || sem > 20) {
    res.status(400).json({
      ok: false,
      message: "El semestre debe ser un numero entero entre 1 y 20.",
    });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({
      ok: false,
      message: "La contrasena debe tener al menos 8 caracteres.",
    });
    return;
  }

  const nombreTrim = nombre.trim();
  const celularTrim = celular.trim();
  const programaTrim = programa.trim();

  if (!nombreTrim || !celularTrim || !programaTrim) {
    res.status(400).json({
      ok: false,
      message: "Nombre, celular y programa son obligatorios.",
    });
    return;
  }

  const codeDigits = verificationCode.replace(/\D/g, "");
  if (codeDigits.length !== 6) {
    res.status(400).json({
      ok: false,
      message: "El codigo de verificacion debe tener 6 digitos.",
    });
    return;
  }

  try {
    const tokenCheck = await verifyRegistrationJwt(
      registrationToken.trim(),
      email,
      codeDigits,
    );
    if (!tokenCheck.ok) {
      res.status(400).json({ ok: false, message: tokenCheck.message });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO users (email, nombre, genero, celular, programa, semestre, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        email,
        nombreTrim,
        genero,
        celularTrim,
        programaTrim,
        sem,
        passwordHash,
      ],
    );

    const userId = rows[0]?.id;
    res.status(201).json({
      ok: true,
      message: "Registro exitoso.",
      userId,
    });
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code === "23505") {
      res.status(409).json({
        ok: false,
        message: "Ya existe una cuenta con ese correo.",
      });
      return;
    }
    const message = err instanceof Error ? err.message : "Error al registrar.";
    res.status(500).json({ ok: false, message });
  }
});

authRouter.post("/login", async (req, res) => {
  const { email: rawEmail, password } = req.body as Record<string, unknown>;

  if (typeof rawEmail !== "string" || typeof password !== "string") {
    res.status(400).json({ ok: false, message: "Correo y contrasena requeridos." });
    return;
  }

  const email = normalizeUdlaEmail(rawEmail);
  if (!isUdlaEmail(email)) {
    res.status(400).json({
      ok: false,
      message: "El correo debe ser institucional (@udla.edu.co).",
    });
    return;
  }

  try {
    const { rows } = await pool.query<{
      id: number;
      password_hash: string;
      nombre: string;
      email: string;
    }>(
      "SELECT id, password_hash, nombre, email FROM users WHERE email = $1 LIMIT 1",
      [email],
    );
    const row = rows[0];
    if (!row?.password_hash) {
      res.status(401).json({ ok: false, message: "Credenciales incorrectas." });
      return;
    }

    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) {
      res.status(401).json({ ok: false, message: "Credenciales incorrectas." });
      return;
    }

    res.json({
      ok: true,
      message: "Sesion iniciada con exito.",
      userId: row.id,
      nombre: row.nombre ?? "",
      email: row.email ?? email,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al iniciar sesion.";
    res.status(500).json({ ok: false, message });
  }
});
