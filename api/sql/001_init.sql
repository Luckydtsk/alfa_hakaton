CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  login TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('client', 'bank')),
  full_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users (id),
  name TEXT NOT NULL,
  inn TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies (id),
  goal TEXT,
  amount_rub INTEGER,
  term_months INTEGER,
  product TEXT,
  business_type TEXT,
  business_age TEXT,
  jobs_supported INTEGER,
  industry_code TEXT,
  collateral BOOLEAN,
  franchise BOOLEAN,
  revolver BOOLEAN,
  status TEXT NOT NULL,
  pd_chargeoff DOUBLE PRECISION,
  risk_score INTEGER,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  mocks JSONB,
  offer JSONB,
  decision_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
