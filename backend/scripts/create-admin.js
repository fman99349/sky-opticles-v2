// One-time script: creates the first (or an additional) administrator.
//
// Usage, from the backend folder:
//   node scripts/create-admin.js "Admin Name" "admin@example.com"
//
// You will be prompted for a password twice. The password is not echoed
// to the screen and never leaves this process. Only its bcrypt hash is
// stored in the database.
//
// Refuses to create a duplicate email. Refuses weak or mismatched passwords.
// Does not touch customers (the users table).

require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const pool = require('../src/db');

const BCRYPT_COST = 10;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

// --- Read CLI arguments -----------------------------------------------------

const [, , rawName, rawEmail] = process.argv;

if (!rawName || !rawEmail) {
  console.error('Usage: node scripts/create-admin.js "Full Name" "email@example.com"');
  process.exit(1);
}

const name = rawName.trim();
const email = rawEmail.trim();
const lowerEmail = email.toLowerCase();

if (!name || name.length > 120) {
  console.error('Name is required and must be 120 characters or fewer.');
  process.exit(1);
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) {
  console.error('A valid email address is required.');
  process.exit(1);
}

// --- Hidden password prompt -------------------------------------------------
//
// readline normally echoes typed characters. We override the private
// _writeToOutput method so the password is not visible on screen.

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    rl._writeToOutput = function (string) {
      // Allow the prompt itself to display, hide everything the user types.
      if (string.startsWith(question)) {
        process.stdout.write(string);
      } else {
        process.stdout.write('*');
      }
    };

    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

// --- Main -------------------------------------------------------------------

async function main() {
  const password = await askHidden(`Password for ${email}: `);

  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    console.error(`Password must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters.`);
    process.exit(1);
  }

  const confirm = await askHidden('Confirm password: ');

  if (password !== confirm) {
    console.error('Passwords do not match.');
    process.exit(1);
  }

  // Refuse duplicates by case-insensitive email.
  const existing = await pool.query(
    'SELECT id FROM admins WHERE LOWER(email) = $1',
    [lowerEmail]
  );
  if (existing.rows.length > 0) {
    console.error(`An administrator with email "${email}" already exists (id ${existing.rows[0].id}).`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  const result = await pool.query(
    `INSERT INTO admins (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, passwordHash]
  );

  const admin = result.rows[0];

  console.log('');
  console.log('Administrator created:');
  console.log(`  id:    ${admin.id}`);
  console.log(`  name:  ${admin.name}`);
  console.log(`  email: ${admin.email}`);
  console.log('');
  console.log('You can now sign in to the desktop app with this email and password.');
}

main()
  .catch((error) => {
    console.error('Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    pool.end();
  });