# SKY OPTICLES Project Context

This document is a code-informed handoff for future engineering work with ChatGPT. It describes the repository as inspected on 2026-10-22. Treat the code and SQL migrations as authoritative when they differ from this summary. Do not put credentials, customer data, or prescription files in prompts.

## Product Summary

SKY OPTICLES (also branded in parts of the UI as Diamond Dee / DMD Optics) is an eyewear-oriented commerce platform. It currently consists of:

- A customer-facing Expo / React Native application for browsing products, configuring eyewear, managing a cart and account, and placing/tracking orders.
- A desktop administration application built with React, Vite, and Electron for catalog and order operations.
- A shared Express API backed by PostgreSQL.
- Ordered SQL migrations defining the relational schema.

The schema and configurator are eyewear-specific, while migration 011 begins a broader product-type/catalog pivot. The platform is therefore best understood as an eyewear commerce system with groundwork for a wider marketplace, not as a fully generic marketplace today.

## Repository Layout

- `backend/`: Express API, PostgreSQL access, uploads, scripts, and lens-option seed data.
- `admin/`: React/Vite renderer, Electron main/preload processes, and admin pages.
- `mobile/`: Expo React Native app, screens, contexts, UI components, and customer API client.
- `database/migrations/`: 17 ordered SQL migrations, from the catalog through password resets.
- `database/seeds/`: directory exists, but no seed files were found during this review.
- `PROJECT_CONTEXT.md`: this report.

There is no root `package.json`; each of `backend`, `admin`, and `mobile` is installed/run independently and has its own `package-lock.json`. No root README or test files were found. Only `mobile/AGENTS.md` was found; it contains Expo-specific guidance, including a preference for Expo Router, while the current app uses local screen state in `App.js`.

## Packages and Runtime

Versions below are the declared versions in each package manifest; lockfiles are present.

| App | Runtime / framework | Main declared packages |
| --- | --- | --- |
| Backend | Node.js, CommonJS, Express 5 | `express ^5.3.0`, `pg ^8.23.1`, `bcryptjs ^3.0.3`, `jsonwebtoken ^9.0.3`, `multer ^2.4.0`, `cors ^2.8.6`, `dotenv ^18.0.7`; dev: `nodemon ^3.1.14` |
| Admin | React 19, Vite 8, Electron 44 | `react ^19.3.1`, `react-dom ^19.3.1`, `lucide-react ^1.57.0`, `recharts ^3.10.1`; dev: `vite ^8.3.4`, `@vitejs/plugin-react ^6.1.2`, `electron ^44.7.2`, `concurrently`, `wait-on` |
| Mobile | Expo SDK 57, React Native 0.86 | `expo ~57.0.28`, `react 19.2.3`, `react-native 0.86.3`, AsyncStorage, Expo Notifications, Document Picker, File System, Constants, Device, Status Bar, and Expo vector icons |

Useful scripts:

- Backend: `npm start` runs `node src/app.js`; `npm run dev` runs it with nodemon. Its `npm test` is a placeholder that exits with an error; there is no configured test suite.
- Admin: `npm run vite:dev`, `npm run vite:build`, `npm run electron:dev`, `npm run electron:prod`.
- Mobile: `npm start`, `npm run android`, `npm run ios`, `npm run web`.

## Architecture and Request Flow

`backend/src/app.js` loads dotenv, enables permissive CORS and JSON parsing, mounts route modules under `/api`, serves product uploads at `/uploads/products`, and exposes `/` and `/api/health`. The listener defaults to port 3000 and binds to `0.0.0.0`. PostgreSQL connection pooling is in `backend/src/db.js` and reads `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`.

The customer mobile app calls the same API through `mobile/utils/api.js`. Its API base URL is currently a hard-coded LAN address; it is not read from Expo environment configuration. The admin API in `admin/src/api/client.js` uses `VITE_API_BASE_URL` when set, otherwise `http://localhost:3000/api`.

Customer and admin accounts are separate (`users` versus `admins`) and have separate login paths. Both issue JWTs signed with `JWT_SECRET`; admin tokens carry `role: 'admin'`. Authenticated customer endpoints reject admin tokens, and admin-only endpoints use `requireAdmin`. The admin token is stored in browser `localStorage`; customer token storage is wrapped by `mobile/utils/authStorage.js`.

### Backend Route Areas

- `routes/catalogue.js`: categories, brands, product listing/detail, and product create/update/delete.
- `routes/inventory.js`: product variants, stock, and product image CRUD/file uploads.
- `routes/auth.js`: customer registration/login/profile, push token registration, password reset.
- `routes/adminAuth.js`: admin login/session/profile.
- `routes/prescriptions.js`: customer-owned prescription upload and read.
- `routes/orders.js`: customer order create/list/detail.
- `routes/adminOrders.js`: admin order list/detail/update, test-mode mark-paid, soft delete, and admin prescription reads.
- `routes/lensOptions.js` and `routes/adminLensOptions.js`: public lens configuration reads and admin-guarded lens group/option writes.
- `routes/productTypes.js`: product-type lookup and CRUD.
- `routes/addresses.js`: customer-owned saved address CRUD.
- `routes/notifications.js`: customer and admin notification list/read; customer delete/clear.
- `routes/adminStats.js`: admin dashboard aggregates.

### Customer Application Flows

- `mobile/App.js` owns top-level screen selection using React state. Shared contexts wrap the app: auth, notifications, currency, and cart.
- Guests can browse the catalog, view product detail, and maintain a locally persisted cart. Checkout requires sign-in.
- Signed-in customers enter `DashboardScreen`, which contains shopping, cart, checkout, orders, account/address, and notification experiences.
- Product detail opens the six-step `LensWizard` for activity, usage, prescription, lens type/index, upgrades, and review. Configuration can include a prescription upload.
- `CartContext` persists cart contents in AsyncStorage. The client calculates display totals, but the order API recalculates prices using backend product/lens-option data before saving.
- Checkout sends selected currency, customer contact, shipping snapshot, product/variant IDs, quantities, and configuration to `POST /api/orders`. Shipping cost is currently set to zero in the backend.
- Customer registration and successful order placement create in-app notifications. Push tokens are registered through Expo; push delivery is attempted by `backend/src/utils/expoPush.js`.
- Password reset screens call backend endpoints, but the backend currently prints the reset code to its console rather than sending an email.

### Admin Application

`admin/src/App.jsx` renders login or an authenticated shell with pages for dashboard, products, orders, categories, brands, variants, lens options, images, product types, and settings. `admin/electron/main.js` loads the Vite dev server for development and the built `dist/index.html` in production. Some admin pages are explicitly placeholders according to the shell comments; verify a page's current implementation before assuming its UI is complete.

## Database Model

The schema is PostgreSQL and is established by applying `database/migrations/001_...sql` through `017_...sql` in filename order. The repository does not show a migration runner or schema version tracking, so migration application is currently an operational/manual step unless managed externally.

| Table / object | Purpose and key relations |
| --- | --- |
| `categories` | Product categories; migration 014 adds self-reference `parent_id` for parent/child categories. |
| `brands` | Product brands. |
| `products` | Catalog item, category and optional brand, product type, base price, status, configurator flag, condition, and currency. |
| `product_variants` | SKU-level variant, legacy eyewear attributes, stock/reorder values, optional price override, and JSONB `attributes`. |
| `product_images` | Product image metadata, optional variant association, primary/sort order, and optional lens-mask image URL. Product-image files are stored under `backend/uploads/products`. |
| `users` | Customer credentials/profile; phone and Expo push token are additive migration columns. Email uniqueness is case-insensitive. |
| `admins` | Separate administrator credentials/profile. Admin creation is done by `backend/scripts/create-admin.js`, not public registration. |
| `prescriptions` | Customer-owned upload metadata; file bytes live under `backend/uploads/prescriptions`. Deleting a user cascades the row, but migration notes that physical file cleanup is not automatic. |
| `lens_option_groups` | Configurator groups, applicability by product type, help text, and display order. |
| `lens_options` | Options within groups, price deltas, overlay colors, and display order. |
| `orders` | Customer, shipping, price/currency, payment and fulfillment snapshots; supports archive and soft-delete. Order number format is `SO-YYYY-NNNNN`, generated using `orders_number_seq`. |
| `order_items` | Purchase-time product/variant/configuration and price snapshots. Product, variant, and prescription links are nullable/weak references so historical orders survive deletions. |
| `product_types` | Lookup for product type labels/default configurator behavior; current product rows store the type key as text, not a foreign key. |
| `user_addresses` | Customer-owned saved delivery addresses; a partial unique index permits at most one default address per user. |
| `notifications` | In-app notification for exactly one customer or admin, enforced by a check constraint. |
| `exchange_rates` | Manually stored conversion rates from the ZAR base currency. Seed migration includes USD and GBP example rates. |
| `product_currency_prices` | Optional explicit product price by currency. |
| `password_reset_tokens` | Customer reset token with expiry; associated row is deleted after successful reset. |
| `orders_number_seq` | Sequence used to construct order numbers; gaps are expected after rolled-back transactions. |

### Migration Timeline

1. `001`: catalog foundation: categories, brands, products, variants, images.
2. `002`-`004`: customers, admins, prescriptions.
3. `005`-`007`: configurable lens groups/options and orders/order items.
4. `008`-`010`: customer phone, variant color/image links, lens-mask URLs.
5. `011`: extensible product types and JSONB variant/order attributes.
6. `012`-`013`: saved addresses and in-app notifications/push token.
7. `014`-`016`: hierarchical categories, new/used condition, multi-currency prices/orders, estimated delivery date.
8. `017`: password reset tokens.

## Setup and Configuration Notes

1. Install dependencies from each app directory with `npm install`.
2. Configure the backend environment variables listed above, plus `JWT_SECRET`; `PORT` and `JWT_EXPIRES_IN` are optional. Do not put real secrets into source control or chat.
3. Create/configure PostgreSQL, then apply migrations 001 through 017 in order.
4. Start the backend from `backend/` with `npm run dev`.
5. To create an admin, run `node scripts/create-admin.js "Admin Name" "admin@example.com"` from `backend/`; the script prompts for the password without echoing it.
6. To seed lens options, run `node scripts/seed-lens-options.js` from `backend/`. The seed source is `backend/data/lens-options-seed.json`; the database becomes the runtime source of truth after seeding.
7. Start desktop admin from `admin/` with `npm run electron:dev`.
8. Start mobile from `mobile/` with `npm start`. Update its API base URL for the development machine/network; the checked-in value is machine/network-specific.

No `.env.example` files were found. The repository currently contains local `.env` files; do not read or paste their values into this report or a prompt. The root `.gitignore` ignores `.env` patterns and common build/upload artifacts, but ignore rules do not untrack already-committed files.

## Important Caveats for Future Work

- **Authorization boundary:** several catalog, variant, image, stock, and product-type mutation routes are mounted without `requireAdmin`. The admin UI attaches an admin token, but the backend does not enforce it on those route modules. Do not assume a request is protected because it originates in the admin app.
- **Duplicate route mount:** `backend/src/app.js` mounts `adminAuthRoutes` twice. This appears redundant and should be checked if changing auth routing.
- **Currency pricing mismatch risk:** catalog reads can use `product_currency_prices`, while order creation currently reads `products.price` and applies `exchange_rates`; verify explicit currency-price behavior before modifying checkout/pricing.
- **Lens pricing applicability:** lens groups carry `applies_to`, but the order price calculation currently indexes options by group and selected key without checking the group applicability for that product type. Keep backend price validation authoritative and test unsupported configurations.
- **Payments:** there is no payment gateway integration. Admin `mark-paid` is explicitly test mode; payment and fulfillment statuses are separate.
- **Password reset delivery:** reset codes are logged to the backend terminal; no email provider is configured in the inspected code. Reset tokens are short codes and should be reviewed for production security/rate-limiting requirements.
- **Uploads/storage:** product images are publicly served. Prescription files are authenticated on customer/admin download routes. Uploads are on local disk, so deployment persistence/backups and cleanup need deliberate handling.
- **Fixed mobile API URL:** the mobile API client is tied to a specific LAN address; this will fail on other networks/devices unless changed or made configurable.
- **No automated tests:** backend `npm test` is a placeholder and no tests were found. Validate critical flows manually or add focused tests before relying on behavior changes.
- **Admin coverage:** the admin shell includes pages whose implementation may be placeholder/incomplete; inspect the page and API path before treating a menu item as a complete workflow.
- **Ignore-file hygiene:** `admin/,gitignore` and `database/,gitignore` are malformed filenames and will not be honored as `.gitignore` files. The root `.gitignore` applies globally. It also contains a credential-shaped string in a comment; this report intentionally does not reproduce it. If that value is a real credential and was ever committed/shared, revoke and rotate it.
- **Destructive maintenance script:** `backend/scripts/bulk-delete.js` is intended to delete catalog rows and requires an explicit confirmation phrase. Review its DB import and target environment before use; never run it against valuable data without a verified backup.

## Collaboration Guidance

- For API behavior, inspect the owning route module and its client call together; the backend is the source of truth for auth, persisted values, and order pricing.
- For schema changes, add a new numbered migration rather than editing an already-applied migration. Update API/client code and any affected seed data in the same change.
- For mobile work, follow the installed Expo SDK version and `mobile/AGENTS.md`; account for iOS, Android, and web when applicable.
- Preserve the split between customer and admin identities and test both token roles when changing protected endpoints.
- Keep currency, product variant, lens configuration, and prescription ownership cases in scope when changing checkout/order logic.
- Do not expose database credentials, JWT secrets, reset codes, prescription files, or customer records in logs, docs, or prompts.

## Research Limits

This report is based on source/manifests/migrations inspection, not a running app or live database. It does not claim the migrations have been applied, the current database matches them, or every listed UI workflow works end-to-end. No tests, builds, or database commands were run for this documentation task.