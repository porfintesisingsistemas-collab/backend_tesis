import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn(
    "[DB] DATABASE_URL no esta definida. Configura la cadena de conexion de Supabase (Settings > Database).",
  );
}

function safeDbLogInfo(): { host: string; port: number; database: string; user: string } | null {
  if (!connectionString) {
    return null;
  }
  try {
    const u = new URL(connectionString);
    return {
      host: u.hostname,
      port: Number(u.port || 5432),
      database: u.pathname.replace(/^\//, "") || "postgres",
      user: u.username || "",
    };
  } catch {
    return null;
  }
}

/** Para logs (sin contrasena). */
export const dbTarget = safeDbLogInfo();

/**
 * Supabase Session pooler usa usuario `postgres.<project_ref>`. Pasar la URI cruda a libpq
 * en Windows suele autenticar como `postgres` (falla la contrasena). Por eso desglosamos la URL en Node.
 */
function poolConfig(): pg.PoolConfig {
  if (!connectionString) {
    return { max: 10, idleTimeoutMillis: 30_000 };
  }
  try {
    const u = new URL(connectionString);
    const isLocal = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    return {
      user: u.username,
      password: u.password,
      host: u.hostname,
      port: Number(u.port || 5432),
      database: u.pathname.replace(/^\//, "") || "postgres",
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
    };
  } catch {
    return {
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      ssl:
        connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
          ? undefined
          : { rejectUnauthorized: false },
    };
  }
}

export const pool = new pg.Pool(poolConfig());

export async function pingDb(): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    return true;
  } finally {
    client.release();
  }
}
