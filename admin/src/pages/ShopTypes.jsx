import React, { useEffect, useState } from 'react';
import { Layers, Eye, EyeOff } from 'lucide-react';
import { adminApi } from '../api/adminClient.js';

export default function ShopTypes() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.listShopTypes();
      setTypes(r.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load shop types.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (type) => {
    try {
      // Optimistic UI update
      setTypes((prev) =>
        prev.map((t) => (t.id === type.id ? { ...t, is_active: !t.is_active } : t))
      );
      await adminApi.toggleShopType(type.id, !type.is_active);
    } catch (e) {
      setError(e.message || 'Failed to update status.');
      load(); // revert on failure
    }
  };

  return (
    <div className="erp-page">
      <div className="erp-page-head">
        <div>
          <h2 className="erp-page-title">Shop Types</h2>
          <p className="muted small">
            Manage the filter tabs that appear on the mobile app's Shop screen.
            Hiding a tab removes it from the mobile app instantly.
          </p>
        </div>
      </div>

      {error && <div className="erp-alert">{error}</div>}

      <div className="erp-table-wrap">
        {loading ? (
          <div className="erp-empty"><p className="muted">Loading...</p></div>
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                <th>Type Key</th>
                <th>Display Label</th>
                <th style={{ textAlign: 'center' }}>Visibility in App</th>
                <th style={{ textAlign: 'center', width: 100 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id}>
                  <td className="erp-cell-muted">{t.key}</td>
                  <td className="erp-cell-strong">{t.label}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${t.is_active ? 'badge-active' : 'badge-archived'}`}>
                      {t.is_active ? 'Visible' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <div className="erp-row-actions" style={{ justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="erp-row-action"
                        onClick={() => toggle(t)}
                        title={t.is_active ? 'Hide from mobile app' : 'Show in mobile app'}
                      >
                        {t.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}