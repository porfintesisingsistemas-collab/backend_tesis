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

export const dbTarget = safeDbLogInfo();

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

export async function initializeAppSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        nombre VARCHAR(150) NOT NULL,
        genero TEXT NOT NULL CHECK (genero IN ('masculino', 'femenino', 'otro', 'prefiero_no_decir')),
        celular VARCHAR(20) NOT NULL,
        programa VARCHAR(200) NOT NULL,
        semestre SMALLINT NOT NULL CHECK (semestre BETWEEN 1 AND 20),
        role VARCHAR(20) NOT NULL DEFAULT 'estudiante',
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_users_email UNIQUE (email),
        CONSTRAINT chk_users_email_udla CHECK (
          lower(email) ~ '^[a-z0-9._%+-]+@udla\\.edu\\.co$'
        )
      )
    `);
    await client.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'estudiante'",
    );
    await client.query(
      "UPDATE users SET role = 'estudiante' WHERE role IS NULL OR btrim(role) = ''",
    );
    await client.query("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'estudiante'");
    await client.query("ALTER TABLE users ALTER COLUMN role SET NOT NULL");

    await client.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id BIGSERIAL PRIMARY KEY,
        professor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        nombre VARCHAR(160) NOT NULL,
        descripcion TEXT NOT NULL DEFAULT '',
        cupo INTEGER NOT NULL DEFAULT 30 CHECK (cupo BETWEEN 1 AND 500),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS class_enrollments (
        id BIGSERIAL PRIMARY KEY,
        class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        estado VARCHAR(20) NOT NULL DEFAULT 'activa',
        progreso_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (progreso_percent BETWEEN 0 AND 100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_class_enrollments UNIQUE (class_id, student_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS exercises (
        id BIGSERIAL PRIMARY KEY,
        class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        professor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        titulo VARCHAR(180) NOT NULL,
        descripcion TEXT NOT NULL DEFAULT '',
        dificultad VARCHAR(20) NOT NULL DEFAULT 'media',
        due_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS exercise_submissions (
        id BIGSERIAL PRIMARY KEY,
        exercise_id BIGINT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
        nota NUMERIC(5, 2),
        submitted_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uk_exercise_submissions UNIQUE (exercise_id, student_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        titulo VARCHAR(180) NOT NULL,
        mensaje TEXT NOT NULL,
        tipo VARCHAR(40) NOT NULL DEFAULT 'general',
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_classes_professor_id ON classes(professor_id)",
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON class_enrollments(class_id)",
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON class_enrollments(student_id)",
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_exercises_class_id ON exercises(class_id)",
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_exercise_submissions_student_id ON exercise_submissions(student_id)",
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read, created_at DESC)",
    );

    await client.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS matricula VARCHAR(64)",
    );
    await client.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS uk_users_matricula ON users (matricula) WHERE matricula IS NOT NULL",
    );
    await client.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS coins_total INTEGER NOT NULL DEFAULT 0",
    );
    await client.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS xp_total INTEGER NOT NULL DEFAULT 0",
    );
    await client.query(
      "ALTER TABLE classes ADD COLUMN IF NOT EXISTS visibilidad VARCHAR(20) NOT NULL DEFAULT 'publica'",
    );
    await client.query(
      "ALTER TABLE exercises ADD COLUMN IF NOT EXISTS coins_reward INTEGER NOT NULL DEFAULT 0",
    );
    await client.query(
      "ALTER TABLE exercises ADD COLUMN IF NOT EXISTS xp_reward INTEGER NOT NULL DEFAULT 0",
    );
    await client.query(
      "ALTER TABLE exercises ADD COLUMN IF NOT EXISTS review_topic VARCHAR(180) NOT NULL DEFAULT ''",
    );
    await client.query(
      "ALTER TABLE exercises ADD COLUMN IF NOT EXISTS graph_latex TEXT NOT NULL DEFAULT ''",
    );
    await client.query(
      "ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_coins_nonnegative",
    );
    await client.query(
      "ALTER TABLE users ADD CONSTRAINT chk_users_coins_nonnegative CHECK (coins_total >= 0)",
    );
    await client.query(
      "ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_xp_nonnegative",
    );
    await client.query(
      "ALTER TABLE users ADD CONSTRAINT chk_users_xp_nonnegative CHECK (xp_total >= 0)",
    );
    await client.query(
      "ALTER TABLE classes DROP CONSTRAINT IF EXISTS chk_classes_visibilidad",
    );
    await client.query(
      "ALTER TABLE classes ADD CONSTRAINT chk_classes_visibilidad CHECK (visibilidad IN ('publica', 'privada'))",
    );
    await client.query(
      "ALTER TABLE exercises DROP CONSTRAINT IF EXISTS chk_exercises_coins_reward",
    );
    await client.query(
      "ALTER TABLE exercises ADD CONSTRAINT chk_exercises_coins_reward CHECK (coins_reward >= 0)",
    );
    await client.query(
      "ALTER TABLE exercises DROP CONSTRAINT IF EXISTS chk_exercises_xp_reward",
    );
    await client.query(
      "ALTER TABLE exercises ADD CONSTRAINT chk_exercises_xp_reward CHECK (xp_reward >= 0)",
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
