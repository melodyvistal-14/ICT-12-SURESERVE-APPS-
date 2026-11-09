import { createContext, useContext, useState, useEffect } from 'react';

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
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  };

  const isAuthenticated = !!token;
  const isVendor = user?.role === 'Vendor';
  const isTeacher = user?.role === 'Teacher';
  const isStudent = user?.role === 'Student';
  const isCustomer = user?.role === 'Student' || user?.role === 'Teacher';
  const isAdmin = user?.role === 'Admin';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, isVendor, isTeacher, isStudent, isCustomer, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
