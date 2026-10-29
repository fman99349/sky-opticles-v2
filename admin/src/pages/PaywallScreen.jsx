import React, { useState } from 'react';
import {
  AlertCircle, Mail, MessageCircle, RefreshCw, Check, Clock,
  Store, ShieldCheck, ArrowRight,
} from 'lucide-react';

function formatZAR(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 'R —';
  return `R ${n.toLocaleString('en-ZA')}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

export default function PaywallScreen({ shop, billing, platform, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);

  const monthly = Number(platform?.monthly_price) || 199;
  const yearly = Number(platform?.yearly_price) || 1999;
  const yearlySavings = Math.max(0, monthly * 12 - yearly);
  const contactEmail = platform?.contact_email || '';
  const contactWhatsapp = (platform?.contact_whatsapp || '').replace(/[^\d]/g, '');

  const refresh = async () => {
    setRefreshing(true);
    try { await onRefresh?.(); } finally { setRefreshing(false); }
  };

  const contactHref = contactEmail
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(`Subscribe — ${shop.name}`)}&body=${encodeURIComponent(
        `Hi,\n\nI'd like to subscribe my shop "${shop.name}".\n\nPreferred plan: [monthly / yearly]\n\nThanks,\n${shop.name}`
      )}`
    : null;

  const whatsappHref = contactWhatsapp
    ? `https://wa.me/${contactWhatsapp}?text=${encodeURIComponent(
        `Hi, I'd like to subscribe my shop "${shop.name}" on SKY OPTICLES.`
      )}`
    : null;

  return (
    <div className="seller-page">
      {/* Hero */}
      <div className="seller-hero">
        <p className="seller-hero-eyebrow">SUBSCRIPTION REQUIRED</p>
        <h1 className="seller-hero-title">Your free trial has ended.</h1>
        <p className="seller-hero-sub">
          <strong>{shop.name}</strong> is currently hidden from customers. Subscribe to make your shop
          live again and start listing products.
        </p>
        <div className="seller-hero-badge">
          <Clock size={12} />
          <span>TRIAL ENDED {billing?.trial_ends_at ? `ON ${formatDate(billing.trial_ends_at).toUpperCase()}` : ''}</span>
        </div>
      </div>

      {/* What's paused / what still works */}
      <div className="paywall-status-grid">
        <div className="paywall-status-card paywall-status-paused">
          <div className="paywall-status-head">
            <AlertCircle size={16} />
            <span>Paused</span>
          </div>
          <ul>
            <li>Your shop is hidden from the marketplace</li>
            <li>Your products do not appear in search</li>
            <li>Customers cannot place new orders</li>
          </ul>
        </div>
        <div className="paywall-status-card paywall-status-active">
          <div className="paywall-status-head">
            <Check size={16} />
            <span>Still works</span>
          </div>
          <ul>
            <li>Fulfil existing orders (you must ship them)</li>
            <li>View your past earnings and orders</li>
            <li>Prepare products for when you reactivate</li>
          </ul>
        </div>
      </div>

      {/* Pricing */}
      <div>
        <h2 className="paywall-section-title">Choose a plan</h2>
        <div className="paywall-plans">
          <div className="paywall-plan">
            <div className="paywall-plan-label">Monthly</div>
            <div className="paywall-plan-price">
              {formatZAR(monthly)}
              <span className="paywall-plan-period">/ month</span>
            </div>
            <p className="paywall-plan-desc">Flexible. Cancel any time.</p>
            <ul className="paywall-plan-features">
              <li><Check size={12} /> Live shop on the marketplace</li>
              <li><Check size={12} /> Unlimited product listings</li>
              <li><Check size={12} /> Customer order access</li>
            </ul>
          </div>

          <div className="paywall-plan paywall-plan-featured">
            <div className="paywall-plan-tag">BEST VALUE</div>
            <div className="paywall-plan-label">Yearly</div>
            <div className="paywall-plan-price">
              {formatZAR(yearly)}
              <span className="paywall-plan-period">/ year</span>
            </div>
            <p className="paywall-plan-desc">
              {yearlySavings > 0
                ? `Save ${formatZAR(yearlySavings)} — 2 months free`
                : 'One payment for a full year'}
            </p>
            <ul className="paywall-plan-features">
              <li><Check size={12} /> Everything in Monthly</li>
              <li><Check size={12} /> Priority placement consideration</li>
              <li><Check size={12} /> One invoice for the year</li>
            </ul>
          </div>
        </div>
      </div>

      {/* How to subscribe */}
      <div className="paywall-contact">
        <h2 className="paywall-section-title">How to subscribe</h2>
        <p className="paywall-contact-intro">
          Contact the platform team with your shop name and preferred plan. We'll send
          you bank details (EFT) and activate your subscription as soon as payment clears —
          usually within a few hours.
        </p>

        <div className="paywall-contact-actions">
          {contactHref && (
            <a href={contactHref} className="paywall-contact-btn paywall-contact-btn-primary">
              <Mail size={16} />
              <span>Email {contactEmail}</span>
              <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
            </a>
          )}
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="paywall-contact-btn">
              <MessageCircle size={16} />
              <span>Message on WhatsApp</span>
              <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
            </a>
          )}
        </div>

        <div className="paywall-contact-note">
          <ShieldCheck size={14} />
          <span>
            Already paid? Click <strong>Refresh status</strong> below. Activation is usually instant after we confirm your payment.
          </span>
        </div>
      </div>

      {/* Refresh footer */}
      <div className="paywall-footer">
        <button
          type="button"
          className="ghost"
          onClick={refresh}
          disabled={refreshing}
          style={{ height: 36 }}
        >
          <RefreshCw size={14} style={{ marginRight: 6 }} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Checking…' : 'Refresh status'}
        </button>
      </div>
    </div>
  );
}