import React, { useState, useRef } from 'react';
import { Upload, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import api from '../api/client'; // 👈 Using your existing API client

export default function ShopLogoUploader({ currentLogoUrl, onUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentLogoUrl || null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Get base URL for image display (since DB stores relative paths)
  const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000';

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant local preview
    setPreview(URL.createObjectURL(file));
    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file); // Backend expects 'file'

      // Use your existing api client. Note: it might need a multipart config
      const res = await api.post('/admin/me/shop/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Backend returns relative path, append API_BASE for display
      const newLogoUrl = `${API_BASE}${res.data.data.shop.logo_url}?t=${Date.now()}`;
      setPreview(newLogoUrl);
      
      if (onUpdated) onUpdated(res.data.data.shop);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
      setPreview(currentLogoUrl || null); // Revert
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Remove shop logo?')) return;
    setUploading(true);
    setError('');

    try {
      const res = await api.delete('/admin/me/shop/logo');
      setPreview(null);
      if (onUpdated) onUpdated(res.data.data.shop);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Delete failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      
      <div 
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          width: 120, height: 120, borderRadius: '50%', overflow: 'hidden',
          border: '2px dashed var(--border)', background: 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: uploading ? 'wait' : 'pointer', position: 'relative',
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--teal)'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        {preview ? (
          <img src={preview} alt="Shop Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <ImageIcon size={32} color="var(--muted)" />
        )}

        {uploading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 className="animate-spin" color="#fff" size={24} />
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/jpeg, image/png, image/webp" 
        style={{ display: 'none' }} 
      />

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => fileInputRef.current?.click()} className="secondary" style={{ padding: '4px 12px', fontSize: 12 }} disabled={uploading}>
          <Upload size={14} style={{ marginRight: 4 }} /> Upload
        </button>
        {preview && (
          <button type="button" onClick={handleDelete} className="secondary" style={{ padding: '4px 12px', fontSize: 12, color: 'var(--danger)' }} disabled={uploading}>
            <Trash2 size={14} style={{ marginRight: 4 }} /> Remove
          </button>
        )}
      </div>

      {error && <p style={{ color: 'var(--danger)', fontSize: 12, margin: 0 }}>{error}</p>}
      <p className="muted small" style={{ margin: 0 }}>JPG, PNG or WebP · 2MB max</p>
    </div>
  );
}