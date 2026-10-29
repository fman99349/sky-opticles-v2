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
  Store,
} from 'lucide-react';
import Settings from './pages/Settings.jsx';
import SellerDashboard from './pages/SellerDashboard.jsx';
import Sellers from './pages/Sellers.jsx';
// Navigation items for the admin sidebar.
// Only Dashboard and Products are wired to real pages today. The rest
// are explicit placeholders — no invented functionality.
// Nav items declare who may see them. "all" = both roles, "owner" = platform owner only.
// The seller dashboard is rendered by the dashboard branch below based on role.
const NAV = [
  { id: 'dashboard',   label: 'Dashboard',   icon: Home,          role: 'all' },
  { id: 'products',    label: 'Products',    icon: Package,       role: 'all' },
  { id: 'orders',      label: 'Orders',      icon: ClipboardList, role: 'all' },
  { id: 'sellers',     label: 'Sellers',     icon: Store,         role: 'owner' },
  { id: 'categories',  label: 'Categories',  icon: Folder,        role: 'owner' },
  { id: 'brands',      label: 'Brands',      icon: Tag,           role: 'owner' },
  { id: 'variants',    label: 'Variants',    icon: List,          role: 'all' },
  { id: 'lensOptions', label: 'Lens Options',icon: Eye,           role: 'owner' },
  { id: 'images',      label: 'Images',      icon: ImageIcon,     role: 'all' },
  { id: 'productTypes',label: 'Product Types',icon: Layers,       role: 'owner' },
  { id: 'settings',    label: 'Settings',    icon: SettingsIcon,  role: 'all' },
];

const SIDEBAR_KEY = 'sky_admin_sidebar_collapsed';

function Shell({ admin, onSignOut }) {
  const [active, setActive] = useState('dashboard');
  const isOwner = admin?.is_platform_owner === true;

  // Nav filtered by role
  const visibleNav = NAV.filter((n) => n.role === 'all' || (n.role === 'owner' && isOwner));

  // Page router — the dashboard branches by role, everything else is shared.
  const renderCurrent = () => {
    switch (active) {
      case 'dashboard':    return isOwner ? <Dashboard /> : <SellerDashboard admin={admin} />;
      case 'products':     return <Products />;
      case 'orders':       return <Orders />;
      case 'sellers':      return <Sellers />;
      case 'categories':   return <Categories />;
      case 'brands':       return <Brands />;
      case 'variants':     return <Variants />;
      case 'lensOptions':  return <LensOptions />;
      case 'images':       return <Images />;
      case 'productTypes': return <ProductTypes />;
      case 'settings':     return <Settings />;
      default:             return null;
    }
  };
  const [toast, setToast] = useState('');
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const current = visibleNav.find((n) => n.id === active) || visibleNav[0];
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
            {visibleNav.map((item) => {
              const Icon = item.icon || Package;
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
          <section className="page">{renderCurrent()}</section>
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