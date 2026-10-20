// One-time script: populates lens_option_groups and lens_options from
// backend/data/lens-options-seed.json.
//
// Usage, from the backend folder:
//   node scripts/seed-lens-options.js
//
// Safe to re-run: if any groups already exist, it aborts without touching
// the database. To start fresh, empty the two tables first
// (DELETE FROM lens_option_groups; cascades to options).
//
// After seeding, the database is the source of truth for lens prices.
// Changes to backend/data/lens-options-seed.json will NOT be picked up
// until the tables are cleared and the script is re-run.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/db');

const SEED_FILE = path.join(__dirname, '..', 'data', 'lens-options-seed.json');

async function main() {
  if (!fs.existsSync(SEED_FILE)) {
    console.error(`Seed file not found: ${SEED_FILE}`);
    process.exitCode = 1;
    return;
  }

  const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));

  if (!seed.groups || !Array.isArray(seed.groups)) {
    console.error('Seed file does not contain a valid "groups" array.');
    process.exitCode = 1;
    return;
  }

  // Idempotency guard
  const existing = await pool.query(
    'SELECT COUNT(*)::int AS n FROM lens_option_groups'
  );
  if (existing.rows[0].n > 0) {
    console.log(
      `Lens option groups already exist (${existing.rows[0].n}). Aborting.`
    );
    console.log('To re-seed, run: DELETE FROM lens_option_groups;');
    return;
  }

  const client = await pool.connect();
  let tx = false;

  try {
    await client.query('BEGIN');
    tx = true;

    let groupCount = 0;
    let optionCount = 0;

    for (const group of seed.groups) {
      const g = await client.query(
        `INSERT INTO lens_option_groups
           (group_key, label, help_title, help_body, applies_to, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          group.group_key,
          group.label,
          group.help_title || null,
          group.help_body || null,
          group.applies_to,
          group.sort_order || 0,
        ]
      );
      const groupId = g.rows[0].id;
      groupCount++;

      for (const opt of group.options) {
        await client.query(
          `INSERT INTO lens_options
             (group_id, option_key, label, price_delta, overlay_color, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            groupId,
            opt.option_key,
            opt.label,
            opt.price_delta,
            opt.overlay_color || null,
            opt.sort_order || 0,
          ]
        );
        optionCount++;
      }
    }

    await client.query('COMMIT');
    tx = false;

    console.log(`Seeded ${groupCount} groups, ${optionCount} options.`);
  } catch (error) {
    if (tx) await client.query('ROLLBACK').catch(() => {});
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error('Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    pool.end();
  });