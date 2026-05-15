const bcrypt = require('bcrypt');
const { pool } = require('../src/db');
require('dotenv').config();

const createUser = async () => {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.log('⚠️ วิธีใช้งาน: node scripts/create_user.js <username> <password>');
    process.exit(1);
  }

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const insertQuery = `
      INSERT INTO users (username, password_hash)
      VALUES ($1, $2) RETURNING id, username;
    `;
    const result = await pool.query(insertQuery, [username, passwordHash]);
    
    console.log(`✅ สร้าง User สิทธิ์ Admin สำเร็จ!`, result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { 
        console.error('❌ Error: Username นี้มีคนใช้แล้ว');
    } else {
        console.error('❌ Error creating user:', err.message);
    }
  } finally {
    process.exit(0);
  }
};

createUser();