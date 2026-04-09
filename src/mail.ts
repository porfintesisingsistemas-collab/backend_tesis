/**
 * Envio de correo (codigo de registro). Solo se usa si SKIP_EMAIL_VERIFICATION=false
 * y el cliente llama a POST /auth/register/send-code.
 * Con SKIP_EMAIL_VERIFICATION=true estas funciones no se invocan.
 */
import nodemailer from "nodemailer";
import { Resend } from "resend";

const brand = "TesisAmazonia";

function buildBodies(code: string): { text: string; html: string } {
  const text = `Hola,\n\nTu codigo de verificacion es: ${code}\n\nEs valido por 15 minutos.\n\nSi no solicitaste registrarte en ${brand}, ignora este mensaje.\n\n— ${brand}`;
  const html = `<div style="font-family:Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0;padding:24px;background:#0f1629;color:#e8ecff;">
  <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:#7ad8ff;">${brand}</p>
  <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#ffffff;">Verifica tu correo</h1>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#b8c0df;">Usa este codigo para completar tu registro. Caduca en 15 minutos.</p>
  <p style="margin:0 0 8px;font-size:14px;color:#b8c0df;">Tu codigo es:</p>
  <p style="margin:0 0 24px;font-size:28px;font-weight:700;letter-spacing:0.35em;color:#5ec8ff;">${code}</p>
  <p style="margin:0;font-size:13px;line-height:1.5;color:#8b95b5;">Si no creaste una cuenta en <strong style="color:#e8ecff;">${brand}</strong>, puedes ignorar este correo.</p>
</div>`;
  return { text, html };
}

function isRenderHost(): boolean {
  return process.env.RENDER === "true";
}

export function isMailConfigured(): boolean {
  if (process.env.RESEND_API_KEY?.trim()) {
    return true;
  }
  if (isRenderHost()) {
    return false;
  }
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  return Boolean(user && pass);
}

export function mailConfigErrorMessage(): string {
  if (isRenderHost()) {
    return "Configura RESEND_API_KEY en Render (resend.com). Gmail SMTP no funciona en este servidor.";
  }
  return "El servidor no tiene configurado el envio de correo (SMTP o RESEND_API_KEY).";
}

async function sendViaResend(toEmail: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY!.trim();
  const resend = new Resend(apiKey);
  const from =
    process.env.MAIL_FROM?.trim() ?? "TesisAmazonia <onboarding@resend.dev>";
  const { text, html } = buildBodies(code);

  const { data, error } = await resend.emails.send({
    from,
    to: toEmail,
    subject: `Codigo de verificacion - ${brand}`,
    text,
    html,
  });

  if (error) {
    throw new Error(error.message);
  }
  if (!data?.id) {
    throw new Error("Resend no devolvio id de correo");
  }
}

export async function sendRegistrationCode(
  toEmail: string,
  code: string,
): Promise<void> {
  if (process.env.RESEND_API_KEY?.trim()) {
    await sendViaResend(toEmail, code);
    return;
  }

  if (isRenderHost()) {
    throw new Error(
      "RESEND_API_KEY requerido en Render (SMTP no disponible en este entorno).",
    );
  }

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!user || !pass) {
    throw new Error("SMTP no configurado");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
    connectionTimeout: 25_000,
    greetingTimeout: 25_000,
    socketTimeout: 25_000,
  });

  const from =
    process.env.MAIL_FROM?.trim() ?? `TesisAmazonia <${user}>`;

  const { text, html } = buildBodies(code);

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: `Codigo de verificacion - ${brand}`,
    text,
    html,
  });
}

function buildResetBodies(code: string): { text: string; html: string } {
  const text = `Hola,\n\nRecibimos una solicitud para cambiar tu contrasena.\nTu codigo es: ${code}\n\nEs valido por 15 minutos.\n\nSi no fuiste tu, ignora este correo.\n\n— ${brand}`;
  const html = `<div style="font-family:Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0;padding:24px;background:#0f1629;color:#e8ecff;">
  <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:#7ad8ff;">${brand}</p>
  <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#ffffff;">Restablecer contrasena</h1>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#b8c0df;">Usa este codigo para cambiar tu contrasena. Caduca en 15 minutos.</p>
  <p style="margin:0 0 8px;font-size:14px;color:#b8c0df;">Tu codigo es:</p>
  <p style="margin:0 0 24px;font-size:28px;font-weight:700;letter-spacing:0.35em;color:#5ec8ff;">${code}</p>
  <p style="margin:0;font-size:13px;line-height:1.5;color:#8b95b5;">Si no solicitaste este cambio, ignora este mensaje.</p>
</div>`;
  return { text, html };
}

export async function sendPasswordResetCode(
  toEmail: string,
  code: string,
): Promise<void> {
  if (process.env.RESEND_API_KEY?.trim()) {
    const apiKey = process.env.RESEND_API_KEY!.trim();
    const resend = new Resend(apiKey);
    const from =
      process.env.MAIL_FROM?.trim() ?? "TesisAmazonia <onboarding@resend.dev>";
    const { text, html } = buildResetBodies(code);
    const { data, error } = await resend.emails.send({
      from,
      to: toEmail,
      subject: `Codigo para cambiar contrasena - ${brand}`,
      text,
      html,
    });
    if (error) {
      throw new Error(error.message);
    }
    if (!data?.id) {
      throw new Error("Resend no devolvio id de correo");
    }
    return;
  }

  if (isRenderHost()) {
    throw new Error(
      "RESEND_API_KEY requerido en Render (SMTP no disponible en este entorno).",
    );
  }

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!user || !pass) {
    throw new Error("SMTP no configurado");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
    connectionTimeout: 25_000,
    greetingTimeout: 25_000,
    socketTimeout: 25_000,
  });

  const from =
    process.env.MAIL_FROM?.trim() ?? `TesisAmazonia <${user}>`;
  const { text, html } = buildResetBodies(code);
  await transporter.sendMail({
    from,
    to: toEmail,
    subject: `Codigo para cambiar contrasena - ${brand}`,
    text,
    html,
  });
}
