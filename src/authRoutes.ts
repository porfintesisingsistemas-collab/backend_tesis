import crypto from "node:crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { isUdlaEmail, normalizeUdlaEmail } from "./emailUdla.js";
import { pool } from "./db.js";
import {
  isMailConfigured,
  mailConfigErrorMessage,
  sendRegistrationCode,
} from "./mail.js";
import { createRegistrationJwt, verifyRegistrationJwt } from "./regJwt.js";

const SKIP_EMAIL_VERIFICATION = process.env.SKIP_EMAIL_VERIFICATION !== "false";
const GENEROS = new Set(["masculino", "femenino", "otro", "prefiero_no_decir"]);
const ROLES = new Set(["estudiante", "profesor"]);
const DIFICULTADES = new Set(["basica", "media", "avanzada"]);
const VISIBILIDADES = new Set(["publica", "privada"]);
const SUBMISSION_STATUS_DONE = "entregado";

type Role = "estudiante" | "profesor";
type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
};

export const authRouter = Router();

function parseRole(value: unknown): Role {
  return value === "profesor" ? "profesor" : "estudiante";
}

function getRoleLabel(role: Role): string {
  return role === "profesor" ? "Profesor" : "Estudiante";
}

function normalizeUserId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normalizeDifficulty(value: unknown): string {
  if (typeof value !== "string") {
    return "media";
  }
  const normalized = value.trim().toLowerCase();
  return DIFICULTADES.has(normalized) ? normalized : "media";
}

function normalizeDueDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return trimmed;
}

function normalizeVisibilidad(value: unknown): "publica" | "privada" {
  if (typeof value !== "string") {
    return "publica";
  }
  const v = value.trim().toLowerCase();
  return VISIBILIDADES.has(v) ? (v as "publica" | "privada") : "publica";
}

/** Devuelve matricula normalizada o null si viene vacío; string especial "__invalid__" si el formato no es válido. */
function parseMatricula(value: unknown): string | null | "__invalid__" {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    return "__invalid__";
  }
  const t = value.trim().toUpperCase().replace(/\s+/g, "");
  if (!t) {
    return null;
  }
  if (!/^[A-Z0-9_-]{4,32}$/.test(t)) {
    return "__invalid__";
  }
  return t;
}

function parseNonNegativeInt(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    return fallback;
  }
  return n;
}

function permissionsForRole(role: Role): string[] {
  if (role === "profesor") {
    return [
      "crear_clases",
      "crear_ejercicios",
      "matricular_estudiantes",
      "ver_avance_estudiantes",
      "recibir_notificaciones",
    ];
  }
  return [
    "ver_progreso",
    "ver_clases_matriculadas",
    "marcar_ejercicios_completados",
    "recibir_notificaciones",
  ];
}

function professorQuickActions(): Array<{ id: string; title: string; description: string }> {
  return [
    {
      id: "crear_clase",
      title: "Crear clase",
      description: "Abre un grupo nuevo para organizar estudiantes y ejercicios.",
    },
    {
      id: "matricular",
      title: "Matricular estudiante",
      description: "Agrega un estudiante con su correo institucional a una clase existente.",
    },
    {
      id: "crear_ejercicio",
      title: "Crear ejercicio",
      description: "Publica una actividad con dificultad y fecha limite.",
    },
  ];
}

function studentQuickActions(): Array<{ id: string; title: string; description: string }> {
  return [
    {
      id: "ver_progreso",
      title: "Ver progreso",
      description: "Consulta tu avance promedio y los ejercicios pendientes.",
    },
    {
      id: "clases",
      title: "Clases matriculadas",
      description: "Revisa tus grupos activos y el profesor asignado.",
    },
    {
      id: "ejercicios",
      title: "Ejercicios activos",
      description: "Marca tareas terminadas para actualizar tu avance.",
    },
  ];
}

async function createNotification(
  db: Queryable,
  userId: number,
  titulo: string,
  mensaje: string,
  tipo: string,
): Promise<void> {
  await db.query(
    `INSERT INTO notifications (user_id, titulo, mensaje, tipo)
     VALUES ($1, $2, $3, $4)`,
    [userId, titulo, mensaje, tipo],
  );
}

async function getUserById(userId: number): Promise<{
  id: number | string;
  email: string;
  nombre: string;
  role: string;
  programa: string;
  semestre: number;
  matricula: string | null;
  coins_total: number | string;
  xp_total: number | string;
} | null> {
  const { rows } = await pool.query<{
    id: number | string;
    email: string;
    nombre: string;
    role: string;
    programa: string;
    semestre: number;
    matricula: string | null;
    coins_total: number | string;
    xp_total: number | string;
  }>(
    `SELECT id, email, nombre, role, programa, semestre,
            matricula, coins_total, xp_total
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

async function recomputeEnrollmentProgress(
  db: Queryable,
  classId: number,
  studentId: number,
): Promise<number> {
  const result = (await db.query(
    `SELECT
       COUNT(DISTINCT e.id) AS total_exercises,
       COUNT(DISTINCT CASE WHEN es.estado = $3 THEN es.id END) AS completed_exercises
     FROM exercises e
     LEFT JOIN exercise_submissions es
       ON es.exercise_id = e.id
      AND es.student_id = $2
     WHERE e.class_id = $1`,
    [classId, studentId, SUBMISSION_STATUS_DONE],
  )) as {
    rows?: Array<{ total_exercises: number | string; completed_exercises: number | string }>;
  };

  const row = result.rows?.[0];
  const totalExercises = Number(row?.total_exercises ?? 0);
  const completedExercises = Number(row?.completed_exercises ?? 0);
  const progress =
    totalExercises > 0 ? Number(((completedExercises / totalExercises) * 100).toFixed(2)) : 0;

  await db.query(
    `UPDATE class_enrollments
     SET progreso_percent = $3
     WHERE class_id = $1 AND student_id = $2`,
    [classId, studentId, progress],
  );

  return progress;
}

async function countStudentsInClass(db: Queryable, classId: number): Promise<number> {
  const result = (await db.query(
    `SELECT COUNT(*)::int AS c FROM class_enrollments WHERE class_id = $1`,
    [classId],
  )) as { rows?: Array<{ c: number | string }> };
  return Number(result.rows?.[0]?.c ?? 0);
}

authRouter.post("/register/send-code", async (req, res) => {
  if (SKIP_EMAIL_VERIFICATION) {
    res.status(503).json({
      ok: false,
      message:
        "Verificacion por correo deshabilitada temporalmente. Usa el registro en un solo paso.",
    });
    return;
  }

  const { email: rawEmail } = req.body as { email?: unknown };

  if (typeof rawEmail !== "string") {
    res.status(400).json({ ok: false, message: "Correo requerido." });
    return;
  }

  if (!isMailConfigured()) {
    res.status(503).json({
      ok: false,
      message: mailConfigErrorMessage(),
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
    const detail = err instanceof Error ? err.message : "";
    if (
      detail.includes("verify a domain") ||
      detail.includes("testing emails to your own email")
    ) {
      res.status(503).json({
        ok: false,
        message:
          "Falta verificar un dominio en Resend (resend.com/domains) y usar MAIL_FROM con ese dominio. Con onboarding@resend.dev solo se puede probar enviando a la cuenta de Resend.",
      });
      return;
    }
    res.status(502).json({
      ok: false,
      message:
        "No se pudo enviar el correo. Revisa la configuracion o intenta mas tarde.",
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
    role: rawRole,
    verificationCode,
    registrationToken,
  } = req.body as Record<string, unknown>;

  if (SKIP_EMAIL_VERIFICATION) {
    if (
      typeof rawEmail !== "string" ||
      typeof nombre !== "string" ||
      typeof genero !== "string" ||
      typeof celular !== "string" ||
      typeof programa !== "string" ||
      typeof password !== "string"
    ) {
      res.status(400).json({
        ok: false,
        message: "Faltan campos o el formato no es valido.",
      });
      return;
    }
  } else {
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
  }

  const email = normalizeUdlaEmail(rawEmail);
  const role = parseRole(rawRole);

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

  if (rawRole !== undefined && (typeof rawRole !== "string" || !ROLES.has(rawRole))) {
    res.status(400).json({ ok: false, message: "Rol no valido." });
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

  const matriculaParsed = parseMatricula(
    (req.body as Record<string, unknown>).matricula,
  );
  if (matriculaParsed === "__invalid__") {
    res.status(400).json({
      ok: false,
      message:
        "La matricula es opcional; si la indicas, usa entre 4 y 32 caracteres (letras, numeros, guiones o guion bajo).",
    });
    return;
  }

  if (!SKIP_EMAIL_VERIFICATION) {
    const codeDigits = String(verificationCode).replace(/\D/g, "");
    if (codeDigits.length !== 6) {
      res.status(400).json({
        ok: false,
        message: "El codigo de verificacion debe tener 6 digitos.",
      });
      return;
    }

    try {
      const tokenCheck = await verifyRegistrationJwt(
        String(registrationToken).trim(),
        email,
        codeDigits,
      );
      if (!tokenCheck.ok) {
        res.status(400).json({ ok: false, message: tokenCheck.message });
        return;
      }
    } catch {
      res.status(400).json({
        ok: false,
        message: "Token de verificacion invalido o expirado.",
      });
      return;
    }
  }

  const client = await pool.connect();
  try {
    const { rows: dup } = await client.query<{ id: number }>(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [email],
    );
    if (dup.length > 0) {
      res.status(409).json({
        ok: false,
        message: "Ya existe una cuenta con ese correo.",
      });
      return;
    }

    if (matriculaParsed) {
      const { rows: matDup } = await client.query<{ id: number }>(
        "SELECT id FROM users WHERE matricula = $1 LIMIT 1",
        [matriculaParsed],
      );
      if (matDup.length > 0) {
        res.status(409).json({
          ok: false,
          message: "Ya existe una cuenta con esa matricula.",
        });
        return;
      }
    }

    await client.query("BEGIN");

    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO users (email, nombre, genero, celular, programa, semestre, role, password_hash, matricula)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        email,
        nombreTrim,
        genero,
        celularTrim,
        programaTrim,
        sem,
        role,
        passwordHash,
        matriculaParsed,
      ],
    );

    const userId = rows[0]?.id;
    if (typeof userId === "number") {
      await createNotification(
        client,
        userId,
        `Bienvenido, ${nombreTrim}`,
        role === "profesor"
          ? "Tu panel ya permite crear clases, matricular estudiantes y publicar ejercicios."
          : "Tu panel ya muestra progreso, clases matriculadas y ejercicios pendientes.",
        "bienvenida",
      );
    }

    await client.query("COMMIT");
    res.status(201).json({
      ok: true,
      message: `Registro exitoso como ${getRoleLabel(role).toLowerCase()}.`,
      userId,
      role,
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code === "23505") {
      res.status(409).json({
        ok: false,
        message: "Ya existe una cuenta con ese correo o esa matricula.",
      });
      return;
    }
    const message = err instanceof Error ? err.message : "Error al registrar.";
    res.status(500).json({ ok: false, message });
  } finally {
    client.release();
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
      id: number | string;
      password_hash: string;
      nombre: string;
      email: string;
      role: string;
      matricula: string | null;
      coins_total: number | string;
      xp_total: number | string;
    }>(
      `SELECT id, password_hash, nombre, email, role, matricula, coins_total, xp_total
       FROM users WHERE email = $1 LIMIT 1`,
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

    const userId = Number(row.id);
    if (!Number.isFinite(userId)) {
      res.status(500).json({ ok: false, message: "No se pudo leer el id del usuario." });
      return;
    }

    const normalizedRole = parseRole(row.role);
    const unread = await pool.query<{ total: number | string }>(
      `SELECT COUNT(*) AS total
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId],
    );

    res.json({
      ok: true,
      message: `Sesion iniciada con exito como ${getRoleLabel(normalizedRole).toLowerCase()}.`,
      userId,
      nombre: row.nombre ?? "",
      email: row.email ?? email,
      role: normalizedRole,
      matricula: row.matricula ?? null,
      coinsTotal: Number(row.coins_total ?? 0),
      xpTotal: Number(row.xp_total ?? 0),
      permissions: permissionsForRole(normalizedRole),
      unreadNotifications: Number(unread.rows[0]?.total ?? 0),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al iniciar sesion.";
    res.status(500).json({ ok: false, message });
  }
});

authRouter.get("/dashboard", async (req, res) => {
  const userId = normalizeUserId(req.query.userId);
  if (userId === null) {
    res.status(400).json({ ok: false, message: "userId es requerido." });
    return;
  }

  try {
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ ok: false, message: "Usuario no encontrado." });
      return;
    }

    const role = parseRole(user.role);
    const notificationsResult = await pool.query<{
      id: number | string;
      titulo: string;
      mensaje: string;
      tipo: string;
      is_read: boolean;
      created_at: string;
    }>(
      `SELECT id, titulo, mensaje, tipo, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 8`,
      [userId],
    );

    const unreadResult = await pool.query<{ total: number | string }>(
      `SELECT COUNT(*) AS total
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId],
    );

    if (role === "profesor") {
      const metricsResult = await pool.query<{
        total_classes: number | string;
        total_students: number | string;
        total_exercises: number | string;
      }>(
        `SELECT
           COUNT(DISTINCT c.id) AS total_classes,
           COUNT(DISTINCT ce.student_id) AS total_students,
           COUNT(DISTINCT e.id) AS total_exercises
         FROM classes c
         LEFT JOIN class_enrollments ce ON ce.class_id = c.id
         LEFT JOIN exercises e ON e.class_id = c.id
         WHERE c.professor_id = $1`,
        [userId],
      );

      const classesResult = await pool.query<{
        id: number | string;
        nombre: string;
        descripcion: string;
        cupo: number | string;
        visibilidad: string;
        total_students: number | string;
        avg_progress: number | string;
        total_exercises: number | string;
      }>(
        `SELECT
           c.id,
           c.nombre,
           c.descripcion,
           c.cupo,
           c.visibilidad,
           COUNT(DISTINCT ce.student_id) AS total_students,
           COALESCE(ROUND(AVG(ce.progreso_percent), 1), 0) AS avg_progress,
           COUNT(DISTINCT e.id) AS total_exercises
         FROM classes c
         LEFT JOIN class_enrollments ce ON ce.class_id = c.id
         LEFT JOIN exercises e ON e.class_id = c.id
         WHERE c.professor_id = $1
         GROUP BY c.id, c.nombre, c.descripcion, c.cupo, c.visibilidad, c.created_at
         ORDER BY c.created_at DESC
         LIMIT 6`,
        [userId],
      );

      const exercisesResult = await pool.query<{
        id: number | string;
        titulo: string;
        descripcion: string;
        dificultad: string;
        due_date: string | null;
        class_name: string;
        coins_reward: number | string;
        xp_reward: number | string;
      }>(
        `SELECT
           e.id,
           e.titulo,
           e.descripcion,
           e.dificultad,
           e.due_date,
           e.coins_reward,
           e.xp_reward,
           c.nombre AS class_name
         FROM exercises e
         INNER JOIN classes c ON c.id = e.class_id
         WHERE e.professor_id = $1
         ORDER BY e.created_at DESC
         LIMIT 8`,
        [userId],
      );

      const studentsResult = await pool.query<{
        id: number | string;
        nombre: string;
        email: string;
        class_name: string;
        progress: number | string;
      }>(
        `SELECT
           u.id,
           u.nombre,
           u.email,
           c.nombre AS class_name,
           ce.progreso_percent AS progress
         FROM class_enrollments ce
         INNER JOIN classes c ON c.id = ce.class_id
         INNER JOIN users u ON u.id = ce.student_id
         WHERE c.professor_id = $1
         ORDER BY ce.created_at DESC
         LIMIT 8`,
        [userId],
      );

      const metrics = metricsResult.rows[0] ?? {
        total_classes: 0,
        total_students: 0,
        total_exercises: 0,
      };

      const insights: string[] = [];
      if (Number(metrics.total_classes) === 0) {
        insights.push("Crea tu primera clase para empezar a organizar estudiantes y contenidos.");
      }
      if (Number(metrics.total_students) === 0) {
        insights.push("Matricula al menos un estudiante para activar seguimiento y notificaciones.");
      }
      if (Number(metrics.total_exercises) === 0) {
        insights.push("Publica un ejercicio para que tus estudiantes empiecen a registrar avance.");
      }
      if (insights.length === 0) {
        insights.push("Tu panel ya combina clases, ejercicios, matriculas y seguimiento de progreso.");
      }

      res.json({
        ok: true,
        user: {
          userId: Number(user.id),
          email: user.email,
          nombre: user.nombre,
          role,
          roleLabel: getRoleLabel(role),
          programa: user.programa,
          semestre: user.semestre,
          matricula: user.matricula ?? null,
          coinsTotal: Number(user.coins_total ?? 0),
          xpTotal: Number(user.xp_total ?? 0),
        },
        permissions: permissionsForRole(role),
        unreadNotifications: Number(unreadResult.rows[0]?.total ?? 0),
        notifications: notificationsResult.rows.map((notification) => ({
          id: Number(notification.id),
          title: notification.titulo,
          body: notification.mensaje,
          type: notification.tipo,
          isRead: notification.is_read,
          createdAt: notification.created_at,
        })),
        quickActions: professorQuickActions(),
        metrics: [
          {
            id: "classes",
            label: "Clases creadas",
            value: Number(metrics.total_classes ?? 0),
            accent: "cyan",
          },
          {
            id: "students",
            label: "Estudiantes activos",
            value: Number(metrics.total_students ?? 0),
            accent: "violet",
          },
          {
            id: "exercises",
            label: "Ejercicios publicados",
            value: Number(metrics.total_exercises ?? 0),
            accent: "amber",
          },
        ],
        professorData: {
          classes: classesResult.rows.map((row) => ({
            id: Number(row.id),
            nombre: row.nombre,
            descripcion: row.descripcion,
            cupo: Number(row.cupo),
            visibilidad: row.visibilidad,
            totalStudents: Number(row.total_students),
            averageProgress: Number(row.avg_progress),
            totalExercises: Number(row.total_exercises),
          })),
          exercises: exercisesResult.rows.map((row) => ({
            id: Number(row.id),
            titulo: row.titulo,
            descripcion: row.descripcion,
            dificultad: row.dificultad,
            dueDate: row.due_date,
            className: row.class_name,
            coinsReward: Number(row.coins_reward ?? 0),
            xpReward: Number(row.xp_reward ?? 0),
          })),
          students: studentsResult.rows.map((row) => ({
            id: Number(row.id),
            nombre: row.nombre,
            email: row.email,
            className: row.class_name,
            progress: Number(row.progress),
          })),
          insights,
        },
      });
      return;
    }

    const metricsResult = await pool.query<{
      enrolled_classes: number | string;
      avg_progress: number | string;
      pending_exercises: number | string;
      completed_exercises: number | string;
    }>(
      `SELECT
         COUNT(DISTINCT ce.class_id) AS enrolled_classes,
         COALESCE(ROUND(AVG(ce.progreso_percent), 1), 0) AS avg_progress,
         COUNT(DISTINCT CASE WHEN COALESCE(es.estado, 'pendiente') <> $2 THEN e.id END) AS pending_exercises,
         COUNT(DISTINCT CASE WHEN es.estado = $2 THEN es.id END) AS completed_exercises
       FROM class_enrollments ce
       LEFT JOIN exercises e ON e.class_id = ce.class_id
       LEFT JOIN exercise_submissions es
         ON es.exercise_id = e.id
        AND es.student_id = ce.student_id
       WHERE ce.student_id = $1`,
      [userId, SUBMISSION_STATUS_DONE],
    );

    const classesResult = await pool.query<{
      id: number | string;
      nombre: string;
      descripcion: string;
      professor_name: string;
      progress: number | string;
      total_exercises: number | string;
      completed_exercises: number | string;
    }>(
      `SELECT
         c.id,
         c.nombre,
         c.descripcion,
         p.nombre AS professor_name,
         ce.progreso_percent AS progress,
         COUNT(DISTINCT e.id) AS total_exercises,
         COUNT(DISTINCT CASE WHEN es.estado = $2 THEN es.id END) AS completed_exercises
       FROM class_enrollments ce
       INNER JOIN classes c ON c.id = ce.class_id
       INNER JOIN users p ON p.id = c.professor_id
       LEFT JOIN exercises e ON e.class_id = c.id
       LEFT JOIN exercise_submissions es
         ON es.exercise_id = e.id
        AND es.student_id = ce.student_id
       WHERE ce.student_id = $1
       GROUP BY c.id, c.nombre, c.descripcion, p.nombre, ce.progreso_percent, ce.created_at
       ORDER BY ce.created_at DESC
       LIMIT 8`,
      [userId, SUBMISSION_STATUS_DONE],
    );

    const exercisesResult = await pool.query<{
      id: number | string;
      titulo: string;
      descripcion: string;
      dificultad: string;
      due_date: string | null;
      class_name: string;
      status: string;
      grade: number | string | null;
    }>(
      `SELECT
         e.id,
         e.titulo,
         e.descripcion,
         e.dificultad,
         e.due_date,
         c.nombre AS class_name,
         COALESCE(es.estado, 'pendiente') AS status,
         es.nota AS grade
       FROM class_enrollments ce
       INNER JOIN classes c ON c.id = ce.class_id
       INNER JOIN exercises e ON e.class_id = c.id
       LEFT JOIN exercise_submissions es
         ON es.exercise_id = e.id
        AND es.student_id = ce.student_id
       WHERE ce.student_id = $1
       ORDER BY e.due_date NULLS LAST, e.created_at DESC
       LIMIT 10`,
      [userId],
    );

    const publicClassesResult = await pool.query<{
      id: number | string;
      nombre: string;
      descripcion: string;
      professor_name: string;
      cupo: number | string;
      enrolled: number | string;
    }>(
      `SELECT
         c.id,
         c.nombre,
         c.descripcion,
         p.nombre AS professor_name,
         c.cupo,
         (SELECT COUNT(*)::int FROM class_enrollments z WHERE z.class_id = c.id) AS enrolled
       FROM classes c
       INNER JOIN users p ON p.id = c.professor_id
       WHERE c.visibilidad = 'publica'
         AND NOT EXISTS (
           SELECT 1 FROM class_enrollments x
           WHERE x.class_id = c.id AND x.student_id = $1
         )
       ORDER BY c.created_at DESC
       LIMIT 8`,
      [userId],
    );

    const metrics = metricsResult.rows[0] ?? {
      enrolled_classes: 0,
      avg_progress: 0,
      pending_exercises: 0,
      completed_exercises: 0,
    };

    const insights: string[] = [];
    if (Number(metrics.enrolled_classes) === 0) {
      insights.push("Todavia no tienes clases matriculadas. Un profesor puede agregarte por correo.");
    }
    if (Number(metrics.pending_exercises) > 0) {
      insights.push("Marca como completados tus ejercicios terminados para actualizar el progreso.");
    }
    if (insights.length === 0) {
      insights.push("Tu panel ya centraliza clases, tareas, progreso y notificaciones.");
    }

    res.json({
      ok: true,
      user: {
        userId: Number(user.id),
        email: user.email,
        nombre: user.nombre,
        role,
        roleLabel: getRoleLabel(role),
        programa: user.programa,
        semestre: user.semestre,
        matricula: user.matricula ?? null,
        coinsTotal: Number(user.coins_total ?? 0),
        xpTotal: Number(user.xp_total ?? 0),
      },
      permissions: permissionsForRole(role),
      unreadNotifications: Number(unreadResult.rows[0]?.total ?? 0),
      notifications: notificationsResult.rows.map((notification) => ({
        id: Number(notification.id),
        title: notification.titulo,
        body: notification.mensaje,
        type: notification.tipo,
        isRead: notification.is_read,
        createdAt: notification.created_at,
      })),
      quickActions: studentQuickActions(),
      metrics: [
        {
          id: "classes",
          label: "Clases matriculadas",
          value: Number(metrics.enrolled_classes ?? 0),
          accent: "cyan",
        },
        {
          id: "progress",
          label: "Progreso promedio",
          value: `${Number(metrics.avg_progress ?? 0)}%`,
          accent: "violet",
        },
        {
          id: "pending",
          label: "Ejercicios pendientes",
          value: Number(metrics.pending_exercises ?? 0),
          accent: "amber",
        },
        {
          id: "coins",
          label: "Monedas",
          value: Number(user.coins_total ?? 0),
          accent: "amber",
        },
        {
          id: "xp",
          label: "Experiencia (XP)",
          value: Number(user.xp_total ?? 0),
          accent: "violet",
        },
      ],
      studentData: {
        classes: classesResult.rows.map((row) => ({
          id: Number(row.id),
          nombre: row.nombre,
          descripcion: row.descripcion,
          profesor: row.professor_name,
          progress: Number(row.progress),
          totalExercises: Number(row.total_exercises),
          completedExercises: Number(row.completed_exercises),
        })),
        exercises: exercisesResult.rows.map((row) => ({
          id: Number(row.id),
          titulo: row.titulo,
          descripcion: row.descripcion,
          dificultad: row.dificultad,
          dueDate: row.due_date,
          className: row.class_name,
          status: row.status,
          grade: row.grade === null ? null : Number(row.grade),
        })),
        publicClasses: publicClassesResult.rows.map((row) => ({
          id: Number(row.id),
          nombre: row.nombre,
          descripcion: row.descripcion,
          profesor: row.professor_name,
          cupo: Number(row.cupo),
          enrolled: Number(row.enrolled),
        })),
        insights,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al cargar el panel.";
    res.status(500).json({ ok: false, message });
  }
});

authRouter.post("/classes", async (req, res) => {
  const { professorId, nombre, descripcion, cupo, visibilidad: rawVis } = req.body as Record<
    string,
    unknown
  >;
  const normalizedProfessorId = normalizeUserId(professorId);
  const className = typeof nombre === "string" ? nombre.trim() : "";
  const classDescription = typeof descripcion === "string" ? descripcion.trim() : "";
  const capacity = Number(cupo ?? 30);
  const visibilidad = normalizeVisibilidad(rawVis);

  if (normalizedProfessorId === null) {
    res.status(400).json({ ok: false, message: "professorId es requerido." });
    return;
  }
  if (!className) {
    res.status(400).json({ ok: false, message: "El nombre de la clase es obligatorio." });
    return;
  }
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
    res.status(400).json({ ok: false, message: "El cupo debe estar entre 1 y 500." });
    return;
  }

  try {
    const professor = await getUserById(normalizedProfessorId);
    if (!professor || parseRole(professor.role) !== "profesor") {
      res.status(403).json({ ok: false, message: "Solo un profesor puede crear clases." });
      return;
    }

    const { rows } = await pool.query<{ id: number | string; nombre: string }>(
      `INSERT INTO classes (professor_id, nombre, descripcion, cupo, visibilidad)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre`,
      [normalizedProfessorId, className, classDescription, capacity, visibilidad],
    );

    const createdClass = rows[0];
    await createNotification(
      pool,
      normalizedProfessorId,
      "Clase creada",
      `La clase "${className}" ya aparece en tu panel y esta lista para matriculas.`,
      "class_created",
    );

    res.status(201).json({
      ok: true,
      message: "Clase creada correctamente.",
      classItem: createdClass
        ? { id: Number(createdClass.id), nombre: createdClass.nombre }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al crear la clase.";
    res.status(500).json({ ok: false, message });
  }
});

authRouter.post("/classes/:classId/enroll", async (req, res) => {
  const classId = normalizeUserId(req.params.classId);
  const { professorId, studentEmail: rawStudentEmail, studentMatricula: rawMatricula } =
    req.body as Record<string, unknown>;
  const normalizedProfessorId = normalizeUserId(professorId);

  if (classId === null || normalizedProfessorId === null) {
    res.status(400).json({ ok: false, message: "Datos incompletos para matricular." });
    return;
  }

  const emailTrim =
    typeof rawStudentEmail === "string" && rawStudentEmail.trim()
      ? normalizeUdlaEmail(rawStudentEmail)
      : "";
  const matriculaParsed =
    rawMatricula !== undefined && rawMatricula !== null && String(rawMatricula).trim()
      ? parseMatricula(rawMatricula)
      : null;

  if (matriculaParsed === "__invalid__") {
    res.status(400).json({
      ok: false,
      message: "La matricula no es valida (4 a 32 caracteres alfanumericos).",
    });
    return;
  }

  if (!emailTrim && !matriculaParsed) {
    res.status(400).json({
      ok: false,
      message: "Indica el correo institucional del estudiante o su matricula.",
    });
    return;
  }

  if (emailTrim && matriculaParsed) {
    res.status(400).json({
      ok: false,
      message: "Usa solo correo o solo matricula del estudiante, no ambos.",
    });
    return;
  }

  if (emailTrim && !isUdlaEmail(emailTrim)) {
    res.status(400).json({
      ok: false,
      message: "El correo del estudiante debe ser institucional (@udla.edu.co).",
    });
    return;
  }

  const client = await pool.connect();
  try {
    const professor = await getUserById(normalizedProfessorId);
    if (!professor || parseRole(professor.role) !== "profesor") {
      res.status(403).json({ ok: false, message: "Solo un profesor puede matricular estudiantes." });
      return;
    }

    const classResult = await client.query<{
      id: number | string;
      nombre: string;
      cupo: number | string;
    }>(
      `SELECT id, nombre, cupo
       FROM classes
       WHERE id = $1 AND professor_id = $2
       LIMIT 1`,
      [classId, normalizedProfessorId],
    );
    const classRow = classResult.rows[0];
    if (!classRow) {
      res.status(404).json({ ok: false, message: "La clase no existe o no te pertenece." });
      return;
    }

    const enrolledCount = await countStudentsInClass(client, classId);
    if (enrolledCount >= Number(classRow.cupo ?? 0)) {
      res.status(400).json({
        ok: false,
        message: "La clase alcanzo el cupo maximo.",
      });
      return;
    }

    const studentResult = await client.query<{
      id: number | string;
      nombre: string;
      role: string;
    }>(
      emailTrim
        ? `SELECT id, nombre, role
           FROM users
           WHERE email = $1
           LIMIT 1`
        : `SELECT id, nombre, role
           FROM users
           WHERE matricula = $1
           LIMIT 1`,
      emailTrim ? [emailTrim] : [matriculaParsed],
    );
    const student = studentResult.rows[0];
    if (!student) {
      res.status(404).json({
        ok: false,
        message: emailTrim
          ? "No existe un estudiante registrado con ese correo."
          : "No existe un estudiante registrado con esa matricula.",
      });
      return;
    }
    if (parseRole(student.role) !== "estudiante") {
      res.status(400).json({
        ok: false,
        message: "Solo puedes matricular usuarios con rol estudiante.",
      });
      return;
    }

    await client.query("BEGIN");
    await client.query(
      `INSERT INTO class_enrollments (class_id, student_id)
       VALUES ($1, $2)`,
      [classId, Number(student.id)],
    );

    const exercisesResult = await client.query<{ id: number | string }>(
      `SELECT id
       FROM exercises
       WHERE class_id = $1`,
      [classId],
    );
    for (const exercise of exercisesResult.rows) {
      await client.query(
        `INSERT INTO exercise_submissions (exercise_id, student_id)
         VALUES ($1, $2)
         ON CONFLICT (exercise_id, student_id) DO NOTHING`,
        [Number(exercise.id), Number(student.id)],
      );
    }

    await createNotification(
      client,
      Number(student.id),
      "Nueva clase matriculada",
      `Has sido matriculado en "${classRow.nombre}". Ya puedes revisar tu progreso y ejercicios.`,
      "enrollment",
    );
    await createNotification(
      client,
      normalizedProfessorId,
      "Estudiante matriculado",
      `${student.nombre} fue agregado correctamente a "${classRow.nombre}".`,
      "enrollment",
    );
    await client.query("COMMIT");

    res.status(201).json({
      ok: true,
      message: `Estudiante matriculado en ${classRow.nombre}.`,
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code === "23505") {
      res.status(409).json({
        ok: false,
        message: "Ese estudiante ya esta matriculado en la clase.",
      });
      return;
    }
    const message = err instanceof Error ? err.message : "Error al matricular estudiante.";
    res.status(500).json({ ok: false, message });
  } finally {
    client.release();
  }
});

authRouter.post("/classes/:classId/join-public", async (req, res) => {
  const classId = normalizeUserId(req.params.classId);
  const normalizedStudentId = normalizeUserId(
    (req.body as Record<string, unknown>).studentId,
  );

  if (classId === null || normalizedStudentId === null) {
    res.status(400).json({ ok: false, message: "classId y studentId son requeridos." });
    return;
  }

  const client = await pool.connect();
  try {
    const student = await getUserById(normalizedStudentId);
    if (!student || parseRole(student.role) !== "estudiante") {
      res.status(403).json({
        ok: false,
        message: "Solo estudiantes pueden unirse a una clase publica.",
      });
      return;
    }

    const classResult = await client.query<{
      id: number | string;
      nombre: string;
      cupo: number | string;
      visibilidad: string;
      professor_id: number | string;
    }>(
      `SELECT id, nombre, cupo, visibilidad, professor_id
       FROM classes
       WHERE id = $1
       LIMIT 1`,
      [classId],
    );
    const classRow = classResult.rows[0];
    if (!classRow) {
      res.status(404).json({ ok: false, message: "La clase no existe." });
      return;
    }
    if (classRow.visibilidad !== "publica") {
      res.status(403).json({
        ok: false,
        message: "Esta clase es privada; pide al profesor que te matricule.",
      });
      return;
    }

    const enrolledCount = await countStudentsInClass(client, classId);
    if (enrolledCount >= Number(classRow.cupo ?? 0)) {
      res.status(400).json({
        ok: false,
        message: "La clase alcanzo el cupo maximo.",
      });
      return;
    }

    const already = await client.query<{ one: number }>(
      `SELECT 1 AS one
       FROM class_enrollments
       WHERE class_id = $1 AND student_id = $2
       LIMIT 1`,
      [classId, normalizedStudentId],
    );
    if (already.rows.length > 0) {
      res.status(409).json({
        ok: false,
        message: "Ya estas matriculado en esta clase.",
      });
      return;
    }

    await client.query("BEGIN");
    await client.query(
      `INSERT INTO class_enrollments (class_id, student_id)
       VALUES ($1, $2)`,
      [classId, normalizedStudentId],
    );

    const exercisesResult = await client.query<{ id: number | string }>(
      `SELECT id
       FROM exercises
       WHERE class_id = $1`,
      [classId],
    );
    for (const exercise of exercisesResult.rows) {
      await client.query(
        `INSERT INTO exercise_submissions (exercise_id, student_id)
         VALUES ($1, $2)
         ON CONFLICT (exercise_id, student_id) DO NOTHING`,
        [Number(exercise.id), normalizedStudentId],
      );
    }

    await createNotification(
      client,
      normalizedStudentId,
      "Te uniste a una clase",
      `Ahora participas en "${classRow.nombre}". Ya puedes ver ejercicios y progreso.`,
      "enrollment",
    );
    await createNotification(
      client,
      Number(classRow.professor_id),
      "Nuevo estudiante en clase publica",
      `${student.nombre} se unio a "${classRow.nombre}".`,
      "enrollment",
    );
    await client.query("COMMIT");

    res.status(201).json({
      ok: true,
      message: `Te uniste a ${classRow.nombre}.`,
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code === "23505") {
      res.status(409).json({
        ok: false,
        message: "Ya estas matriculado en esta clase.",
      });
      return;
    }
    const message = err instanceof Error ? err.message : "Error al unirse a la clase.";
    res.status(500).json({ ok: false, message });
  } finally {
    client.release();
  }
});

authRouter.post("/exercises", async (req, res) => {
  const {
    professorId,
    classId,
    titulo,
    descripcion,
    difficulty,
    dueDate,
    coinsReward: rawCoins,
    xpReward: rawXp,
  } = req.body as Record<string, unknown>;
  const normalizedProfessorId = normalizeUserId(professorId);
  const normalizedClassId = normalizeUserId(classId);
  const title = typeof titulo === "string" ? titulo.trim() : "";
  const description = typeof descripcion === "string" ? descripcion.trim() : "";
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const normalizedDueDate = normalizeDueDate(dueDate);
  const coinsReward = parseNonNegativeInt(rawCoins, 0);
  const xpReward = parseNonNegativeInt(rawXp, 0);

  if (normalizedProfessorId === null || normalizedClassId === null) {
    res.status(400).json({ ok: false, message: "professorId y classId son requeridos." });
    return;
  }
  if (!title) {
    res.status(400).json({ ok: false, message: "El titulo del ejercicio es obligatorio." });
    return;
  }
  if (typeof dueDate === "string" && dueDate.trim() && !normalizedDueDate) {
    res.status(400).json({ ok: false, message: "La fecha limite no es valida." });
    return;
  }

  const client = await pool.connect();
  try {
    const professor = await getUserById(normalizedProfessorId);
    if (!professor || parseRole(professor.role) !== "profesor") {
      res.status(403).json({ ok: false, message: "Solo un profesor puede crear ejercicios." });
      return;
    }

    const classResult = await client.query<{ nombre: string }>(
      `SELECT nombre
       FROM classes
       WHERE id = $1 AND professor_id = $2
       LIMIT 1`,
      [normalizedClassId, normalizedProfessorId],
    );
    const classRow = classResult.rows[0];
    if (!classRow) {
      res.status(404).json({ ok: false, message: "La clase no existe o no te pertenece." });
      return;
    }

    await client.query("BEGIN");
    const exerciseResult = await client.query<{ id: number | string }>(
      `INSERT INTO exercises (class_id, professor_id, titulo, descripcion, dificultad, due_date, coins_reward, xp_reward)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        normalizedClassId,
        normalizedProfessorId,
        title,
        description,
        normalizedDifficulty,
        normalizedDueDate,
        coinsReward,
        xpReward,
      ],
    );
    const exerciseId = Number(exerciseResult.rows[0]?.id ?? 0);

    const studentsResult = await client.query<{ id: number | string }>(
      `SELECT student_id AS id
       FROM class_enrollments
       WHERE class_id = $1`,
      [normalizedClassId],
    );

    for (const student of studentsResult.rows) {
      const studentId = Number(student.id);
      await client.query(
        `INSERT INTO exercise_submissions (exercise_id, student_id)
         VALUES ($1, $2)
         ON CONFLICT (exercise_id, student_id) DO NOTHING`,
        [exerciseId, studentId],
      );
      await createNotification(
        client,
        studentId,
        "Nuevo ejercicio disponible",
        `Se publico "${title}" en la clase "${classRow.nombre}".`,
        "exercise_created",
      );
      await recomputeEnrollmentProgress(client, normalizedClassId, studentId);
    }

    await createNotification(
      client,
      normalizedProfessorId,
      "Ejercicio publicado",
      `El ejercicio "${title}" ya esta visible para los estudiantes de "${classRow.nombre}".`,
      "exercise_created",
    );
    await client.query("COMMIT");

    res.status(201).json({
      ok: true,
      message: "Ejercicio creado correctamente.",
      exerciseId,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    const message = err instanceof Error ? err.message : "Error al crear el ejercicio.";
    res.status(500).json({ ok: false, message });
  } finally {
    client.release();
  }
});

authRouter.post("/exercises/:exerciseId/complete", async (req, res) => {
  const exerciseId = normalizeUserId(req.params.exerciseId);
  const { studentId } = req.body as Record<string, unknown>;
  const normalizedStudentId = normalizeUserId(studentId);

  if (exerciseId === null || normalizedStudentId === null) {
    res.status(400).json({ ok: false, message: "exerciseId y studentId son requeridos." });
    return;
  }

  const client = await pool.connect();
  try {
    const student = await getUserById(normalizedStudentId);
    if (!student || parseRole(student.role) !== "estudiante") {
      res.status(403).json({ ok: false, message: "Solo un estudiante puede completar ejercicios." });
      return;
    }

    const exerciseResult = await client.query<{
      exercise_id: number | string;
      class_id: number | string;
      title: string;
      class_name: string;
      professor_id: number | string;
      coins_reward: number | string;
      xp_reward: number | string;
    }>(
      `SELECT
         e.id AS exercise_id,
         e.class_id,
         e.titulo AS title,
         c.nombre AS class_name,
         c.professor_id,
         e.coins_reward,
         e.xp_reward
       FROM exercises e
       INNER JOIN classes c ON c.id = e.class_id
       INNER JOIN class_enrollments ce
         ON ce.class_id = c.id
        AND ce.student_id = $2
       WHERE e.id = $1
       LIMIT 1`,
      [exerciseId, normalizedStudentId],
    );
    const exercise = exerciseResult.rows[0];
    if (!exercise) {
      res.status(404).json({
        ok: false,
        message: "El ejercicio no existe o no pertenece a una de tus clases.",
      });
      return;
    }

    const coinsReward = Number(exercise.coins_reward ?? 0);
    const xpReward = Number(exercise.xp_reward ?? 0);

    await client.query("BEGIN");

    const prevRow = await client.query<{ estado: string | null }>(
      `SELECT es.estado
       FROM exercises e
       LEFT JOIN exercise_submissions es
         ON es.exercise_id = e.id AND es.student_id = $2
       WHERE e.id = $1
       LIMIT 1`,
      [exerciseId, normalizedStudentId],
    );
    const prevEstado = prevRow.rows[0]?.estado ?? "pendiente";
    const wasDone = prevEstado === SUBMISSION_STATUS_DONE;

    await client.query(
      `INSERT INTO exercise_submissions (exercise_id, student_id, estado, submitted_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (exercise_id, student_id)
       DO UPDATE SET estado = $3, submitted_at = NOW(), updated_at = NOW()`,
      [exerciseId, normalizedStudentId, SUBMISSION_STATUS_DONE],
    );

    let coinsEarned = 0;
    let xpEarned = 0;
    if (!wasDone && (coinsReward > 0 || xpReward > 0)) {
      await client.query(
        `UPDATE users
         SET coins_total = coins_total + $2, xp_total = xp_total + $3
         WHERE id = $1`,
        [normalizedStudentId, coinsReward, xpReward],
      );
      coinsEarned = coinsReward;
      xpEarned = xpReward;
    }

    const progress = await recomputeEnrollmentProgress(
      client,
      Number(exercise.class_id),
      normalizedStudentId,
    );

    const totalsResult = await client.query<{
      coins_total: number | string;
      xp_total: number | string;
    }>(`SELECT coins_total, xp_total FROM users WHERE id = $1 LIMIT 1`, [normalizedStudentId]);
    const coinsTotal = Number(totalsResult.rows[0]?.coins_total ?? 0);
    const xpTotal = Number(totalsResult.rows[0]?.xp_total ?? 0);

    const rewardNote =
      coinsEarned > 0 || xpEarned > 0
        ? ` Ganaste ${coinsEarned} monedas y ${xpEarned} XP.`
        : "";
    await createNotification(
      client,
      normalizedStudentId,
      "Ejercicio completado",
      `Marcaste "${exercise.title}" como completado en "${exercise.class_name}".${rewardNote}`,
      "exercise_completed",
    );
    await createNotification(
      client,
      Number(exercise.professor_id),
      "Nuevo avance del estudiante",
      `${student.nombre} completo "${exercise.title}" y actualizo su progreso a ${progress}%.`,
      "progress_update",
    );

    await client.query("COMMIT");
    res.json({
      ok: true,
      message: "Ejercicio marcado como completado.",
      progress,
      coinsEarned,
      xpEarned,
      coinsTotal,
      xpTotal,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    const message = err instanceof Error ? err.message : "Error al actualizar el ejercicio.";
    res.status(500).json({ ok: false, message });
  } finally {
    client.release();
  }
});

authRouter.post("/notifications/:notificationId/read", async (req, res) => {
  const notificationId = normalizeUserId(req.params.notificationId);
  const { userId } = req.body as Record<string, unknown>;
  const normalizedUserId = normalizeUserId(userId);

  if (notificationId === null || normalizedUserId === null) {
    res.status(400).json({ ok: false, message: "notificationId y userId son requeridos." });
    return;
  }

  try {
    const result = await pool.query<{ id: number | string }>(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [notificationId, normalizedUserId],
    );
    if (result.rows.length === 0) {
      res.status(404).json({ ok: false, message: "Notificacion no encontrada." });
      return;
    }
    res.json({ ok: true, message: "Notificacion actualizada." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al actualizar notificacion.";
    res.status(500).json({ ok: false, message });
  }
});
