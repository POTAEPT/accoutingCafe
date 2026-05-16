-- Adds is_cup to products and transaction_items if missing.
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_cup BOOLEAN DEFAULT TRUE;
UPDATE products SET is_cup = TRUE WHERE is_cup IS NULL;

ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS is_cup BOOLEAN DEFAULT TRUE;
UPDATE transaction_items SET is_cup = TRUE WHERE is_cup IS NULL;
