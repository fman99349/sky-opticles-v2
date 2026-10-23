import React, { useState } from 'react';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAdminAuth } from '../auth/AdminAuthContext';

export default function Settings() {
  const { admin, updateProfile } = useAdminAuth();
  
  const [form, setForm] = useState({
    name: admin?.name || '',
    email: admin?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
    setSuccess('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) return setError('Name is required.');
    if (!form.email.trim()) return setError('Email is required.');
    
    if (form.newPassword) {
      if (form.newPassword.length < 8) return setError('New password must be at least 8 characters.');
      if (form.newPassword !== form.confirmPassword) return setError('Passwords do not match.');
      if (!form.currentPassword) return setError('You must enter your current password to change your password.');
    }

    const hasEmailChanged = form.email !== admin.email;
    if (hasEmailChanged && !form.currentPassword) {
      return setError('You must enter your current password to change your email.');
    }

    setSaving(true);
    try {
      await updateProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        currentPassword: form.currentPassword || undefined,
        newPassword: form.newPassword || undefined,
      });
      setSuccess('Profile updated successfully.');
      setForm((f) => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err) {
      setError(err.message || 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="erp-page">
      <div className="erp-page-head">
        <div>
          <h2 className="erp-page-title">Account Settings</h2>
          <p className="muted small">Manage your administrator credentials.</p>
        </div>
      </div>

      <div style={{ maxWidth: 600 }}>
        <form className="form" onSubmit={submit} style={{ background: 'var(--white)', padding: 24, borderRadius: 8, border: '1px solid var(--border)' }}>
          
          {error && (
            <div className="erp-alert" style={{ marginBottom: 16 }}>
              <AlertCircle size={16} /><span>{error}</span>
            </div>
          )}
          {success && (
            <div className="erp-alert" style={{ marginBottom: 16, background: 'rgba(46,141,134,0.1)', borderColor: 'rgba(46,141,134,0.3)', color: 'var(--teal)' }}>
              <CheckCircle2 size={16} /><span>{success}</span>
            </div>
          )}

          <h3 style={{ margin: '0 0 16px 0', fontSize: 14, color: 'var(--ink)' }}>Profile Details</h3>

          <label>
            Name
            <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} maxLength={120} />
          </label>

          <label>
            Email Address
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} maxLength={180} />
          </label>

          <h3 style={{ margin: '24px 0 16px 0', fontSize: 14, color: 'var(--ink)' }}>Security</h3>
          <p className="muted small" style={{ marginBottom: 16 }}>
            Leave the password fields blank if you do not want to change your password. You must enter your current password to make any changes to your email or password.
          </p>

          <label>
            Current Password
            <input type="password" value={form.currentPassword} onChange={(e) => update('currentPassword', e.target.value)} placeholder="Required for email/password changes" />
          </label>

          <div className="form-row">
            <label>
              New Password
              <input type="password" value={form.newPassword} onChange={(e) => update('newPassword', e.target.value)} placeholder="At least 8 characters" />
            </label>
            <label>
              Confirm New Password
              <input type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} placeholder="Repeat new password" />
            </label>
          </div>

          <div className="modal-actions" style={{ borderTop: 'none', paddingTop: 24, marginTop: 0 }}>
            <button type="submit" disabled={saving} className="primary">
              <Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}