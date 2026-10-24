const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('[auth-service] Seeding database...');

  // Seed roles
  const roles = ['CUSTOMER', 'ADMIN', 'SHIPMENT_STAFF'];
  const roleMap = {};

  for (const rolename of roles) {
    const role = await prisma.role.upsert({
      where: { rolename },
      update: {},
      create: { rolename }
    });
    roleMap[rolename] = role.roleid;
  }

  // Salt rounds = 10
  const saltRounds = 10;

  // Users in exact order:
  // 1. admin / Admin@123 (ADMIN)
  // 2. staff / Staff@123 (SHIPMENT_STAFF)
  // 3. bronze_user / User@123 (CUSTOMER)
  // 4. silver_user / User@123 (CUSTOMER)
  // 5. gold_user / User@123 (CUSTOMER)
  const usersToSeed = [
    {
      username: 'admin',
      passwordRaw: 'Admin@123',
      role: 'ADMIN',
      email: 'admin@example.com'
    },
    {
      username: 'staff',
      passwordRaw: 'Staff@123',
      role: 'SHIPMENT_STAFF',
      email: 'staff@example.com'
    },
    {
      username: 'bronze_user',
      passwordRaw: 'User@123',
      role: 'CUSTOMER',
      email: 'bronze_user@example.com'
    },
    {
      username: 'silver_user',
      passwordRaw: 'User@123',
      role: 'CUSTOMER',
      email: 'silver_user@example.com'
    },
    {
      username: 'gold_user',
      passwordRaw: 'User@123',
      role: 'CUSTOMER',
      email: 'gold_user@example.com'
    }
  ];

  for (const u of usersToSeed) {
    const hashedPassword = await bcrypt.hash(u.passwordRaw, saltRounds);
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {
        password: hashedPassword,
        roleid: roleMap[u.role]
      },
      create: {
        username: u.username,
        password: hashedPassword,
        email: u.email,
        roleid: roleMap[u.role]
      }
    });
    console.log(`[auth-service] Upserted user: ${user.username} (uid: ${user.uid}, role: ${u.role})`);
  }

  console.log('[auth-service] Database seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('[auth-service] Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
