import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Package, ShoppingBag, Wallet, Clock, AlertCircle, Trophy, ArrowRight, X,
} from 'lucide-react';
import { adminApi } from '../api/adminClient.js';
import { api } from '../api/client.js';
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

export default function SellerDashboard({ admin, onNavigate }) {
  const [shopData, setShopData] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  
  // State to dismiss the top banner
  const [showHero, setShowHero] = useState(true);

  const firstName = admin?.name ? admin.name.split(' ')[0] : 'there';

  const loadAll = React.useCallback(async () => {
    try {
      const [shopRes, statsRes, ordersRes] = await Promise.all([
        adminApi.getMyShop(),
        adminApi.getMyDashboardStats(),
        api.listOrders({ limit: 5 }).catch(() => ({ data: [] })),
      ]);
      
      setShopData(shopRes?.data || { shop: null, billing: null, platform: null });
      setStats(statsRes?.data || null);
      setRecentOrders(ordersRes.data || []);
      setError('');
    } catch (e) {
      setError(e.message || 'Failed to load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) {
    return <div className="erp-empty"><p className="muted">Loading your business dashboard…</p></div>;
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

  // --- Lifecycle Gates ---
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
        onShopSaved={() => { loadAll(); setEditMode(false); }}
      />
    );
  }
  if (shop.status === 'pending') {
    return (
      <div className="seller-page">
        <div className="seller-hero">
          <p className="seller-hero-eyebrow">PENDING APPROVAL</p>
          <h1 className="seller-hero-title">{shop.name}</h1>
          <p className="seller-hero-sub">The platform team is reviewing your shop. You'll be notified once approved.</p>
        </div>
      </div>
    );
  }
  if (shop.status === 'active' && billing?.trial_expired && !billing?.paid_active && !shop.is_platform_owned) {
    return <PaywallScreen shop={shop} billing={billing} platform={platform} onRefresh={loadAll} />;
  }
  if (shop.status === 'suspended') {
    return (
      <div className="seller-page">
        <div className="seller-hero" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
          <p className="seller-hero-eyebrow" style={{ color: '#B91C1C' }}>SHOP SUSPENDED</p>
          <h1 className="seller-hero-title" style={{ color: '#991B1B' }}>{shop.name}</h1>
          <p className="seller-hero-sub" style={{ color: '#7F1D1D' }}>Your shop is offline. Please contact platform support to resolve this.</p>
        </div>
      </div>
    );
  }

  // --- Active Dashboard Data ---
  const fulfillment = stats?.fulfillmentData || [];
  const chartData = stats?.chartData || [];
  const topProducts = stats?.topProducts || [];
  const pendingOrdersCount = recentOrders.filter(o => o.fulfillment_status === 'pending').length;

  return (
    <div className="seller-page">
      
      {/* 1. Slim, Dismissible Header Hero */}
      {showHero && (
        <div className="seller-hero" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <h1 className="seller-hero-title" style={{ fontSize: 16, margin: 0 }}>Welcome back, {firstName}.</h1>
              <p className="seller-hero-sub" style={{ fontSize: 12, margin: '2px 0 0' }}>
                {shop.name} {shop.tagline ? `— ${shop.tagline}` : ''}
              </p>
            </div>
            {billing?.trial_active && daysLeft !== null && (
              <div className="seller-hero-badge" style={{ margin: 0, padding: '4px 10px', background: 'rgba(215,185,135,0.2)', border: '1px solid rgba(215,185,135,0.4)', color: '#D7B987' }}>
                <Clock size={12} />
                <span>TRIAL · {daysLeft} DAY{daysLeft === 1 ? '' : 'S'} LEFT</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="ghost"
              onClick={() => setEditMode(true)}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#D7B987', height: 28, fontSize: 11, padding: '0 12px' }}
            >
              Edit Profile
            </button>
            <button
              onClick={() => setShowHero(false)}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}
              title="Dismiss banner"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 2. Action Required Banner */}
      {pendingOrdersCount > 0 && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertCircle color="#DC2626" size={20} />
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#991B1B' }}>Action Required</h3>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#7F1D1D' }}>You have {pendingOrdersCount} unfulfilled order{pendingOrdersCount === 1 ? '' : 's'} waiting to be processed.</p>
            </div>
          </div>
          <button className="primary" onClick={() => onNavigate('orders')} style={{ backgroundColor: '#DC2626', borderColor: '#DC2626' }}>
            Fulfill Orders <ArrowRight size={14} style={{ marginLeft: 6 }} />
          </button>
        </div>
      )}

      {/* 3. Stats Row */}
      <div className="seller-stat-grid">
        <StatTile icon={Package} label="Live Listings" value={stats.activeProducts} caption={`${stats.totalProducts} total (incl. drafts)`} />
        <StatTile icon={ShoppingBag} label="Orders Received" value={stats.totalOrders} caption={`${stats.paidOrders} paid`} />
        <StatTile icon={Wallet} label="Your Earnings" value={formatR(stats.totalRevenue)} caption="From paid orders" />
        <StatTile icon={Clock} label={billing?.trial_active ? 'Trial Days Left' : 'Shop Status'} value={billing?.trial_active && daysLeft !== null ? daysLeft : shop.status.toUpperCase()} caption={billing?.trial_active ? `Ends ${formatDateShort(billing.trial_ends_at)}` : (billing?.paid_active ? 'Subscription active' : 'Not currently live')} />
      </div>

      {/* 4. Charts Row */}
      <div className="seller-chart-grid">
        <div className="seller-chart-card">
          <header className="seller-chart-head">
            <Trophy size={16} />
            <h3>Sales — Last 7 Days</h3>
          </header>
          <div style={{ minHeight: 260 }}>
            {chartData.every(d => (d.orders || 0) === 0) ? (
              <p className="muted small" style={{ padding: '20px 0' }}>No sales yet this week.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={PALETTE.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: PALETTE.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: PALETTE.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R${v}`} />
                  <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fill: PALETTE.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#FFFFFF', border: `1px solid ${PALETTE.border}`, borderRadius: 4, fontSize: 12 }} formatter={(v, name) => (name === 'revenue' ? [`R ${Number(v).toFixed(2)}`, 'Revenue'] : [v, 'Orders'])} />
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
            <h3>Order Status Breakdown</h3>
          </header>
          <div style={{ minHeight: 260 }}>
            {fulfillment.length === 0 ? (
              <p className="muted small" style={{ padding: '20px 0' }}>No orders yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={fulfillment} dataKey="count" nameKey="status" outerRadius={88} innerRadius={46} paddingAngle={2} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {fulfillment.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#FFFFFF', border: `1px solid ${PALETTE.border}`, borderRadius: 4, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: PALETTE.muted }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 5. Recent Orders Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Recent Orders</h2>
          <button className="ghost" onClick={() => onNavigate('orders')} style={{ height: 30, fontSize: 11 }}>View All</button>
        </div>
        
        {recentOrders.length === 0 ? (
          <p className="muted small" style={{ padding: '20px 0' }}>No orders yet. Once customers buy your products, they'll appear here.</p>
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(o => (
                <tr key={o.id}>
                  <td className="erp-cell-strong">{o.order_number}</td>
                  <td>{o.customer_name}</td>
                  <td className="erp-cell-muted">{formatDateShort(o.created_at)}</td>
                  <td className="erp-cell-price">{formatR(o.total)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge badge-${o.fulfillment_status === 'pending' ? 'draft' : 'active'}`}>
                      {o.fulfillment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 6. Top Products */}
      <div className="seller-chart-card" style={{ marginTop: 4 }}>
        <header className="seller-chart-head">
          <Trophy size={16} />
          <h3>Your Best Sellers</h3>
        </header>
        {topProducts.length === 0 ? (
          <p className="muted small" style={{ padding: '12px 0' }}>No sales yet. Your top products will appear here once orders start.</p>
        ) : (
          <ul className="seller-top-list">
            {topProducts.map((p, i) => (
              <li key={p.product_id}>
                <span className="seller-top-rank">{i + 1}</span>
                <span className="seller-top-name">{p.name}</span>
                <div className="seller-top-meta">
                  <span className="seller-top-revenue">{formatR(p.revenue)}</span>
                  <span className="seller-top-count">{p.order_count} order{p.order_count === 1 ? '' : 's'}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}