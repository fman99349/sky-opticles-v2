import React, { useEffect, useState } from 'react';
import {
  Plus,
  RefreshCw,
  X,
  Pencil,
  Trash2,
  PackageOpen,
} from 'lucide-react';
import { api } from '../api/client.js';

const EMPTY_FORM = {
  key: '',
  label: '',
  defaultHasConfigurator: false,
  sortOrder: '0',
};

// Auto-generate a slug-style key from a label. "Kitchen Equipment" →
// "kitchen_equipment". The admin can still edit the key afterwards.
function keyFromLabel(label) {
  return String(label || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

// ---------------------------------------------------------------------------
// Dual-purpose modal
// ---------------------------------------------------------------------------
function ProductTypeModal({ mode, initialType, onClose, onSaved }) {
  const isEdit = mode === 'edit';

  const [form, setForm] = useState(() =>
    isEdit && initialType
      ? {
          key: initialType.key || '',
          label: initialType.label || '',
          defaultHasConfigurator: !!initialType.default_has_configurator,
          sortOrder: String(initialType.sort_order ?? 0),
        }
      : EMPTY_FORM
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  // Auto-fill key from label unless the admin has edited the key manually.
  const [keyTouched, setKeyTouched] = useState(isEdit);
  const updateLabel = (value) => {
    update('label', value);
    if (!keyTouched) update('key', keyFromLabel(value));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.key.trim()) return setError('Key is required.');
    if (!/^[a-z][a-z0-9_]*$/.test(form.key.trim())) {
      return setError(
        'Key must start with a letter and contain only a-z, 0-9, and underscores.'
      );
    }
    if (!form.label.trim()) return setError('Label is required.');

    const sortOrder = Number(form.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      return setError('Sort order must be a non-negative integer.');
    }

    setSaving(true);
    try {
      const body = {
        key: form.key.trim(),
        label: form.label.trim(),
        defaultHasConfigurator: form.defaultHasConfigurator,
        sortOrder,
      };

      if (isEdit) {
        await api.updateProductType(initialType.id, body);
        onSaved({ mode: 'edit', label: body.label });
      } else {
        await api.createProductType(body);
        onSaved({ mode: 'create', label: body.label });
      }
      onClose();
    } catch (err) {
      setError(
        err.message || `Could not ${isEdit ? 'update' : 'create'} product type.`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 520 }}
      >
        <header className="modal-head">
          <div>
            <h2>{isEdit ? 'Edit product type' : 'New product type'}</h2>
            <p className="muted small">
              {isEdit
                ? `Editing ${initialType.label}`
                : 'A category of products you sell — eyewear, computers, kitchenware, etc.'}
            </p>
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

        <form className="form" onSubmit={submit}>
          <label>
            Label
            <input
              type="text"
              value={form.label}
              maxLength={100}
              onChange={(e) => updateLabel(e.target.value)}
              placeholder="e.g. Kitchen Equipment"
              autoFocus
            />
          </label>

          <label>
            Key (internal identifier)
            <input
              type="text"
              value={form.key}
              maxLength={50}
              onChange={(e) => {
                setKeyTouched(true);
                update('key', e.target.value.toLowerCase());
              }}
              placeholder="e.g. kitchen_equipment"
            />
          </label>

          <label
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              textTransform: 'none',
              letterSpacing: 'normal',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--ink)',
            }}
          >
            <input
              type="checkbox"
              checked={form.defaultHasConfigurator}
              onChange={(e) =>
                update('defaultHasConfigurator', e.target.checked)
              }
              style={{ width: 16, height: 16 }}
            />
            Products of this type use the configurator wizard by default
            (eyewear)
          </label>

          <label>
            Sort order
            <input
              type="number"
              min="0"
              step="1"
              value={form.sortOrder}
              onChange={(e) => update('sortOrder', e.target.value)}
            />
          </label>

          {error && <p className="status-error">{error}</p>}

          <p className="muted small">
            The key must be unique. Eyewear types (optical_frame, sunglasses,
            etc.) are seeded and should not be recreated.
          </p>

          <div className="modal-actions">
            <button
              type="button"
              className="ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" disabled={saving}>
              {saving
                ? isEdit
                  ? 'Saving…'
                  : 'Creating…'
                : isEdit
                ? 'Save changes'
                : 'Create product type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ProductTypes() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [toast, setToast] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editTarget, setEditTarget] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    setListError('');
    try {
      const r = await api.listProductTypes();
      setTypes(r.data || []);
    } catch (e) {
      setListError(e.message || 'Failed to load product types.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const openCreate = () => {
    setModalMode('create');
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setModalMode('edit');
    setEditTarget(t);
    setModalOpen(true);
  };

  const handleSaved = (result) => {
    showToast(
      result.mode === 'create'
        ? `Created "${result.label}".`
        : `Updated "${result.label}".`
    );
    loadAll();
  };

  const handleDelete = async (t) => {
    const ok = window.confirm(
      `Delete "${t.label}"? Products still using this key will not be affected, but the type will disappear from suggestions.`
    );
    if (!ok) return;
    try {
      await api.deleteProductType(t.id);
      showToast(`Deleted "${t.label}".`);
      loadAll();
    } catch (e) {
      setListError(e.message || 'Could not delete product type.');
    }
  };

  return (
    <div className="erp-page">
      <div className="erp-page-head">
        <div>
          <h2 className="erp-page-title">Product Types</h2>
          <p className="muted small">
            {loading
              ? 'Loading types…'
              : `${types.length} type${types.length === 1 ? '' : 's'} defined`}
          </p>
        </div>

        <div className="erp-page-actions">
          <button
            className="ghost"
            onClick={loadAll}
            disabled={loading}
            type="button"
          >
            <RefreshCw size={14} />
            <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          <button className="primary" onClick={openCreate} type="button">
            <Plus size={16} />
            <span>New type</span>
          </button>
        </div>
      </div>

      {listError && (
        <div className="erp-alert">
          <span>{listError}</span>
        </div>
      )}

      <div className="erp-table-wrap">
        {loading && types.length === 0 ? (
          <div className="erp-empty">
            <p className="muted">Loading types…</p>
          </div>
        ) : types.length === 0 ? (
          <div className="erp-empty">
            <PackageOpen size={36} color="#7C8792" />
            <p className="erp-empty-title">No product types yet</p>
            <p className="muted small">
              Click <strong>New type</strong> to add the first one.
            </p>
          </div>
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>ID</th>
                <th>Label</th>
                <th>Key</th>
                <th style={{ textAlign: 'center' }}>Configurator</th>
                <th style={{ textAlign: 'center', width: 80 }}>Order</th>
                <th style={{ textAlign: 'center', width: 90 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id}>
                  <td className="erp-cell-muted">#{t.id}</td>
                  <td>
                    <div className="erp-cell-strong">{t.label}</div>
                  </td>
                  <td className="erp-cell-muted">
                    <code>{t.key}</code>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      className={`badge badge-${t.default_has_configurator ? 'active' : 'archived'}`}
                    >
                      {t.default_has_configurator ? 'wizard' : 'direct'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }} className="erp-cell-muted">
                    {t.sort_order}
                  </td>
                  <td>
                    <div className="erp-row-actions">
                      <button
                        type="button"
                        className="erp-row-action"
                        onClick={() => openEdit(t)}
                        title="Edit"
                        aria-label={`Edit ${t.label}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="erp-row-action danger"
                        onClick={() => handleDelete(t)}
                        title="Delete"
                        aria-label={`Delete ${t.label}`}
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

      {modalOpen && (
        <ProductTypeModal
          mode={modalMode}
          initialType={editTarget}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {toast && <div className="erp-toast">{toast}</div>}
    </div>
  );
}