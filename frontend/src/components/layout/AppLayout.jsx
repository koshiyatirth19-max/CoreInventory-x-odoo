import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

const pageTitles = {
  '/':            'Dashboard',
  '/products':    'Products',
  '/receipts':    'Receipts',
  '/deliveries':  'Delivery Orders',
  '/transfers':   'Internal Transfers',
  '/adjustments': 'Stock Adjustments',
  '/moves':       'Move History',
  '/warehouses':  'Warehouses',
  '/profile':     'My Profile',
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] || pageTitles[Object.keys(pageTitles).find(k => pathname.startsWith(k) && k !== '/')] || 'CoreInventory';

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="top-header">
          <span className="page-title">{title}</span>
        </header>
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
