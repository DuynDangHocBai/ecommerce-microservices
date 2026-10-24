const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('[customer-service] Seeding database...');

  // 1. Seed Memberships
  const memberships = [
    { mid: 1, mname: 'BRONZE', score: 0 },
    { mid: 2, mname: 'SILVER', score: 500 },
    { mid: 3, mname: 'GOLD', score: 1000 }
  ];

  for (const m of memberships) {
    await prisma.membership.upsert({
      where: { mid: m.mid },
      update: {
        mname: m.mname,
        score: m.score
      },
      create: {
        mid: m.mid,
        mname: m.mname,
        score: m.score
      }
    });
    console.log(`[customer-service] Upserted membership: ${m.mname} (mid: ${m.mid}, score: ${m.score})`);
  }

  // 2. Seed Customers
  const customers = [
    { uid: 1, fullname: 'Administrator', mid: 3 },
    { uid: 2, fullname: 'Shipment Staff', mid: 1 },
    { uid: 3, fullname: 'Bronze User', mid: 1 },
    { uid: 4, fullname: 'Silver User', mid: 2 },
    { uid: 5, fullname: 'Gold User', mid: 3 }
  ];

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { uid: c.uid },
      update: {
        fullname: c.fullname,
        mid: c.mid
      },
      create: {
        uid: c.uid,
        fullname: c.fullname,
        mid: c.mid
      }
    });
    console.log(`[customer-service] Upserted customer: ${c.fullname} (uid: ${c.uid}, mid: ${c.mid})`);
  }

  console.log('[customer-service] Database seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('[customer-service] Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
