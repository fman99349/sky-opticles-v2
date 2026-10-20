import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  RefreshCw,
  X,
  Pencil,
  Trash2,
  PackageOpen,
  Upload,
  Star,
} from 'lucide-react';
import { api } from '../api/client.js';

const EMPTY_FORM = {
  name: '',
  categoryId: '',
  brandId: '',
  description: '',
  productType: '',
  price: '',
  status: 'active',
  hasConfigurator: false,
};

function pretty(slug) {
  return String(slug || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatZar(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'R —';
  return `R ${n.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ---------------------------------------------------------------------------
// Modal — dual purpose (create or edit). Also manages images in edit mode.
// ---------------------------------------------------------------------------
function ProductModal({
  mode,
  initialProduct,
  categories,
  brands,
  productTypes,
  onClose,
  onSaved,
}) {
  const isEdit = mode === 'edit';

  const [form, setForm] = useState(() =>
    isEdit && initialProduct
      ? {
          name: initialProduct.name || '',
          categoryId: String(initialProduct.category_id || ''),
          brandId: String(initialProduct.brand_id || ''),
          description: initialProduct.description || '',
          productType: initialProduct.product_type || '',
          price: String(initialProduct.price || ''),
          status: initialProduct.status || 'active',
          hasConfigurator:
            initialProduct.has_configurator === undefined
              ? true
              : initialProduct.has_configurator,
        }
      : EMPTY_FORM
  );

    // Tracks whether the admin has manually flipped the toggle in this modal
  // session. If they have not, the toggle auto-syncs to the selected type's
  // default whenever the type changes.
  const [hasConfiguratorTouched, setHasConfiguratorTouched] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // --- Image state (only meaningful in edit mode) ---
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef(null);

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };
  const handleTypeChange = (newKey) => {
    setForm((f) => {
      const next = { ...f, productType: newKey };
      // Auto-sync hasConfigurator to the type's default unless the admin
      // has explicitly overridden it in this session.
      if (!hasConfiguratorTouched) {
        const t = productTypes.find((pt) => pt.key === newKey);
        if (t) next.hasConfigurator = t.default_has_configurator;
      }
      return next;
    });
  };

  const toggleConfigurator = (value) => {
    setHasConfiguratorTouched(true);
    setForm((f) => ({ ...f, hasConfigurator: value }));
  };






  // Load images when editing
  useEffect(() => {
    if (!isEdit || !initialProduct) return;

    let cancelled = false;
    (async () => {
      setLoadingImages(true);
      try {
        const result = await api.listImages(initialProduct.id);
        if (!cancelled) setImages(result.data || []);
      } catch (e) {
        if (!cancelled) setImageError(e.message || 'Failed to load images.');
      } finally {
        if (!cancelled) setLoadingImages(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEdit, initialProduct]);

  const reloadImages = async () => {
    if (!isEdit) return;
    try {
      const result = await api.listImages(initialProduct.id);
      setImages(result.data || []);
    } catch (e) {
      setImageError(e.message || 'Failed to reload images.');
    }
  };

  const pickImage = () => {
    if (!isEdit) return;
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const onImagePicked = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (event.target) event.target.value = '';
    if (!file) return;

    setImageError('');
    setUploading(true);
    try {
      await api.uploadImage(initialProduct.id, file, {
        altText: file.name,
        isPrimary: images.length === 0,
        sortOrder: images.length,
      });
      await reloadImages();
    } catch (e) {
      setImageError(e.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const setPrimaryImage = async (imageId) => {
    setImageError('');
    try {
      await api.updateImage(initialProduct.id, imageId, { is_primary: true });
      await reloadImages();
    } catch (e) {
      setImageError(e.message || 'Could not set primary.');
    }
  };

  const deleteImage = async (imageId) => {
    if (!window.confirm('Delete this image?')) return;
    setImageError('');
    try {
      await api.deleteImage(initialProduct.id, imageId);
      await reloadImages();
    } catch (e) {
      setImageError(e.message || 'Could not delete image.');
    }
  };

  const addByUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;
    setImageError('');
    try {
      await api.createImage(initialProduct.id, {
        imageUrl: url,
        altText: null,
        isPrimary: images.length === 0,
        sortOrder: images.length,
      });
      setUrlInput('');
      await reloadImages();
    } catch (e) {
      setImageError(e.message || 'Could not add image.');
    }
  };

  // --- Submit ---
  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Name is required.');
    if (!form.categoryId) {
      return setError(
        'Category is required. Create one on the Categories page first.'
      );
    }
    if (
      form.price === '' ||
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) < 0
    ) {
      return setError('Price must be a non-negative number.');
    }

    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        categoryId: Number(form.categoryId),
        brandId: form.brandId ? Number(form.brandId) : null,
        description: form.description.trim() || null,
        productType: form.productType,
        price: Number(form.price),
        status: form.status,
        hasConfigurator: form.hasConfigurator,
      };

      if (isEdit) {
        await api.updateProduct(initialProduct.id, body);
        onSaved({ mode: 'edit', product: { ...initialProduct, ...body } });
      } else {
        const result = await api.createProduct(body);
        onSaved({ mode: 'create', product: result.data });
      }
      onClose();
    } catch (err) {
      setError(err.message || `Could not ${isEdit ? 'update' : 'create'} product.`);
    } finally {
      setSaving(false);
    }
  };

  const noCategories = categories.length === 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: 780 }}
      >
        <header className="modal-head">
          <div>
            <h2>{isEdit ? 'Edit product' : 'New product'}</h2>
            <p className="muted small">
              {isEdit
                ? `Editing #${initialProduct.id} — ${initialProduct.name}`
                : 'Add a piece to the active collection.'}
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

        {noCategories && (
          <div className="erp-alert">
            No categories exist yet. Create a category first — products
            require one.
          </div>
        )}

        <form className="form" onSubmit={submit}>
          <label>
            Name
            <input
              type="text"
              value={form.name}
              maxLength={200}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Aviator Classic"
              autoFocus
            />
          </label>

          <div className="form-row">
            <label>
              Category
              <select
                value={form.categoryId}
                onChange={(e) => update('categoryId', e.target.value)}
              >
                <option value="">— select —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Brand (optional)
              <select
                value={form.brandId}
                onChange={(e) => update('brandId', e.target.value)}
              >
                <option value="">— none —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>
              Product type
              <select
                value={form.productType}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="">— select —</option>
                {productTypes.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
                {/* If the current value is not in the list (e.g. legacy
                    product whose type was deleted), show it as-is so it
                    does not silently change. */}
                {form.productType &&
                  !productTypes.find((t) => t.key === form.productType) && (
                    <option value={form.productType}>
                      {form.productType} (legacy)
                    </option>
                  )}
              </select>
            </label>





          <label
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 10,
              textTransform: 'none',
              letterSpacing: 'normal',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--ink)',
              paddingTop: 8,
            }}
          >
            <input
              type="checkbox"
              checked={form.hasConfigurator}
              onChange={(e) => toggleConfigurator(e.target.checked)}
              style={{ width: 16, height: 16, marginTop: 2 }}
            />
            <span style={{ lineHeight: 1.45 }}>
              <strong>Needs configurator</strong>
              <br />
              <span className="muted small">
                Show the eyewear wizard (lens options, prescription) on mobile.
                Turn off for products sold as-is — computers, kitchenware,
                accessories.
              </span>
            </span>
          </label>















            <label>
              Price (ZAR)
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => update('price', e.target.value)}
                placeholder="0.00"
              />
            </label>
          </div>

          <label>
            Status
            <select
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
            >
              <option value="active">Active — visible on mobile storefront</option>
              <option value="draft">Draft — saved, NOT visible on mobile</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label>
            Description (optional)
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </label>

          {/* -------- Images section -------- */}
          <div className="modal-section">
            <div className="modal-section-head">
              <span className="modal-section-title">Product images</span>
              {isEdit && (
                <div className="modal-section-actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={pickImage}
                    disabled={uploading}
                  >
                    <Upload size={12} style={{ marginRight: 4, verticalAlign: '-2px' }} />
                    {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
              )}
            </div>

            {!isEdit && (
              <p className="muted small">
                Save this product first, then add images by reopening it.
              </p>
            )}

            {isEdit && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onImagePicked}
                  style={{ display: 'none' }}
                />

                {loadingImages ? (
                  <p className="muted small">Loading images…</p>
                ) : images.length === 0 ? (
                  <p className="muted small">No images yet.</p>
                ) : (
                  <div className="modal-image-grid">
                    {images.map((img) => (
                      <div className="modal-image-tile" key={img.id}>
                        {img.is_primary && (
                          <span className="modal-image-primary">PRIMARY</span>
                        )}
                        <div className="modal-image-thumb">
                          <img src={img.image_url} alt={img.alt_text || ''} />
                        </div>
                        <div className="modal-image-actions">
                          <button
                            type="button"
                            onClick={() => setPrimaryImage(img.id)}
                            disabled={img.is_primary}
                            title="Set as primary"
                          >
                            <Star size={10} style={{ verticalAlign: '-1px' }} />
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => deleteImage(img.id)}
                            title="Delete image"
                          >
                            <Trash2 size={10} style={{ verticalAlign: '-1px' }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="modal-url-row">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Or add by URL: https://example.com/frame.jpg"
                  />
                  <button type="button" onClick={addByUrl}>
                    Add URL
                  </button>
                </div>

                {imageError && (
                  <p className="status-error" style={{ marginTop: 8 }}>
                    {imageError}
                  </p>
                )}
              </>
            )}
          </div>

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
            <button type="submit" disabled={saving || noCategories}>
              {saving
                ? isEdit
                  ? 'Saving…'
                  : 'Creating…'
                : isEdit
                ? 'Save changes'
                : 'Create product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Products page
// ---------------------------------------------------------------------------
export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [toast, setToast] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editTarget, setEditTarget] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    setListError('');
    try {
      const [p, c, b, t] = await Promise.all([
        api.listProducts({ limit: 100 }),
        api.listCategories(),
        api.listBrands(),
        api.listProductTypes(),
      ]);
      setProducts(p.data || []);
      setCategories(c.data || []);
      setBrands(b.data || []);
      setProductTypes(t.data || []);
    } catch (e) {
      setListError(e.message || 'Failed to load products.');
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

  const openEdit = (product) => {
    setModalMode('edit');
    setEditTarget(product);
    setModalOpen(true);
  };

  const handleSaved = (result) => {
    if (result.mode === 'create') {
      showToast(`Created "${result.product.name}" (id ${result.product.id}).`);
    } else {
      showToast(`Updated "${result.product.name}".`);
    }
    loadAll();
  };

  const handleDelete = async (product) => {
    const ok = window.confirm(
      `Delete "${product.name}"? This also removes its images and cannot be undone.`
    );
    if (!ok) return;

    try {
      await api.deleteProduct(product.id);
      showToast(`Deleted "${product.name}".`);
      loadAll();
    } catch (e) {
      setListError(e.message || 'Could not delete product.');
    }
  };

  return (
    <div className="erp-page">
      <div className="erp-page-head">
        <div>
          <h2 className="erp-page-title">Products</h2>
          <p className="muted small">
            {loading
              ? 'Loading catalogue…'
              : `${products.length} active product${products.length === 1 ? '' : 's'}`}
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
            <span>New product</span>
          </button>
        </div>
      </div>

      {listError && (
        <div className="erp-alert">
          <span>{listError}</span>
        </div>
      )}

      <div className="erp-table-wrap">
        {loading && products.length === 0 ? (
          <div className="erp-empty">
            <p className="muted">Loading products…</p>
          </div>
        ) : products.length === 0 ? (
          <div className="erp-empty">
            <PackageOpen size={36} color="#7C8792" />
            <p className="erp-empty-title">No active products yet</p>
            <p className="muted small">
              Click <strong>New product</strong> to add your first piece.
            </p>
          </div>
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Brand</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center', width: 90 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="erp-cell-muted">#{p.id}</td>
                  <td>
                    <div className="erp-cell-strong">{p.name}</div>
                    {p.description && (
                      <div className="erp-cell-sub" title={p.description}>
                        {p.description}
                      </div>
                    )}
                  </td>
                  <td>{p.category_name || '—'}</td>
                  <td>{p.brand_name || <span className="muted">—</span>}</td>
                  <td>{pretty(p.product_type)}</td>
                  <td className="erp-cell-price">{formatZar(p.price)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge badge-${p.status}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <div className="erp-row-actions">
                      <button
                        type="button"
                        className="erp-row-action"
                        onClick={() => openEdit(p)}
                        title="Edit product"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="erp-row-action danger"
                        onClick={() => handleDelete(p)}
                        title="Delete product"
                        aria-label={`Delete ${p.name}`}
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
        <ProductModal
          mode={modalMode}
          initialProduct={editTarget}
          categories={categories}
          brands={brands}
          productTypes={productTypes}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {toast && <div className="erp-toast">{toast}</div>}
    </div>
  );
}