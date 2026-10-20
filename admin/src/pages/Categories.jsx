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

const EMPTY_FORM = { name: '', description: '' };

// ---------------------------------------------------------------------------
// Dual-purpose modal — Create or Edit.
// ---------------------------------------------------------------------------
function CategoryModal({ mode, initialCategory, onClose, onSaved }) {
  const isEdit = mode === 'edit';

  const [form, setForm] = useState(() =>
    isEdit && initialCategory
      ? {
          name: initialCategory.name || '',
          description: initialCategory.description || '',
        }
      : EMPTY_FORM
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Name is required.');
    if (form.name.trim().length > 100) {
      return setError('Name must be 100 characters or fewer.');
    }

    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
      };

      if (isEdit) {
        await api.updateCategory(initialCategory.id, body);
        onSaved({ mode: 'edit', name: body.name });
      } else {
        const result = await api.createCategory(body);
        onSaved({ mode: 'create', name: result.data.name });
      }
      onClose();
    } catch (err) {
      setError(err.message || `Could not ${isEdit ? 'update' : 'create'} category.`);
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
      >
        <header className="modal-head">
          <div>
            <h2>{isEdit ? 'Edit category' : 'New category'}</h2>
            <p className="muted small">
              {isEdit
                ? `Editing #${initialCategory.id} — ${initialCategory.name}`
                : 'Group products into a catalogue category.'}
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
              value={form.name}
              maxLength={100}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Optical Frames"
              autoFocus
            />
          </label>

          <label>
            Description (optional)
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="A short note shown to administrators only."
            />
          </label>

          {error && <p className="status-error">{error}</p>}

          <p className="muted small">
            The backend generates the slug automatically. If the category is
            used by any product, you cannot delete it — deactivate it instead.
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
                : 'Create category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Categories page
// ---------------------------------------------------------------------------
export default function Categories() {
  const [categories, setCategories] = useState([]);
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
      const c = await api.listCategories();
      setCategories(c.data || []);
    } catch (e) {
      setListError(e.message || 'Failed to load categories.');
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

  const openEdit = (category) => {
    setModalMode('edit');
    setEditTarget(category);
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

  const handleDelete = async (category) => {
    const ok = window.confirm(
      `Delete "${category.name}"? This cannot be undone.`
    );
    if (!ok) return;

    try {
      await api.deleteCategory(category.id);
      showToast(`Deleted "${category.name}".`);
      loadAll();
    } catch (e) {
      setListError(
        e.message ||
          'Could not delete category. If products still use it, deactivate instead.'
      );
    }
  };

  return (
    <div className="erp-page">
      <div className="erp-page-head">
        <div>
          <h2 className="erp-page-title">Categories</h2>
          <p className="muted small">
            {loading
              ? 'Loading categories…'
              : `${categories.length} active categor${categories.length === 1 ? 'y' : 'ies'}`}
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
            <span>New category</span>
          </button>
        </div>
      </div>

      {listError && (
        <div className="erp-alert">
          <span>{listError}</span>
        </div>
      )}

      <div className="erp-table-wrap">
        {loading && categories.length === 0 ? (
          <div className="erp-empty">
            <p className="muted">Loading categories…</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="erp-empty">
            <PackageOpen size={36} color="#7C8792" />
            <p className="erp-empty-title">No categories yet</p>
            <p className="muted small">
              Click <strong>New category</strong> to add the first one.
            </p>
          </div>
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>ID</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Description</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center', width: 90 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td className="erp-cell-muted">#{c.id}</td>
                  <td>
                    <div className="erp-cell-strong">{c.name}</div>
                  </td>
                  <td className="erp-cell-muted">{c.slug}</td>
                  <td>
                    {c.description ? (
                      <div className="erp-cell-sub" title={c.description}>
                        {c.description}
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      className={`badge badge-${c.is_active ? 'active' : 'archived'}`}
                    >
                      {c.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="erp-row-actions">
                      <button
                        type="button"
                        className="erp-row-action"
                        onClick={() => openEdit(c)}
                        title="Edit category"
                        aria-label={`Edit ${c.name}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="erp-row-action danger"
                        onClick={() => handleDelete(c)}
                        title="Delete category"
                        aria-label={`Delete ${c.name}`}
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
        <CategoryModal
          mode={modalMode}
          initialCategory={editTarget}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {toast && <div className="erp-toast">{toast}</div>}
    </div>
  );
}