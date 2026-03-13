-- VIP purchases table: stores verified buyer emails from Fanbasis via Zapier
-- Used to gate the /vip signup page so only actual buyers can create accounts

CREATE TABLE IF NOT EXISTS vip_purchases (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  source VARCHAR(50) DEFAULT 'fanbasis',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast email lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_vip_purchases_email ON vip_purchases (LOWER(email));

-- RLS
ALTER TABLE vip_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to vip_purchases" ON vip_purchases
  FOR ALL USING (true) WITH CHECK (true);
