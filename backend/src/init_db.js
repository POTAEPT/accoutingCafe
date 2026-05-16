const { pool } = require('./db');

const initDB = async () => {
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // 1. เพิ่มคำสั่งสร้างตารางหัวบิล (transactions)
  const createTransactionsTableQuery = `
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      receipt_no VARCHAR(50) UNIQUE NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // 2. เพิ่มคำสั่งสร้างตารางรายการสินค้า (transaction_items)
  const createTransactionItemsTableQuery = `
    CREATE TABLE IF NOT EXISTS transaction_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
      product_name VARCHAR(255) NOT NULL,
      product_variant VARCHAR(20),
      sweetness VARCHAR(20),
      is_cup BOOLEAN DEFAULT TRUE,
      quantity INT NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL
    );
  `;

  const migrateTransactionItemsQuery = `
    ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS product_variant VARCHAR(20);
    ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS sweetness VARCHAR(20);
    ALTER TABLE transaction_items ADD COLUMN IF NOT EXISTS is_cup BOOLEAN DEFAULT TRUE;
    UPDATE transaction_items SET is_cup = TRUE WHERE is_cup IS NULL;
  `;

  const createProductsTableQuery = `
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) UNIQUE NOT NULL,
      category VARCHAR(100) NOT NULL,
      prices JSONB NOT NULL,
      has_sweetness BOOLEAN DEFAULT TRUE,
      allow_roast BOOLEAN DEFAULT TRUE,
      allow_addons BOOLEAN DEFAULT TRUE,
      is_cup BOOLEAN DEFAULT TRUE,
      is_active BOOLEAN DEFAULT TRUE
    );
  `;

  const migrateProductsTableQuery = `
    ALTER TABLE products ADD COLUMN IF NOT EXISTS prices JSONB;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS has_sweetness BOOLEAN DEFAULT TRUE;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_roast BOOLEAN DEFAULT TRUE;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_addons BOOLEAN DEFAULT TRUE;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_cup BOOLEAN DEFAULT TRUE;
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'price'
      ) THEN
        UPDATE products
          SET prices = jsonb_build_object('regular', price)
          WHERE prices IS NULL AND price IS NOT NULL;
      END IF;
    END $$;
    ALTER TABLE products DROP COLUMN IF EXISTS price;
      UPDATE products SET is_cup = TRUE WHERE is_cup IS NULL;
  `;

  const createAddonsTableQuery = `
    CREATE TABLE IF NOT EXISTS addons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      category VARCHAR(20) NOT NULL,
      UNIQUE (name, category),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const migrateAddonsTableQuery = `
    ALTER TABLE addons ADD COLUMN IF NOT EXISTS name VARCHAR(255);
    ALTER TABLE addons ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);
    ALTER TABLE addons ADD COLUMN IF NOT EXISTS category VARCHAR(20);
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'addons_name_category_key'
      ) THEN
        ALTER TABLE addons ADD CONSTRAINT addons_name_category_key UNIQUE (name, category);
      END IF;
    END $$;
  `;

  const seedAddonsQuery = `
    INSERT INTO addons (name, price, category) VALUES
    ('ปกติ', 0, 'roast'),
    ('คั่วอ่อน', 30, 'roast'),
    ('คั่วเข้ม', 40, 'roast'),
    ('เพิ่มช็อต', 20, 'addon'),
    ('เพิ่มไซรัป', 10, 'addon')
    ON CONFLICT (name, category) DO NOTHING;
  `;

  const seedProductsQuery = `
    INSERT INTO products (name, category, prices, has_sweetness, is_active) VALUES
    ('เอสเฟรสโซ่', 'Coffee', '{"hot":35,"iced":40,"frappe":45}', TRUE, TRUE),
    ('อเมริกาโน่', 'Coffee', '{"hot":35,"iced":40,"frappe":45}', TRUE, TRUE),
    ('คาปูชิโน่', 'Coffee', '{"hot":35,"iced":40,"frappe":45}', TRUE, TRUE),
    ('ลาเต้', 'Coffee', '{"hot":35,"iced":40,"frappe":45}', TRUE, TRUE),
    ('มอคค่า', 'Coffee', '{"hot":35,"iced":40,"frappe":45}', TRUE, TRUE),
    ('กาแฟส้ม', 'Coffee', '{"iced":45}', TRUE, TRUE),
    ('Dirty', 'Coffee', '{"iced":40}', TRUE, TRUE),
    ('On the Rock', 'Coffee', '{"iced":40}', TRUE, TRUE),
    ('Americano Lemon Tonic', 'Coffee', '{"iced":45}', TRUE, TRUE),
    ('ชาดำ', 'Tea', '{"hot":30,"iced":35,"frappe":40}', TRUE, TRUE),
    ('ชามะนาว', 'Tea', '{"hot":30,"iced":35,"frappe":40}', TRUE, TRUE),
    ('ชาเขียว', 'Tea', '{"hot":30,"iced":35,"frappe":40}', TRUE, TRUE),
    ('ชาเขียวมะนาว', 'Tea', '{"hot":30,"iced":35,"frappe":40}', TRUE, TRUE),
    ('เพียวมัทฉะ', 'Tea', '{"iced":45}', TRUE, TRUE),
    ('มัทฉะลาเต้', 'Tea', '{"iced":50}', TRUE, TRUE),
    ('น้ำอัดลม', 'Tea', '{"regular":10}', FALSE, TRUE),
    ('นมสด', 'Milk', '{"hot":30,"iced":35,"frappe":40}', TRUE, TRUE),
    ('นมสดสตรอว์เบอร์รี่', 'Milk', '{"iced":35,"frappe":40}', TRUE, TRUE),
    ('นมสดบราวน์ซูการ์', 'Milk', '{"iced":35,"frappe":40}', TRUE, TRUE),
    ('โกโก้', 'Milk', '{"hot":30,"iced":35,"frappe":40}', TRUE, TRUE),
    ('โอวันติน', 'Milk', '{"hot":30,"iced":35,"frappe":40}', TRUE, TRUE),
    ('นมเย็น', 'Milk', '{"hot":30,"iced":35,"frappe":40}', TRUE, TRUE),
    ('นมสดโอริโอ้', 'Milk', '{"frappe":45}', TRUE, TRUE),
    ('น้ำส้มสด', 'Special Drinks', '{"iced":50}', FALSE, TRUE),
    ('อิตาเลียนโซดา', 'Special Drinks', '{"iced":35}', TRUE, TRUE),
    ('อัญชันมะนาวโซดา', 'Special Drinks', '{"hot":30,"iced":35,"frappe":40}', TRUE, TRUE),
    ('ชาพีช', 'Special Drinks', '{"hot":30,"iced":35,"frappe":40}', TRUE, TRUE),
    ('น้ำผึ้งมะนาว', 'Special Drinks', '{"hot":30,"iced":35,"frappe":40}', TRUE, TRUE),
    ('น้ำมะนาวโซดา', 'Special Drinks', '{"hot":30,"iced":35,"frappe":40}', TRUE, TRUE),
    ('น้ำผึ้งมะนาวโซดา', 'Special Drinks', '{"hot":30,"iced":35,"frappe":40}', TRUE, TRUE),
    ('บ๊วยมะนาวโซดา', 'Special Drinks', '{"hot":30,"iced":35,"frappe":40}', TRUE, TRUE)
    ON CONFLICT (name) DO NOTHING;
  `;

  try {
    console.log('⏳ Updating database structure...');
    // รันสร้างตารางเดิมและตารางใหม่
    await pool.query(createTransactionItemsTableQuery);
    await pool.query(migrateTransactionItemsQuery);
    await pool.query(createProductsTableQuery);
    await pool.query(migrateProductsTableQuery);
    await pool.query(createAddonsTableQuery);
    await pool.query(migrateAddonsTableQuery);
    await pool.query(seedProductsQuery);
    await pool.query(seedAddonsQuery);
    console.log('✅ Database is ready with Thai menu!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally { process.exit(0); }
};

initDB();