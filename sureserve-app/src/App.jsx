import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import BottomNav from './components/BottomNav';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import FoodDetailPage from './pages/FoodDetailPage';
import CartPage from './pages/CartPage';
import OrderConfirmedPage from './pages/OrderConfirmedPage';
import OrdersPage from './pages/OrdersPage';
import ProfilePage from './pages/ProfilePage';
import VendorDashboardPage from './pages/VendorDashboardPage';
import VendorOrdersPage from './pages/VendorOrdersPage';
import VendorMenuPage from './pages/VendorMenuPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function StudentRoute({ children }) {
  const { isAuthenticated, isVendor, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (isVendor) return <Navigate to="/vendor" replace />;
  return children;
}

function VendorRoute({ children }) {
  const { isAuthenticated, isVendor, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (!isVendor) return <Navigate to="/" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { isAuthenticated, isVendor, isAdmin } = useAuth();
  const defaultRedirect = isAdmin ? '/admin' : (isVendor ? '/vendor' : '/');

  return (
    <>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to={defaultRedirect} replace /> : <LoginPage />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to={defaultRedirect} replace /> : <RegisterPage />} />
        <Route path="/vendor/register" element={isAuthenticated ? <Navigate to={defaultRedirect} replace /> : <RegisterPage defaultRole="Vendor" />} />
        <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
        <Route path="/" element={<StudentRoute><HomePage /></StudentRoute>} />
        <Route path="/food/:id" element={<StudentRoute><FoodDetailPage /></StudentRoute>} />
        <Route path="/cart" element={<StudentRoute><CartPage /></StudentRoute>} />
        <Route path="/order-confirmed" element={<StudentRoute><OrderConfirmedPage /></StudentRoute>} />
        <Route path="/orders" element={<StudentRoute><OrdersPage /></StudentRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/vendor" element={<VendorRoute><VendorDashboardPage /></VendorRoute>} />
        <Route path="/vendor/orders" element={<VendorRoute><VendorOrdersPage /></VendorRoute>} />
        <Route path="/vendor/menu" element={<VendorRoute><VendorMenuPage /></VendorRoute>} />
        <Route path="*" element={<Navigate to={defaultRedirect} replace />} />
      </Routes>
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <div className="app-container">
            <AppRoutes />
          </div>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
