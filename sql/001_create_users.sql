-- Ejecutar en Supabase: SQL Editor (el proyecto ya tiene la base `postgres`).
-- No uses CREATE DATABASE aqui; en Supabase la BD viene creada.

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
    lower(email) ~ '^[a-z0-9._%+-]+@udla\.edu\.co$'
  )
);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'estudiante';

UPDATE users
SET role = 'estudiante'
WHERE role IS NULL OR btrim(role) = '';

ALTER TABLE users
ALTER COLUMN role SET DEFAULT 'estudiante';

ALTER TABLE users
ALTER COLUMN role SET NOT NULL;

CREATE TABLE IF NOT EXISTS classes (
  id BIGSERIAL PRIMARY KEY,
  professor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nombre VARCHAR(160) NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  cupo INTEGER NOT NULL DEFAULT 30 CHECK (cupo BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_enrollments (
  id BIGSERIAL PRIMARY KEY,
  class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  estado VARCHAR(20) NOT NULL DEFAULT 'activa',
  progreso_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (progreso_percent BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_class_enrollments UNIQUE (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS exercises (
  id BIGSERIAL PRIMARY KEY,
  class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  professor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo VARCHAR(180) NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  dificultad VARCHAR(20) NOT NULL DEFAULT 'media',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercise_submissions (
  id BIGSERIAL PRIMARY KEY,
  exercise_id BIGINT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  nota NUMERIC(5, 2),
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_exercise_submissions UNIQUE (exercise_id, student_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  titulo VARCHAR(180) NOT NULL,
  mensaje TEXT NOT NULL,
  tipo VARCHAR(40) NOT NULL DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_professor_id ON classes(professor_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_exercises_class_id ON exercises(class_id);
CREATE INDEX IF NOT EXISTS idx_exercise_submissions_student_id ON exercise_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read, created_at DESC);

-- Campos anadidos para matricula, monedas/XP, visibilidad de clase y recompensas por ejercicio (idempotente)
ALTER TABLE users ADD COLUMN IF NOT EXISTS matricula VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS uk_users_matricula ON users (matricula) WHERE matricula IS NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS coins_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS visibilidad VARCHAR(20) NOT NULL DEFAULT 'publica';
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS coins_reward INTEGER NOT NULL DEFAULT 0;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS xp_reward INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_coins_nonnegative;
ALTER TABLE users ADD CONSTRAINT chk_users_coins_nonnegative CHECK (coins_total >= 0);
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_xp_nonnegative;
ALTER TABLE users ADD CONSTRAINT chk_users_xp_nonnegative CHECK (xp_total >= 0);
ALTER TABLE classes DROP CONSTRAINT IF EXISTS chk_classes_visibilidad;
ALTER TABLE classes ADD CONSTRAINT chk_classes_visibilidad CHECK (visibilidad IN ('publica', 'privada'));
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS chk_exercises_coins_reward;
ALTER TABLE exercises ADD CONSTRAINT chk_exercises_coins_reward CHECK (coins_reward >= 0);
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS chk_exercises_xp_reward;
ALTER TABLE exercises ADD CONSTRAINT chk_exercises_xp_reward CHECK (xp_reward >= 0);
