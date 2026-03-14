import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import { LoginPage, RegisterPage, ForgotPasswordPage } from './pages/auth/AuthPages';
import Dashboard from './pages/dashboard/Dashboard';
import Products from './pages/products/Products';
import { ReceiptsPage, TransfersPage } from './pages/operations/OperationsPages';
import DeliveriesPage from './pages/operations/DeliveriesPage';
import Adjustments from './pages/operations/Adjustments';
import { MoveHistory } from './pages/misc/MiscPages';
import { WarehousesPage, CategoriesPage, UsersPage, ProfilePage } from './pages/settings/SettingsPages';
import './styles/global.css';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right"
          toastOptions={{ style: { fontFamily: 'DM Sans, sans-serif', fontSize: 13.5 },
            success: { iconTheme: { primary: '#16A34A', secondary: '#fff' } } }} />
        <Routes>
          {/* Public */}
          <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register"        element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

          {/* Protected */}
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index             element={<Dashboard />} />
            <Route path="products"   element={<Products />} />
            <Route path="receipts"   element={<ReceiptsPage />} />
            <Route path="deliveries" element={<DeliveriesPage />} />
            <Route path="transfers"  element={<TransfersPage />} />
            <Route path="adjustments" element={<Adjustments />} />
            <Route path="moves"      element={<MoveHistory />} />
            <Route path="warehouses" element={<WarehousesPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="users"      element={<UsersPage />} />
            <Route path="profile"    element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
