import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IoArrowBack, IoStar, IoAdd, IoRemove, IoCart, IoRestaurant, IoCheckmarkCircle } from 'react-icons/io5';
import { useCart } from '../context/CartContext';
import api from '../services/api';

export default function FoodDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartCount } = useCart();
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addedModal, setAddedModal] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadItem();
  }, [id]);

  const loadItem = async () => {
    try {
      const res = await api.get(`/menuitems/${id}`);
      setItem(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAddToCart = async () => {
    try {
      await addToCart(item.id, quantity);
      setAddedModal(true);
    } catch (err) {
      setToast(err.response?.data?.message || 'Failed to add item');
      setTimeout(() => setToast(''), 2000);
    }
  };

  const handleBuyNow = async () => {
    try {
      await addToCart(item.id, quantity);
      navigate('/cart');
    } catch (err) {
      setToast(err.response?.data?.message || 'Failed to process item');
      setTimeout(() => setToast(''), 2000);
    }
  };

  if (loading) return <div className="page"><div className="loading-spinner"><div className="spinner" /></div></div>;
  if (!item) return <div className="page"><div className="empty-state"><div className="empty-state-title">Item not found</div></div></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      {/* Image Header */}
      <div style={{ position: 'relative' }}>
        <div style={{
          width: '100%', height: 240, background: 'var(--surface-hover)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 64, opacity: 0.3 }}>🍔</span>
          )}
        </div>
        <button className="header-back" onClick={() => navigate(-1)}
          style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.9)', boxShadow: 'var(--shadow-md)' }}>
          <IoArrowBack />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 20px 120px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, marginBottom: 4 }}>{item.name}</h1>
            <p className="text-muted" style={{ fontSize: 13 }}>{item.vendor?.shopName}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>₱{item.price}</div>
          </div>
        </div>

        {/* Rating */}
        {item.averageRating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 14 }}>
            <IoStar color="var(--accent)" />
            <span style={{ fontWeight: 600 }}>{item.averageRating}</span>
            <span className="text-muted">({item.reviewCount} reviews)</span>
          </div>
        )}

        {/* Description */}
        {item.description && (
          <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            {item.description}
          </p>
        )}

        {/* Stock & Availability */}
        {(() => {
          const isItemAvailable = item.isAvailable && item.stock > 0;
          return (
            <>
              <div style={{
                marginTop: 16, padding: '10px 16px',
                background: isItemAvailable ? 'var(--ready-bg)' : '#FEE2E2',
                borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600,
                color: isItemAvailable ? 'var(--ready)' : '#DC2626',
              }}>
                {isItemAvailable ? `✓ Available · ${item.stock} in stock` : '🚫 Currently unavailable · Sold Out'}
              </div>

              {/* Quantity */}
              {isItemAvailable && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
                  <span style={{ fontWeight: 600 }}>Quantity</span>
                  <div className="qty-selector">
                    <button className="qty-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))}><IoRemove /></button>
                    <span className="qty-value">{quantity}</span>
                    <button className="qty-btn" onClick={() => setQuantity(Math.min(item.stock, quantity + 1))}><IoAdd /></button>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* Reviews */}
        {item.reviews && item.reviews.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 12 }}>Reviews</h3>
            {item.reviews.map(review => (
              <div key={review.id} style={{ marginBottom: 12, padding: '12px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{review.user}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--accent)', fontSize: 13 }}>
                    <IoStar /> {review.rating}
                  </div>
                </div>
                {review.comment && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{review.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixed Bottom Action Bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 'var(--mobile-max)',
        padding: '12px 16px env(safe-area-inset-bottom, 12px)',
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
        zIndex: 10,
      }}>
        {item.isAvailable && item.stock > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 10 }}>
            <button
              className="btn btn-outline"
              style={{
                borderColor: 'var(--primary)',
                color: 'var(--primary)',
                fontWeight: 700,
                fontSize: 13,
                padding: '12px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
              onClick={handleAddToCart}
            >
              <IoCart size={18} />
              + Add to Cart
            </button>
            <button
              className="btn btn-primary"
              style={{
                fontWeight: 700,
                fontSize: 13,
                padding: '12px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
              }}
              onClick={handleBuyNow}
            >
              ⚡ Buy / Reserve (₱{(item.price * quantity).toFixed(2)})
            </button>
          </div>
        ) : (
          <button className="btn btn-ghost" disabled style={{ width: '100%', background: '#F1F5F9', color: '#94A3B8', cursor: 'not-allowed', fontWeight: 700 }}>
            🚫 Sold Out
          </button>
        )}
      </div>

      {/* ADDED TO CART SELECTION MODAL */}
      {addedModal && (
        <div className="modal-overlay" onClick={() => setAddedModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ color: '#15803D', margin: '0 auto 12px' }}>
              <IoCheckmarkCircle size={54} />
            </div>
            <h2 style={{ fontSize: 20, marginBottom: 4 }}>Added to Cart! 🛒</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
              <strong>{quantity}x {item.name}</strong> has been added to your reservation cart.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/')}
                style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #DCFCE7' }}
              >
                <IoRestaurant size={18} />
                Add Another Food Item (Keep Shopping)
              </button>

              <button
                className="btn btn-primary"
                onClick={() => navigate('/cart')}
                style={{ background: '#15803D' }}
              >
                <IoCart size={18} />
                View Cart & Place Order
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
