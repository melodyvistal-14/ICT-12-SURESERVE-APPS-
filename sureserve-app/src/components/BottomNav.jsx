import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { IoHome, IoReceipt, IoCart, IoPerson, IoRestaurant } from 'react-icons/io5';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function BottomNav() {
  const { cartCount } = useCart();
  const { isAuthenticated, isVendor, isAdmin } = useAuth();
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [lastSeenOrdersCount, setLastSeenOrdersCount] = useState(() => {
    return parseInt(localStorage.getItem('seen_orders_count') || '0', 10);
  });
  const location = useLocation();

  const isOrdersPage = location.pathname === '/orders' || location.pathname === '/vendor/orders';

  useEffect(() => {
    if (!isAuthenticated || isAdmin) return;

    const fetchOrdersCount = async () => {
      try {
        if (isVendor) {
          const res = await api.get('/vendor/orders', { params: { status: 'Pending' } });
          const count = res.data?.length || 0;
          setActiveOrdersCount(count);
        } else {
          const res = await api.get('/orders', { params: { status: 'upcoming' } });
          const count = res.data?.length || 0;
          setActiveOrdersCount(count);
        }
      } catch (err) {
        // silent catch
      }
    };

    fetchOrdersCount();
    const interval = setInterval(fetchOrdersCount, 4000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isVendor, isAdmin, location.pathname]);

  // Mark orders as seen when viewing the Orders page
  useEffect(() => {
    if (isOrdersPage) {
      setLastSeenOrdersCount(activeOrdersCount);
      localStorage.setItem('seen_orders_count', activeOrdersCount.toString());
    }
  }, [isOrdersPage, activeOrdersCount]);

  const unreadOrdersCount = isOrdersPage
    ? 0
    : Math.max(0, activeOrdersCount - lastSeenOrdersCount);

  // Hide bottom nav on login/register/admin pages and for Admin accounts
  if (['/login', '/register', '/register/student', '/vendor/register', '/admin'].includes(location.pathname) || isAdmin) return null;

  if (isVendor) {
    return (
      <nav className="bottom-nav">
        <NavLink to="/vendor" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <IoHome className="nav-icon" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/vendor/orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <IoReceipt className="nav-icon" />
          <span>Orders</span>
          {unreadOrdersCount > 0 && <span className="nav-badge">{unreadOrdersCount}</span>}
        </NavLink>
        <NavLink to="/vendor/menu" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <IoRestaurant className="nav-icon" />
          <span>Menu</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <IoPerson className="nav-icon" />
          <span>Profile</span>
        </NavLink>
      </nav>
    );
  }

  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <IoHome className="nav-icon" />
        <span>Home</span>
      </NavLink>
      <NavLink to="/orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <IoReceipt className="nav-icon" />
        <span>Orders</span>
        {unreadOrdersCount > 0 && <span className="nav-badge">{unreadOrdersCount}</span>}
      </NavLink>
      <NavLink to="/cart" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <IoCart className="nav-icon" />
        <span>Cart</span>
        {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <IoPerson className="nav-icon" />
        <span>Profile</span>
      </NavLink>
    </nav>
  );
}
