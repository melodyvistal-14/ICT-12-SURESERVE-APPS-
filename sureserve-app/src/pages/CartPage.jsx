import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoTrash, IoAdd, IoRemove, IoCartOutline, IoClose, IoSearch } from 'react-icons/io5';
import { useCart } from '../context/CartContext';
import api from '../services/api';

export default function CartPage() {
  const { cartItems, cartCount, fetchCart, updateCartItem, removeFromCart, addToCart } = useCart();
  const [cartData, setCartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState('');

  const [showAddMoreModal, setShowAddMoreModal] = useState(false);
  const [allMenuItems, setAllMenuItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    const data = await fetchCart();
    setCartData(data);
    setLoading(false);
  };

  const loadAllMenuItems = async () => {
    try {
      const res = await api.get('/menuitems');
      setAllMenuItems(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAddMore = () => {
    setShowAddMoreModal(true);
    loadAllMenuItems();
  };

  const handleAddMoreItem = async (item) => {
    try {
      await addToCart(item.id, 1);
      await loadCart();
      setToast(`Added 1x ${item.name} to order! 🛒`);
      setTimeout(() => setToast(''), 2000);
    } catch (err) {
      setToast(err.response?.data?.message || 'Failed to add item');
      setTimeout(() => setToast(''), 2000);
    }
  };

  const handleUpdateQty = async (id, newQty) => {
    await updateCartItem(id, newQty);
    const data = await fetchCart();
    setCartData(data);
  };

  const handleRemove = async (id) => {
    await removeFromCart(id);
    const data = await fetchCart();
    setCartData(data);
  };

  const handleCheckout = async () => {
    setChecking(true);
    try {
      const res = await api.post('/orders/checkout');
      navigate('/order-confirmed', { state: res.data });
    } catch (err) {
      setToast(err.response?.data?.message || 'Checkout failed');
      setTimeout(() => setToast(''), 3000);
    }
    setChecking(false);
  };

  // Determine allowed vendors from existing cart items
  const cartVendors = cartData?.items ? [...new Set(cartData.items.map(i => i.menuItem.vendor))] : [];

  if (loading) return <div className="page"><div className="loading-spinner"><div className="spinner" /></div></div>;

  return (
    <div className="page">
      <div className="header" style={{ padding: '16px 0', borderBottom: 'none' }}>
        <div>
          <h1 style={{ fontSize: 22 }}>My Cart</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Food Reservation Items</p>
        </div>

      </div>

      {!cartData || cartData.items?.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><IoCartOutline /></div>
          <div className="empty-state-title">Your cart is empty</div>
          <div className="empty-state-text">Browse our menu and reserve your favorite meals!</div>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/')}>
            Browse Food Menu
          </button>
        </div>
      ) : (
        <>
          {cartData.items.map((item, i) => (
            <div key={item.id} className="cart-item" style={{ animationDelay: `${i * 0.05}s` }}>
              <div style={{
                width: 64, height: 64, borderRadius: 'var(--radius-md)',
                background: 'var(--surface-hover)', overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {item.menuItem.imageUrl ? (
                  <img src={item.menuItem.imageUrl} alt={item.menuItem.name} className="cart-item-img" />
                ) : (
                  <span style={{ fontSize: 28, opacity: 0.3 }}>🍔</span>
                )}
              </div>
              <div className="cart-item-info">
                <div className="cart-item-name">{item.menuItem.name}</div>
                <div className="cart-item-price">₱{item.menuItem.price}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <button
                  onClick={() => handleRemove(item.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--cancelled)', cursor: 'pointer', padding: 4 }}
                >
                  <IoTrash size={16} />
                </button>
                <div className="qty-selector" style={{ transform: 'scale(0.85)', transformOrigin: 'right' }}>
                  <button className="qty-btn" onClick={() => handleUpdateQty(item.id, item.quantity - 1)}>
                    <IoRemove />
                  </button>
                  <span className="qty-value">{item.quantity}</span>
                  <button className="qty-btn" onClick={() => handleUpdateQty(item.id, item.quantity + 1)}>
                    <IoAdd />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Option to Add More Food Items */}
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleOpenAddMore}
              style={{ fontSize: 13, borderStyle: 'dashed' }}
            >
              <IoAdd size={16} /> Add Another Food Item to Order
            </button>
          </div>

          {/* Summary */}
          <div style={{ marginTop: 16, padding: '16px 0' }}>
            <div className="price-row">
              <span className="text-muted">Subtotal ({cartData.itemCount} items)</span>
              <span>₱{cartData.subTotal?.toFixed(2)}</span>
            </div>
            <div className="price-row total">
              <span>Total Amount</span>
              <span style={{ color: 'var(--primary)' }}>₱{cartData.totalAmount?.toFixed(2)}</span>
            </div>
          </div>

          <div style={{
            background: 'var(--primary-bg)', borderRadius: 'var(--radius-md)',
            padding: '12px 16px', marginBottom: 16, fontSize: 13, lineHeight: 1.6,
          }}>
            <strong style={{ color: 'var(--primary)' }}>📋 How it works:</strong><br />
            ✓ Add as many food items as you want to your cart<br />
            ✓ Tap "Place Order" when you are ready to reserve<br />
            ✓ Pay and pick up at the canteen counter
          </div>

          <button
            className="btn btn-primary"
            onClick={handleCheckout}
            disabled={checking}
            style={{ marginBottom: 16 }}
          >
            {checking ? 'Placing Order...' : `Place Order · ₱${cartData.totalAmount?.toFixed(2)}`}
          </button>
        </>
      )}

      {/* ADD MORE FOOD POPUP MODAL SHEET */}
      {showAddMoreModal && (
        <div className="modal-overlay" onClick={() => setShowAddMoreModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '20px 16px' }}
          >
            <div className="modal-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Add Food to Order 🍔</h2>
              <button
                type="button"
                onClick={() => setShowAddMoreModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <IoClose />
              </button>
            </div>

            {/* Search Input */}
            <div className="search-bar" style={{ marginBottom: 12 }}>
              <IoSearch />
              <input
                type="text"
                placeholder="Search food menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Food List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
              {allMenuItems
                .filter((item) => item.isAvailable && item.stock > 0)
                .filter((item) => cartVendors.includes(item.vendor)) // Strictly filter by vendor
                .filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item) => (
                  <div
                    key={item.id}
                    className="card"
                    style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px' }}
                  >
                    <div style={{
                      width: 50, height: 50, borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-hover)', overflow: 'hidden', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 24, opacity: 0.3 }}>🍔</span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                      <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>₱{item.price}</div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ padding: '6px 12px', fontSize: 12, borderRadius: 'var(--radius-md)' }}
                      onClick={() => handleAddMoreItem(item)}
                    >
                      + Add
                    </button>
                  </div>
                ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowAddMoreModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
