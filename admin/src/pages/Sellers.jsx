import React, { useEffect, useState } from 'react';
import {
  Plus, RefreshCw, X, Copy, Mail, Check, XCircle, ShieldAlert,
  Store, Trash2,
} from 'lucide-react';
import { adminApi } from '../api/adminClient.js';

const STATUS_BADGE = {
  draft: 'badge-draft',
  pending: 'badge-draft',
  active: 'badge-active',
  rejected: 'badge-archived',
  suspended: 'badge-archived',
  closed: 'badge-archived',
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-ZA', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

// ---------------------------------------------------------------------------
// Invite modal — creates invite, shows copyable URL.
// ---------------------------------------------------------------------------
function InviteModal({ onClose, onCreated }) {
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Email is required.');
    setCreating(true);
    try {
      const result = await adminApi.createInvite(email.trim());
      setCreated(result.data);
      onCreated();
    } catch (e) {
      setError(e.message || 'Could not create invite.');
    } finally {
      setCreating(false);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(created.invite_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy automatically — select and copy manually.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <header className="modal-head">
          <div>
            <h2>Invite a seller</h2>
            <p className="muted small">
              The seller will receive a link to set a password and create their account. They can then set up their shop.
            </p>
          </div>
          <button className="icon-ghost" onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        {!created ? (
          <form className="form" onSubmit={submit}>
            <label>
              Seller email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seller@example.com"
                autoFocus
                disabled={creating}
              />
            </label>
            {error && <p className="status-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={onClose} disabled={creating}>
                Cancel
              </button>
              <button type="submit" disabled={creating || !email.trim()}>
                {creating ? 'Creating…' : 'Create invite'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div
              style={{
                padding: '12px 14px',
                background: '#F1F9F8',
                border: '1px solid rgba(46,141,134,0.3)',
                borderRadius: 6,
                marginBottom: 16,
                fontSize: 12,
                color: '#2E8D86',
                fontWeight: 700,
              }}
            >
              Invite created for <strong>{created.email}</strong>. Copy the link and send it via WhatsApp or email.
            </div>

            <label style={{ display: 'block', marginBottom: 14 }}>
              <span
                style={{
                  display: 'block',
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginBottom: 6,
                }}
              >
                Invite URL — copy now, cannot be shown again
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={created.invite_url}
                  readOnly
                  onClick={(e) => e.target.select()}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    background: '#FAF7F1',
                    color: 'var(--ink)',
                  }}
                />
                <button type="button" className="primary" onClick={copyUrl} style={{ whiteSpace: 'nowrap' }}>
                  <Copy size={14} />
                  <span style={{ marginLeft: 6 }}>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </label>

            <p className="muted small" style={{ margin: '8px 0 0' }}>
              Expires: <strong>{formatDateTime(created.expires_at)}</strong> (72 hours)
            </p>

            {error && <p className="status-error">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mark paid modal
// ---------------------------------------------------------------------------
function MarkPaidModal({ shop, onClose, onDone }) {
  const [plan, setPlan] = useState('monthly');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setSaving(true);
    setError('');
    try {
      await adminApi.markShopPaid(shop.id, plan);
      onDone?.();
      onClose?.();
    } catch (e) {
      setError(e.message || 'Could not mark paid.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <header className="modal-head">
          <div>
            <h2>Mark subscription paid</h2>
            <p className="muted small">
              Extends paid time for <strong>{shop.name}</strong>. The shop goes live immediately.
            </p>
          </div>
          <button className="icon-ghost" onClick={onClose} type="button" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="form">
          <label
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              padding: '12px 14px', border: `1px solid ${plan === 'monthly' ? 'var(--gold)' : 'var(--border)'}`,
              background: plan === 'monthly' ? 'rgba(215,185,135,0.10)' : 'var(--white)',
              borderRadius: 6, cursor: 'pointer',
              textTransform: 'none', letterSpacing: 'normal', fontSize: 13, fontWeight: 500, color: 'var(--ink)',
            }}
          >
            <input
              type="radio"
              name="plan"
              checked={plan === 'monthly'}
              onChange={() => setPlan('monthly')}
            />
            <span><strong>Monthly</strong> — adds 1 month from current paid date (or now)</span>
          </label>

          <label
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              padding: '12px 14px', border: `1px solid ${plan === 'yearly' ? 'var(--gold)' : 'var(--border)'}`,
              background: plan === 'yearly' ? 'rgba(215,185,135,0.10)' : 'var(--white)',
              borderRadius: 6, cursor: 'pointer',
              textTransform: 'none', letterSpacing: 'normal', fontSize: 13, fontWeight: 500, color: 'var(--ink)',
            }}
          >
            <input
              type="radio"
              name="plan"
              checked={plan === 'yearly'}
              onChange={() => setPlan('yearly')}
            />
            <span><strong>Yearly</strong> — adds 1 year from current paid date (or now)</span>
          </label>
        </div>

        {error && <p className="status-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={confirm} disabled={saving}>
            {saving ? 'Saving…' : `Mark paid (${plan})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shops tab
// ---------------------------------------------------------------------------
function ShopsTab() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [markPaidFor, setMarkPaidFor] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = filter === 'all' ? {} : { status: filter };
      const result = await adminApi.listShops(params);
      setShops(result.data || []);
    } catch (e) {
      setError(e.message || 'Could not load shops.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const approve = async (shop) => {
    if (!window.confirm(`Approve "${shop.name}"? They go live with a 14-day trial.`)) return;
    try { await adminApi.approveShop(shop.id); load(); }
    catch (e) { setError(e.message); }
  };

  const reject = async (shop) => {
    const reason = window.prompt(`Reject "${shop.name}" — reason?`);
    if (!reason || !reason.trim()) return;
    try { await adminApi.rejectShop(shop.id, reason.trim()); load(); }
    catch (e) { setError(e.message); }
  };

  const suspend = async (shop) => {
    if (!window.confirm(`Suspend "${shop.name}"? They're hidden from customers.`)) return;
    try { await adminApi.suspendShop(shop.id); load(); }
    catch (e) { setError(e.message); }
  };

  const unsuspend = async (shop) => {
    if (!window.confirm(`Unsuspend "${shop.name}"? They go live again.`)) return;
    try { await adminApi.unsuspendShop(shop.id); load(); }
    catch (e) { setError(e.message); }
  };

  const FILTERS = [
    { key: 'all',       label: 'All' },
    { key: 'pending',   label: 'Pending' },
    { key: 'active',    label: 'Active' },
    { key: 'draft',     label: 'Draft' },
    { key: 'rejected',  label: 'Rejected' },
    { key: 'suspended', label: 'Suspended' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={filter === f.key ? 'primary' : 'ghost'}
            onClick={() => setFilter(f.key)}
            style={{ padding: '0 14px', height: 32, fontSize: 11 }}
          >
            {f.label}
          </button>
        ))}
        <button className="ghost" onClick={load} style={{ marginLeft: 'auto', height: 32 }}>
          <RefreshCw size={12} />
          <span style={{ marginLeft: 6 }}>Refresh</span>
        </button>
      </div>

      {error && <div className="erp-alert"><span>{error}</span></div>}

      <div className="erp-table-wrap">
        {loading ? (
          <div className="erp-empty"><p className="muted">Loading shops…</p></div>
        ) : shops.length === 0 ? (
          <div className="erp-empty">
            <Store size={36} color="#7C8792" />
            <p className="erp-empty-title">
              No shops {filter === 'all' ? 'yet' : `with status "${filter}"`}
            </p>
            <p className="muted small">Use "Invite seller" to bring your first shop online.</p>
          </div>
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                <th>Shop</th>
                <th>Contact</th>
                <th>Type</th>
                <th>Location</th>
                <th style={{ textAlign: 'right' }}>Products</th>
                <th style={{ textAlign: 'center' }}>Trial</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shops.map((s) => {
                const trialEnds = s.trial_ends_at ? new Date(s.trial_ends_at) : null;
                const paidUntil = s.paid_until ? new Date(s.paid_until) : null;
                const now = new Date();
                const trialActive = trialEnds && trialEnds > now;
                const paidActive = paidUntil && paidUntil > now;
                const daysLeft = trialActive ? Math.ceil((trialEnds - now) / 86400000) : null;

                return (
                  <tr key={s.id}>
                    <td>
                      <div className="erp-cell-strong">{s.name}</div>
                      <div className="erp-cell-sub">/{s.slug}</div>
                    </td>
                    <td className="erp-cell-muted">{s.contact_email || '—'}</td>
                    <td>{s.shop_type}</td>
                    <td className="erp-cell-muted">{s.city}, {s.province}</td>
                    <td className="erp-cell-price">{s.product_count ?? '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {trialActive ? (
                        <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 800 }}>
                          {daysLeft}d left
                        </span>
                      ) : paidActive ? (
                        <span style={{ fontSize: 11, color: 'var(--teal)', fontWeight: 800 }}>Paid</span>
                      ) : s.status === 'active' ? (
                        <span style={{ fontSize: 11, color: 'var(--err)', fontWeight: 800 }}>Expired</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${STATUS_BADGE[s.status] || 'badge-archived'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <div className="erp-row-actions">
                        {s.status === 'pending' && (
                          <>
                            <button className="erp-row-action" onClick={() => approve(s)} title="Approve">
                              <Check size={13} color="#2E8D86" />
                            </button>
                            <button className="erp-row-action danger" onClick={() => reject(s)} title="Reject">
                              <XCircle size={13} />
                            </button>
                          </>
                        )}
                        {s.status === 'active' && !s.is_platform_owned && (
                          <button
                            className="erp-row-action"
                            onClick={() => setMarkPaidFor(s)}
                            title="Mark subscription paid"
                          >
                            <Check size={13} color="#C9962E" />
                          </button>
                        )}
                        {s.status === 'active' && (
                          <button className="erp-row-action danger" onClick={() => suspend(s)} title="Suspend">
                            <ShieldAlert size={13} />
                          </button>
                        )}
                        {s.status === 'suspended' && (
                          <button className="erp-row-action" onClick={() => unsuspend(s)} title="Unsuspend">
                            <Check size={13} color="#2E8D86" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {markPaidFor && (
        <MarkPaidModal
          shop={markPaidFor}
          onClose={() => setMarkPaidFor(null)}
          onDone={load}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invites tab
// ---------------------------------------------------------------------------
function InvitesTab({ onShowInviteModal, refreshKey }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await adminApi.listInvites();
      setInvites(result.data || []);
    } catch (e) {
      setError(e.message || 'Could not load invites.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [refreshKey]);

  const revoke = async (inv) => {
    if (!window.confirm(`Revoke invite for ${inv.email}?`)) return;
    try { await adminApi.revokeInvite(inv.id); load(); }
    catch (e) { setError(e.message); }
  };

  const statusOf = (inv) => {
    if (inv.revoked_at) return 'revoked';
    if (inv.accepted_at) return 'accepted';
    if (new Date(inv.expires_at) < new Date()) return 'expired';
    return 'pending';
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, alignItems: 'center' }}>
        <button className="ghost" onClick={load} style={{ height: 32 }}>
          <RefreshCw size={12} />
          <span style={{ marginLeft: 6 }}>Refresh</span>
        </button>
        <button className="primary" onClick={onShowInviteModal} style={{ marginLeft: 'auto', height: 32 }}>
          <Plus size={12} />
          <span style={{ marginLeft: 6 }}>Invite seller</span>
        </button>
      </div>

      {error && <div className="erp-alert"><span>{error}</span></div>}

      <div className="erp-table-wrap">
        {loading ? (
          <div className="erp-empty"><p className="muted">Loading invites…</p></div>
        ) : invites.length === 0 ? (
          <div className="erp-empty">
            <Mail size={36} color="#7C8792" />
            <p className="erp-empty-title">No invites yet</p>
            <p className="muted small">Click "Invite seller" to send your first one.</p>
          </div>
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Created</th>
                <th>Expires</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => {
                const st = statusOf(inv);
                return (
                  <tr key={inv.id}>
                    <td className="erp-cell-strong">{inv.email}</td>
                    <td className="erp-cell-muted">{formatDate(inv.created_at)}</td>
                    <td className="erp-cell-muted">{formatDate(inv.expires_at)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${
                        st === 'pending'  ? 'badge-draft' :
                        st === 'accepted' ? 'badge-active' :
                                            'badge-archived'
                      }`}>
                        {st}
                      </span>
                    </td>
                    <td>
                      <div className="erp-row-actions">
                        {st === 'pending' && (
                          <button className="erp-row-action danger" onClick={() => revoke(inv)} title="Revoke">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Sellers() {
  const [tab, setTab] = useState('shops');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteRefresh, setInviteRefresh] = useState(0);

  return (
    <div className="erp-page">
      <div className="erp-page-head">
        <div>
          <h2 className="erp-page-title">Sellers</h2>
          <p className="muted small">
            Invite sellers, approve new shops, suspend misbehaving ones.
          </p>
        </div>
        <div className="erp-page-actions">
          <button className="primary" onClick={() => setInviteModalOpen(true)}>
            <Plus size={16} />
            <span>Invite seller</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className={tab === 'shops' ? 'primary' : 'ghost'}
          onClick={() => setTab('shops')}
          style={{ padding: '0 18px', height: 36, fontSize: 11 }}
        >
          Shops
        </button>
        <button
          className={tab === 'invites' ? 'primary' : 'ghost'}
          onClick={() => setTab('invites')}
          style={{ padding: '0 18px', height: 36, fontSize: 11 }}
        >
          Invites
        </button>
      </div>

      {tab === 'shops' ? (
        <ShopsTab />
      ) : (
        <InvitesTab
          onShowInviteModal={() => setInviteModalOpen(true)}
          refreshKey={inviteRefresh}
        />
      )}

      {inviteModalOpen && (
        <InviteModal
          onClose={() => setInviteModalOpen(false)}
          onCreated={() => setInviteRefresh((n) => n + 1)}
        />
      )}
    </div>
  );
}