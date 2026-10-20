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

// ---------------------------------------------------------------------------
// Dual-purpose modal — Create or Edit.
// ---------------------------------------------------------------------------
function BrandModal({ mode, initialBrand, onClose, onSaved }) {
  const isEdit = mode === 'edit';

  const [name, setName] = useState(
    isEdit && initialBrand ? initialBrand.name || '' : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) return setError('Name is required.');
    if (name.trim().length > 120) {
      return setError('Name must be 120 characters or fewer.');
    }

    setSaving(true);
    try {
      const body = { name: name.trim() };
      if (isEdit) {
        await api.updateBrand(initialBrand.id, body);
        onSaved({ mode: 'edit', name: body.name });
      } else {
        const result = await api.createBrand(body);
        onSaved({ mode: 'create', name: result.data.name });
      }
      onClose();
    } catch (err) {
      setError(err.message || `Could not ${isEdit ? 'update' : 'create'} brand.`);
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
        style={{ maxWidth: 480 }}
      >
        <header className="modal-head">
          <div>
            <h2>{isEdit ? 'Edit brand' : 'New brand'}</h2>
            <p className="muted small">
              {isEdit
                ? `Editing #${initialBrand.id} — ${initialBrand.name}`
                : 'A manufacturer or label carried by SKY OPTICLES.'}
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
            Name
            <input
              type="text"
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sky Opticles"
              autoFocus
            />
          </label>

          {error && <p className="status-error">{error}</p>}

          <p className="muted small">
            The backend generates the slug automatically. If the brand is used
            by any product, you cannot delete it.
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
                : 'Create brand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Brands page
// ---------------------------------------------------------------------------
export default function Brands() {
  const [brands, setBrands] = useState([]);
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
      const b = await api.listBrands();
      setBrands(b.data || []);
    } catch (e) {
      setListError(e.message || 'Failed to load brands.');
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

  const openEdit = (brand) => {
    setModalMode('edit');
    setEditTarget(brand);
    setModalOpen(true);
  };

  const handleSaved = (result) => {
    showToast(
      result.mode === 'create'
        ? `Created "${result.name}".`
        : `Updated "${result.name}".`
    );
    loadAll();
  };

  const handleDelete = async (brand) => {
    const ok = window.confirm(
      `Delete "${brand.name}"? This cannot be undone.`
    );
    if (!ok) return;

    try {
      await api.deleteBrand(brand.id);
      showToast(`Deleted "${brand.name}".`);
      loadAll();
    } catch (e) {
      setListError(
        e.message ||
          'Could not delete brand. If products still use it, deactivate instead.'
      );
    }
  };

  return (
    <div className="erp-page">
      <div className="erp-page-head">
        <div>
          <h2 className="erp-page-title">Brands</h2>
          <p className="muted small">
            {loading
              ? 'Loading brands…'
              : `${brands.length} active brand${brands.length === 1 ? '' : 's'}`}
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
            <span>New brand</span>
          </button>
        </div>
      </div>

      {listError && (
        <div className="erp-alert">
          <span>{listError}</span>
        </div>
      )}

      <div className="erp-table-wrap">
        {loading && brands.length === 0 ? (
          <div className="erp-empty">
            <p className="muted">Loading brands…</p>
          </div>
        ) : brands.length === 0 ? (
          <div className="erp-empty">
            <PackageOpen size={36} color="#7C8792" />
            <p className="erp-empty-title">No brands yet</p>
            <p className="muted small">
              Click <strong>New brand</strong> to add the first one.
            </p>
          </div>
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>ID</th>
                <th>Name</th>
                <th>Slug</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center', width: 90 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id}>
                  <td className="erp-cell-muted">#{b.id}</td>
                  <td>
                    <div className="erp-cell-strong">{b.name}</div>
                  </td>
                  <td className="erp-cell-muted">{b.slug}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      className={`badge badge-${b.is_active ? 'active' : 'archived'}`}
                    >
                      {b.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="erp-row-actions">
                      <button
                        type="button"
                        className="erp-row-action"
                        onClick={() => openEdit(b)}
                        title="Edit brand"
                        aria-label={`Edit ${b.name}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="erp-row-action danger"
                        onClick={() => handleDelete(b)}
                        title="Delete brand"
                        aria-label={`Delete ${b.name}`}
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
        <BrandModal
          mode={modalMode}
          initialBrand={editTarget}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {toast && <div className="erp-toast">{toast}</div>}
    </div>
  );
}