import React, { useState } from 'react';
import { Upload, Save, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { adminApi } from '../api/adminClient.js';

const SHOP_TYPES = [
  { key: 'independent', label: 'Independent — solo seller' },
  { key: 'boutique',    label: 'Boutique — small, curated selection' },
  { key: 'brand',       label: 'Brand — manufacturer or direct-to-consumer' },
  { key: 'reseller',    label: 'Reseller — multiple brands' },
  { key: 'chain',       label: 'Chain — multiple physical locations' },
];

export default function CreateShopWizard({ existingShop, onShopSaved }) {
  const isEdit = !!existingShop;
  const isRejected = existingShop?.status === 'rejected';
  const isActive = existingShop?.status === 'active';

  const [form, setForm] = useState(() => ({
    name: existingShop?.name || '',
    tagline: existingShop?.tagline || '',
    description: existingShop?.description || '',
    shop_type: existingShop?.shop_type || '',
    city: existingShop?.city || '',
    province: existingShop?.province || '',
    country: existingShop?.country || 'South Africa',
    postal_code: existingShop?.postal_code || '',
    contact_email: existingShop?.contact_email || '',
    contact_phone: existingShop?.contact_phone || '',
  }));

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const validate = ({ requireContact = false } = {}) => {
    if (!form.name.trim() || form.name.trim().length < 2) return 'Shop name is required (2–120 chars).';
    if (!form.shop_type) return 'Please choose a shop type.';
    if (!form.city.trim()) return 'City is required.';
    if (!form.province.trim()) return 'Province is required.';
    if (!form.country.trim()) return 'Country is required.';
    if (requireContact && !form.contact_email.trim()) {
      return 'A contact email is required before submitting for approval.';
    }
    return null;
  };

  const buildBody = () => ({
    name: form.name.trim(),
    tagline: form.tagline.trim() || null,
    description: form.description.trim() || null,
    shop_type: form.shop_type,
    city: form.city.trim(),
    province: form.province.trim(),
    country: form.country.trim(),
    postal_code: form.postal_code.trim() || null,
    contact_email: form.contact_email.trim() || null,
    contact_phone: form.contact_phone.trim() || null,
  });

  const saveDraft = async () => {
    setError(''); setSuccess('');
    const err = validate();
    if (err) return setError(err);
    setSaving(true);
    try {
      if (isEdit) {
        await adminApi.updateMyShop(buildBody());
      } else {
        await adminApi.createMyShop(buildBody());
      }
      setSuccess(isActive
        ? 'Shop details updated.'
        : 'Shop saved as draft. Add a logo if you want, then submit for approval.');
      onShopSaved?.();
    } catch (e) {
      setError(e.message || 'Could not save shop.');
    } finally {
      setSaving(false);
    }
  };

  const submitForApproval = async () => {
    setError(''); setSuccess('');
    const err = validate({ requireContact: true });
    if (err) return setError(err);
    setSubmitting(true);
    try {
      if (isEdit) {
        await adminApi.updateMyShop(buildBody());
      } else {
        await adminApi.createMyShop(buildBody());
      }
      await adminApi.submitMyShop();
      setSuccess('Submitted for approval. The platform team will review shortly.');
      onShopSaved?.();
    } catch (e) {
      setError(e.message || 'Could not submit for approval.');
    } finally {
      setSubmitting(false);
    }
  };

  const uploadLogo = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (event.target) event.target.value = '';
    if (!file) return;
    if (!existingShop) {
      setError('Save the shop as a draft first, then upload your logo.');
      return;
    }
    setError(''); setSuccess('');
    try {
      await adminApi.uploadShopLogo(file);
      setSuccess('Logo uploaded.');
      onShopSaved?.();
    } catch (e) {
      setError(e.message || 'Could not upload logo.');
    }
  };

  const busy = saving || submitting;

  return (
    <div className="seller-page">
      <div className="seller-hero">
        <p className="seller-hero-eyebrow">{isActive ? 'EDIT YOUR SHOP' : isEdit ? 'EDIT YOUR SHOP' : 'CREATE YOUR SHOP'}</p>
        <h1 className="seller-hero-title">
          {isEdit ? existingShop.name : 'Set up your shop'}
        </h1>
        <p className="seller-hero-sub">
          {isActive
            ? 'Update the details customers see. Changes go live immediately.'
            : 'Fill in the details customers will see. Once you submit, the platform team reviews your shop before it goes live on the marketplace.'}
        </p>
      </div>

      {isRejected && existingShop.rejection_reason && (
        <div className="erp-alert">
          <AlertCircle size={16} />
          <div>
            <strong>Rejected — please fix and resubmit</strong>
            <p style={{ margin: '6px 0 0', fontSize: 12 }}>{existingShop.rejection_reason}</p>
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Shop identity</h2>
        <div className="form">
          <label>
            Shop name *
            <input
              type="text"
              value={form.name}
              maxLength={120}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Vicky's Eyewear Boutique"
              disabled={busy}
            />
          </label>

          <label>
            Tagline (optional — one line)
            <input
              type="text"
              value={form.tagline}
              maxLength={140}
              onChange={(e) => update('tagline', e.target.value)}
              placeholder="Handpicked designer frames from Cape Town"
              disabled={busy}
            />
          </label>

          <label>
            Description
            <textarea
              rows={4}
              value={form.description}
              maxLength={5000}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Tell customers what makes your shop special."
              disabled={busy}
            />
          </label>

          <label>
            Shop type *
            <select
              value={form.shop_type}
              onChange={(e) => update('shop_type', e.target.value)}
              disabled={busy}
            >
              <option value="">— select —</option>
              {SHOP_TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Location</h2>
        <div className="form">
          <div className="form-row">
            <label>
              City *
              <input
                type="text"
                value={form.city}
                maxLength={100}
                onChange={(e) => update('city', e.target.value)}
                placeholder="Cape Town"
                disabled={busy}
              />
            </label>
            <label>
              Province *
              <input
                type="text"
                value={form.province}
                maxLength={100}
                onChange={(e) => update('province', e.target.value)}
                placeholder="Western Cape"
                disabled={busy}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Country *
              <input
                type="text"
                value={form.country}
                maxLength={80}
                onChange={(e) => update('country', e.target.value)}
                placeholder="South Africa"
                disabled={busy}
              />
            </label>
            <label>
              Postal code
              <input
                type="text"
                value={form.postal_code}
                maxLength={20}
                onChange={(e) => update('postal_code', e.target.value)}
                placeholder="8001"
                disabled={busy}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Contact</h2>
        <div className="form">
          <div className="form-row">
            <label>
              Contact email *
              <input
                type="email"
                value={form.contact_email}
                maxLength={180}
                onChange={(e) => update('contact_email', e.target.value)}
                placeholder="hello@yourshop.com"
                disabled={busy}
              />
            </label>
            <label>
              Contact phone
              <input
                type="text"
                value={form.contact_phone}
                maxLength={40}
                onChange={(e) => update('contact_phone', e.target.value)}
                placeholder="+27 21 555 0100"
                disabled={busy}
              />
            </label>
          </div>
        </div>
      </div>

      {isEdit && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Logo</h2>
          <p className="muted small" style={{ marginTop: 0, marginBottom: 12 }}>
            Square image, max 2MB, JPG/PNG/WebP. Displayed on the shop list and shop detail screens.
            Square works best — wide or tall logos will be centred with padding.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: '#FAF7F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {existingShop.logo_url ? (
                <img
                  src={existingShop.logo_url}
                  alt="Current logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                />
              ) : (
                <span style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em' }}>
                  NO LOGO
                </span>
              )}
            </div>
            <label
              className="ghost"
              style={{ display: 'inline-flex', alignItems: 'center', cursor: busy ? 'not-allowed' : 'pointer' }}
            >
              <Upload size={14} style={{ marginRight: 6 }} />
              <span>{existingShop.logo_url ? 'Replace logo' : 'Upload logo'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={uploadLogo}
                disabled={busy}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
      )}

      {error && (
        <div className="erp-alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div
          className="erp-alert"
          style={{
            background: 'rgba(46,141,134,0.08)',
            borderColor: 'rgba(46,141,134,0.3)',
            color: 'var(--teal)',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          className="ghost"
          onClick={saveDraft}
          disabled={busy}
          type="button"
          style={{ height: 40 }}
        >
          <Save size={14} style={{ marginRight: 6 }} />
          {saving ? 'Saving…' : isActive ? 'Save changes' : 'Save draft'}
        </button>
        {!isActive && (
          <button
            className="primary"
            onClick={submitForApproval}
            disabled={busy}
            type="button"
            style={{ height: 40 }}
          >
            <Send size={14} style={{ marginRight: 6 }} />
            {submitting ? 'Submitting…' : 'Submit for approval'}
          </button>
        )}
      </div>
    </div>
  );
}