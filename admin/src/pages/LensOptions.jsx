import React, { useEffect, useState } from 'react';
import { RefreshCw, Pencil, Trash2, Plus, X } from 'lucide-react';
import { api } from '../api/client.js';

// ---------------------------------------------------------------------------
// Option Modal (Create / Edit)
// ---------------------------------------------------------------------------
function OptionModal({ mode, group, initialData, onClose, onSaved }) {
  const isEdit = mode === 'edit';

  const [form, setForm] = useState({
    option_key: initialData?.option_key || '',
    label: initialData?.label || '',
    price_delta: initialData?.price_delta || '0',
    overlay_color: initialData?.overlay_color || '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (f, v) => setForm((prev) => ({ ...prev, [f]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.option_key.trim()) return setError('Option Key is required.');
    if (!form.label.trim()) return setError('Label is required.');
    const price = Number(form.price_delta);
    if (!Number.isFinite(price) || price < 0) return setError('Price must be a valid non-negative number.');

    setSaving(true);
    try {
      const body = {
        group_id: group.id,
        option_key: form.option_key.trim(),
        label: form.label.trim(),
        price_delta: price,
        overlay_color: form.overlay_color.trim() || null,
      };

      if (isEdit) {
        await api.updateLensOption(initialData.id, body);
      } else {
        await api.createLensOption(body);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save option.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <header className="modal-head">
          <div>
            <h2>{isEdit ? 'Edit Option' : 'New Option'}</h2>
            <p className="muted small">Group: {group.label}</p>
          </div>
          <button className="icon-ghost" onClick={onClose} type="button"><X size={18} /></button>
        </header>

        <form className="form" onSubmit={submit}>
          <label>
            Option Key (Internal)
            <input
              type="text"
              value={form.option_key}
              onChange={(e) => update('option_key', e.target.value)}
              disabled={isEdit} // Usually don't change keys once created
              placeholder="e.g. 1.67 or grey"
            />
          </label>
          <label>
            Display Label
            <input
              type="text"
              value={form.label}
              onChange={(e) => update('label', e.target.value)}
              placeholder="e.g. 1.67 — Very Thin"
            />
          </label>
          <label>
            Price (R)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price_delta}
              onChange={(e) => update('price_delta', e.target.value)}
            />
          </label>
          {group.group_key === 'tint' && (
            <label>
              Overlay Colour (CSS rgba)
              <input
                type="text"
                value={form.overlay_color}
                onChange={(e) => update('overlay_color', e.target.value)}
                placeholder="e.g. rgba(55,55,55,0.38)"
              />
            </label>
          )}

          {error && <p className="status-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Option'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function LensOptions() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [toast, setToast] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editTarget, setEditTarget] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setListError('');
    try {
      const res = await api.listLensOptions();
      setGroups(res.data.groups || []);
    } catch (e) {
      setListError(e.message || 'Failed to load lens options.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const handleDelete = async (option, groupId) => {
    if (!window.confirm(`Delete "${option.label}"?`)) return;
    try {
      await api.deleteLensOption(option.id);
      showToast('Option deleted.');
      loadData();
    } catch (e) {
      setListError(e.message || 'Could not delete. It may be in use by orders.');
    }
  };

  return (
    <div className="erp-page">
      <div className="erp-page-head">
        <div>
          <h2 className="erp-page-title">Lens Configurator Options</h2>
          <p className="muted small">Manage prices, labels, and availability for the mobile lens wizard.</p>
        </div>
        <div className="erp-page-actions">
          <button className="ghost" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} />
            <span>{loading ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {listError && <div className="erp-alert"><span>{listError}</span></div>}

      {loading ? (
        <p className="muted">Loading groups…</p>
      ) : (
        groups.map((group) => (
          <div key={group.id} className="erp-table-wrap" style={{ marginBottom: 24 }}>
            <div style={{ padding: '14px 16px', backgroundColor: '#FAF7F1', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 14, color: 'var(--ink)' }}>{group.label}</strong>
                <span className="muted small" style={{ marginLeft: 8 }}>
                  {group.group_key} (Applies to: {group.applies_to.join(', ')})
                </span>
              </div>
              <button
                className="ghost"
                onClick={() => {
                  setActiveGroup(group);
                  setModalMode('create');
                  setEditTarget(null);
                  setModalOpen(true);
                }}
              >
                <Plus size={14} /> Add Option
              </button>
            </div>

            <table className="erp-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Key</th>
                  <th style={{ textAlign: 'right' }}>Price (R)</th>
                  <th style={{ textAlign: 'center', width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {group.options.map((opt) => (
                  <tr key={opt.id}>
                    <td><div className="erp-cell-strong">{opt.label}</div></td>
                    <td className="erp-cell-muted"><code>{opt.option_key}</code></td>
                    <td className="erp-cell-price">R {Number(opt.price_delta).toFixed(2)}</td>
                    <td>
                      <div className="erp-row-actions">
                        <button
                          className="erp-row-action"
                          onClick={() => {
                            setActiveGroup(group);
                            setModalMode('edit');
                            setEditTarget(opt);
                            setModalOpen(true);
                          }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="erp-row-action danger"
                          onClick={() => handleDelete(opt, group.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {modalOpen && activeGroup && (
        <OptionModal
          mode={modalMode}
          group={activeGroup}
          initialData={editTarget}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            showToast('Saved.');
            loadData();
          }}
        />
      )}

      {toast && <div className="erp-toast">{toast}</div>}
    </div>
  );
}