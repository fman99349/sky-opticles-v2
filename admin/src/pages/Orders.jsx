import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  X,
  Eye,
  PackageOpen,
  Archive,
  Trash2,
  BadgeCheck,
} from 'lucide-react';
import { api } from '../api/client.js';

const PAYMENT_OPTIONS = ['unpaid', 'paid', 'refunded'];
const FULFILLMENT_OPTIONS = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

function formatCurrency(value, currency = 'ZAR') {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';

  let symbol = 'R';
  if (currency === 'USD') symbol = '$';
  if (currency === 'GBP') symbol = '£';
  if (currency === 'EUR') symbol = '€';

  return `${symbol} ${n.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}


function formatDateForInput(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toISOString().split('T')[0]; // Returns YYYY-MM-DD
}
// ---------------------------------------------------------------------------
// Lens specification helpers
// ---------------------------------------------------------------------------

const ACTIVITY_LABELS = {
  everyday: 'Everyday wear',
  driving: 'Driving',
  sport: 'Sport & outdoors',
  reading: 'Reading',
  screen: 'Screen & computer',
  sun: 'Strong sunlight',
};

const GROUP_ORDER = [
  'lensType',
  'lensIndex',
  'edgeThickness',
  'progressiveStyle',
  'tint',
  'polarization',
  'coating',
  'contactSchedule',
  'contactType',
  'accessoryFinish',
];

const GROUP_LABELS_FALLBACK = {
  lensType: 'Lens type',
  lensIndex: 'Lens index',
  edgeThickness: 'Edge finish',
  progressiveStyle: 'Progressive style',
  tint: 'Tint',
  polarization: 'Polarization',
  coating: 'Coating',
  contactSchedule: 'Wearing schedule',
  contactType: 'Lens correction',
  accessoryFinish: 'Finish',
};

function prettyOptionLabel(lensGroups, groupKey, optionKey) {
  const group = (lensGroups || []).find((g) => g.group_key === groupKey);
  if (!group) return String(optionKey).replaceAll('_', ' ');
  const opt = (group.options || []).find((o) => o.option_key === optionKey);
  if (!opt) return String(optionKey).replaceAll('_', ' ');
  return opt.label;
}

function prettyGroupLabel(lensGroups, groupKey) {
  const group = (lensGroups || []).find((g) => g.group_key === groupKey);
  return group ? group.label : GROUP_LABELS_FALLBACK[groupKey] || groupKey;
}

function isPrescriptionTyped(rx) {
  if (!rx) return false;
  const fields = ['sph', 'cyl', 'axis', 'pd'];
  for (const eye of ['od', 'os']) {
    for (const f of fields) {
      if (rx[eye] && String(rx[eye][f] || '').trim() !== '') return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// SpecsPanel — the "view specifications" body for one order item.
// ---------------------------------------------------------------------------
function SpecsPanel({ item, lensGroups }) {
  const cfg = item.lens_config || {};
  const rows = [];

  if (cfg.frameOnly === true) {
    rows.push({ label: 'Frame only', value: 'Yes — lenses excluded' });
  }

  if (cfg.activity) {
    rows.push({
      label: 'Activity',
      value: ACTIVITY_LABELS[cfg.activity] || cfg.activity,
    });
  }

  for (const key of GROUP_ORDER) {
    const v = cfg[key];
    if (v === undefined || v === null || v === '') continue;
    rows.push({
      label: prettyGroupLabel(lensGroups, key),
      value: prettyOptionLabel(lensGroups, key, v),
    });
  }

  // If the item has variant_attributes (like a laptop), list them here.
  const variantAttrs = item.variant_attributes || {};
  for (const [k, v] of Object.entries(variantAttrs)) {
    rows.push({ label: k, value: String(v) });
  }

  const typedRx = isPrescriptionTyped(cfg.prescription);
  const hasUpload = !!item.prescription_id;

  return (
    <div>
      {rows.length > 0 ? (
        <div className="spec-grid">
          {rows.map((r, i) => (
            <div className="spec-row" key={`${r.label}-${i}`}>
              <span className="spec-label">{r.label}</span>
              <span className="spec-value">{r.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="spec-empty">No custom lens choices on this item.</p>
      )}

      {typedRx && (
        <div className="spec-rx">
          <div className="spec-rx-head">Prescription (typed)</div>
          <table className="spec-rx-table">
            <thead>
              <tr>
                <th>Eye</th>
                <th>SPH</th>
                <th>CYL</th>
                <th>Axis</th>
                <th>PD</th>
              </tr>
            </thead>
            <tbody>
              {['od', 'os'].map((eye) => (
                <tr key={eye}>
                  <td>{eye === 'od' ? 'Right (OD)' : 'Left (OS)'}</td>
                  <td>{cfg.prescription[eye]?.sph || '—'}</td>
                  <td>{cfg.prescription[eye]?.cyl || '—'}</td>
                  <td>{cfg.prescription[eye]?.axis || '—'}</td>
                  <td>{cfg.prescription[eye]?.pd || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasUpload && !typedRx && (
        <p className="spec-empty">
          Prescription was uploaded as a file — use the "open prescription"
          link above to view it.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status pill
// ---------------------------------------------------------------------------
function Pill({ kind, value }) {
  const cls =
    kind === 'pay' ? `order-pill pay-${value}` : `order-pill ful-${value}`;
  return <span className={cls}>{value}</span>;
}

// ---------------------------------------------------------------------------
// Order detail modal
// ---------------------------------------------------------------------------
function OrderModal({ orderId, onClose, onChanged, lensGroups }) {
  const [order, setOrder] = useState(null);
  const [openSpecs, setOpenSpecs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');

  const openPrescription = async (prescriptionId) => {
    try {
      setBusy(`rx-${prescriptionId}`);
      const blob = await api.downloadPrescription(prescriptionId);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (e) {
      setError(e.message || 'Could not open prescription.');
    } finally {
      setBusy('');
    }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getOrder(orderId);
      setOrder(result.data);
      if (result.data.estimated_delivery_date) {
        setDeliveryDate(formatDateForInput(result.data.estimated_delivery_date));
      }
    } catch (e) {
      setError(e.message || 'Failed to load order.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const changeFulfillment = async (next) => {
    setBusy(`ful-${next}`);
    try {
      await api.updateOrder(orderId, { fulfillment_status: next });
      await load();
      onChanged();
    } catch (e) {
      setError(e.message || 'Could not update status.');
    } finally {
      setBusy('');
    }
  };

  const toggleArchive = async () => {
    setBusy('archive');
    try {
      await api.updateOrder(orderId, { archived: !order.archived });
      await load();
      onChanged();
    } catch (e) {
      setError(e.message || 'Could not update archive state.');
    } finally {
      setBusy('');
    }
  };
  const saveDeliveryDate = async () => {
    setBusy('delivery');
    try {
      // Set time to end of day so the customer sees the full day
      const isoDate = new Date(`${deliveryDate}T23:59:59`).toISOString();
      await api.updateOrder(orderId, { estimated_delivery_date: isoDate });
      await load();
      onChanged();
      window.alert('Delivery date updated.');
    } catch (e) {
      setError(e.message || 'Could not update delivery date.');
    } finally {
      setBusy('');
    }
  };







  const markPaid = async () => {
    const ok = window.confirm(
      'TEST MODE — mark this order as paid? The real payment gateway is not implemented yet.'
    );
    if (!ok) return;
    setBusy('paid');
    try {
      await api.markOrderPaid(orderId);
      await load();
      onChanged();
    } catch (e) {
      setError(e.message || 'Could not mark paid.');
    } finally {
      setBusy('');
    }
  };

  const deleteOrder = async () => {
    const ok = window.confirm(
      'Soft-delete this order? It will be hidden from lists but kept in the database.'
    );
    if (!ok) return;
    setBusy('delete');
    try {
      await api.deleteOrder(orderId);
      onChanged();
      onClose();
    } catch (e) {
      setError(e.message || 'Could not delete order.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 860 }}
      >
        <header className="modal-head">
          <div>
            <h2>{order ? order.order_number : 'Order'}</h2>
            {order && (
              <p className="muted small">
                Placed {formatDate(order.created_at)} · {order.items.length}{' '}
                item{order.items.length === 1 ? '' : 's'}
              </p>
            )}
          </div>
          <button
            className="icon-ghost"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        {loading && <p className="muted">Loading order…</p>}
        {error && <p className="status-error">{error}</p>}

        {order && (
          <>
            {/* Status pills at a glance */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <Pill kind="pay" value={order.payment_status} />
              <Pill kind="ful" value={order.fulfillment_status} />
              {order.archived && (
                <span className="order-pill pay-refunded">archived</span>
              )}
            </div>

            {/* Customer */}
            <div className="order-detail-section">
              <h4>Customer</h4>
              <div className="order-customer-grid">
                <div className="row">
                  <strong>Name</strong>
                  {order.customer.name}
                </div>
                <div className="row">
                  <strong>Email</strong>
                  {order.customer.email}
                </div>
                <div className="row">
                  <strong>Phone</strong>
                  {order.customer.phone}
                </div>
                <div className="row">
                  <strong>Paid at</strong>
                  {order.paid_at ? formatDate(order.paid_at) : '—'}
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div className="order-detail-section">
              <h4>Shipping address</h4>
              <div className="order-shipping-grid">
                <div className="row full">
                  <strong>Street</strong>
                  {order.shipping.line1}
                  {order.shipping.line2 ? `, ${order.shipping.line2}` : ''}
                </div>
                <div className="row">
                  <strong>City</strong>
                  {order.shipping.city}
                </div>
                <div className="row">
                  <strong>Postal code</strong>
                  {order.shipping.postalCode}
                </div>
                <div className="row">
                  <strong>Province</strong>
                  {order.shipping.province}
                </div>
                <div className="row">
                  <strong>Country</strong>
                  {order.shipping.country}
                </div>
              </div>
            </div>

                       {/* Delivery Date */}
            <div className="order-detail-section">
              <h4>Estimated Delivery</h4>
              <div style={{ 
                display: 'flex', 
                gap: 10, 
                alignItems: 'center', 
                background: '#FAF7F1', 
                padding: 14, 
                borderRadius: 6, 
                border: '1px solid var(--border)' 
              }}>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: 4, 
                    border: '1px solid var(--border)', 
                    background: '#FFF', 
                    color: 'var(--ink)',
                    fontSize: 13,
                    fontWeight: 600
                  }}
                />
                <button
                  type="button"
                  className="ghost"
                  onClick={saveDeliveryDate}
                  disabled={busy !== '' || !deliveryDate}
                >
                  {busy === 'delivery' ? 'Saving…' : 'Update Date'}
                </button>
              </div>
            </div>








            {/* Items */}
            <div className="order-detail-section">
              <h4>Items</h4>
              <div className="order-items-list">
                {order.items.map((it) => (
                  <div className="order-item-group" key={it.id}>
                    <div className="order-item-row">
                      <div className="order-item-thumb">
                        {it.prescription_id ? 'Rx' : 'SO'}
                      </div>
                      <div className="order-item-main">
                        <div className="order-item-name">
                          {it.product_name}
                        </div>
                        <div className="order-item-meta">
                          {it.variant_sku && (
                            <>
                              SKU <code>{it.variant_sku}</code> ·{' '}
                            </>
                          )}
                          Base {formatCurrency(it.base_price, order.currency)}
                          {Number(it.lens_delta) > 0 && (
                            <> + lenses {formatCurrency(it.lens_delta, order.currency)}</>
                          )}
                          {it.prescription_id && (
                            <>
                              {' '}
                              ·{' '}
                              <button
                                type="button"
                                onClick={() =>
                                  openPrescription(it.prescription_id)
                                }
                                disabled={busy !== ''}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  padding: 0,
                                  color: 'var(--teal)',
                                  fontWeight: 800,
                                  fontSize: 'inherit',
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                }}
                                title={
                                  it.prescription_original_name
                                    ? `Open ${it.prescription_original_name}`
                                    : 'Open prescription'
                                }
                              >
                                {busy === `rx-${it.prescription_id}`
                                  ? 'opening…'
                                  : 'open prescription'}
                              </button>
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          className="spec-toggle"
                          onClick={() =>
                            setOpenSpecs((s) => ({
                              ...s,
                              [it.id]: !s[it.id],
                            }))
                          }
                        >
                          {openSpecs[it.id]
                            ? 'Hide specifications'
                            : 'View specifications'}
                        </button>
                      </div>
                      <div className="order-item-qty">
                        × {it.quantity}
                      </div>
                      <div className="order-item-total">
                        {formatCurrency(it.line_total, order.currency)}
                      </div>
                    </div>
                    {openSpecs[it.id] && (
                      <SpecsPanel item={it} lensGroups={lensGroups} />
                    )}
                  </div>
                ))}
              </div>

              <div className="order-summary">
                <div className="order-summary-row">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal, order.currency)}</span>
                </div>
                <div className="order-summary-row">
                  <span>Shipping</span>
                  <span>
                    {Number(order.shipping_cost) > 0
                      ? formatCurrency(order.shipping_cost, order.currency)
                      : 'Free'}
                  </span>
                </div>
                <div className="order-summary-row total">
                  <span>Total</span>
                  <span>{formatCurrency(order.total, order.currency)}</span>
                </div>
                
                {/* Show ZAR equivalent if the order was paid in another currency */}
                {order.currency !== 'ZAR' && (
                  <div className="order-summary-row" style={{ marginTop: 10, color: 'var(--teal)', fontSize: 11, borderTop: '1px dashed var(--border)', paddingTop: 10 }}>
                    <span>ZAR Base Total (Accounting)</span>
                    <span>{formatCurrency(order.base_total, 'ZAR')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="order-action-strip">
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  width: '100%',
                  marginBottom: 6,
                }}
              >
                Fulfillment status
              </span>
              {FULFILLMENT_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeFulfillment(s)}
                  disabled={
                    busy !== '' || order.fulfillment_status === s
                  }
                  className={order.fulfillment_status === s ? 'primary' : ''}
                >
                  {busy === `ful-${s}` ? '…' : s}
                </button>
              ))}

              <span
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  width: '100%',
                  marginTop: 12,
                  marginBottom: 6,
                }}
              >
                Other actions
              </span>

              {order.payment_status === 'unpaid' && (
                <button
                  type="button"
                  className="test-mode"
                  onClick={markPaid}
                  disabled={busy !== ''}
                  title="Test mode — the real payment gateway is not built yet"
                >
                  <BadgeCheck
                    size={12}
                    style={{ marginRight: 4, verticalAlign: '-2px' }}
                  />
                  {busy === 'paid' ? '…' : 'Mark paid (test)'}
                </button>
              )}

              <button
                type="button"
                onClick={toggleArchive}
                disabled={busy !== ''}
              >
                <Archive
                  size={12}
                  style={{ marginRight: 4, verticalAlign: '-2px' }}
                />
                {order.archived ? 'Unarchive' : 'Archive'}
              </button>

              <button
                type="button"
                className="danger"
                onClick={deleteOrder}
                disabled={busy !== ''}
              >
                <Trash2
                  size={12}
                  style={{ marginRight: 4, verticalAlign: '-2px' }}
                />
                {busy === 'delete' ? '…' : 'Delete'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Orders page
// ---------------------------------------------------------------------------
export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [toast, setToast] = useState('');
  const [lensGroups, setLensGroups] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api
      .listLensOptions()
      .then((r) => {
        if (!cancelled) setLensGroups(r.data?.groups || []);
      })
      .catch(() => {
        // Non-fatal — specs panel falls back to raw keys.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [filters, setFilters] = useState({
    payment_status: '',
    fulfillment_status: '',
    archived: '',
    search: '',
  });

  const [openOrderId, setOpenOrderId] = useState(null);

  const load = async () => {
    setLoading(true);
    setListError('');
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (filters.payment_status) params.payment_status = filters.payment_status;
      if (filters.fulfillment_status)
        params.fulfillment_status = filters.fulfillment_status;
      if (filters.archived) params.archived = filters.archived;
      if (filters.search.trim()) params.search = filters.search.trim();

      const result = await api.listOrders(params);
      setOrders(result.data || []);
      setPagination(result.pagination || pagination);
    } catch (e) {
      setListError(e.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pagination.page,
    filters.payment_status,
    filters.fulfillment_status,
    filters.archived,
    filters.search,
  ]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const onChanged = () => {
    showToast('Order updated.');
    load();
  };

  const setFilter = (field, value) => {
    setPagination((p) => ({ ...p, page: 1 }));
    setFilters((f) => ({ ...f, [field]: value }));
  };

  const handleDeleteOrder = async (order) => {
    const ok = window.confirm(
      `Delete order ${order.order_number}? This hides it from the list (soft delete).`
    );
    if (!ok) return;

    try {
      await api.deleteOrder(order.id);
      showToast(`Deleted ${order.order_number}.`);
      load();
    } catch (e) {
      setListError(e.message || 'Could not delete order.');
    }
  };

  return (
    <div className="erp-page">
      <div className="erp-page-head">
        <div>
          <h2 className="erp-page-title">Orders</h2>
          <p className="muted small">
            {loading
              ? 'Loading orders…'
              : `${pagination.total} order${pagination.total === 1 ? '' : 's'}`}
          </p>
        </div>

        <div className="erp-page-actions">
          <button
            className="ghost"
            onClick={load}
            disabled={loading}
            type="button"
          >
            <RefreshCw size={14} />
            <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {listError && (
        <div className="erp-alert">
          <span>{listError}</span>
        </div>
      )}

      {/* Filters */}
      <div className="order-filters">
        <label>
          Payment
          <select
            value={filters.payment_status}
            onChange={(e) => setFilter('payment_status', e.target.value)}
          >
            <option value="">All</option>
            {PAYMENT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label>
          Fulfillment
          <select
            value={filters.fulfillment_status}
            onChange={(e) => setFilter('fulfillment_status', e.target.value)}
          >
            <option value="">All</option>
            {FULFILLMENT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label>
          Archived
          <select
            value={filters.archived}
            onChange={(e) => setFilter('archived', e.target.value)}
          >
            <option value="">All</option>
            <option value="false">Active only</option>
            <option value="true">Archived only</option>
          </select>
        </label>

        <label style={{ flex: 1 }}>
          Search
          <input
            type="text"
            className="search-wide"
            placeholder="Order #, customer, email"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
          />
        </label>
      </div>

      {/* Table */}
      <div className="erp-table-wrap">
        {loading && orders.length === 0 ? (
          <div className="erp-empty">
            <p className="muted">Loading orders…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="erp-empty">
            <PackageOpen size={36} color="#7C8792" />
            <p className="erp-empty-title">No orders match these filters</p>
            <p className="muted small">
              Adjust the filters or wait for customers to place orders.
            </p>
          </div>
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ width: 140 }}>Order #</th>
                <th>Customer</th>
                <th style={{ textAlign: 'center', width: 70 }}>Items</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ textAlign: 'center' }}>Payment</th>
                <th style={{ textAlign: 'center' }}>Fulfillment</th>
                <th>Placed</th>
                <th style={{ textAlign: 'center', width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <div className="erp-cell-strong">{o.order_number}</div>
                    {o.archived && (
                      <div className="erp-cell-sub">archived</div>
                    )}
                  </td>
                  <td>
                    <div className="erp-cell-strong">{o.customer_name}</div>
                    <div className="erp-cell-sub">{o.customer_email}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {o.item_count ?? '—'}
                  </td>
                  <td className="erp-cell-price">{formatCurrency(o.total, o.currency)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <Pill kind="pay" value={o.payment_status} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Pill kind="ful" value={o.fulfillment_status} />
                  </td>
                  <td className="erp-cell-muted" style={{ fontSize: 11 }}>
                    {formatDate(o.created_at)}
                  </td>
                  <td>
                    <div className="erp-row-actions">
                      <button
                        type="button"
                        className="erp-row-action"
                        onClick={() => setOpenOrderId(o.id)}
                        title="View order"
                        aria-label={`View ${o.order_number}`}
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        className="erp-row-action danger"
                        onClick={() => handleDeleteOrder(o)}
                        title="Delete order"
                        aria-label={`Delete ${o.order_number}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 12,
            fontSize: 12,
            color: 'var(--muted)',
          }}
        >
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="ghost"
              disabled={pagination.page <= 1}
              onClick={() =>
                setPagination((p) => ({ ...p, page: p.page - 1 }))
              }
            >
              Previous
            </button>
            <button
              type="button"
              className="ghost"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() =>
                setPagination((p) => ({ ...p, page: p.page + 1 }))
              }
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail modal — WITH lensGroups prop */}
      {openOrderId && (
        <OrderModal
          orderId={openOrderId}
          onClose={() => setOpenOrderId(null)}
          onChanged={onChanged}
          lensGroups={lensGroups}
        />
      )}

      {toast && <div className="erp-toast">{toast}</div>}
    </div>
  );
}