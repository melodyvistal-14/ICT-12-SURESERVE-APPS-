import { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);

  const fetchCart = useCallback(async () => {
    try {
      const res = await api.get('/cart');
      setCartItems(res.data.items || []);
      setCartCount(res.data.itemCount || 0);
      return res.data;
    } catch {
      return null;
    }
  }, []);

  const addToCart = async (menuItemId, quantity = 1) => {
    await api.post('/cart', { menuItemId, quantity });
    await fetchCart();
  };

  const updateCartItem = async (id, quantity) => {
    await api.put(`/cart/${id}`, { quantity });
    await fetchCart();
  };

  const removeFromCart = async (id) => {
    await api.delete(`/cart/${id}`);
    await fetchCart();
  };

  return (
    <CartContext.Provider value={{ cartItems, cartCount, fetchCart, addToCart, updateCartItem, removeFromCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
