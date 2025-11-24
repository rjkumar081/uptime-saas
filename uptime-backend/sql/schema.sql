-- users
CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  name text,
  email text UNIQUE,
  phone text,
  password_hash text,
  created_at timestamptz DEFAULT now()
);

-- monitors
CREATE TABLE IF NOT EXISTS monitors (
  id serial PRIMARY KEY,
  user_id int REFERENCES users(id) ON DELETE CASCADE,
  name text,
  url text NOT NULL,
  owner_phone text,
  owner_email text,
  check_interval int NOT NULL DEFAULT 60, -- seconds
  last_status text,
  last_checked timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- checks (history)
CREATE TABLE IF NOT EXISTS checks (
  id serial PRIMARY KEY,
  monitor_id int REFERENCES monitors(id) ON DELETE CASCADE,
  scheduled_at timestamptz,
  executed_at timestamptz,
  status text,
  status_code text,
  response_time_ms int,
  raw_response jsonb
);

-- incidents
CREATE TABLE IF NOT EXISTS incidents (
  id serial PRIMARY KEY,
  monitor_id int REFERENCES monitors(id) ON DELETE CASCADE,
  detected_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  status_code text,
  response_time_ms int,
  message_sent boolean DEFAULT false
);

-- subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id serial PRIMARY KEY,
  user_id int REFERENCES users(id) ON DELETE CASCADE,
  razorpay_subscription_id text,
  plan text,
  status text,
  created_at timestamptz DEFAULT now()
);

-- contacts (for alerts)
CREATE TABLE IF NOT EXISTS contacts (
  id serial PRIMARY KEY,
  user_id int REFERENCES users(id),
  type text,
  value text,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);
