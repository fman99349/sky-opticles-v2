SKY OPTICLES — Complete System Handoff
Last updated: 2026-10-28
Session scope: Multi-seller marketplace added end-to-end (sellers, shops, invites, paywall, product gallery)

This document is the authoritative technical reference for the current state of SKY OPTICLES. If you're picking up work on this project, read this top to bottom before touching code. Everything that is true about the system today, and every decision that was made, is recorded here.

Table of Contents
System Overview

Repository Layout

Running the System (Local Dev)

Environment Variables

Database Schema

Migration History

Authentication & Authorization

Data Flows

API Endpoints Reference

Backend File Map

Admin App File Map

Mobile App File Map

Shop Lifecycle States

Trial & Paywall Mechanics

Platform Settings

Test Accounts

Security Model & Test Coverage

Known Issues & TODO

Common Operations

Gotchas & Traps

Current Data State

1. System Overview
SKY OPTICLES (branded in parts of the UI as Diamond Dee / DMD Optics) is an eyewear marketplace platform with three distinct user types:

Role	What they do	Where
Customer	Browse shops, buy products	Mobile app (Expo / React Native)
Seller (admin)	Own and manage one shop	Desktop admin app (Electron)
Platform owner (admin)	Approve sellers, manage catalog taxonomy, control billing	Desktop admin app (Electron)
Architecture
text
┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│   Mobile (Expo SDK 57)  │    │  Admin (Electron + Vite)│    │   Express backend       │
│   React Native 0.86     │    │  React 19               │    │   Node.js, Express 5    │
│   Customer-facing       │    │  Owner + Seller UIs     │    │   Port 3000             │
└───────────┬─────────────┘    └───────────┬─────────────┘    └───────────┬─────────────┘
            │                              │                              │
            └──────────────────┬───────────┴──────────────────────────────┘
                               │
                               │  JSON over HTTP
                               │  JWT in Authorization header
                               │
                     ┌─────────▼─────────┐
                     │   PostgreSQL      │
                     │   ~20 tables      │
                     │   21 migrations   │
                     └───────────────────┘
All three apps talk to the same Express backend on port 3000. There is no GraphQL, no websocket, no message queue. Just JSON over HTTP.

The marketplace model
Platform owner operates a "master" shop (SKY OPTICLES, is_platform_owned = TRUE) that behaves like a normal shop but is exempt from billing, approval, and visibility rules.

Sellers are separate admin accounts, each owning exactly one shop.

Customers see products from all approved, in-trial-or-paid shops.

Rent is collected manually via EFT after a 14-day trial; the platform owner activates sellers by clicking "Mark paid" in the admin UI.

2. Repository Layout
text
sky-opticles-v2/
├── backend/                        # Express API server
│   ├── src/
│   │   ├── app.js                  # Entry point, mounts all routes
│   │   ├── db.js                   # pg pool
│   │   ├── middleware/
│   │   │   └── shopAccess.js       # Authorization for shop resources
│   │   ├── routes/                 # ~18 route modules (see §10)
│   │   ├── utils/
│   │   │   ├── expoPush.js         # Push notification helper
│   │   │   └── url.js              # toAbsoluteUrl()
│   │   └── ...
│   ├── scripts/
│   │   ├── create-admin.js         # Creates a platform admin (bootstrap)
│   │   ├── seed-lens-options.js    # Seeds lens groups/options
│   │   └── bulk-delete.js          # DESTRUCTIVE — requires confirmation phrase
│   ├── uploads/
│   │   ├── products/               # Product images (public)
│   │   ├── prescriptions/          # Customer Rx (auth only)
│   │   ├── models/                 # 3D models (now unused)
│   │   └── shops/{shopId}/         # Shop logos/banners
│   ├── .env                        # DO NOT COMMIT
│   └── package.json
│
├── admin/                          # Electron desktop admin
│   ├── electron/
│   │   ├── main.js
│   │   └── preload.js
│   ├── src/
│   │   ├── App.jsx                 # Shell + nav + routing
│   │   ├── api/
│   │   │   ├── client.js           # Owner-facing API wrapper
│   │   │   └── adminClient.js      # Auth + shop API wrapper
│   │   ├── auth/
│   │   │   └── AdminAuthContext.jsx
│   │   ├── pages/                  # ~15 page components (see §11)
│   │   ├── components/
│   │   └── styles.css              # Global stylesheet
│   └── package.json
│
├── mobile/                         # Expo customer app
│   ├── App.js                      # Root screen switcher
│   ├── screens/                    # ~15 screen components (see §12)
│   ├── components/                 # Reusable UI
│   ├── cart/
│   ├── auth/
│   ├── notifications/
│   ├── utils/
│   │   ├── api.js                  # API client
│   │   └── CurrencyContext.js
│   ├── styles.ts
│   └── package.json
│
├── database/
│   └── migrations/                 # 21 SQL files, ordered 001 → 021
│
├── backups/                        # Manual + auto DB dumps
├── PROJECT_CONTEXT.md              # Pre-session context (from before marketplace work)
└── HANDOFF.md                      # ← This file
Each of backend/, admin/, mobile/ is an independent npm project with its own package-lock.json. There is no root package.json and no monorepo tooling.

3. Running the System (Local Dev)
Prerequisites
Node.js 20+ (tested with Node 20/22)

PostgreSQL 14+ (tested with PG 15/16)

PowerShell 5.1 on Windows (or bash on macOS/Linux)

For mobile: Expo Go app on a physical device, SDK 57 specifically (see §20)

Starting all three apps
Run each in its own terminal, in this order:

Terminal 1 — Backend:

powershell
cd C:\Users\vicky\Documents\FranceMan\SkyOpticlesApp\sky-opticles-v2\backend
npm run dev
Expected output:

text
SKY OPTICLES API running on port 3000
The backend does not print a startup log line per route, so quiet is normal.

Terminal 2 — Admin (Electron):

powershell
cd C:\Users\vicky\Documents\FranceMan\SkyOpticlesApp\sky-opticles-v2\admin
npm run electron:dev
Starts Vite on :5173 and opens the Electron window. The window loads the Vite dev server in dev mode.

Terminal 3 — Mobile (Metro / Expo):

powershell
cd C:\Users\vicky\Documents\FranceMan\SkyOpticlesApp\sky-opticles-v2\mobile
npx expo start --clear
Scan the QR code with Expo Go on the phone. The phone must be on the same WiFi as the backend machine — see §20.

Restarting after code changes
App	How to restart
Backend	Ctrl+C then npm run dev — restart always needed for route/middleware changes
Admin	Vite hot-reloads JSX and CSS automatically. For .jsx file additions, Ctrl+C then npm run electron:dev. In the Electron window, Ctrl+R reloads the renderer
Mobile	Metro hot-reloads on save. For new files or style changes, press r in Metro, or shake the phone and tap "Reload"
Port map
Port	Service
3000	Backend API
5173	Vite dev server (admin)
8081	Metro bundler (mobile)
5432	PostgreSQL
4. Environment Variables
Located at backend/.env. Never commit this file. .gitignore at the repo root should already exclude it.

Required for backend
ini
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sky_opticles
DB_USER=sky_opticles_app
DB_PASSWORD=<DB password>

JWT_SECRET=<long random string>
JWT_EXPIRES_IN=7d
Optional
ini
PORT=3000                                  # Default 3000
NANOGPT_API_KEY=<key>                      # For 3D AI generation (now unused)
PUBLIC_BASE_URL=https://yoursite.com       # For absolute URL generation in 3D
Admin env
Optional admin/.env (or .env.local) can set:

ini
VITE_API_BASE_URL=http://localhost:3000/api
If not set, defaults to http://localhost:3000/api (see admin/src/api/client.js line 4).

Mobile env
None currently. The API URL is hardcoded in mobile/utils/api.js:

js
export const API_URL = 'http://10.195.227.20:3000/api';
This is a known limitation — see §18.

How to load backend .env into a PowerShell session
This pattern is used repeatedly in operations scripts:

powershell
$root = "C:\Users\vicky\Documents\FranceMan\SkyOpticlesApp\sky-opticles-v2"
Get-Content "$root\backend\.env" | ForEach-Object {
  if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$') {
    Set-Item -Path "Env:$($matches[1])" -Value $matches[2].Trim('"').Trim("'")
  }
}
$env:PGPASSWORD = $env:DB_PASSWORD
5. Database Schema
Database name: sky_opticles (configurable via DB_NAME)
User: sky_opticles_app
Migration directory: database/migrations/
Order: numeric prefix, 001_...sql through 021_...sql
Runner: none — migrations are applied manually with psql -f. There is no knex, sequelize, or tracking table. Do not re-run a migration that's already been applied.

5.1 Core reference tables
categories
Hierarchical category tree. Used to classify products.

sql
id BIGINT PK
name VARCHAR(100) UNIQUE NOT NULL
slug VARCHAR(120) UNIQUE NOT NULL
description TEXT
is_active BOOLEAN DEFAULT TRUE
parent_id BIGINT REFERENCES categories(id)   -- added in 014
created_at TIMESTAMPTZ
brands
sql
id BIGINT PK
name VARCHAR(120) UNIQUE NOT NULL
slug VARCHAR(140) UNIQUE NOT NULL
is_active BOOLEAN DEFAULT TRUE
created_at TIMESTAMPTZ
product_types
Lookup table for product type labels (added in 011). Note: this is separate from products.product_type, which is stored as a text column, not a FK.

sql
id BIGINT PK
key VARCHAR(50) UNIQUE NOT NULL         -- e.g. 'optical_frame'
label VARCHAR(100) NOT NULL             -- e.g. 'Optical Frame'
default_has_configurator BOOLEAN
sort_order INTEGER
created_at TIMESTAMPTZ
5.2 Shop & marketplace tables (NEW in session)
shops
The central marketplace table. Every product belongs to exactly one shop.

sql
id BIGINT GENERATED ALWAYS AS IDENTITY PK
name VARCHAR(120) NOT NULL
slug VARCHAR(140) UNIQUE NOT NULL
tagline VARCHAR(140)
description TEXT
logo_url TEXT
banner_url TEXT

shop_type VARCHAR(20) NOT NULL CHECK (shop_type IN (
  'independent','boutique','brand','reseller','chain'
))

city VARCHAR(100) NOT NULL
province VARCHAR(100) NOT NULL
country VARCHAR(80) NOT NULL DEFAULT 'South Africa'
postal_code VARCHAR(20)

contact_email VARCHAR(180)
contact_phone VARCHAR(40)

is_platform_owned BOOLEAN NOT NULL DEFAULT FALSE

status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
  'draft',      -- seller editing
  'pending',    -- submitted, awaiting approval
  'active',     -- approved; visible if trial/paid valid
  'rejected',   -- platform rejected; seller can edit + resubmit
  'suspended',  -- platform suspended
  'closed'      -- seller closed
))
rejection_reason TEXT
approved_at TIMESTAMPTZ
approved_by_admin_id BIGINT REFERENCES admins(id)

trial_ends_at TIMESTAMPTZ
paid_until TIMESTAMPTZ
subscription_plan VARCHAR(50)            -- 'monthly' or 'yearly' when paid

avg_rating NUMERIC(3,2) DEFAULT 0        -- added in 020, currently unused
review_count INTEGER DEFAULT 0           -- added in 020, currently unused

created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ

-- Constraints:
CREATE UNIQUE INDEX only_one_platform_shop ON shops(is_platform_owned) WHERE is_platform_owned = TRUE;
CREATE INDEX idx_shops_active ON shops(shop_type, created_at DESC) WHERE status = 'active';
CREATE INDEX idx_shops_pending ON shops(created_at DESC) WHERE status = 'pending';
shop_memberships
Links admins to shops. Enforces "one seller, one shop" at the DB level.

sql
id BIGINT PK
shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE
admin_id BIGINT NOT NULL REFERENCES admins(id) ON DELETE CASCADE
role VARCHAR(20) NOT NULL CHECK (role IN ('owner','staff'))
created_at TIMESTAMPTZ
UNIQUE (shop_id, admin_id)

-- Enforces one shop per seller admin:
CREATE UNIQUE INDEX one_shop_per_admin_owner ON shop_memberships(admin_id) WHERE role = 'owner';
shop_invites
One-time-use invite tokens for seller onboarding.

sql
id BIGINT PK
token VARCHAR(64) UNIQUE NOT NULL       -- SHA-256 hash of raw token
email VARCHAR(180) NOT NULL
invited_by_admin_id BIGINT NOT NULL REFERENCES admins(id)
expires_at TIMESTAMPTZ NOT NULL         -- 72h from creation
accepted_at TIMESTAMPTZ
accepted_admin_id BIGINT REFERENCES admins(id)
revoked_at TIMESTAMPTZ
created_at TIMESTAMPTZ

-- Prevent duplicate pending invites per email:
CREATE UNIQUE INDEX one_pending_invite_per_email
  ON shop_invites(LOWER(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
shop_product_types
Currently unused. Originally intended to restrict what each shop could sell. That restriction was removed — see §18. The table is still populated for backward compatibility but not enforced.

sql
shop_id BIGINT NOT NULL REFERENCES shops(id) ON DELETE CASCADE
product_type VARCHAR(30) NOT NULL CHECK (product_type IN (
  'optical_frame','sunglasses','lenses','contact_lenses','accessory'
))
PRIMARY KEY (shop_id, product_type)
platform_settings
Key/value settings for platform-wide config.

sql
key VARCHAR(100) PRIMARY KEY
value TEXT NOT NULL
updated_by_admin_id BIGINT REFERENCES admins(id)
updated_at TIMESTAMPTZ
Current keys:

Key	Value	Purpose
trial_days	14	Trial length in days
monthly_price	199	ZAR, seller monthly subscription
yearly_price	1999	ZAR, seller yearly subscription
contact_email	admin1@gmail.com	Paywall CTA email
contact_whatsapp	``	Paywall WhatsApp (empty = hidden)
5.3 Identity tables
admins (seller + platform owner identities)
sql
id BIGINT GENERATED ALWAYS AS IDENTITY PK
name VARCHAR(120) NOT NULL
email VARCHAR(180) NOT NULL
password_hash TEXT NOT NULL
is_platform_owner BOOLEAN NOT NULL DEFAULT FALSE   -- added in 019
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ

-- Case-insensitive uniqueness:
CREATE UNIQUE INDEX admins_email_lower_idx ON admins (LOWER(email));
users (customer identities)
sql
id BIGINT GENERATED ALWAYS AS IDENTITY PK
name VARCHAR(120) NOT NULL
email VARCHAR(180) NOT NULL
password_hash TEXT NOT NULL
phone VARCHAR(40)                      -- added in 008
expo_push_token TEXT                   -- added in 013
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ

CREATE UNIQUE INDEX users_email_lower_idx ON users (LOWER(email));
5.4 Product tables
products
sql
id BIGINT PK
category_id BIGINT NOT NULL REFERENCES categories(id)
brand_id BIGINT REFERENCES brands(id)
name VARCHAR(200) NOT NULL
slug VARCHAR(220) UNIQUE NOT NULL
description TEXT
product_type VARCHAR(30) NOT NULL
price NUMERIC(12,2) NOT NULL CHECK (price >= 0)
status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','active','archived'))
has_configurator BOOLEAN DEFAULT TRUE     -- added in 008
condition VARCHAR(10) DEFAULT 'new'       -- added in 014 ('new'|'used')
shop_id BIGINT NOT NULL REFERENCES shops(id)   -- added in 019, NOT NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
product_variants
SKU-level records (colour, size, material). One product → many variants.

sql
id BIGINT PK
product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT
sku VARCHAR(80) UNIQUE NOT NULL
color VARCHAR(80)
color_hex VARCHAR(7)                      -- added in 009
frame_material VARCHAR(100)
frame_shape VARCHAR(80)
size_label VARCHAR(50)
price_override NUMERIC(12,2)
stock_quantity INTEGER DEFAULT 0
reorder_level INTEGER DEFAULT 5
is_active BOOLEAN DEFAULT TRUE
attributes JSONB DEFAULT '{}'             -- added in 011
created_at TIMESTAMPTZ
product_images
sql
id BIGINT PK
product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE
image_url TEXT NOT NULL
alt_text VARCHAR(250)
is_primary BOOLEAN DEFAULT FALSE
sort_order INTEGER DEFAULT 0
variant_id BIGINT REFERENCES product_variants(id) ON DELETE SET NULL   -- added in 009
lens_layer_url TEXT                       -- added in 010
created_at TIMESTAMPTZ

-- One primary per product:
CREATE UNIQUE INDEX one_primary_image_per_product
  ON product_images(product_id) WHERE is_primary = TRUE;
Images are unlimited per product. No 4-image cap exists. The admin UI shows "X of 4 recommended" as a soft nudge, but 10+ images work fine.

product_3d_models (DORMANT — route unmounted)
sql
id BIGINT PK
product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE
variant_id BIGINT REFERENCES product_variants(id) ON DELETE CASCADE
model_url TEXT NOT NULL
format VARCHAR(10) CHECK (format IN ('glb','gltf','usdz'))
poster_url TEXT
file_size_bytes BIGINT
is_primary BOOLEAN DEFAULT FALSE
created_at TIMESTAMPTZ
Data intact, but the backend route is unmounted (app.js) and the admin UI is hidden. Do not re-enable without a cost decision — the AI generation path costs ~$0.20 per model.

5.5 Order tables
orders
sql
id BIGINT PK
order_number VARCHAR(20) UNIQUE NOT NULL      -- format: SO-YYYY-NNNNN
user_id BIGINT NOT NULL REFERENCES users(id)

-- Customer snapshot (do not join to users):
customer_name VARCHAR(120)
customer_email VARCHAR(180)
customer_phone VARCHAR(40)

-- Shipping snapshot:
shipping_line1 VARCHAR(200)
shipping_line2 VARCHAR(200)
shipping_city VARCHAR(100)
shipping_postal_code VARCHAR(20)
shipping_province VARCHAR(100)
shipping_country VARCHAR(80) DEFAULT 'South Africa'

-- Money:
subtotal NUMERIC(12,2)
shipping_cost NUMERIC(12,2) DEFAULT 0
total NUMERIC(12,2)
currency VARCHAR(3) DEFAULT 'ZAR'             -- added in 016
exchange_rate NUMERIC(12,4)                   -- added in 016
base_total NUMERIC(12,2)                      -- added in 016 (ZAR equivalent)

payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded'))
fulfillment_status VARCHAR(20) DEFAULT 'pending' CHECK (fulfillment_status IN ('pending','processing','shipped','delivered','cancelled'))
paid_at TIMESTAMPTZ
estimated_delivery_date DATE                  -- added in 016
archived BOOLEAN DEFAULT FALSE
deleted_at TIMESTAMPTZ
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ

-- Sequence for order numbers:
CREATE SEQUENCE orders_number_seq START 1;
order_items
Snapshots at purchase time — do not re-join products to display an order.

sql
id BIGINT PK
order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE
product_id BIGINT REFERENCES products(id) ON DELETE SET NULL       -- weak
variant_id BIGINT REFERENCES product_variants(id) ON DELETE SET NULL
prescription_id BIGINT REFERENCES prescriptions(id) ON DELETE SET NULL

-- Snapshots:
product_name VARCHAR(200)
product_slug VARCHAR(220)
variant_sku VARCHAR(80)
variant_attributes JSONB
lens_config JSONB DEFAULT '{}'

base_price NUMERIC(12,2)
lens_delta NUMERIC(12,2)
unit_price NUMERIC(12,2)
quantity INTEGER
line_total NUMERIC(12,2)
created_at TIMESTAMPTZ
Note on cross-shop order handling: because order_items.product_id is a weak reference and products.shop_id is NOT NULL, an order's shops can be derived at query time via JOIN order_items oi ON ... JOIN products p ON p.id = oi.product_id. This is what adminOrders.js uses. If you split fulfillment per-shop (future migration), you'll add a seller_fulfillment_id FK here — see §18.

5.6 Support tables
prescriptions
sql
id BIGINT PK
user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
filename VARCHAR(255) NOT NULL
original_name VARCHAR(255)
mime_type VARCHAR(100)
size_bytes INTEGER
created_at TIMESTAMPTZ
Files live at backend/uploads/prescriptions/. Authenticated reads only.

lens_option_groups / lens_options
Configurator groups (Lens Type, Tint, Coating...) and options within them.

sql
lens_option_groups:
  id, group_key UNIQUE, label, help_title, help_body,
  applies_to TEXT[], sort_order

lens_options:
  id, group_id FK, option_key, label, price_delta, overlay_color, sort_order
  UNIQUE (group_id, option_key)
user_addresses
Saved customer delivery addresses.

sql
id BIGINT PK
user_id BIGINT NOT NULL REFERENCES users(id)
label VARCHAR(50)
recipient_name, line1, line2, city, province, postal_code, country
phone
is_default BOOLEAN DEFAULT FALSE
created_at, updated_at
notifications
In-app notifications, for either a customer OR an admin (not both).

sql
id BIGINT PK
customer_id BIGINT REFERENCES users(id)
admin_id BIGINT REFERENCES admins(id)
title VARCHAR(200) NOT NULL
message TEXT NOT NULL
type VARCHAR(30)                       -- 'order' | 'account' | 'system'
is_read BOOLEAN DEFAULT FALSE
created_at TIMESTAMPTZ

CHECK ((customer_id IS NOT NULL)::int + (admin_id IS NOT NULL)::int = 1)
password_reset_tokens
Customer-only password resets.

sql
id BIGINT PK
user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
token VARCHAR(10) NOT NULL
expires_at TIMESTAMPTZ NOT NULL
created_at TIMESTAMPTZ
exchange_rates
sql
currency_code VARCHAR(3) PRIMARY KEY
rate_to_base NUMERIC(10,4) NOT NULL
updated_at TIMESTAMPTZ
Base currency is ZAR. Seeded with USD and GBP example rates.

product_currency_prices
Optional explicit price per currency (overrides exchange-rate conversion).

sql
product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE
currency_code VARCHAR(3) NOT NULL
price NUMERIC(12,2) NOT NULL
PRIMARY KEY (product_id, currency_code)
6. Migration History
#	File	What it adds
001	create_catalogue.sql	categories, brands, products, product_variants, product_images
002	create_users.sql	users (customers)
003	create_admins.sql	admins (separate identity model)
004	create_prescriptions.sql	prescriptions (Rx uploads)
005	create_lens_options.sql	lens_option_groups, lens_options
006	create_orders.sql	orders, orders_number_seq
007	create_order_items.sql	order_items
008	add_product_configurator.sql	products.has_configurator, users.phone
009	add_variant_images_and_color.sql	product_variants.color_hex, product_images.variant_id
010	add_lens_masks.sql	product_images.lens_layer_url
011	product_types_and_jsonb.sql	product_types table, product_variants.attributes, order_items.variant_attributes
012	create_addresses.sql	user_addresses
013	create_notifications.sql	notifications, users.expo_push_token
014	category_hierarchy_and_conditions.sql	categories.parent_id, products.condition
015	multi_currency_prices.sql	exchange_rates, product_currency_prices
016	order_currency.sql	orders.currency, exchange_rate, base_total, estimated_delivery_date
017	password_resets.sql	password_reset_tokens
018	product_3d_models.sql	product_3d_models (DORMANT — route unmounted)
019	create_shops_and_marketplace.sql	shops, shop_memberships, shop_product_types, platform_settings; admins.is_platform_owner; products.shop_id (backfilled to platform shop, then NOT NULL)
020	create_shop_invites_and_ratings.sql	shop_invites; shops.avg_rating, shops.review_count
021	seed_platform_pricing.sql	platform_settings: monthly_price, yearly_price, contact_email, contact_whatsapp
Applying migrations
Manual, one file at a time:

powershell
$root = "C:\Users\vicky\Documents\FranceMan\SkyOpticlesApp\sky-opticles-v2"
Get-Content "$root\backend\.env" | ForEach-Object {
  if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$') { Set-Item -Path "Env:$($matches[1])" -Value $matches[2].Trim('"').Trim("'") }
}
$env:PGPASSWORD = $env:DB_PASSWORD

psql -P pager=off -v ON_ERROR_STOP=1 -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USER -d $env:DB_NAME `
  -f "$root\database\migrations\021_seed_platform_pricing.sql"

Remove-Item Env:PGPASSWORD, Env:DB_PASSWORD
Rules:

Migrations 001–018 are already applied in any live DB from before this session.

Do not re-run applied migrations. Use new numbered files.

Always back up first if a migration uses ALTER COLUMN ... SET NOT NULL or DROP COLUMN.

7. Authentication & Authorization
Identity model
There are two separate identity tables with separate login endpoints:

Identity	Table	Endpoint	Token payload
Customer	users	POST /api/auth/login	{ sub, email } (no role)
Admin / seller	admins	POST /api/admin/auth/login	{ sub, email, role: 'admin' }
Both are signed with the same JWT_SECRET. The role claim distinguishes them.

Customers cannot hit admin endpoints. Admins cannot hit customer endpoints. Both sides check role explicitly and reject the wrong kind with 403.

Admin roles
Every admin is one of:

Type	How identified	What they can do
Platform owner	admins.is_platform_owner = TRUE	See/act on ALL shops, create invites, approve shops, mark paid, manage categories/brands, delete orders
Seller	is_platform_owner = FALSE + has a shop_memberships row with role='owner'	Manage own shop's products, variants, images, orders. Cannot see other sellers' data
Only one admin should be the platform owner. It's set manually in the DB after migration 019:

sql
UPDATE admins SET is_platform_owner = TRUE WHERE LOWER(email) = 'admin1@gmail.com';
Middleware chain (backend)
Routes are gated by these middlewares, in this order:

Middleware	File	What it does
requireAdmin	adminAuth.js	Verifies JWT, loads admin row (including is_platform_owner), sets req.admin
requirePlatformOwner	adminAuth.js	Asserts req.admin.is_platform_owner === true, else 403
requireShopAccess	middleware/shopAccess.js	Loads shop_memberships for req.admin.id, sets req.admin.shops (array) and req.shop (seller's shop, null for owner)
requireProductAccess	(various)	Loads the product's shop_id and asserts the caller can access it. Returns 404 if not (never 403 — no existence leak)
requireVariantAccess	(various)	Same as above, resolves variant → parent product → shop
The 404-not-403 rule
When a seller attempts to access or mutate another shop's resource, the response is 404 "not found", not 403. This prevents leaking the existence of other sellers' products/orders to a curious seller probing IDs.

Cross-shop isolation — proven by test
12 isolation tests were run and all passed:

Attempt	Result
Seller PATCHes another shop's product	404
Seller DELETEs another shop's product	404
Seller POSTs variant to another shop's product	404
Seller POSTs image to another shop's product	404
Seller POSTs 3D model to another shop's product	404
Seller creates a product with another shop's shopId in body	403
Seller reads /api/admin/shops (owner-only)	403
Seller POSTs /api/admin/shops/:id/approve	403
Seller POSTs /api/admin/invites	403
Seller reads another shop's 3D models	404
Seller edits own product	✅ 200
Platform owner edits any product	✅ 200
If you ever refactor route access, re-run this test — it's the safety net.

Public (no auth) endpoints
These are intentionally open, matching standard e-commerce patterns:

GET /api/products, /api/products/:id — public product catalog

GET /api/categories, /api/brands, /api/lens-options, /api/product-types — public taxonomies

GET /api/shops, /api/shops/:slug, /api/shops/:slug/products, /api/shops/meta/types — public shop browsing

GET /api/health, GET / — health + info

POST /api/auth/register, /auth/login, /auth/forgot-password, /auth/reset-password

POST /api/admin/auth/login — admin login

GET /accept-invite/:token — seller signup HTML page

POST /api/invites/:token/accept — invite acceptance (creates admin account)

GET /api/invites/:token/validate — invite status check

Everything else requires auth.

8. Data Flows
8.1 Seller onboarding (invite → shop live)
text
Platform owner                     System                        Seller
     │                                │                              │
     ├─ POST /admin/invites {email} ─►│                              │
     │                                ├─ generate 32-byte token      │
     │                                ├─ hash (SHA-256) → shop_invites│
     │                                ├─ print URL to console        │
     │◄─ { invite_url, expires_at } ──┤                              │
     │                                │                              │
     ├─ (manually send URL to seller) ─┼─────────────────────────────►│
     │                                │                              │
     │                                │◄─ GET /accept-invite/<token>─┤
     │                                ├─ serves HTML form            │
     │                                │◄─ POST /invites/<token>/accept
     │                                │       { name, password }      │
     │                                ├─ verify token (not expired,  │
     │                                │   not used, not revoked)      │
     │                                ├─ create admins row           │
     │                                ├─ mark invite accepted        │
     │                                ├─ (seller has NO shop yet)    │
     │                                │                              │
     │                                │◄─ seller logs into admin app ─┤
     │                                ├─ Dashboard → GET /me/shop →  │
     │                                │   shop: null → wizard         │
     │                                │◄─ POST /me/shop (create draft)─┤
     │                                ├─ status = 'draft'            │
     │                                │                              │
     │                                │◄─ seller uploads logo ────────┤
     │                                │◄─ seller clicks "Submit" ─────┤
     │                                ├─ status = 'pending'          │
     │                                │                              │
     ├─ Sellers page → Approve ──────►│                              │
     │                                ├─ status = 'active'           │
     │                                ├─ trial_ends_at = NOW + 14d   │
     │                                │                              │
     │                                │◄─ shop visible to customers ──┤
     │                                │                              │
8.2 Customer places an order
text
Customer (mobile)                  Backend                          DB
     │                                │                              │
     ├─ POST /orders ────────────────►│                              │
     │  { items: [{productId,         │                              │
     │    variantId, quantity,        │                              │
     │    config}],                   │                              │
     │    shipping, customer,         │                              │
     │    currency }                  │                              │
     │                                │                              │
     │                                ├─ verify JWT (requireCustomer)
     │                                ├─ load lens option prices ───►│
     │                                ├─ load products + variants ──►│
     │                                ├─ verify each product is:
     │                                │   - status='active'
     │                                │   - shop visible (paid/trial)
     │                                │   - variant belongs to product
     │                                ├─ compute lens delta per item
     │                                ├─ verify prescription ownership
     │                                ├─ generate order_number ──────┤
     │                                ├─ INSERT orders ──────────────┤
     │                                ├─ INSERT order_items ─────────┤
     │                                ├─ UPDATE stock ───────────────┤
     │                                ├─ INSERT notifications
     │                                │  (customer + owner admin)
     │                                ├─ send Expo push (customer)
     │◄─ 201 { order } ───────────────┤                              │
Prices are computed server-side only. The client sends product IDs and configs, never prices.

8.3 Seller fulfils an order
text
Seller admin app                   Backend                          DB
     │                                │                              │
     ├─ GET /admin/orders ───────────►│                              │
     │                                ├─ if seller: filter orders ──►│
     │                                │   WHERE EXISTS (order_item
     │                                │   whose product is in their shop)
     │◄─ { orders: [...] } ───────────┤                              │
     │                                │                              │
     ├─ GET /admin/orders/:id ───────►│                              │
     │                                ├─ if seller: 404 unless every
     │                                │   item belongs to their shop
     │◄─ { order } ───────────────────┤                              │
     │                                │                              │
     ├─ PATCH /admin/orders/:id ─────►│                              │
     │   { fulfillment_status }       ├─ if seller: 403 unless order
     │                                │   is single-shop and theirs
     │                                ├─ UPDATE orders.fulfillment_status
     │                                ├─ UPDATE orders.updated_at
     │◄─ { order } ───────────────────┤                              │
Note: current model is single orders.fulfillment_status. If an order spans multiple shops, only the platform owner can change the status. Sellers see the order but get 403 on PATCH. This will change when per-shop fulfillment is implemented (§18).

8.4 Trial expiry → paywall → reactivation
text
System (no cron — visibility is query-time)   Seller                Platform owner
     │                                          │                        │
     ├─ (14 days after approval) trial_ends_at passes
     │                                          │                        │
     │                                          ├─ Dashboard loads ─────►│
     │                                          │                        │
     ├─ GET /me/shop returns billing: {         │                        │
     │     trial_expired: true,                 │                        │
     │     paid_active: false,                  │                        │
     │     requires_payment: true               │                        │
     │   }                                      │                        │
     │                                          │                        │
     ├─ SellerDashboard.jsx: show PaywallScreen │                        │
     │                                          │                        │
     │                                          ├─ clicks "Email admin" ─┤
     │                                          │    (sends via mailto:) │
     │                                          │                        │
     │                                          │                        ├─ receives email
     │                                          │                        ├─ sends bank details
     │                                          │                        │
     │                                          │◄─── EFT payment ───────┤
     │                                          │                        │
     │                                          │                        ├─ Sellers page
     │                                          │                        ├─ "Mark paid" modal
     │                                          │                        ├─ picks monthly/yearly
     │                                          │                        │
     │                                          │                        ├─ POST /admin/shops/:id/mark-paid
     │                                          │                        │   { plan }
     │                                          │                        │
     │                                          │       ┌────────────────┴────────────────┐
     │                                          │       │ UPDATE shops SET                 │
     │                                          │       │   paid_until = max(paid_until,  │
     │                                          │       │                 NOW()) + 1mo/1yr │
     │                                          │       │   subscription_plan = plan      │
     │                                          │       │   status = 'active'             │
     │                                          │       │ INSERT notification (seller)    │
     │                                          │       └────────────────┬────────────────┘
     │                                          │                        │
     ├─ shop visible to customers (paid_until > NOW())
     │                                          │                        │
     │                                          ├─ Dashboard shows ─────►│
     │                                          │   normal dashboard     │
     │                                          ├─ receives notification
Payment is manual EFT. No gateway integration. If you later add PayFast/Yoco/Stripe, replace the "Mark paid" button with a real payment link — the backend mark-paid endpoint stays the same.

8.5 Customer browses shops
text
Customer                    Mobile app                     Backend
   │                            │                              │
   ├─ opens app ───────────────►│                              │
   │                            ├─ GET /products, /categories │
   │                            │                              │
   ├─ taps SHOPS tab ──────────►│                              │
   │                            ├─ GET /shops/meta/types     │
   │                            ├─ GET /shops (visible only)  │
   │                            │                              │
   ├─ filters by type ─────────►│                              │
   │                            ├─ GET /shops?shop_type=boutique
   │                            │                              │
   ├─ taps shop ───────────────►│                              │
   │                            ├─ GET /shops/:slug (detail)  │
   │                            ├─ GET /shops/:slug/products  │
   │                            │                              │
   ├─ taps product ────────────►│                              │
   │                            ├─ GET /products/:id (full detail with
   │                            │   variants, images, 3D models)
   │                            │                              │
   ├─ swipes images, selects   │                              │
   │   variant, taps ADD LENSES │                              │
Visibility rule used in every public query:

sql
s.is_platform_owned = TRUE
OR (
  s.status = 'active' AND (
    (s.trial_ends_at IS NOT NULL AND s.trial_ends_at > NOW())
    OR (s.paid_until IS NOT NULL AND s.paid_until > NOW())
  )
)
A shop failing this rule:

Does not appear in GET /shops

Its detail returns 404

Its products return 404 in /products/:id

It does not appear in /shops/:slug/products

Its products are filtered from /api/products (public catalog)

9. API Endpoints Reference
Base URL: http://localhost:3000/api (dev)

9.1 Public (no auth)
Method	Path	Notes
GET	/	Service info
GET	/health	Health check
GET	/categories	Active categories
GET	/brands	Active brands
GET	/product-types	Product type taxonomy
GET	/products?currency=ZAR&...	Public product catalog. Filters: search, categoryId, brandId, type, condition, parentCategoryId, page, limit. Excludes products from invisible shops.
GET	/products/:id	Product detail with variants + images + models_3d. 404s if shop invisible.
GET	/lens-options?currency=ZAR	Lens configurator options
GET	/shops/meta/types	Fixed list of shop types
GET	/shops?shop_type=&city=&product_type=&search=&page=&limit=	Visible shops
GET	/shops/:slug	Visible shop detail
GET	/shops/:slug/products?currency=&type=&categoryId=&search=&page=&limit=	Visible shop's products
9.2 Customer authentication
Method	Path	Body
POST	/auth/register	{ name, email, password } → { user, token }
POST	/auth/login	{ email, password } → { user, token }
GET	/auth/me	Bearer token → { user }
PATCH	/auth/me	{ name?, phone?, email? }
PATCH	/auth/push-token	{ pushToken }
POST	/auth/forgot-password	{ email } → code prints to backend console
POST	/auth/reset-password	{ email, token, newPassword }
9.3 Customer resources (require customer JWT)
Method	Path	Notes
POST	/prescriptions/upload	multipart, file field
GET	/prescriptions/:id	auth + owner check
POST	/orders	See §8.2
GET	/orders	Own orders
GET	/orders/:id	Own order detail
GET/POST/PATCH/DELETE	/addresses[/:id]	Saved addresses CRUD
GET/PATCH	/notifications[/:id/read]	Own notifications
DELETE	/notifications/:id	Delete one
DELETE	/notifications	Clear all
9.4 Admin authentication
Method	Path	Body
POST	/admin/auth/login	{ email, password } → { admin, token }
GET	/admin/auth/me	→ { admin } (includes is_platform_owner)
PATCH	/admin/auth/me	{ name?, email?, currentPassword?, newPassword? }
9.5 Admin: catalog (platform owner only for mutations)
Method	Path	Access
POST	/categories	owner
PATCH/DELETE	/categories/:id	owner
POST	/brands	owner
PATCH/DELETE	/brands/:id	owner
POST/PATCH/DELETE	/product-types[/:id]	owner (via productTypes.js)
9.6 Admin: products (shop-scoped)
Method	Path	Access	Notes
GET	/admin/me/products?shop_id=&status=&search=&page=&limit=	any admin	Seller: own only. Owner: all, shop_id filters. Includes category_name, brand_name, image_count, variant_count.
POST	/products	admin + shop_access	Seller: forced to own shop. Owner: shopId in body, defaults to platform shop.
PATCH	/products/:id	admin + product_access	404 if not caller's shop
DELETE	/products/:id	admin + product_access	404 if not caller's shop
GET	/products/:productId/variants	admin + product_access	
POST	/products/:productId/variants	admin + product_access	
PATCH	/variants/:id/stock	admin + variant_access	
PATCH/DELETE	/variants/:id	admin + variant_access	
GET	/products/:productId/images	admin + product_access	
POST	/products/:productId/images	admin + product_access	URL-based
POST	/products/:productId/images/upload	admin + product_access	multipart, file + optional lensLayer
PATCH/DELETE	/products/:productId/images/:imageId	admin + product_access	
POST	/products/:productId/images/:imageId/lens-layer	admin + product_access	
GET	/products/:id/3d-models	DISABLED (route unmounted)	
POST	/products/:id/3d-models	DISABLED	
DELETE	/3d-models/:id	DISABLED	
POST	/products/:id/generate-3d-model	DISABLED	
9.7 Admin: seller dashboard (self-service)
Method	Path	Access	Returns
GET	/admin/me/stats	any admin	Seller-scoped: activeProducts, totalOrders, totalRevenue, chartData (last 7 days), fulfillmentData, topProducts (top 5 by revenue)
9.8 Admin: shop self-service (seller)
Method	Path	Notes
GET	/admin/me/shop	Returns { shop, billing, platform }. shop: null if seller has none. platform = { monthly_price, yearly_price, contact_email, contact_whatsapp }
POST	/admin/me/shop	Create draft. Body: { name, tagline, description, shop_type, city, province, country, postal_code, contact_email, contact_phone }. Product types optional now
PATCH	/admin/me/shop	Edit own shop
POST	/admin/me/shop/submit	draft/rejected → pending
POST	/admin/me/shop/withdraw	pending → draft
POST	/admin/me/shop/logo	multipart file — JPG/PNG/WebP, 2MB max
POST	/admin/me/shop/banner	multipart file — same limits
9.9 Admin: shop management (platform owner only)
Method	Path	Notes
GET	/admin/shops?status=&search=&page=&limit=	List all shops. Pending first, then draft, then active
GET	/admin/shops/:id	Detail with members
POST	/admin/shops/:id/approve	pending → active, sets trial_ends_at = NOW + trial_days
POST	/admin/shops/:id/reject	{ reason } → rejected
POST	/admin/shops/:id/suspend	active → suspended
POST	/admin/shops/:id/unsuspend	suspended → active
PATCH	/admin/shops/:id/billing	{ trial_ends_at?, paid_until?, subscription_plan? } — direct DB manipulation
POST	/admin/shops/:id/mark-paid	{ plan: 'monthly'|'yearly' } — extends paid_until, activates, notifies seller
9.10 Admin: invites (platform owner only)
Method	Path	Body	Returns
POST	/admin/invites	{ email }	{ id, email, expires_at, invite_url }. Also prints URL to backend console
GET	/admin/invites	—	All invites (accepted, pending, revoked)
DELETE	/admin/invites/:id	—	Revokes pending invite
9.11 Invite acceptance (public)
Method	Path	Body	Notes
GET	/invites/:token/validate	—	Returns { valid, email, expires_at } or 404/410
POST	/invites/:token/accept	{ name, password }	Creates admin, marks invite accepted
GET	/accept-invite/:token	—	HTML page served by backend (not JSON)
9.12 Admin: orders
Method	Path	Access	Notes
GET	/admin/orders?payment_status=&fulfillment_status=&archived=&search=&page=&limit=	any admin	Seller: filtered by own-shop items. Owner: all
GET	/admin/orders/:id	any admin	Seller: 404 unless their items present
PATCH	/admin/orders/:id	any admin	Seller: 403 if multi-shop or not theirs
POST	/admin/orders/:id/mark-paid	owner only	403 for seller
DELETE	/admin/orders/:id	owner only	403 for seller. Soft delete
GET	/admin/prescriptions/:id	any admin	Streams PDF/image
9.13 Admin: stats
Method	Path	Access
GET	/admin/stats	owner only — platform-wide aggregates
GET	/admin/me/stats	any admin — scoped stats
9.14 Admin: lens options (platform owner only for mutations)
Method	Path	Access
POST/PATCH/DELETE	/admin/lens-groups[/:id]	owner
POST/PATCH/DELETE	/admin/lens-options[/:id]	owner
GET	/lens-options	public
9.15 Admin: notifications
Method	Path	Access
GET	/admin/notifications	any admin — own notifications
PATCH	/admin/notifications/:id/read	any admin
PATCH	/admin/notifications/read-all	any admin
10. Backend File Map
Located at backend/src/routes/.

File	Purpose	Notes
app.js	Express setup, mount all routes	Mounts each route via app.use('/api', require('./routes/...'))
db.js	PostgreSQL pool	pg.Pool with env-based config
middleware/shopAccess.js	requireShopAccess, canAccessShop, accessibleShopIds, isShopVisibleToCustomers	Core authorization layer
catalogue.js	Products, categories, brands	Products POST/PATCH/DELETE have shop scoping. Categories/brands are requirePlatformOwner. Public product list/detail filter by shop visibility
inventory.js	Product variants + images + uploads	11 routes all gated with requireAdmin, requireShopAccess, requireProductAccess|requireVariantAccess
product3d.js	3D models	DISABLED in app.js (comment out the mount to re-enable). Routes still exist and are protected
adminAuth.js	Admin login + /me + requireAdmin + requirePlatformOwner	Exports both middlewares
auth.js	Customer auth + password reset	Duplicated requireCustomer logic — see §18
orders.js	Customer order placement + own orders	Server-side pricing authority
adminOrders.js	Admin order list/detail/update/delete	Has shop scoping. Owner-only for mark-paid + delete
adminStats.js	Owner dashboard stats + /admin/me/stats	Split by role
adminLensOptions.js	Lens group/option CRUD	Platform owner only
lensOptions.js	Public lens options read	
productTypes.js	Product type CRUD	Platform owner only for mutations
prescriptions.js	Rx upload + read	Customer ownership checks
addresses.js	Saved addresses	
notifications.js	Notification list/read	
shopsPublic.js	Public shop endpoints	/shops, /shops/:slug, /shops/:slug/products, /shops/meta/types
shopsSeller.js	Seller shop self-service	/admin/me/shop (GET/POST/PATCH), submit/withdraw, logo/banner upload, /admin/me/products, /admin/me/stats, getPlatformPricing() helper
shopsAdmin.js	Owner shop management	List, approve, reject, suspend, unsuspend, billing patch, mark-paid
shopInvites.js	Invite create/list/revoke/accept	Token hashing, expiry, one-time use
invitePage.js	HTML /accept-invite/:token	Serves the seller signup page directly from Express
Route mounting order (in app.js)
Order matters only for path matching. shopsPublic must be mounted before other routes if any of them also handle /shops — but currently no conflicts.

11. Admin App File Map
Located at admin/src/.

Entry & shell
File	Purpose
App.jsx	AdminAuthProvider wrapper, login gate, Shell component with sidebar, nav filtering by is_platform_owner
auth/AdminAuthContext.jsx	Auth state, signIn, signOut, updateProfile
LoginPage.jsx	Login screen
API clients (two separate files, easy to confuse)
File	Purpose
api/client.js	Owner-facing API. Categories, brands, products, variants, images, orders, lens options, listMyProducts (new). Auth header auto-attached
api/adminClient.js	Auth + shop API. login, me, updateProfile, getMyShop, getMyDashboardStats, createMyShop, updateMyShop, submitMyShop, withdrawMyShop, uploadShopLogo, uploadShopBanner, listShops, getShop, approveShop, rejectShop, suspendShop, unsuspendShop, updateShopBilling, markShopPaid, listInvites, createInvite, revokeInvite
Rule of thumb: if it's about shops or auth, use adminClient. If it's about catalog or orders, use client.js.

Pages
Page	Who sees	Purpose
Dashboard.jsx	Owner only	Platform-wide stats with charts
SellerDashboard.jsx	Sellers	Seller-scoped stats. Routes by shop status: no-shop → wizard, draft/rejected → wizard, pending → "awaiting approval", paywall (trial expired), suspended → "suspended", active → dashboard with hero+stats
Products.jsx	Both	Product list. Sellers see own shop only (via listMyProducts). Shows 📷 N badge for products with <4 images
Orders.jsx	Both	Order list. Sellers see filtered
Sellers.jsx	Owner only	Two tabs: Shops (approve/reject/suspend/mark-paid) and Invites (create/copy/revoke)
CreateShopWizard.jsx	Sellers	Shop creation/edit form. Hides "Submit for approval" when shop is active (edit-only mode)
PaywallScreen.jsx	Sellers with expired trial	"Subscribe" screen with pricing from platform_settings + email/WhatsApp CTAs
Categories.jsx	Owner only (via nav filter)	Category CRUD
Brands.jsx	Owner only	Brand CRUD
Variants.jsx	Both	Variant list, uses listMyProducts
Images.jsx	Both	Image gallery for a product. 3D section hidden. Shows "X of 4 recommended" nudge
LensOptions.jsx	Owner only	Lens group/option CRUD
ProductTypes.jsx	Owner only	Product type CRUD
Settings.jsx	Both	Admin profile (name, email, password)
LoginPage.jsx	Public	Login screen
Nav filtering in App.jsx
The NAV array has role: 'all' | 'owner'. Shell filters to visibleNav based on admin.is_platform_owner. Sellers see 6 items (Dashboard, Products, Orders, Variants, Images, Settings). Owner sees all 10+.

Styles
admin/src/styles.css — the entire stylesheet. Includes:

Base palette (navy/gold/cream/teal)

ERP table patterns (.erp-page, .erp-table-wrap, .erp-table)

Modal patterns (.modal-overlay, .modal-panel)

Order pills (.order-pill)

Seller dashboard (.seller-page, .seller-hero, .seller-stat-grid, .seller-stat-tile, .seller-chart-*)

Paywall (.paywall-*)

Toast (.erp-toast)

Both owner and seller use the same navy/gold palette — a previous experiment with terracotta was reverted. Differentiate by content, not color.

12. Mobile App File Map
Located at mobile/.

Root
File	Purpose
App.js	Root screen switcher (guest → welcome/catalogue/detail/cart/signin/signup/forgotPassword; authenticated → DashboardScreen with detail overlay)
utils/api.js	API client — API_URL hardcoded
utils/product.js	imageFor, price, category, applyFilters, buildTabHierarchy
utils/CurrencyContext.js	Currency state (ZAR/USD/GBP)
cart/CartContext.js	AsyncStorage-persisted cart
auth/AuthContext.js	Customer auth state
notifications/NotificationContext.js	In-app notification state
styles.ts	Global guest screens stylesheet
Screens
Screen	Purpose
WelcomeScreen (in App.js)	Guest intro carousel
CatalogueScreen (in App.js)	Guest product catalog
DetailScreen.jsx	Product detail with image carousel (new: ProductImageCarousel), variant picker, lens wizard launcher, "SOLD BY [shop name]"
LensWizard.jsx	6-step configurator (activity, usage, prescription, lens type/index, upgrades, review)
CartScreen.jsx	Guest cart
SignInScreen.jsx / SignUpScreen.jsx / ForgotPasswordScreen.jsx	Auth
DashboardScreen.jsx	Signed-in shell: TopBar, notification bell, bottom tabs. "Shop" tab has segmented control PRODUCTS/SHOPS
CheckoutScreen.jsx	Checkout flow
ShopListScreen.jsx	NEW — Shop list with search, filter chips, 2-column grid
ShopDetailScreen.jsx	NEW — Shop banner (full-bleed logo), name with verified pill, meta row, product grid
shopStyles.js	NEW — Styles for shop screens
Components
Component	Purpose
ProductCard.jsx	2-column grid card
ProductImageCarousel.jsx	NEW — swipeable carousel + fullscreen viewer
VariantPicker.jsx	Colour swatches / size picker
FilterTabs.jsx	Category chips
ConditionDropdown.jsx	New/used filter
BottomTabs.jsx	Bottom nav
NotificationIcon.jsx	Bell with badge
AdminBell.jsx	Admin-side bell (used in admin app, not mobile)
OrderTracker.jsx	Status timeline
AddressModal.jsx	Add/edit address
ProductSpecs.jsx	Spec list for non-configurable products
Product3DViewer.jsx	DORMANT — 3D viewer, no longer rendered
Typewriter.jsx	Animation
Brand.jsx	Logo component
Icons.jsx	SVG icon set
PrimaryButton.jsx	Standard button
Mobile API URL
Currently hardcoded to http://10.195.227.20:3000/api in mobile/utils/api.js. This must be updated whenever:

The backend host IP changes

You deploy to production

The user's network changes

Before launch, refactor this to read from process.env.EXPO_PUBLIC_API_URL or expo-constants.

13. Shop Lifecycle States
Status	Set by	Visible to customers?	Notes
draft	Seller creates	No	Seller can edit, upload logo, submit
pending	Seller submits	No	Seller sees "Awaiting approval", can withdraw
active	Owner approves OR mark-paid	Yes if trial or paid	Live shop
rejected	Owner rejects	No	Shows rejection reason, seller can edit + resubmit
suspended	Owner suspends	No	Seller sees "Shop is offline"
closed	(future)	No	For seller-initiated closure
Status transitions
text
draft ──submit──► pending ──approve──► active ──suspend──► suspended
  ▲                 │                    │                    │
  │                 └──withdraw──►draft  │                    └─unsuspend─►active
  │                                      │
  └──edit──── rejected ◄──reject───pending
  │
  └──edit──── (any non-suspended non-closed status)
active shops can revert to pending only if you re-add the "product_types requires re-approval" rule — currently removed (see §18).

Billing states (orthogonal to status)
Computed at query time in shopsSeller.js:computeBilling():

text
trial_active      = trial_ends_at > NOW()
paid_active       = paid_until > NOW()
requires_payment  = status == 'active' && !trial_active && !paid_active
is_visible_to_customers = status == 'active' && (trial_active || paid_active)
Platform-owned shops: is_visible_to_customers is always true (bypass).

14. Trial & Paywall Mechanics
Trial
Length: read from platform_settings.trial_days (default 14)

Start: at the moment the shop transitions from pending → active (i.e. when owner clicks "Approve")

End: trial_ends_at timestamp

Trial does not start on account creation — this was a deliberate decision so sellers get the full trial window after approval, not while waiting in the review queue.

Paywall trigger
When a seller loads the Dashboard in the admin app:

GET /admin/me/shop returns { shop, billing, platform }

billing.trial_expired === true AND billing.paid_active === false AND shop.status === 'active' AND !shop.is_platform_owned

SellerDashboard.jsx renders <PaywallScreen> instead of the normal dashboard

Other tabs still work. Sellers can access Products, Orders, Variants, Images, Settings — they just can't see analytics and can't list new products (well, they technically could, but the products wouldn't appear in the public catalog because the shop is invisible).

Paywall UI
The <PaywallScreen> shows:

Trial end date

"Paused" list (shop hidden, no search, no orders)

"Still works" list (fulfil existing orders, view earnings, prepare products)

Two plan cards with prices from platform_settings

"How to subscribe" section with contact email + optional WhatsApp

"Refresh status" button

No payment gateway. All payment is via bank transfer. The seller emails or WhatsApps the platform owner, who manually activates via "Mark paid".

Reactivation
Platform owner action, in Sellers.jsx:

Sellers → Shops tab

Find the shop, look for the gold checkmark icon in Actions column (only shows for active non-platform shops)

Click → modal → pick Monthly or Yearly

Backend: UPDATE shops SET paid_until = max(paid_until, NOW()) + INTERVAL '1 month'|'1 year', subscription_plan = plan, status = 'active'

Notification inserted for the seller's owner admin

Shop becomes visible to customers immediately (no cron, no delay — visibility is computed at query time)

Pricing (editable via DB)
sql
-- Change monthly price to R249:
UPDATE platform_settings SET value = '249' WHERE key = 'monthly_price';

-- Change yearly price:
UPDATE platform_settings SET value = '2499' WHERE key = 'yearly_price';

-- Change contact email:
UPDATE platform_settings SET value = 'newemail@example.com' WHERE key = 'contact_email';

-- Add WhatsApp (digits only, international format):
UPDATE platform_settings SET value = '27821234567' WHERE key = 'contact_whatsapp';
No code change or restart needed. The paywall reflects new values on next load.

15. Platform Settings
See §5.2 for schema. Current keys:

Key	Type	Current value	Purpose
trial_days	int	14	Trial length
monthly_price	int (ZAR)	199	Paywall displays "R 199 / month"
yearly_price	int (ZAR)	1999	Paywall displays "R 1,999 / year"
contact_email	string	admin1@gmail.com	Paywall "Email admin" mailto:
contact_whatsapp	string	(empty)	Paywall "WhatsApp" button — hidden when empty
To change any value:

powershell
$root = "C:\Users\vicky\Documents\FranceMan\SkyOpticlesApp\sky-opticles-v2"
Get-Content "$root\backend\.env" | ForEach-Object {
  if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$') { Set-Item -Path "Env:$($matches[1])" -Value $matches[2].Trim('"').Trim("'") }
}
$env:PGPASSWORD = $env:DB_PASSWORD
psql -P pager=off -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USER -d $env:DB_NAME `
  -c "UPDATE platform_settings SET value = '249' WHERE key = 'monthly_price';"
Remove-Item Env:PGPASSWORD, Env:DB_PASSWORD
16. Test Accounts
⚠️ All passwords below appeared in chat transcripts and must be rotated before real use.

Email	Password	Role	Notes
admin1@gmail.com	alpha@0233	Platform owner	The account created via create-admin.js. Has is_platform_owner = TRUE
seller-1266779242@example.com	sellerpass123	Seller (test)	Owns "Vicky's Eyewear Boutique" (shop id 2)
Rotate via the Settings page in the admin app. Or:

powershell
$root = "C:\Users\vicky\Documents\FranceMan\SkyOpticlesApp\sky-opticles-v2"
Get-Content "$root\backend\.env" | ForEach-Object {
  if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$') { Set-Item -Path "Env:$($matches[1])" -Value $matches[2].Trim('"').Trim("'") }
}
Push-Location "$root\backend"
$newPass = 'NewStrongPassword123!'
$hash = node -e "const b = require('bcryptjs'); b.hash(process.argv[1], 10).then(h => console.log(h));" $newPass
Pop-Location
$env:PGPASSWORD = $env:DB_PASSWORD
psql -P pager=off -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USER -d $env:DB_NAME `
  -c "UPDATE admins SET password_hash = '$hash', updated_at = NOW() WHERE LOWER(email) = 'admin1@gmail.com';"
Remove-Item Env:PGPASSWORD, Env:DB_PASSWORD
Customer accounts exist too (created via the mobile app) — no known credentials to document.

17. Security Model & Test Coverage
What's proven
Cross-shop isolation: 12/12 tests (see §7)

Seller cannot mark order paid or delete orders (403)

Seller cannot invite other sellers (403)

Seller cannot access owner-only endpoints (403)

Sellers see only their products in list endpoints

Sellers see only orders containing their items

Anonymous cannot hit mutation endpoints (401)

Invite tokens are hashed (SHA-256), one-time use, 72h expiry

Passwords are bcrypt-hashed (cost 10)

JWT is signed with JWT_SECRET, contains role: 'admin' for admin tokens

Customer and admin tokens are not interchangeable

What's NOT covered (manual testing required)
Rate limiting on login/register/forgot-password — none implemented

Prescription file cleanup on user deletion — files orphan on disk

Invite email delivery — manual copy-paste only (no email provider)

Password reset for admins — manual only (no self-service)

CSRF — no protection, but all mutations require Authorization header (mitigates)

3D image generation — route unmounted to save cost

Known authorization boundaries
Categories and brands are platform-owner only for mutations. Sellers choose from what exists.

Product types can be created by platform owner via ProductTypes.jsx. Sellers pick any type on create.

Product type is no longer restricted per shop — see §18. shop_product_types is populated but not enforced.

18. Known Issues & TODO
🔴 Must fix before real launch
1. Rotate all passwords — see §16.

2. Mobile API URL is hardcoded — mobile/utils/api.js line 2. Refactor to read from process.env.EXPO_PUBLIC_API_URL. Until then, every network/device change requires a code edit + Metro restart.

3. No production deployment — everything runs locally. To go live you need:

VPS (DigitalOcean / Hetzner / AWS Lightsail — ~R150-300/month)

Node.js 20+ installed

PostgreSQL installed

Caddy or Nginx for HTTPS

Real domain (e.g. skyopticles.co.za)

PM2 or systemd to keep backend running

4. No backup schedule — backups/ directory has manual dumps. Set up a scheduled pg_dump (Task Scheduler or cron).

5. Notifications query needs admin_id index — as notification volume grows, GET /admin/notifications may slow. Not urgent at current scale.

🟡 Should do before scaling past 5 sellers
6. Per-shop fulfillment split (migration 022) — right now orders has a single fulfillment_status for the whole order. If a customer buys from two shops in one order:

Only the platform owner can update status

Sellers see it but get 403 on PATCH

The fix: new table order_seller_fulfillments (id, order_id, shop_id, status, tracking_number, ...), plus order_items.seller_fulfillment_id. Then adminOrders.js can scope per-shop. Until then, expect this to be a support ticket every time a real multi-shop order happens.

7. Payment gateway — currently manual EFT. If you have 5+ paying sellers, manual activation becomes a bottleneck. Options:

PayFast (SA, ~3 hours to integrate)

Yoco (SA, card reader + online)

Stripe (international)

mark-paid endpoint stays the same — you'd add a webhook that calls it.

8. Emails — password reset codes and invite links currently print to the backend console. Options:

Resend (easiest, free tier 100/day)

SendGrid

AWS SES

~1 hour each to integrate.

🟢 Nice to have / backlog
9. Verify email addresses — currently no email verification step. Sellers could sign up with fake emails.

10. Reviews / ratings — shops.avg_rating and review_count exist but no UI. Add a reviews table + admin moderation.

11. Category cleanup — current categories include "VW", "BMW", "Toyota", "Ford", "Burgers", "Fries", "Drinks". These don't belong in an eyewear marketplace. Clean up before selling real shops.

12. Multiple shops per seller — currently enforced by DB constraint one_shop_per_admin_owner. If you decide to allow this, drop that index and update requireShopAccess to accept a shop_id query param.

13. Staff members per shop — shop_memberships.role = 'staff' exists but no UI to invite them. Add a "Invite staff member" flow if sellers want to add employees.

14. Product type restrictions — this was removed. The shop_product_types table is orphaned. If you want it back: re-add the "What will you sell?" wizard section, re-add the shopAllowsProductType checks in catalogue.js, and re-add the re-approval-on-expansion logic in shopsSeller.js PATCH.

15. Restore 3D feature — the product3d.js route is commented out in app.js. The table, files, and mobile viewer all exist. To re-enable, uncomment the mount and remove the {false && ...} wrapper in Images.jsx. Decision needed: the AI generation path costs ~$0.20 per model via NanoGPT. If you only allow uploads (not AI generation), it's free.

16. Test payment flow end-to-end — you've tested individual pieces but never placed a real order through the whole stack with a real seller. Do this once before inviting a real customer.

19. Common Operations
Invite a new seller
powershell
$root = "C:\Users\vicky\Documents\FranceMan\SkyOpticlesApp\sky-opticles-v2"
Get-Content "$root\backend\.env" | ForEach-Object {
  if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$') { Set-Item -Path "Env:$($matches[1])" -Value $matches[2].Trim('"').Trim("'") }
}
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/admin/auth/login" -ContentType "application/json" `
  -Body (@{ email = "admin1@gmail.com"; password = "alpha@0233" } | ConvertTo-Json)
$auth = @{ Authorization = "Bearer $($login.data.token)" }

$inv = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/admin/invites" -Headers $auth `
  -ContentType "application/json" -Body (@{ email = "new-seller@example.com" } | ConvertTo-Json)

Write-Host "`nSend this URL to the seller:" -ForegroundColor Yellow
Write-Host $inv.data.invite_url -ForegroundColor Cyan
Better path: do it through the admin UI → Sellers page → "Invite seller" button → copy URL.

Approve a pending shop
Via admin UI: Sellers page → Shops tab → find pending shop → green checkmark.

Via API:

powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/admin/shops/2/approve" -Headers $auth
Mark a shop paid
Via admin UI: Sellers page → Shops tab → gold checkmark on the shop → pick monthly/yearly → confirm.

Via API:

powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/admin/shops/2/mark-paid" -Headers $auth `
  -ContentType "application/json" -Body (@{ plan = "monthly" } | ConvertTo-Json)
Force a shop into expired-trial state (for testing)
powershell
$env:PGPASSWORD = $env:DB_PASSWORD
psql -P pager=off -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USER -d $env:DB_NAME `
  -c "UPDATE shops SET trial_ends_at = NOW() - INTERVAL '1 day', paid_until = NULL WHERE id = 2;"
Remove-Item Env:PGPASSWORD, Env:DB_PASSWORD
Rotate a seller/admin password
Use the Settings page in the admin app (each admin can change their own password after providing their current password).

If locked out, use the bcrypt+SQL script in §16.

Reset a customer password
Customer → mobile app → "Forgot password" → enter email → look at backend terminal for the 6-char code → enter code + new password.

Or via API:

powershell
$body = @{ email = "customer@example.com" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/forgot-password" -ContentType "application/json" -Body $body
# Read code from terminal, then:
$resetBody = @{
  email = "customer@example.com"
  token = "ABC123"
  newPassword = "newpassword123"
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/reset-password" -ContentType "application/json" -Body $resetBody
Change platform pricing
See §14.

Change trial length
powershell
$env:PGPASSWORD = $env:DB_PASSWORD
psql -P pager=off -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USER -d $env:DB_NAME `
  -c "UPDATE platform_settings SET value = '21' WHERE key = 'trial_days';"
Remove-Item Env:PGPASSWORD, Env:DB_PASSWORD
Note: existing trials already started keep their original end date. This only affects new trials (shops approved after the change).

Back up the database
powershell
$root = "C:\Users\vicky\Documents\FranceMan\SkyOpticlesApp\sky-opticles-v2"
Get-Content "$root\backend\.env" | ForEach-Object {
  if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$') { Set-Item -Path "Env:$($matches[1])" -Value $matches[2].Trim('"').Trim("'") }
}
$env:PGPASSWORD = $env:DB_PASSWORD
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
pg_dump -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USER -d $env:DB_NAME -F c -f "$root\backups\sky-$stamp.dump"
Remove-Item Env:PGPASSWORD, Env:DB_PASSWORD
Restore from backup
powershell
$env:PGPASSWORD = $env:DB_PASSWORD
psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USER -d postgres -c "DROP DATABASE $($env:DB_NAME);"
psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USER -d postgres -c "CREATE DATABASE $($env:DB_NAME);"
pg_restore -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USER -d $env:DB_NAME "$root\backups\sky-20261028_120000.dump"
Remove-Item Env:PGPASSWORD, Env:DB_PASSWORD
20. Gotchas & Traps
PowerShell 5.1 encoding (Windows)
Never use Get-Content -Raw + Set-Content on files with non-ASCII content (em-dashes, apostrophes, emoji). PS 5.1 defaults to ANSI/CP-1252, and every smart quote becomes mojibake on round-trip.

Use one of:

powershell
# Option A — byte-safe (recommended)
$text = [System.Text.Encoding]::UTF8.GetString([System.IO.File]::ReadAllBytes($file))
# ... edit $text ...
[System.IO.File]::WriteAllText($file, $text, (New-Object System.Text.UTF8Encoding($false)))
powershell
# Option B — explicit UTF-8 both ways
$text = Get-Content $file -Raw -Encoding UTF8
# ... edit ...
Set-Content -Path $file -Value $text -NoNewline -Encoding UTF8
Safest option: use VS Code for anything more than trivial text edits.

PowerShell 5.1 syntax traps
else on a new line fails. if {...} then else {...} on next line is two statements. Always } else { on one line, or use $(if(cond){'a'}else{'b'}) inline.

$PID is read-only. It's the current process ID. Don't use $pid = ... — it silently fails and breaks subsequent logic.

.Count on a single object returns $null in PS 5.1. (Where-Object {...}).Count returns 1 in PS 7 but $null in PS 5.1 when there's exactly 1 match. Wrap with @( ... ).Count always.

$LASTEXITCODE is per-exe, not per-pipe. Check it right after the native command, not after Set-Content.

Variable assignment on the same line as Remove-Item — Remove-Item $a, $b$c = $d fails. One statement per line.

Contains() uses LF vs CRLF correctly but Replace() preserves whatever bytes it sees. If your Find string has CRLF but the file has LF, Contains() returns false even when it "looks" identical. Prefer regex with \r?\n.

Expo / Metro traps
SDK version mismatch. If the phone has Expo Go SDK 58 but the project is SDK 57, they can't connect. Uninstall Expo Go on the phone and install the SDK 57 APK from https://expo.dev/go.

Metro port 8081 can only run one instance. If it hangs at "Welcome to Metro", check for orphaned node processes:

powershell
Get-NetTCPConnection -LocalPort 8081 -State Listen | ForEach-Object {
  Get-Process -Id $_.OwningProcess
}
Kill stale PIDs, then restart.

npx.cmd expo start --clear clears the Metro cache. Use this after any file renaming or new component files.

Phone must be on the same WiFi as the backend machine. localhost doesn't work on the phone — the mobile API URL is a LAN IP.

Vite / Electron traps
Ctrl+R reloads the renderer — this does NOT reload the Vite dev server. If you added a new file or changed an import, Ctrl+C → npm run electron:dev.

"Transform failed" errors — usually a brace imbalance from a bad file paste. Check the indicated line, or replace the entire file with a clean copy.

Ctrl+Shift+I opens Chromium devtools inside Electron. Useful for API errors — Console tab shows all fetch failures.

General backend traps
Restart the backend after every route/middleware change. Nodemon usually does this automatically, but a require() cache issue can hide a change. If in doubt, Ctrl+C and restart.

Migration 019 set products.shop_id NOT NULL. Any code that INSERTs into products must supply shop_id. This is already done in catalogue.js, but if you add a new product-creation path, remember this.

app.js mounts adminAuthRoutes twice — a harmless artifact from earlier. If you're refactoring, remove the duplicate line, but it doesn't cause problems.

404 vs 403 discipline. Cross-shop access returns 404 (not 403) to prevent existence leaks. Don't change this without understanding the security implication.

Order pricing is server-authoritative. The mobile client sends IDs and configs, never prices. If you modify POST /orders, keep it that way.

product_type is a text column, not a FK. The product_types table exists but isn't referenced. Migration 019's shop_product_types also doesn't enforce anymore.

shop_product_types is orphaned. Populated during shop creation but not read anywhere. If you re-add restrictions, wire it up; otherwise it's dead data (safe to leave).

21. Current Data State
As of the last session commit:

Shops
ID	Name	Slug	Type	Status	Owner
1	SKY OPTICLES	sky-opticles	brand	active	Platform (admin1@gmail.com)
2	Vicky's Eyewear Boutique	vicky-s-eyewear-boutique	boutique	active	seller-1266779242@example.com
3	Fat Cake City	fat-cake-city	?	active	(created during testing)
4	Kilimanjaro	kilimanjaro	?	active	(created during testing)
Products
~10 products across shops 1, 2, 3, 4. Categories include "Optics" (id 16), "Vegan" (id 44), etc. Note: category cleanup is a TODO (§18).

One leftover test product Isolation Test Target (id 34) may still exist — archive or delete it.

Admins
ID	Email	Name	Platform Owner
1	admin1@gmail.com	admin	TRUE
2	seller-1266779242@example.com	Test Seller …	FALSE
Notifications
Many test notifications exist in the DB from testing approve/mark-paid flows. Safe to clear if you want a clean slate.

Handoff Checklist for the Next Developer / AI
Before you make any change:

Read this entire document. No skipping.

Verify local setup: backend running, admin running, mobile reachable. If any fails, fix that first.

Run the isolation test (in §7) if you touch any route with requireAdmin. If it fails, you've regressed security.

Rotate test passwords (§16) before doing anything user-facing.

Back up the DB before any migration or destructive operation.

When you make a change:

New migration: add 022_...sql, never modify 001–021.

New route: if it touches shop-owned data, chain requireAdmin, requireShopAccess, requireProductAccess (or equivalent). Return 404 not 403 for cross-shop access.

New admin UI page: add it to NAV in App.jsx with role: 'all' | 'owner'. If role is owner, sellers won't see the nav item.

New customer screen: add to mobile/App.js screen state switch, or add as a sub-screen of DashboardScreen if it's tab-based.

File edits on Windows: use VS Code. If you must use PowerShell, use byte-safe reads/writes (§20).

When you're done:

Test the seller flow end-to-end (invite → create shop → submit → approve → paywall → mark paid → live)

Test the customer flow end-to-end (browse shops → open shop → open product → add to cart → place order)

Update this document if anything material changes