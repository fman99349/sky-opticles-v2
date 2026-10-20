import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  RefreshCw,
  Upload,
  Trash2,
  Star,
  ImageOff,
  Layers,
  X,
} from 'lucide-react';
import { api } from '../api/client.js';

// ---------------------------------------------------------------------------
// Images admin page
//
// Every image can carry an optional "lens mask": a transparent PNG the same
// size as the image, with the lens area drawn in white. The mobile app uses
// it to tint only the lens, not the frame.
// ---------------------------------------------------------------------------

function humanBytes(n) {
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function variantLabel(variant) {
  const parts = [];
  if (variant.color) parts.push(variant.color);
  if (variant.size_label) parts.push(variant.size_label);
  if (parts.length === 0) return variant.sku;
  return `${parts.join(' · ')} — ${variant.sku}`;
}

export default function Images() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [images, setImages] = useState([]);
  const [variants, setVariants] = useState([]);

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [urlForm, setUrlForm] = useState({
    imageUrl: '',
    altText: '',
    isPrimary: false,
  });
  const [savingUrl, setSavingUrl] = useState(false);

  const [savingVariantFor, setSavingVariantFor] = useState(null);

  // Which image is currently uploading a lens mask (its id) or null.
  const [uploadingMaskFor, setUploadingMaskFor] = useState(null);

  const fileInputRef = useRef(null);
  const maskInputRef = useRef(null);
  const pendingMaskImageIdRef = useRef(null);

  // --- Load products once ---
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
        if (!cancelled) setError(e.message || 'Failed to load products.');
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadImages = async (pid) => {
    if (!pid) {
      setImages([]);
      return;
    }
    setLoadingImages(true);
    setError('');
    try {
      const result = await api.listImages(pid);
      setImages(result.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load images.');
    } finally {
      setLoadingImages(false);
    }
  };

  const loadVariants = async (pid) => {
    if (!pid) {
      setVariants([]);
      return;
    }
    try {
      const result = await api.listVariants(pid);
      setVariants(result.data || []);
    } catch {
      setVariants([]);
    }
  };

  useEffect(() => {
    loadImages(productId);
    loadVariants(productId);
  }, [productId]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const selectedProduct = products.find(
    (p) => String(p.id) === String(productId)
  );

  // --- Main image upload ---
  const triggerFilePicker = () => {
    if (!productId) {
      setError('Select a product first.');
      return;
    }
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const onFilePicked = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (event.target) event.target.value = '';
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      await api.uploadImage(productId, file, {
        altText: file.name,
        isPrimary: images.length === 0,
        sortOrder: images.length,
      });
      showToast(`Uploaded "${file.name}".`);
      await loadImages(productId);
    } catch (e) {
      setError(e.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // --- Lens mask upload ---
  const triggerMaskPicker = (imageId) => {
    pendingMaskImageIdRef.current = imageId;
    if (maskInputRef.current) maskInputRef.current.click();
  };

  const onMaskPicked = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (event.target) event.target.value = '';
    if (!file) return;

    const imageId = pendingMaskImageIdRef.current;
    pendingMaskImageIdRef.current = null;
    if (!imageId) return;

    setUploadingMaskFor(imageId);
    setError('');
    try {
      await api.uploadLensLayerForImage(productId, imageId, file);
      showToast(`Lens mask attached (${file.name}).`);
      await loadImages(productId);
    } catch (e) {
      setError(e.message || 'Lens mask upload failed.');
    } finally {
      setUploadingMaskFor(null);
    }
  };

  const clearMask = async (imageId) => {
    if (!window.confirm('Remove the lens mask from this image?')) return;
    setError('');
    try {
      await api.updateImage(productId, imageId, { lens_layer_url: null });
      showToast('Lens mask removed.');
      await loadImages(productId);
    } catch (e) {
      setError(e.message || 'Could not remove lens mask.');
    }
  };

  // --- Primary ---
  const setPrimary = async (imageId) => {
    setError('');
    try {
      await api.updateImage(productId, imageId, { is_primary: true });
      showToast('Primary image updated.');
      await loadImages(productId);
    } catch (e) {
      setError(e.message || 'Could not set primary image.');
    }
  };

  // --- Delete ---
  const removeImage = async (imageId) => {
    if (!window.confirm('Delete this image? This cannot be undone.')) return;
    setError('');
    try {
      await api.deleteImage(productId, imageId);
      showToast('Image deleted.');
      await loadImages(productId);
    } catch (e) {
      setError(e.message || 'Could not delete image.');
    }
  };

  // --- Variant assignment ---
  const changeVariant = async (imageId, nextVariantId) => {
    setSavingVariantFor(imageId);
    setError('');
    try {
      await api.updateImage(productId, imageId, {
        variant_id: nextVariantId === '' ? null : Number(nextVariantId),
      });
      await loadImages(productId);
    } catch (e) {
      setError(e.message || 'Could not update variant.');
    } finally {
      setSavingVariantFor(null);
    }
  };

  // --- Add by URL ---
  const submitUrl = async (event) => {
    event.preventDefault();
    if (!productId) return setError('Select a product first.');
    if (!urlForm.imageUrl.trim()) return setError('Image URL is required.');

    setSavingUrl(true);
    setError('');
    try {
      await api.createImage(productId, {
        imageUrl: urlForm.imageUrl.trim(),
        altText: urlForm.altText.trim() || null,
        isPrimary: urlForm.isPrimary,
        sortOrder: images.length,
      });
      showToast('Image added by URL.');
      setUrlForm({ imageUrl: '', altText: '', isPrimary: false });
      await loadImages(productId);
    } catch (e) {
      setError(e.message || 'Could not add image.');
    } finally {
      setSavingUrl(false);
    }
  };

  const variantForImage = (img) =>
    img.variant_id
      ? variants.find((v) => String(v.id) === String(img.variant_id))
      : null;

  return (
    <div className="erp-page">
      <div className="erp-page-head">
        <div>
          <h2 className="erp-page-title">Images</h2>
          <p className="muted small">
            Upload product photos. Attach a lens mask (transparent PNG, lens
            area in white) so the tint preview only affects the lens. Assign
            images to variants to show the right photo per colour.
          </p>
        </div>

        <div className="erp-page-actions">
          <button
            className="ghost"
            onClick={() => {
              loadImages(productId);
              loadVariants(productId);
            }}
            disabled={loadingImages || !productId}
            type="button"
          >
            <RefreshCw size={14} />
            <span>{loadingImages ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          <button
            className="primary"
            onClick={triggerFilePicker}
            disabled={!productId || uploading}
            type="button"
          >
            <Upload size={16} />
            <span>{uploading ? 'Uploading…' : 'Upload image'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="erp-alert">
          <span>{error}</span>
        </div>
      )}

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

        {selectedProduct && (
          <span className="muted small">
            {images.length} image{images.length === 1 ? '' : 's'}
            {variants.length > 0 &&
              ` · ${variants.length} variant${variants.length === 1 ? '' : 's'}`}
          </span>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onFilePicked}
        style={{ display: 'none' }}
      />
      <input
        ref={maskInputRef}
        type="file"
        accept="image/png"
        onChange={onMaskPicked}
        style={{ display: 'none' }}
      />

      {/* Grid */}
      {loadingImages ? (
        <div className="erp-table-wrap">
          <div className="erp-empty">
            <p className="muted">Loading images…</p>
          </div>
        </div>
      ) : !productId ? (
        <div className="erp-table-wrap">
          <div className="erp-empty">
            <ImageOff size={36} color="#7C8792" />
            <p className="erp-empty-title">No product selected</p>
            <p className="muted small">
              Choose a product above to see and add its images.
            </p>
          </div>
        </div>
      ) : (
        <div className="erp-image-grid">
          <div
            className="erp-image-upload-tile"
            onClick={triggerFilePicker}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') triggerFilePicker();
            }}
          >
            <Plus size={28} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.08em',
              }}
            >
              {uploading ? 'UPLOADING…' : 'UPLOAD'}
            </span>
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>
              JPG · PNG · WEBP · 5 MB
            </span>
          </div>

          {images.map((img) => {
            const assignedVariant = variantForImage(img);
            const hasMask = !!img.lens_layer_url;
            const isUploadingMask = uploadingMaskFor === img.id;

            return (
              <div className="erp-image-tile" key={img.id}>
                {img.is_primary && (
                  <span className="erp-image-primary-badge">PRIMARY</span>
                )}

                {assignedVariant && (
                  <span
                    className="erp-image-variant-badge"
                    title={variantLabel(assignedVariant)}
                  >
                    {assignedVariant.color || assignedVariant.sku}
                  </span>
                )}

                {hasMask && (
                  <span className="erp-image-mask-badge" title="Lens mask attached">
                    <Layers
                      size={9}
                      style={{ marginRight: 3, verticalAlign: '-1px' }}
                    />
                    LENS MASK
                  </span>
                )}

                <div className="erp-image-thumb">
                  <img src={img.image_url} alt={img.alt_text || ''} />
                </div>

                <div className="erp-image-body">
                  <div className="erp-image-alt">
                    {img.alt_text || <span className="muted">No alt text</span>}
                  </div>
                  <div className="erp-image-sort">
                    #{img.id} · sort {img.sort_order}
                  </div>

                  {variants.length > 0 && (
                    <div className="erp-image-variant-row">
                      <span className="erp-image-variant-label">Variant</span>
                      <select
                        className="erp-image-variant-select"
                        value={img.variant_id ? String(img.variant_id) : ''}
                        onChange={(e) =>
                          changeVariant(img.id, e.target.value)
                        }
                        disabled={savingVariantFor === img.id}
                      >
                        <option value="">(Product-wide)</option>
                        {variants.map((v) => (
                          <option key={v.id} value={String(v.id)}>
                            {variantLabel(v)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Lens mask row */}
                  <div className="erp-image-mask-row">
                    <button
                      type="button"
                      className="erp-image-mask-btn"
                      onClick={() => triggerMaskPicker(img.id)}
                      disabled={isUploadingMask}
                      title={
                        hasMask
                          ? 'Replace the lens mask'
                          : 'Attach a lens mask (PNG)'
                      }
                    >
                      <Layers size={11} style={{ marginRight: 4 }} />
                      {isUploadingMask
                        ? 'Uploading…'
                        : hasMask
                        ? 'Replace mask'
                        : 'Add lens mask'}
                    </button>
                    {hasMask && (
                      <button
                        type="button"
                        className="erp-image-mask-clear"
                        onClick={() => clearMask(img.id)}
                        title="Remove lens mask"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="erp-image-actions">
                  <button
                    type="button"
                    onClick={() => setPrimary(img.id)}
                    disabled={img.is_primary}
                    title="Set as primary"
                  >
                    <Star
                      size={12}
                      style={{ marginRight: 4, verticalAlign: '-1px' }}
                    />
                    {img.is_primary ? 'Primary' : 'Set primary'}
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => removeImage(img.id)}
                    title="Delete image"
                  >
                    <Trash2
                      size={12}
                      style={{ marginRight: 4, verticalAlign: '-1px' }}
                    />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add by URL */}
      {productId && (
        <form className="erp-inline-form" onSubmit={submitUrl}>
          <label>
            Image URL (secondary)
            <input
              type="url"
              value={urlForm.imageUrl}
              onChange={(e) =>
                setUrlForm((f) => ({ ...f, imageUrl: e.target.value }))
              }
              placeholder="https://example.com/frame.jpg"
              disabled={savingUrl}
            />
          </label>

          <label>
            Alt text
            <input
              type="text"
              maxLength={250}
              value={urlForm.altText}
              onChange={(e) =>
                setUrlForm((f) => ({ ...f, altText: e.target.value }))
              }
              placeholder="Optional"
              disabled={savingUrl}
            />
          </label>

          <button
            type="submit"
            className="ghost"
            disabled={savingUrl}
            style={{ height: 38 }}
          >
            {savingUrl ? 'Adding…' : 'Add by URL'}
          </button>
        </form>
      )}

      {toast && <div className="erp-toast">{toast}</div>}
    </div>
  );
}