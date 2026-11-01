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

  const identifier = (await rl.question(
    `\nEnter Order ID (UUID), Order Number, or Customer Name/Email:\n> `
  )).trim();

  if (!identifier) {
    rl.close();
    console.log('❌ No identifier provided. Aborting.');
    await pool.end();
    return;
  }

  const client = await pool.connect();

  try {
    const { rows: colInfo } = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'orders'`
    );
    const cols = colInfo.map(c => c.column_name);

    const whereParts = [`id::text = $1`];
    const params = [identifier];

    if (cols.includes('order_number')) whereParts.push(`order_number = $1`);
    if (cols.includes('customer_name')) {
      params.push(`%${identifier}%`);
      whereParts.push(`customer_name ILIKE $${params.length}`);
    }
    if (cols.includes('customer_email')) {
      params.push(`%${identifier}%`);
      whereParts.push(`customer_email ILIKE $${params.length}`);
    }

    const selectCols = ['id'];
    ['order_number', 'customer_name', 'customer_email', 'total', 'status', 'created_at']
      .forEach(c => { if (cols.includes(c)) selectCols.push(c); });

    const { rows: orders } = await client.query(
      `SELECT ${selectCols.join(', ')} FROM orders WHERE ${whereParts.join(' OR ')} LIMIT 20`,
      params
    );

    if (orders.length === 0) {
      rl.close();
      console.log(`\n❌ No orders found matching "${identifier}".`);
      await pool.end();
      return;
    }

    console.log(`\n🔎 Found ${orders.length} matching order(s):\n`);
    orders.forEach((o, i) => {
      console.log(`  [${i + 1}] ${o.order_number || o.id}`);
      if (o.id)             console.log(`      ID:       ${o.id}`);
      if (o.customer_name)  console.log(`      Customer: ${o.customer_name}`);
      if (o.customer_email) console.log(`      Email:    ${o.customer_email}`);
      if (o.status)         console.log(`      Status:   ${o.status}`);
      if (o.total)          console.log(`      Total:    ${o.total}`);
      if (o.created_at)     console.log(`      Created:  ${o.created_at}`);
      console.log('');
    });

    const choice = (await rl.question(
      `Enter the number to DELETE (1-${orders.length}), or "ALL" for all matches: `
    )).trim();

    let targets;
    if (choice.toUpperCase() === 'ALL') {
      targets = orders;
    } else {
      const n = Number(choice);
      if (!n || n < 1 || n > orders.length) {
        rl.close();
        console.log('❌ Invalid selection. Aborting.');
        await pool.end();
        return;
      }
      targets = [orders[n - 1]];
    }

    const confirm = (await rl.question(
      `\n⚠️  About to PERMANENTLY DELETE ${targets.length} order(s) and all related records.\n` +
      `Type "DELETE" to confirm: `
    )).trim();
    rl.close();

    if (confirm !== 'DELETE') {
      console.log('❌ Aborted — nothing was deleted.');
      await pool.end();
      return;
    }

    const childTables = await findChildTables(client, 'orders');
    console.log(`\n📋 Found ${childTables.length} child table(s) referencing orders:`);
    childTables.forEach(c => console.log(`   • ${c.child_table}.${c.fk_column}`));

    await client.query('BEGIN');

    for (const order of targets) {
      for (const { child_table, fk_column } of childTables) {
        const { rowCount } = await client.query(
          `DELETE FROM ${child_table} WHERE ${fk_column} = $1`,
          [order.id]
        );
        if (rowCount > 0) {
          console.log(`  🗑️  ${rowCount} row(s) from ${child_table}`);
        }
      }
      await client.query(`DELETE FROM orders WHERE id = $1`, [order.id]);
      console.log(`  ✅ Deleted order ${order.order_number || order.id}`);
    }

    await client.query('COMMIT');
    console.log(`\n✅ All deletions committed.`);
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