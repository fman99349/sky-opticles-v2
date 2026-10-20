import React, { useEffect, useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  Package, Layers, Award, Wallet, BarChart3, Activity,
  AlertCircle, CheckCircle2,
} from 'lucide-react';
import { api } from '../api/client.js';

// Colour palette shared with the mobile app.
// Used by both the charts and the stat tiles.
const PALETTE = {
  navy: '#101D2C',
  navyLight: '#1D3044',
  gold: '#D7B987',
  teal: '#2E8D86',
  muted: '#7C8792',
  cream: '#F8F5EF',
  ink: '#17283A',
};

// Colour sequence for pie slices. Repeats if there are more slices
// than entries.
const PIE_COLORS = [
  '#101D2C', // navy
  '#D7B987', // gold
  '#2E8D86', // teal
  '#7C8792', // muted
  '#1D3044', // navy light
  '#A88B54', // darker gold
  '#1F6E68', // darker teal
  '#B0B7C1', // light muted
];

// Backend caps page limit at 100. For catalogues under that size this
// gives us the full set for aggregation. Larger catalogues would need a
// dedicated stats endpoint on the backend — noted as a future item.
const FETCH_LIMIT = 100;

// Turn `contact_lenses` into `Contact Lenses`.
function pretty(slug) {
  return String(slug || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ZAR price, no currency symbol repetition in tiles.
function formatZar(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'R —';
  return `R ${n.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Stat tile — a single KPI with an icon, a value, and a caption.
function StatTile({ icon: Icon, label, value, caption }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-head">
        <span className="stat-tile-icon"><Icon size={18} /></span>
        <span className="stat-tile-label">{label}</span>
      </div>
      <div className="stat-tile-value">{value}</div>
      {caption && <div className="stat-tile-caption">{caption}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [health, setHealth] = useState({ state: 'loading' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Backend health
      try {
        const h = await api.health();
        if (!cancelled) setHealth({ state: 'ok', data: h });
      } catch (e) {
        if (!cancelled) setHealth({ state: 'error', message: e.message });
      }

      // 2. Products (up to the cap)
      try {
        const result = await api.listProducts({ limit: FETCH_LIMIT });
        if (!cancelled) {
          setProducts(result?.data || []);
          setTotalProducts(result?.pagination?.total ?? (result?.data?.length ?? 0));
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load products.');
      }

      // 3. Categories + brands (small lists, no cap issue)
      try {
        const [c, b] = await Promise.all([
          api.listCategories(),
          api.listBrands(),
        ]);
        if (!cancelled) {
          setCategories(c?.data || []);
          setBrands(b?.data || []);
        }
      } catch {
        /* leave empty */
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // --- Aggregations, all derived from real fetched data ---

  const stats = useMemo(() => {
    const avg =
      products.length > 0
        ? products.reduce((s, p) => s + Number(p.price || 0), 0) / products.length
        : 0;
    return {
      products: totalProducts,
      categories: categories.length,
      brands: brands.length,
      avgPrice: avg,
    };
  }, [products, categories, brands, totalProducts]);

  const byCategory = useMemo(() => {
    const m = new Map();
    for (const p of products) {
      const key = p.category_name || 'Uncategorised';
      m.set(key, (m.get(key) || 0) + 1);
    }
    return [...m.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [products]);

  const byType = useMemo(() => {
    const m = new Map();
    for (const p of products) {
      const key = pretty(p.product_type || 'unknown');
      m.set(key, (m.get(key) || 0) + 1);
    }
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [products]);

  const byBrand = useMemo(() => {
    const m = new Map();
    for (const p of products) {
      const key = p.brand_name || 'No brand';
      m.set(key, (m.get(key) || 0) + 1);
    }
    return [...m.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [products]);

  const hasData = products.length > 0;

    return (
    <div className="dashboard-erp">
      {/* --- Page heading --- */}
      <div className="dash-heading">
        <h1 className="dash-title">Sky Optics Dashboard Management System</h1>
        <p className="dash-subtitle">
          Real-time overview of your catalogue, brands, and operations.
        </p>
      </div>

      {/* --- Row 1: KPI tiles --- */}
      <div className="stat-grid">
        <StatTile
          icon={Package}
          label="Active products"
          value={stats.products}
          caption="Visible on mobile storefront"
        />
        <StatTile
          icon={Layers}
          label="Categories"
          value={stats.categories}
          caption="Catalogue groupings"
        />
        <StatTile
          icon={Award}
          label="Brands"
          value={stats.brands}
          caption="Registered labels"
        />
        <StatTile
          icon={Wallet}
          label="Average price"
          value={formatZar(stats.avgPrice)}
          caption={
            hasData
              ? `Across ${products.length} of ${stats.products}`
              : 'No products yet'
          }
        />
      </div>

      {error && (
        <div className="erp-alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* --- Row 2: category pie + product type bar --- */}
      <div className="chart-grid">
        <div className="chart-card">
          <header className="chart-card-head">
            <BarChart3 size={16} />
            <h3>Products by category</h3>
          </header>

          <div className="chart-body">
            {loading ? (
              <p className="muted small">Loading chart…</p>
            ) : byCategory.length === 0 ? (
              <p className="muted small">No products to chart yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={88}
                    innerRadius={46}
                    paddingAngle={2}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {byCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: '1px solid #E7E3DC',
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: PALETTE.muted }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="chart-card">
          <header className="chart-card-head">
            <BarChart3 size={16} />
            <h3>Products by type</h3>
          </header>

          <div className="chart-body">
            {loading ? (
              <p className="muted small">Loading chart…</p>
            ) : byType.length === 0 ? (
              <p className="muted small">No products to chart yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byType}>
                  <CartesianGrid stroke="#E7E3DC" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: PALETTE.muted, fontSize: 11 }}
                    axisLine={{ stroke: '#E7E3DC' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: PALETTE.muted, fontSize: 11 }}
                    axisLine={{ stroke: '#E7E3DC' }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: '1px solid #E7E3DC',
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" fill={PALETTE.gold} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* --- Row 3: brand bar + backend side card --- */}
      <div className="chart-grid-3">
        <div className="chart-card">
          <header className="chart-card-head">
            <BarChart3 size={16} />
            <h3>Top brands by product count</h3>
          </header>

          <div className="chart-body">
            {loading ? (
              <p className="muted small">Loading chart…</p>
            ) : byBrand.length === 0 ? (
              <p className="muted small">No products to chart yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byBrand} layout="vertical">
                  <CartesianGrid stroke="#E7E3DC" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: PALETTE.muted, fontSize: 11 }}
                    axisLine={{ stroke: '#E7E3DC' }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fill: PALETTE.muted, fontSize: 11 }}
                    axisLine={{ stroke: '#E7E3DC' }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#FFFFFF',
                      border: '1px solid #E7E3DC',
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" fill={PALETTE.teal} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="side-column">
          <div className="side-card">
            <header className="chart-card-head">
              <Activity size={16} />
              <h3>Backend</h3>
            </header>

            {health.state === 'loading' && (
              <p className="muted small">Checking…</p>
            )}
            {health.state === 'ok' && (
              <div className="health-ok">
                <div className="health-row">
                  <CheckCircle2 size={14} />
                  <span>Connected</span>
                </div>
                <p className="muted small">
                  {health.data?.service} · database {health.data?.database} · user {health.data?.databaseUser}
                </p>
              </div>
            )}
            {health.state === 'error' && (
              <div className="health-err">
                <div className="health-row">
                  <AlertCircle size={14} />
                  <span>Unavailable</span>
                </div>
                <p className="muted small">{health.message}</p>
              </div>
            )}
          </div>

          <div className="side-card">
            <header className="chart-card-head">
              <AlertCircle size={16} />
              <h3>Storefront visibility</h3>
            </header>
            <p className="muted small">
              The mobile storefront only shows products whose status is <code>active</code>.
              A product created as <code>draft</code> is saved in the database but is not
              returned by <code>GET /api/products</code>. There is currently no
              product-update endpoint, so a draft cannot be promoted afterwards.
            </p>
          </div>

          <div className="side-card">
            <header className="chart-card-head">
              <BarChart3 size={16} />
              <h3>Chart source</h3>
            </header>
            <p className="muted small">
              Charts are computed client-side from the first{' '}
              <code>{FETCH_LIMIT}</code> active products returned by the API. When the
              catalogue grows beyond that, a dedicated stats endpoint will replace this.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}