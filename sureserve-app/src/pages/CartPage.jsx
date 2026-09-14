import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoTrash, IoAdd, IoRemove, IoCartOutline, IoClose, IoSearch, IoLocate, IoCheckmarkCircle, IoWarning } from 'react-icons/io5';
import { useCart } from '../context/CartContext';
import api from '../services/api';

// ──────────────────────────────────────────────────────────────
// CANTEEN GPS COORDINATES — set these to your actual canteen location
// ──────────────────────────────────────────────────────────────
const CANTEEN_LAT = 14.5995; // ← Replace with your school canteen latitude
const CANTEEN_LNG = 120.9842; // ← Replace with your school canteen longitude

// Haversine formula: returns distance in meters between two GPS coordinates
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Fee: ₱5 base + ₱2 per 100 meters (min ₱5, max ₱50)
function computeDeliveryFeeFromDistance(meters) {
  const fee = 5 + Math.ceil(meters / 100) * 2;
  return Math.min(Math.max(fee, 5), 50);
}

export default function CartPage() {
  const { fetchCart, updateCartItem, removeFromCart, addToCart } = useCart();
  const [cartData, setCartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [toast, setToast] = useState('');

  const [showAddMoreModal, setShowAddMoreModal] = useState(false);
  const [allMenuItems, setAllMenuItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();

  useEffect(() => { loadCart(); }, []);

  const loadCart = async () => {
    const data = await fetchCart();
    setCartData(data);
    setLoading(false);
  };

  const loadAllMenuItems = async () => {
    try {
      const res = await api.get('/menuitems');
      setAllMenuItems(res.data);
    } catch (err) { console.error(err); }
  };

  const handleOpenAddMore = () => { setShowAddMoreModal(true); loadAllMenuItems(); };

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

  // ── Delivery state ──
  const [deliveryType, setDeliveryType] = useState('Pickup');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [section, setSection] = useState('');

  // ── GPS distance state ──
  const [locating, setLocating] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [locError, setLocError] = useState('');

  const currentDeliveryFee = deliveryType === 'Delivery' && distanceMeters !== null
    ? computeDeliveryFeeFromDistance(distanceMeters)
    : 0;
  const grandTotal = (cartData?.totalAmount || 0) + currentDeliveryFee;

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const dist = haversineDistance(CANTEEN_LAT, CANTEEN_LNG, latitude, longitude);
        setDistanceMeters(dist);
        setLocating(false);
      },
      (err) => {
        setLocError('Could not get your location. Please allow location access.');
        setLocating(false);
        console.error(err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleCheckout = async () => {
    if (deliveryType === 'Delivery') {
      if (!building || !room || !section) {
        setToast('Please fill in Building, Room No., and Section for delivery.');
        setTimeout(() => setToast(''), 3000);
        return;
      }
      if (distanceMeters === null) {
        setToast('Please tap "Get My Location" so we can calculate the delivery fee.');
        setTimeout(() => setToast(''), 3000);
        return;
      }
    }

    setChecking(true);
    try {
      const res = await api.post('/orders/checkout', {
        deliveryType,
        building: deliveryType === 'Delivery' ? building : undefined,
        room: deliveryType === 'Delivery' ? room : undefined,
        section: deliveryType === 'Delivery' ? section : undefined,
        distanceMeters: deliveryType === 'Delivery' ? Math.round(distanceMeters) : undefined,
      });
      navigate('/order-confirmed', { state: res.data });
    } catch (err) {
      setToast(err.response?.data?.message || 'Checkout failed');
      setTimeout(() => setToast(''), 3000);
    }
    setChecking(false);
  };

  const cartVendors = cartData?.items ? [...new Set(cartData.items.map(i => i.menuItem.vendor))] : [];

  if (loading) return <div className="page"><div className="loading-spinner"><div className="spinner" /></div></div>;

  return (
    <div className="page">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text-primary)', color: 'white', padding: '10px 20px',
          borderRadius: 'var(--radius-md)', fontSize: 13, zIndex: 9999,
          boxShadow: '0 4px 14px rgba(0,0,0,0.2)', whiteSpace: 'nowrap',
        }}>{toast}</div>
      )}

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
                  <button className="qty-btn" onClick={() => handleUpdateQty(item.id, item.quantity - 1)}><IoRemove /></button>
                  <span className="qty-value">{item.quantity}</span>
                  <button className="qty-btn" onClick={() => handleUpdateQty(item.id, item.quantity + 1)}><IoAdd /></button>
                </div>
              </div>
            </div>
          ))}

          {/* Add More */}
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <button type="button" className="btn btn-outline" onClick={handleOpenAddMore}
              style={{ fontSize: 13, borderStyle: 'dashed' }}>
              <IoAdd size={16} /> Add Another Food Item to Order
            </button>
          </div>

          {/* ── Receiving Option ── */}
          <div style={{
            marginTop: 20, padding: 16,
            background: 'var(--surface-hover)',
            borderRadius: 'var(--radius-md)',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Receiving Option</h3>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <button
                className={`btn ${deliveryType === 'Pickup' ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1, padding: '10px 0', fontSize: 13 }}
                onClick={() => setDeliveryType('Pickup')}
              >Pick up in Canteen</button>
              <button
                className={`btn ${deliveryType === 'Delivery' ? 'btn-primary' : 'btn-outline'}`}
                style={{ flex: 1, padding: '10px 0', fontSize: 13 }}
                onClick={() => setDeliveryType('Delivery')}
              >Deliver to Room</button>
            </div>

            {deliveryType === 'Delivery' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Building */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Building
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Main Building, Science Hall..."
                    value={building}
                    onChange={e => setBuilding(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 13 }}
                  />
                </div>

                {/* Room & Section */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Room No.
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 104"
                      value={room}
                      onChange={e => setRoom(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 13 }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Section / Dept
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. STEM A"
                      value={section}
                      onChange={e => setSection(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 13 }}
                    />
                  </div>
                </div>

                {/* GPS Distance Tracker */}
                <div style={{
                  background: 'white', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', padding: '12px 14px',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
                    📍 Distance-Based Delivery Fee
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                    We use your GPS location to measure the distance from the canteen and calculate a fair fee (₱5 base + ₱2 per 100m, max ₱50).
                  </p>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleGetLocation}
                    disabled={locating}
                    style={{ width: '100%', fontSize: 13, padding: '9px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <IoLocate size={16} />
                    {locating ? 'Getting your location...' : distanceMeters !== null ? 'Recalculate Distance' : 'Get My Location'}
                  </button>

                  {locError && (
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--cancelled)', display: 'flex', gap: 4, alignItems: 'center' }}>
                      <IoWarning size={13} /> {locError}
                    </div>
                  )}

                  {distanceMeters !== null && !locError && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Distance from canteen</span>
                        <span style={{ fontWeight: 700 }}>
                          {distanceMeters < 1000
                            ? `${Math.round(distanceMeters)} m`
                            : `${(distanceMeters / 1000).toFixed(2)} km`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Delivery fee</span>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>₱{currentDeliveryFee.toFixed(2)}</span>
                      </div>
                      <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#16a34a' }}>
                        <IoCheckmarkCircle size={13} /> Location confirmed ✓
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div style={{ marginTop: 16, padding: '16px 0' }}>
            <div className="price-row">
              <span className="text-muted">Subtotal ({cartData.itemCount} items)</span>
              <span>₱{cartData.subTotal?.toFixed(2)}</span>
            </div>
            {deliveryType === 'Delivery' && distanceMeters !== null && (
              <div className="price-row">
                <span className="text-muted">Delivery Fee</span>
                <span>₱{currentDeliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="price-row total" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
              <span>Total Amount</span>
              <span style={{ color: 'var(--primary)' }}>₱{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div style={{
            background: 'var(--primary-bg)', borderRadius: 'var(--radius-md)',
            padding: '12px 16px', marginBottom: 16, fontSize: 13, lineHeight: 1.6,
          }}>
            <strong style={{ color: 'var(--primary)' }}>📋 How it works:</strong><br />
            ✓ Add as many food items as you want to your cart<br />
            ✓ Choose to pick up or have it delivered to your room<br />
            {deliveryType === 'Delivery'
              ? '✓ Tap "Get My Location" then "Place Order" to confirm'
              : '✓ Tap "Place Order" to finalize your reservation'}
          </div>

          <button
            className="btn btn-primary"
            onClick={handleCheckout}
            disabled={checking || (deliveryType === 'Delivery' && distanceMeters === null)}
            style={{ marginBottom: 16, opacity: (deliveryType === 'Delivery' && distanceMeters === null) ? 0.6 : 1 }}
          >
            {checking
              ? 'Placing Order...'
              : deliveryType === 'Delivery' && distanceMeters === null
              ? 'Get Location First to Place Order'
              : `Place Order · ₱${grandTotal.toFixed(2)}`}
          </button>
        </>
      )}

      {/* ADD MORE FOOD POPUP MODAL */}
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
              <button type="button" onClick={() => setShowAddMoreModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>
                <IoClose />
              </button>
            </div>

            <div className="search-bar" style={{ marginBottom: 12 }}>
              <IoSearch />
              <input
                type="text"
                placeholder="Search food menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
              {allMenuItems
                .filter((item) => item.isAvailable && item.stock > 0)
                .filter((item) => cartVendors.includes(item.vendor))
                .filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item) => (
                  <div key={item.id} className="card"
                    style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px' }}>
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                      <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>₱{item.price}</div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ padding: '6px 12px', fontSize: 12, borderRadius: 'var(--radius-md)', flexShrink: 0 }}
                      onClick={() => handleAddMoreItem(item)}
                    >
                      + Add
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
