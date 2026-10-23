import React, { useState } from 'react';
import { useAdminAuth } from './auth/AdminAuthContext.jsx';
import { adminApi } from './api/adminClient.js';
import LoginPage from './pages/LoginPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import Placeholder from './pages/Placeholder.jsx';
import Categories from './pages/Categories.jsx';
import Brands from './pages/Brands.jsx';
import Images from './pages/Images.jsx';
import Variants from './pages/Variants.jsx';
import Orders from './pages/Orders.jsx';
import ProductTypes from './pages/ProductTypes.jsx';
import AdminBell from './components/AdminBell.jsx';
import LensOptions from './pages/LensOptions.jsx';
import {
  Bell,
  ClipboardList,
  Menu,
  LogOut,
  Home,
  Package,
  Folder,
  Tag,
  SettingsIcon,
  Image as ImageIcon,
  List,
  Eye,
  Layers,
} from 'lucide-react';
import Settings from './pages/Settings.jsx';
// Navigation items for the admin sidebar.
// Only Dashboard and Products are wired to real pages today. The rest
// are explicit placeholders — no invented functionality.
const NAV = [
  { id: 'dashboard',  label: 'Dashboard',  icon: Home,      render: () => <Dashboard /> },
  { id: 'products',   label: 'Products',   icon: Package,   render: () => <Products /> },
  { id: 'orders',     label: 'Orders',     icon: ClipboardList, render: () => <Orders /> },
  { id: 'categories', label: 'Categories', icon: Folder,    render: () => <Categories /> },
  { id: 'brands',     label: 'Brands',     icon: Tag,       render: () => <Brands /> },
  { id: 'variants',   label: 'Variants',   icon: List,      render: () => <Variants /> },
  { id: 'lensOptions',label: 'Lens Options',icon: Eye,      render: () => <LensOptions /> },
  { id: 'images',     label: 'Images',     icon: ImageIcon, render: () => <Images /> },
  { id: 'productTypes',label: 'Product Types',icon: Layers, render: () => <ProductTypes /> },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, render: () => <Settings /> },
];

const SIDEBAR_KEY = 'sky_admin_sidebar_collapsed';

function Shell({ admin, onSignOut }) {
  const [active, setActive] = useState('dashboard');
  const [toast, setToast] = useState('');
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const current = NAV.find((n) => n.id === active) || NAV[0];
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="app">
      {/* Global top bar spanning the full app width */}
      <header className="app-topbar">
        <div className="app-topbar-left">
          <button
            type="button"
            className="topbar-icon-btn"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu size={18} />
          </button>
          <div className="app-topbar-title">{current.label}</div>
        </div>

                <div className="app-topbar-actions">
                  <AdminBell /> {/* <-- Use the new component here */}
          

          <button
            type="button"
            className="topbar-icon-btn"
            onClick={() => setActive('orders')}
            title="Orders"
            aria-label="Orders"
          >
            <ClipboardList size={18} />
          </button>
        </div>
      </header>

      <div className={`app-body${collapsed ? ' collapsed' : ''}`}>
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">DMD</span>
            
            <span className="brand-sub">Management System💎</span>
          </div>

          <nav className="nav">
                        {NAV.map((item) => {
              const Icon = item.icon || Package;
              if (!item.icon) {
                console.warn(`Missing icon for nav item: ${item.id}`);
              }
              return (
                <button
                  key={item.id}
                  className={`nav-item ${active === item.id ? 'active' : ''}`}
                  onClick={() => setActive(item.id)}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={16} />
                  <span className="nav-label">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            {!collapsed ? (
              <>
                

                <button
                  className="ghost"
                  onClick={onSignOut}
                  style={{ width: '100%' }}
                >
                  SIGN OUT
                </button>

                
              </>
            ) : (
              <button
                type="button"
                className="sidebar-signout-collapsed"
                onClick={onSignOut}
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </aside>

        <main className="content">
          <section className="page">{current.render()}</section>
        </main>
      </div>

      {toast && <div className="erp-toast">{toast}</div>}
    </div>
  );
}
















export default function App() {
  const { admin, restoring, signOut } = useAdminAuth();

  // Still reading any stored token. Show a minimal loading state so we do
  // not flash the login screen for a fraction of a second on every launch.
  if (restoring) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#101D2C',
          color: '#D7B987',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          letterSpacing: '0.2em',
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        RESTORING SESSION…
      </div>
    );
  }

  // Not signed in — only the login screen is shown. No guest browsing.
  if (!admin) {
    return <LoginPage />;
  }

  // Signed in — render the admin shell.
  return <Shell admin={admin} onSignOut={signOut} />;
}