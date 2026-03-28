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
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_users_email UNIQUE (email),
  CONSTRAINT chk_users_email_udla CHECK (
    lower(email) ~ '^[a-z0-9._%+-]+@udla\.edu\.co$'
  )
);
