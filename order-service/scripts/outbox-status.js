require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const events = await prisma.outboxEvent.findMany({
      orderBy: { id: 'desc' },
      take: 10
    });

    if (events.length === 0) {
      console.log('\n[outbox:status] No outbox events found in order_db.\n');
      return;
    }

    const tableData = events.map(e => ({
      id: e.id,
      oid: e.aggregate_id,
      status: e.status,
      attempts: e.attempts,
      published_at: e.published_at ? e.published_at.toISOString() : 'null',
      last_error: e.last_error ? (e.last_error.length > 35 ? e.last_error.slice(0, 32) + '...' : e.last_error) : 'null'
    }));

    console.log('\n=== LATEST 10 OUTBOX EVENTS ===');
    console.table(tableData);
    console.log(`Total retrieved: ${events.length}\n`);
  } catch (err) {
    console.error('[outbox:status] Error fetching outbox events:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
