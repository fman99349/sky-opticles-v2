require('dotenv').config();
const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');
const pool = require('../src/db');

const TABLES_IN_ORDER = [
  'product_images',
  'product_variants',
  'products',
];

async function main() {
  const rl = readline.createInterface({ input, output });

  const answer = await rl.question(
    `⚠️  This will DELETE ALL ROWS from:\n` +
      TABLES_IN_ORDER.map(t => `   • ${t}`).join('\n') +
      `\n\nCategories, Brands, and Shops will remain untouched.` +
      `\nType "DELETE PRODUCTS" to confirm: `
  );
  rl.close();

  if (answer !== 'DELETE PRODUCTS') {
    console.log('❌ Aborted — nothing was deleted.');
    process.exit(0);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const table of TABLES_IN_ORDER) {
      const { rowCount } = await client.query(`DELETE FROM ${table}`);
      console.log(`🗑️  Deleted ${rowCount} row(s) from ${table}`);
    }

    await client.query('COMMIT');
    console.log('✅ All product deletions committed.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Failed — the whole transaction was rolled back.');
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();