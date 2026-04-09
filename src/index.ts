import "dotenv/config";
import cors from "cors";
import express from "express";
import { authRouter } from "./authRoutes.js";
import { dbTarget, initializeAppSchema, pingDb, pool } from "./db.js";
import { assertRegistrationJwtConfigured } from "./regJwt.js";

const app = express();
const port = Number(process.env.PORT ?? 3000);

const corsOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite tools sin Origin (curl, health checks, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }
      // Si no hay whitelist configurada, permite todos (comportamiento previo).
      if (corsOrigins.length === 0) {
        callback(null, true);
        return;
      }
      if (corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS bloqueado para origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.options("*", cors());
app.use(express.json());
app.use("/auth", authRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/db/ping", async (_req, res) => {
  try {
    await pingDb();
    res.json({ ok: true, message: "PostgreSQL responde correctamente" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    res.status(503).json({ ok: false, message });
  }
});

app.get("/db/version", async (_req, res) => {
  try {
    const { rows } = await pool.query<{ version: string }>(
      "SELECT version() AS version",
    );
    const row = rows[0];
    res.json({ ok: true, version: row?.version });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    res.status(503).json({ ok: false, message });
  }
});

async function bootstrap(): Promise<void> {
  try {
    assertRegistrationJwtConfigured();
    console.log("[JWT] JWT_REGISTRATION_SECRET lista para codigos de registro.");
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[JWT] ${detail}`);
  }

  try {
    await pingDb();
    if (dbTarget) {
      console.log(
        `[PostgreSQL] Conexion correcta -> ${dbTarget.host}:${dbTarget.port}, usuario "${dbTarget.user}", base "${dbTarget.database}"`,
      );
    } else {
      console.log("[PostgreSQL] Conexion correcta (DATABASE_URL).");
    }
    await initializeAppSchema();
    console.log("[PostgreSQL] Esquema de roles, clases, ejercicios y notificaciones listo.");
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[PostgreSQL] No se pudo conectar: ${detail}`);
    if (detail.includes("Tenant or user not found")) {
      console.error(
        "[PostgreSQL] El host del Session pooler no coincide con la region de tu proyecto. " +
          "En Supabase: Connect > Session pooler > copia la URI completa y pegala en DATABASE_URL " +
          "(una linea, sin duplicar DATABASE_URL=). " +
          "O revisa Settings > General la region del proyecto y el host aws-0-REGION en esa misma pantalla Connect.",
      );
    }
  }

  app.listen(port, () => {
    console.log(`API en http://localhost:${port}`);
  });
}

void bootstrap();
