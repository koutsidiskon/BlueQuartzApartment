import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import bcrypt from 'bcryptjs';
import sequelize from '../src/config/db.js';
import { AdminUser } from '../src/models/AdminUser.js';

const EMAIL    = process.env.BOOTSTRAP_ADMIN_EMAIL;
const PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('❌  Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD in .env before running this script.');
  process.exit(1);
}

async function main() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: false });

  const existing = await AdminUser.findOne({ where: { email: EMAIL } });
  if (existing) {
    console.log('✋  User already exists:', EMAIL);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  await AdminUser.create({ email: EMAIL, passwordHash, role: 'owner', isActive: true });
  console.log('✅  Admin user created:', EMAIL);
  process.exit(0);
}

main().catch(err => {
  console.error('❌  Error creating admin:', err.message);
  process.exit(1);
});
