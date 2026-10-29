import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Package, ShoppingBag, Wallet, Clock, AlertCircle, Trophy,
  ShieldAlert, Hourglass, RotateCcw,
} from 'lucide-react';
import { adminApi } from '../api/adminClient.js';
import CreateShopWizard from './CreateShopWizard.jsx';
import PaywallScreen from './PaywallScreen.jsx';

const PALETTE = {
  brick: '#101D2C',
  brickDark: '#1D3044',
  copper: '#D7B987',
  sand: '#F1EDE5',
  ink: '#17283A',
  muted: '#7C8792',
  border: '#E7E3DC',
  ok: '#2E8D86',
  warn: '#C9962E',
};

const PIE_COLORS = ['#101D2C', '#D7B987', '#2E8D86', '#7C8792', '#1D3044', '#A88B54'];

function formatR(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'R —';
  return `R ${n.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateShort(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function StatTile({ icon: Icon, label, value, caption }) {
  return (
    <div className="seller-stat-tile">
      <div className="seller-stat-tile-head">
        <span className="seller-stat-icon"><Icon size={16} /></span>
        <span className="seller-stat-label">{label}</span>
      </div>
      <div className="seller-stat-value">{value}</div>
      {caption && <div className="seller-stat-caption">{caption}</div>}
    </div>
  );
}

export default function SellerDashboard({ admin }) {
  const [shopData, setShopData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);

  const firstName = admin?.name ? admin.name.split(' ')[0] : 'there';

  const loadAll = React.useCallback(async () => {
    try {
      const [shopRes, statsRes] = await Promise.all([
        adminApi.getMyShop(),
        adminApi.getMyDashboardStats(),
      ]);
      setShopData(shopRes?.data || { shop: null, billing: null, platform: null });
      setStats(statsRes?.data || null);
      setError('');
    } catch (e) {
      setError(e.message || 'Failed to load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) {
    return <div className="erp-empty"><p className="muted">Loading your shop…</p></div>;
  }

  if (error) {
    return (
      <div className="erp-alert">
        <AlertCircle size={16} />
        <span>{error}</span>
      </div>
    );
  }

  const shop = shopData?.shop || null;
  const billing = shopData?.billing || null;
  const platform = shopData?.platform || null;
  const hasShop = !!shop;
  const daysLeft = billing?.days_left_in_trial;

  if (!hasShop) {
    return <CreateShopWizard onShopSaved={loadAll} />;
  }

  if (shop.status === 'draft' || shop.status === 'rejected') {
    return <CreateShopWizard existingShop={shop} onShopSaved={loadAll} />;
  }

  if (editMode) {
    return (
      <CreateShopWizard
        existingShop={shop}
        onShopSaved={() => {
          loadAll();
          setEditMode(false);
        }}
      />
    );
  }

  if (shop.status === 'pending') {
    return (
      <div className="seller-page">
        <div className="seller-hero">
          <p className="seller-hero-eyebrow">PENDING APPROVAL</p>
          <h1 className="seller-hero-title">{shop.name}</h1>
          <p className="seller-hero-sub">
            Your shop has been submitted. The platform team is reviewing it and will approve or send it back with feedback.
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '40px 28px' }}>
          <Hourglass size={40} color="#D7B987" style={{ marginBottom: 14 }} />
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900 }}>Under review</h2>
          <p className="muted" style={{ fontSize: 13, maxWidth: 480, margin: '0 auto 20px', lineHeight: 1.55 }}>
            You'll get an in-app notification when it's approved. In the meantime you can withdraw your submission to make further changes.
          </p>
          <button
            className="ghost"
            onClick={async () => {
              if (!window.confirm('Withdraw your submission and go back to editing?')) return;
              try { await adminApi.withdrawMyShop(); loadAll(); }
              catch (e) { setError(e.message); }
            }}
            type="button"
          >
            <RotateCcw size={14} style={{ marginRight: 6 }} />
            Withdraw submission
          </button>
        </div>
      </div>
    );
  }

  if (shop.status === 'active' && billing?.trial_expired && !billing?.paid_active && !shop.is_platform_owned) {
    return (
      <PaywallScreen
        shop={shop}
        billing={billing}
        platform={platform}
        onRefresh={loadAll}
      />
    );
  }

  if (shop.status === 'suspended') {
    return (
      <div className="seller-page">
        <div className="seller-hero">
          <p className="seller-hero-eyebrow">SHOP SUSPENDED</p>
          <h1 className="seller-hero-title">{shop.name}</h1>
          <p className="seller-hero-sub">
            Your shop is currently suspended and hidden from customers. Contact the platform administrator to resolve.
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '40px 28px' }}>
          <ShieldAlert size={40} color="#C0392B" style={{ marginBottom: 14 }} />
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900 }}>Shop is offline</h2>
          <p className="muted" style={{ fontSize: 13, maxWidth: 480, margin: '0 auto', lineHeight: 1.55 }}>
            You can still sign in and view historical data, but customers cannot see your shop or products. Reach out to the platform admin to restore it.
          </p>
        </div>
      </div>
    );
  }

  if (shop.status === 'closed') {
    return (
      <div className="seller-page">
        <div className="seller-hero">
          <p className="seller-hero-eyebrow">SHOP CLOSED</p>
          <h1 className="seller-hero-title">{shop.name}</h1>
          <p className="seller-hero-sub">
            This shop is closed. Contact the platform administrator if you'd like to reopen it.
          </p>
        </div>
      </div>
    );
  }

  const fulfillment = stats?.fulfillmentData || [];
  const chartData = stats?.chartData || [];
  const topProducts = stats?.topProducts || [];

  return (
    <div className="seller-page">
      <div className="seller-hero">
        <p className="seller-hero-eyebrow">YOUR SHOP AT A GLANCE</p>
        <h1 className="seller-hero-title">Welcome back, {firstName}.</h1>
        <p className="seller-hero-sub">
          {shop.name}
          {shop.tagline ? ` — ${shop.tagline}` : ''}
          {billing?.trial_active && daysLeft !== null
            ? ` · Trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`
            : ''}
        </p>
        {billing?.trial_active && daysLeft !== null && (
          <div className="seller-hero-badge">
            <Clock size={12} />
            <span>
              TRIAL · {daysLeft} DAY{daysLeft === 1 ? '' : 'S'} LEFT
            </span>
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <button
            className="ghost"
            onClick={() => setEditMode(true)}
            type="button"
            style={{
              background: 'rgba(255,255,255,0.08)',
              borderColor: 'rgba(255,255,255,0.2)',
              color: 'var(--gold)',
              height: 34,
              fontSize: 11,
              padding: '0 14px',
            }}
          >
            Edit shop
          </button>
        </div>
      </div>

      <div className="seller-stat-grid">
        <StatTile
          icon={Package}
          label="Live listings"
          value={stats.activeProducts}
          caption={`${stats.totalProducts} total (incl. drafts)`}
        />
        <StatTile
          icon={ShoppingBag}
          label="Orders received"
          value={stats.totalOrders}
          caption={`${stats.paidOrders} paid`}
        />
        <StatTile
          icon={Wallet}
          label="Your earnings"
          value={formatR(stats.totalRevenue)}
          caption="From paid orders"
        />
        <StatTile
          icon={Clock}
          label={billing?.trial_active && daysLeft !== null ? 'Trial days left' : 'Shop status'}
          value={
            billing?.trial_active && daysLeft !== null
              ? daysLeft
              : shop.status.toUpperCase()
          }
          caption={
            billing?.trial_active && daysLeft !== null
              ? `Ends ${formatDateShort(billing.trial_ends_at)}`
              : billing?.paid_active
              ? 'Subscription active'
              : 'Not currently live'
          }
        />
      </div>

      <div className="seller-chart-grid">
        <div className="seller-chart-card">
          <header className="seller-chart-head">
            <Trophy size={16} />
            <h3>Sales — last 7 days</h3>
          </header>
          <div style={{ minHeight: 260 }}>
            {chartData.every((d) => (d.orders || 0) === 0) ? (
              <p className="muted small" style={{ padding: '20px 0' }}>
                No sales yet this week. Once orders start coming in, you'll see them here.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={PALETTE.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: PALETTE.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: PALETTE.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${v}`} />
                  <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fill: PALETTE.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#FFFFFF', border: `1px solid ${PALETTE.border}`, borderRadius: 4, fontSize: 12 }}
                    formatter={(v, name) => (name === 'revenue' ? [`R ${Number(v).toFixed(2)}`, 'Revenue'] : [v, 'Orders'])}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: PALETTE.muted }} />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" stroke={PALETTE.brick} strokeWidth={3} dot={{ r: 4 }} name="revenue" />
                  <Line yAxisId="right" type="monotone" dataKey="orders" stroke={PALETTE.copper} strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="orders" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="seller-chart-card">
          <header className="seller-chart-head">
            <ShoppingBag size={16} />
            <h3>Order status breakdown</h3>
          </header>
          <div style={{ minHeight: 260 }}>
            {fulfillment.length === 0 ? (
              <p className="muted small" style={{ padding: '20px 0' }}>
                You have no orders yet. When they arrive, you'll see their status here.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={fulfillment}
                    dataKey="count"
                    nameKey="status"
                    outerRadius={88}
                    innerRadius={46}
                    paddingAngle={2}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {fulfillment.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#FFFFFF', border: `1px solid ${PALETTE.border}`, borderRadius: 4, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: PALETTE.muted }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="seller-chart-card" style={{ marginTop: 4 }}>
        <header className="seller-chart-head">
          <Trophy size={16} />
          <h3>Your best sellers</h3>
        </header>
        {topProducts.length === 0 ? (
          <p className="muted small" style={{ padding: '12px 0' }}>
            No sales yet. Your top products will appear here once orders start.
          </p>
        ) : (
          <ul className="seller-top-list">
            {topProducts.map((p, i) => (
              <li key={p.product_id}>
                <span className="seller-top-rank">{i + 1}</span>
                <span className="seller-top-name">{p.name}</span>
                <div className="seller-top-meta">
                  <span className="seller-top-revenue">{formatR(p.revenue)}</span>
                  <span className="seller-top-count">
                    {p.order_count} order{p.order_count === 1 ? '' : 's'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}