import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine,
  ArrowLeftRight, ClipboardList, History, Warehouse, LogOut,
  User, ChevronRight, Tag, Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin   = user?.role === 'admin';
  const initials  = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const nav = [
    { label: 'Dashboard',    to: '/',            icon: LayoutDashboard },
    { label: 'Products',     to: '/products',    icon: Package },
    { divider: 'Operations' },
    { label: 'Receipts',     to: '/receipts',    icon: ArrowDownToLine },
    { label: 'Deliveries',   to: '/deliveries',  icon: ArrowUpFromLine },
    { label: 'Transfers',    to: '/transfers',   icon: ArrowLeftRight },
    { label: 'Adjustments',  to: '/adjustments', icon: ClipboardList },
    { label: 'Move History', to: '/moves',       icon: History },
    { divider: 'Settings' },
    { label: 'Warehouses',   to: '/warehouses',  icon: Warehouse },
    { label: 'Categories',   to: '/categories',  icon: Tag },
    ...(isAdmin ? [{ label: 'Users', to: '/users', icon: Users }] : []),
    { divider: 'Account' },
    { label: 'My Profile',   to: '/profile',     icon: User },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">C</div>
        <span className="sidebar-logo-text">CoreInventory</span>
      </div>

      <nav className="sidebar-nav">
        {nav.map((item, i) => {
          if (item.divider) return <div key={i} className="sidebar-section-label">{item.divider}</div>;
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={16} /> {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card" onClick={() => navigate('/profile')}>
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <ChevronRight size={14} color="var(--gray-500)" style={{ marginLeft:'auto' }} />
        </div>
        <button className="btn btn-outline w-full mt-4"
          style={{ color:'var(--gray-400)', borderColor:'rgba(255,255,255,.12)', justifyContent:'center' }}
          onClick={logout}>
          <LogOut size={14} /> Logout
        </button>
      </div>
    </aside>
  );
}
