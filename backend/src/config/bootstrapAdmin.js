import bcrypt from 'bcryptjs';
import { AdminUser } from '../models/AdminUser.js';

export async function ensureInitialAdminUser() {
  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || '');

  if (!adminEmail || !adminPassword) {
    console.warn('⚠️ Initial admin user was not created. Set ADMIN_EMAIL and ADMIN_PASSWORD in env.');
    return;
  }

  const existing = await AdminUser.findOne({ where: { email: adminEmail } });
  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await AdminUser.create({
    email: adminEmail,
    passwordHash,
    role: 'owner',
    isActive: true
  });

  console.log('✅ Initial admin user created.');
}
