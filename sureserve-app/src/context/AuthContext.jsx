import { createContext, useContext, useState } from 'react';
import { registerPushNotifications, unregisterPushNotifications } from '../services/pushNotifications';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const login = (userData, tokenValue) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', tokenValue);
    setUser(userData);
    setToken(tokenValue);
    // Register for push notifications after login (non-blocking)
    setTimeout(() => registerPushNotifications(), 1000);
  };

  const logout = () => {
    // Unregister push before clearing credentials
    unregisterPushNotifications().catch(() => {});
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  };

  const isAuthenticated = !!token;
  const isVendor = user?.role === 'Vendor';
  const isStudent = user?.role === 'Student';
  const isAdmin = user?.role === 'Admin';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, isVendor, isStudent, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
