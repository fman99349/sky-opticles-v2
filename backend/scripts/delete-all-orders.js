require('dotenv').config();
const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');
const pool = require('../src/db');

async function findChildTables(client, parentTable) {
  const { rows } = await client.query(
    `SELECT 
       tc.table_name AS child_table,
       kcu.column_name AS fk_column
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
     JOIN information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = tc.constraint_name
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND ccu.table_name = $1
       AND tc.table_name <> $1`,
    [parentTable]
  );
  return rows;
}

async function main() {
  const rl = readline.createInterface({ input, output });

  console.log(`🔌 Database: ${process.env.DB_NAME || '(from .env)'} @ ${process.env.DB_HOST || 'localhost'}`);

  const client = await pool.connect();

  try {
    const { rows: [{ count: beforeCount }] } = await client.query(
      `SELECT COUNT(*)::int AS count FROM orders`
    );

    if (beforeCount === 0) {
      rl.close();
      console.log('\n📭 There are no orders to delete.');
      await pool.end();
      return;
    }

    const childTables = await findChildTables(client, 'orders');

    console.log(`\n⚠️  This will PERMANENTLY DELETE:`);
    console.log(`   • ${beforeCount} row(s) from orders`);
    childTables.forEach(c => {
      console.log(`   • ALL rows from ${c.child_table} (via ${c.fk_column})`);
    });

    const answer = (await rl.question(
      `\nType "DELETE ALL ORDERS" to confirm: `
    )).trim();
    rl.close();

    if (answer !== 'DELETE ALL ORDERS') {
      console.log('❌ Aborted — nothing was deleted.');
      await pool.end();
      return;
    }

    await client.query('BEGIN');

    for (const { child_table } of childTables) {
      const { rowCount } = await client.query(`DELETE FROM ${child_table}`);
      console.log(`🗑️  Deleted ${rowCount} row(s) from ${child_table}`);
    }

    const { rowCount: ordersDeleted } = await client.query(`DELETE FROM orders`);
    console.log(`🗑️  Deleted ${ordersDeleted} row(s) from orders`);

    await client.query('COMMIT');
    console.log(`\n✅ All order deletions committed.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Failed — the whole transaction was rolled back.');
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();