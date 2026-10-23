import React, { useEffect, useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import {
  Package, Layers, Wallet, BarChart3, TrendingUp, AlertCircle,
} from 'lucide-react';
import { api } from '../api/client.js';

const PALETTE = {
  navy: '#101D2C',
  navyLight: '#1D3044',
  gold: '#D7B987',
  teal: '#2E8D86',
  muted: '#7C8792',
  cream: '#F8F5EF',
  ink: '#17283A',
};

const PIE_COLORS = [
  '#101D2C', '#D7B987', '#2E8D86', '#7C8792', '#1D3044', '#A88B54', '#1F6E68', '#B0B7C1',
];

const FETCH_LIMIT = 100;

function formatZar(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'R —';
  return `R ${n.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // New Stats State
  const [stats, setStats] = useState(null);
  
  // Products state for the Catalogue Pie Chart
  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Fetch both the platform stats and the products for the chart
        const [statsRes, productsRes] = await Promise.all([
          api.getDashboardStats(),
          api.listProducts({ limit: FETCH_LIMIT })
        ]);

        if (!cancelled) {
          setStats(statsRes.data);
          setProducts(productsRes?.data || []);
          setTotalProducts(productsRes?.pagination?.total ?? 0);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load dashboard data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Aggregate Products by Category for the Pie Chart
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

  if (loading) {
    return <div className="erp-empty"><p className="muted">Loading dashboard analytics…</p></div>;
  }

  if (error) {
    return <div className="erp-alert"><AlertCircle size={16} /><span>{error}</span></div>;
  }

  return (
    <div className="dashboard-erp">
      {/* --- Page heading --- */}
      <div className="dash-heading">
        <h1 className="dash-title">DMD Dashboard Management System</h1>
        <p className="dash-subtitle">
          Real-time overview of your revenue, orders, and catalogue.
        </p>
      </div>

      {/* --- Row 1: KPI tiles --- */}
      <div className="stat-grid">
        <StatTile
          icon={Package}
          label="Active products"
          value={stats.totalProducts}
          caption="Visible on mobile storefront"
        />
        <StatTile
          icon={Layers}
          label="Total Orders"
          value={stats.totalOrders}
          caption="All-time orders"
        />
        <StatTile
          icon={Wallet}
          label="Total Revenue"
          value={formatZar(stats.totalRevenue)}
          caption="From paid orders"
        />
        <StatTile
          icon={TrendingUp}
          label="Avg. Order Value"
          value={formatZar(stats.aov)}
          caption="Revenue ÷ Orders"
        />
      </div>

      {/* --- Row 2: Fulfillment Pie + Revenue Line Graph --- */}
      <div className="chart-grid">
        <div className="chart-card">
          <header className="chart-card-head">
            <BarChart3 size={16} />
            <h3>Orders by Fulfillment Status</h3>
          </header>

          <div className="chart-body">
            {stats.fulfillmentData.length === 0 ? (
              <p className="muted small">No orders to chart yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={stats.fulfillmentData}
                    dataKey="count"
                    nameKey="status"
                    outerRadius={88}
                    innerRadius={46}
                    paddingAngle={2}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {stats.fulfillmentData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E7E3DC', borderRadius: 4, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: PALETTE.muted }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="chart-card">
          <header className="chart-card-head">
            <TrendingUp size={16} />
            <h3>Revenue & Orders (Last 7 Days)</h3>
          </header>

          <div className="chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E7E3DC" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: PALETTE.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fill: PALETTE.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${v}`} />
                <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fill: PALETTE.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #E7E3DC', borderRadius: 4, fontSize: 12 }}
                  formatter={(value, name) => name === 'revenue' ? [`R ${value.toFixed(2)}`, 'Revenue'] : [value, 'Orders']}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: PALETTE.muted }} />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke={PALETTE.teal} strokeWidth={3} dot={{ r: 4 }} name="revenue" />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke={PALETTE.gold} strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="orders" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- Row 3: Full-width Catalogue Chart --- */}
      <div className="chart-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="chart-card">
          <header className="chart-card-head">
            <Package size={16} />
            <h3>Products by Category</h3>
          </header>

          <div className="chart-body">
            {byCategory.length === 0 ? (
              <p className="muted small">No products to chart yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byCategory}>
                  <CartesianGrid stroke="#E7E3DC" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: PALETTE.muted, fontSize: 11 }} axisLine={{ stroke: '#E7E3DC' }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: PALETTE.muted, fontSize: 11 }} axisLine={{ stroke: '#E7E3DC' }} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E7E3DC', borderRadius: 4, fontSize: 12 }} />
                  <Bar dataKey="value" fill={PALETTE.teal} radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}