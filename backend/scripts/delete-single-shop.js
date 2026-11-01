require('dotenv').config();
const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');
const pool = require('../src/db');

async function main() {
  const rl = readline.createInterface({ input, output });

  console.log('🔍 Find a shop to delete by ID, Name, or Slug.');
  const searchTerm = (await rl.question('Enter Shop ID, Name, or Slug: ')).trim();

  if (!searchTerm) {
    rl.close();
    console.log('❌ No search term provided. Aborting.');
    await pool.end();
    return;
  }

  const client = await pool.connect();

  try {
    // 1. Find the shop
    const { rows: shops } = await client.query(
      `SELECT id, name, slug, city, status 
       FROM shops 
       WHERE id::text = $1 OR name ILIKE $2 OR slug = $1`,
      [searchTerm, `%${searchTerm}%`]
    );

    if (shops.length === 0) {
      rl.close();
      console.log(`\n❌ No shops found matching "${searchTerm}".`);
      return;
    }

    if (shops.length > 1) {
      rl.close();
      console.log(`\n⚠️ Found ${shops.length} matching shops. Please be more specific (e.g., use the exact ID or Slug):\n`);
      shops.forEach((s) => {
        console.log(`  • [ID: ${s.id}] ${s.name} (${s.slug}) - ${s.city}`);
      });
      return;
    }

    // 2. Preview the shop
    const shop = shops[0];
    console.log('\n🎯 Found matching shop:');
    console.log(`   ID:       ${shop.id}`);
    console.log(`   Name:     ${shop.name}`);
    console.log(`   Slug:     ${shop.slug}`);
    console.log(`   Location: ${shop.city}`);
    console.log(`   Status:   ${shop.status}`);

    // 3. Confirm deletion
    const answer = (await rl.question(
      `\n⚠️  WARNING: This will PERMANENTLY DELETE "${shop.name}" and ALL its products, variants, and images.\n` +
      `Type "DELETE SHOP" to confirm: `
    )).trim();
    rl.close();

    if (answer !== 'DELETE SHOP') {
      console.log('❌ Aborted — nothing was deleted.');
      return;
    }

    // 4. Perform deletion in a transaction
    await client.query('BEGIN');

    // Delete child records first (using the shop's products)
    const { rowCount: imgCount } = await client.query(
      `DELETE FROM product_images 
       WHERE product_id IN (SELECT id FROM products WHERE shop_id = $1)`,
      [shop.id]
    );
    console.log(`🗑️  Deleted ${imgCount} row(s) from product_images`);

    const { rowCount: varCount } = await client.query(
      `DELETE FROM product_variants 
       WHERE product_id IN (SELECT id FROM products WHERE shop_id = $1)`,
      [shop.id]
    );
    console.log(`🗑️  Deleted ${varCount} row(s) from product_variants`);

    const { rowCount: prodCount } = await client.query(
      `DELETE FROM products WHERE shop_id = $1`,
      [shop.id]
    );
    console.log(`🗑️  Deleted ${prodCount} row(s) from products`);

    // Finally, delete the shop itself
    const { rowCount: shopCount } = await client.query(
      `DELETE FROM shops WHERE id = $1`,
      [shop.id]
    );
    console.log(`🗑️  Deleted ${shopCount} row(s) from shops`);

    await client.query('COMMIT');
    console.log(`\n✅ Successfully deleted shop "${shop.name}" and all associated data.`);

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