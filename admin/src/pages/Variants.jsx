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
  sku: '',
  color: '',
  frameMaterial: '',
  frameShape: '',
  sizeLabel: '',
  priceOverride: '',
  stockQuantity: '0',
  reorderLevel: '5',
  isActive: true,
  attributes: [],
};

// ---------------------------------------------------------------------------
// Inline stock editor — one row, always visible.
// Uses PATCH /api/variants/:id/stock (already existed) so we do not need
// to open the modal for the most common admin action.
// ---------------------------------------------------------------------------
function StockCell({ variant, onSaved }) {
  const [value, setValue] = useState(String(variant.stock_quantity));
  const [saving, setSaving] = useState(false);

  // Keep local value in sync if parent refreshes with new data.
  useEffect(() => {
    setValue(String(variant.stock_quantity));
  }, [variant.stock_quantity]);

  const original = Number(variant.stock_quantity);
  const current = Number(value);
  const dirty = Number.isFinite(current) && current !== original && current >= 0;

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      await api.updateStock(variant.id, current);
      onSaved();
    } catch {
      setValue(String(original));
    } finally {
      setSaving(false);
    }
  };

  const isLow =
    Number(variant.stock_quantity) <= Number(variant.reorder_level);

  return (
    <div className="erp-stock-cell">
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`erp-stock-input${dirty ? ' dirty' : ''}`}
      />
      {dirty && (
        <button
          type="button"
          className="erp-stock-save"
          onClick={save}
          disabled={saving}
        >
          {saving ? '…' : 'Save'}
        </button>
      )}
      {!dirty && isLow && <span className="erp-stock-low">LOW</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create / Edit variant modal
// ---------------------------------------------------------------------------
function VariantModal({
  mode,
  initialVariant,
  productId,
  product,
  onClose,
  onSaved,
}) {
  const isEdit = mode === 'edit';

  // Attributes editor is only relevant for products where the eyewear
  // configurator is off. Eyewear products use the four legacy fields.
  const showAttributes = product && product.has_configurator === false;

  const [form, setForm] = useState(() =>
    isEdit && initialVariant
      ? {
          sku: initialVariant.sku || '',
          color: initialVariant.color || '',
          frameMaterial: initialVariant.frame_material || '',
          frameShape: initialVariant.frame_shape || '',
          sizeLabel: initialVariant.size_label || '',
          priceOverride:
            initialVariant.price_override !== null &&
            initialVariant.price_override !== undefined
              ? String(initialVariant.price_override)
              : '',
          stockQuantity: String(initialVariant.stock_quantity ?? 0),
          reorderLevel: String(initialVariant.reorder_level ?? 5),
          isActive: initialVariant.is_active !== false,
          attributes: Object.entries(initialVariant.attributes || {}).map(
            ([key, value]) => ({ key, value: String(value ?? '') })
          ),
        }
      : EMPTY_FORM
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };



    const addAttrRow = () => {
    setForm((f) => ({
      ...f,
      attributes: [...f.attributes, { key: '', value: '' }],
    }));
  };

  const updateAttrRow = (idx, field, value) => {
    setForm((f) => {
      const next = [...f.attributes];
      next[idx] = { ...next[idx], [field]: value };
      return { ...f, attributes: next };
    });
  };

  const removeAttrRow = (idx) => {
    setForm((f) => ({
      ...f,
      attributes: f.attributes.filter((_, i) => i !== idx),
    }));
  };
  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.sku.trim()) return setError('SKU is required.');
    if (form.sku.trim().length > 80) {
      return setError('SKU must be 80 characters or fewer.');
    }

    const stock = Number(form.stockQuantity);
    if (!Number.isInteger(stock) || stock < 0) {
      return setError('Stock quantity must be a non-negative integer.');
    }

    const reorder = Number(form.reorderLevel);
    if (!Number.isInteger(reorder) || reorder < 0) {
      return setError('Reorder level must be a non-negative integer.');
    }

    let priceOverride = null;
    if (form.priceOverride !== '' && form.priceOverride !== null) {
      const p = Number(form.priceOverride);
      if (!Number.isFinite(p) || p < 0) {
        return setError('Price override must be a non-negative number or blank.');
      }
      priceOverride = p;
    }

    // Convert the attributes array to an object. Skip fully-empty rows.
    // Reject duplicate keys so the resulting object does not silently lose
    // data.
    const attrObj = {};
    const seenKeys = new Set();
    for (const row of form.attributes || []) {
      const k = String(row.key || '').trim();
      const v = String(row.value || '').trim();
      if (!k && !v) continue;
      if (!k) return setError('Every attribute needs a name.');
      if (seenKeys.has(k)) {
        return setError(`Duplicate attribute name: "${k}".`);
      }
      seenKeys.add(k);
      attrObj[k] = v;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const body = {
          sku: form.sku.trim(),
          color: form.color.trim() || null,
          frameMaterial: form.frameMaterial.trim() || null,
          frameShape: form.frameShape.trim() || null,
          sizeLabel: form.sizeLabel.trim() || null,
          priceOverride,
          stockQuantity: stock,
          reorderLevel: reorder,
          isActive: form.isActive,
          attributes: attrObj,
        };
        await api.updateVariant(initialVariant.id, body);
        onSaved({ mode: 'edit', sku: body.sku });
      } else {
        const body = {
          sku: form.sku.trim(),
          color: form.color.trim() || null,
          frameMaterial: form.frameMaterial.trim() || null,
          frameShape: form.frameShape.trim() || null,
          sizeLabel: form.sizeLabel.trim() || null,
          priceOverride,
          stockQuantity: stock,
          reorderLevel: reorder,
          attributes: attrObj,
        };
        const result = await api.createVariant(productId, body);
        onSaved({ mode: 'create', sku: result.data.sku });
      }
      onClose();
    } catch (err) {
      setError(err.message || `Could not ${isEdit ? 'update' : 'create'} variant.`);
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
        style={{ maxWidth: 640 }}
      >
        <header className="modal-head">
          <div>
            <h2>{isEdit ? 'Edit variant' : 'New variant'}</h2>
            <p className="muted small">
              {isEdit
                ? `Editing ${initialVariant.sku}`
                : 'One SKU for a specific colour / size / material combination.'}
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
            SKU
            <input
              type="text"
              value={form.sku}
              maxLength={80}
              onChange={(e) => update('sku', e.target.value)}
              placeholder="e.g. AV-BLK-M"
              autoFocus
            />
          </label>

          <div className="form-row">
            <label>
              Color
              <input
                type="text"
                value={form.color}
                maxLength={80}
                onChange={(e) => update('color', e.target.value)}
                placeholder="e.g. Black"
              />
            </label>

            <label>
              Size label
              <input
                type="text"
                value={form.sizeLabel}
                maxLength={50}
                onChange={(e) => update('sizeLabel', e.target.value)}
                placeholder="e.g. Medium"
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Frame material
              <input
                type="text"
                value={form.frameMaterial}
                maxLength={100}
                onChange={(e) => update('frameMaterial', e.target.value)}
                placeholder="e.g. Acetate"
              />
            </label>

            <label>
              Frame shape
              <input
                type="text"
                value={form.frameShape}
                maxLength={80}
                onChange={(e) => update('frameShape', e.target.value)}
                placeholder="e.g. Rectangle"
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              Stock quantity
              <input
                type="number"
                min="0"
                step="1"
                value={form.stockQuantity}
                onChange={(e) => update('stockQuantity', e.target.value)}
              />
            </label>

            <label>
              Reorder level
              <input
                type="number"
                min="0"
                step="1"
                value={form.reorderLevel}
                onChange={(e) => update('reorderLevel', e.target.value)}
              />
            </label>
          </div>

          <label>
            Price override (optional)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.priceOverride}
              onChange={(e) => update('priceOverride', e.target.value)}
              placeholder="Leave blank to use the product price"
            />
          </label>

          {isEdit && (
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
                checked={form.isActive}
                onChange={(e) => update('isActive', e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              Active — visible on the mobile storefront
            </label>
          )}



          {showAttributes && (
            <div className="variant-attrs-section">
              <div className="variant-attrs-head">
                <span className="variant-attrs-title">
                  Specification attributes
                </span>
              </div>

              {form.attributes.length === 0 && (
                <p className="variant-attr-hint">
                  No attributes yet. Click <strong>Add attribute</strong> below
                  to list specs like CPU, RAM, dimensions, weight.
                </p>
              )}

              {form.attributes.map((row, idx) => (
                <div className="variant-attr-row" key={idx}>
                  <input
                    type="text"
                    placeholder="Name (e.g. CPU)"
                    value={row.key}
                    onChange={(e) =>
                      updateAttrRow(idx, 'key', e.target.value)
                    }
                    disabled={saving}
                    maxLength={40}
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. Intel i7-1360P)"
                    value={row.value}
                    onChange={(e) =>
                      updateAttrRow(idx, 'value', e.target.value)
                    }
                    disabled={saving}
                    maxLength={200}
                  />
                  <button
                    type="button"
                    className="variant-attr-remove"
                    onClick={() => removeAttrRow(idx)}
                    disabled={saving}
                    title="Remove attribute"
                    aria-label="Remove attribute"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="variant-attr-add"
                onClick={addAttrRow}
                disabled={saving}
              >
                + Add attribute
              </button>

              <p className="variant-attr-hint">
                Attributes appear on the mobile product page as a
                specification list. Only shown for products where the
                configurator is turned off.
              </p>
            </div>
          )}

















          {error && <p className="status-error">{error}</p>}

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
                : 'Create variant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variants page
// ---------------------------------------------------------------------------
export default function Variants() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [variants, setVariants] = useState([]);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [listError, setListError] = useState('');
  const [toast, setToast] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editTarget, setEditTarget] = useState(null);

  // Load products, default to first
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await api.listProducts({ limit: 100 });
        if (cancelled) return;
        const list = result.data || [];
        setProducts(list);
        if (list.length > 0) setProductId(String(list[0].id));
      } catch (e) {
        if (!cancelled) setListError(e.message || 'Failed to load products.');
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadVariants = async (pid) => {
    if (!pid) { setVariants([]); return; }
    setLoadingVariants(true);
    setListError('');
    try {
      const result = await api.listVariants(pid);
      setVariants(result.data || []);
    } catch (e) {
      setListError(e.message || 'Failed to load variants.');
    } finally {
      setLoadingVariants(false);
    }
  };

  useEffect(() => {
    loadVariants(productId);
  }, [productId]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const openCreate = () => {
    setModalMode('create');
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (variant) => {
    setModalMode('edit');
    setEditTarget(variant);
    setModalOpen(true);
  };

  const handleSaved = (result) => {
    showToast(
      result.mode === 'create'
        ? `Created variant ${result.sku}.`
        : `Updated variant ${result.sku}.`
    );
    loadVariants(productId);
  };

  const handleDelete = async (variant) => {
    if (!window.confirm(`Delete variant ${variant.sku}?`)) return;
    try {
      await api.deleteVariant(variant.id);
      showToast(`Deleted ${variant.sku}.`);
      loadVariants(productId);
    } catch (e) {
      setListError(e.message || 'Could not delete variant.');
    }
  };

  return (
    <div className="erp-page">
      <div className="erp-page-head">
        <div>
          <h2 className="erp-page-title">Variants</h2>
          <p className="muted small">
            One SKU per colour / size / material. Adjust stock inline.
          </p>
        </div>

        <div className="erp-page-actions">
          <button
            className="ghost"
            onClick={() => loadVariants(productId)}
            disabled={loadingVariants || !productId}
            type="button"
          >
            <RefreshCw size={14} />
            <span>{loadingVariants ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          <button
            className="primary"
            onClick={openCreate}
            disabled={!productId}
            type="button"
          >
            <Plus size={16} />
            <span>New variant</span>
          </button>
        </div>
      </div>

      {listError && (
        <div className="erp-alert">
          <span>{listError}</span>
        </div>
      )}

      {/* Product selector */}
      <div className="erp-selector-strip">
        <label>
          Product
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            disabled={loadingProducts}
          >
            {loadingProducts ? (
              <option>Loading products…</option>
            ) : products.length === 0 ? (
              <option value="">No products yet</option>
            ) : (
              products.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} — {p.name}
                </option>
              ))
            )}
          </select>
        </label>

        <span className="muted small">
          {variants.length} variant{variants.length === 1 ? '' : 's'} on this product
        </span>
      </div>

      {/* Variants table */}
      <div className="erp-table-wrap">
        {loadingVariants ? (
          <div className="erp-empty">
            <p className="muted">Loading variants…</p>
          </div>
        ) : !productId ? (
          <div className="erp-empty">
            <PackageOpen size={36} color="#7C8792" />
            <p className="erp-empty-title">No product selected</p>
            <p className="muted small">
              Choose a product above to see and add its variants.
            </p>
          </div>
        ) : variants.length === 0 ? (
          <div className="erp-empty">
            <PackageOpen size={36} color="#7C8792" />
            <p className="erp-empty-title">No variants yet</p>
            <p className="muted small">
              Click <strong>New variant</strong> to add a SKU.
            </p>
          </div>
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>ID</th>
                <th>SKU</th>
                <th>Color</th>
                <th>Material</th>
                <th>Shape</th>
                <th>Size</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th style={{ textAlign: 'center', width: 160 }}>Stock</th>
                <th style={{ textAlign: 'center' }}>Reorder</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center', width: 90 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id}>
                  <td className="erp-cell-muted">#{v.id}</td>
                  <td>
                    <div className="erp-cell-strong">{v.sku}</div>
                  </td>
                  <td>{v.color || <span className="muted">—</span>}</td>
                  <td>{v.frame_material || <span className="muted">—</span>}</td>
                  <td>{v.frame_shape || <span className="muted">—</span>}</td>
                  <td>{v.size_label || <span className="muted">—</span>}</td>
                  <td className="erp-cell-price">
                    {v.price_override !== null && v.price_override !== undefined
                      ? `R ${Number(v.price_override).toFixed(2)}`
                      : <span className="muted">Base</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <StockCell
                      variant={v}
                      onSaved={() => loadVariants(productId)}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>{v.reorder_level}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      className={`badge badge-${v.is_active ? 'active' : 'archived'}`}
                    >
                      {v.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="erp-row-actions">
                      <button
                        type="button"
                        className="erp-row-action"
                        onClick={() => openEdit(v)}
                        title="Edit variant"
                        aria-label={`Edit ${v.sku}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="erp-row-action danger"
                        onClick={() => handleDelete(v)}
                        title="Delete variant"
                        aria-label={`Delete ${v.sku}`}
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
        <VariantModal
          mode={modalMode}
          initialVariant={editTarget}
          productId={productId}
          product={products.find((p) => String(p.id) === String(productId))}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {toast && <div className="erp-toast">{toast}</div>}
    </div>
  );
}