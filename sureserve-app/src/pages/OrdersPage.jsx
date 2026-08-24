import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoClose,
  IoFastFoodOutline,
  IoChevronForward,
  IoAlertCircleOutline,
  IoWarningOutline
} from 'react-icons/io5';
import api from '../services/api';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);

  // Selected Order Modal State (Details)
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Custom Cancel Confirmation State (Replaces native browser confirm alert)
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
  }, [activeTab]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders', { params: { status: activeTab } });
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const confirmCancelOrder = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.put(`/orders/${cancelTarget.id}/cancel`);
      await loadOrders();
      if (selectedOrder?.id === cancelTarget.id) setSelectedOrder(null);
      setCancelTarget(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenDetails = async (orderId) => {
    setLoadingDetails(true);
    try {
      const res = await api.get(`/orders/${orderId}`);
      setSelectedOrder(res.data);
    } catch (err) {
      alert('Failed to load order details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      Pending: 'badge-pending',
      Preparing: 'badge-preparing',
      Ready: 'badge-ready',
      Completed: 'badge-completed',
      Cancelled: 'badge-cancelled',
    };
    return `badge ${map[status] || ''}`;
  };

  const getStatusMessage = (status) => {
    const map = {
      Pending: '⏳ Waiting for vendor to accept',
      Preparing: '👨‍🍳 Being prepared by the canteen chef!',
      Ready: '✅ Ready for pickup! Please head to the canteen',
      Completed: '✓ Order Completed',
      Cancelled: '✕ Order Cancelled',
    };
    return map[status] || status;
  };

  return (
    <div className="page" style={{ paddingBottom: '100px' }}>
      <div style={{ padding: '20px 0 8px' }}>
        <h1 style={{ fontSize: 22 }}>My Orders</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Track your canteen food reservations</p>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {['upcoming', 'completed', 'cancelled'].map(tab => (
          <button
            key={tab}
            className={`tab-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No {activeTab} orders</div>
          <div className="empty-state-text">
            {activeTab === 'upcoming' ? 'Reserve your food from our canteen menu!' : `You have no ${activeTab} orders yet.`}
          </div>
          {activeTab === 'upcoming' && (
            <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/')}>
              Browse Canteen Menu
            </button>
          )}
        </div>
      ) : (
        orders.map((order, i) => (
          <div key={order.id} className="order-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="order-card-header">
              <span className="order-number">{order.orderNumber}</span>
              <span className={getStatusBadge(order.status)}>{order.status}</span>
            </div>

            <div style={{
              padding: '8px 12px', borderRadius: 'var(--radius-md)',
              background: order.status === 'Ready' ? 'var(--ready-bg)' : 'var(--surface-hover)',
              fontSize: 13, fontWeight: 500,
              color: order.status === 'Ready' ? 'var(--ready)' : 'var(--text-secondary)',
              marginBottom: 12,
            }}>
              {getStatusMessage(order.status)}
            </div>

            {/* Food items preview */}
            <div className="order-items-preview">
              {order.items?.map((item, j) => (
                <div key={j} style={{ padding: '2px 0', fontSize: 13 }}>
                  • {item.itemName} <strong>x{item.quantity}</strong> — ₱{(item.price * item.quantity).toFixed(2)}
                </div>
              ))}
            </div>

            <div className="order-card-footer" style={{ marginTop: 8 }}>
              <span className="order-total">₱{order.totalAmount?.toFixed(2)}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {order.status === 'Pending' && (
                  <button className="btn btn-outline btn-sm" onClick={() => setCancelTarget(order)}>
                    Cancel
                  </button>
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenDetails(order.id)}
                  disabled={loadingDetails}
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* CUSTOM CANCEL ORDER QUESTION MODAL (Replaces browser confirm popup) */}
      {cancelTarget && (
        <div className="modal-overlay" onClick={() => setCancelTarget(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ textAlign: 'center', padding: '24px' }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <IoWarningOutline size={32} />
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: '#1E293B' }}>
              Cancel Food Reservation?
            </h3>

            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
              Are you sure you want to cancel order <strong style={{ color: 'var(--primary)' }}>{cancelTarget.orderNumber}</strong>?
              <br />
              The reserved food items will be released back to the canteen.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
              >
                Keep Order
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1, background: '#EF4444' }}
                onClick={confirmCancelOrder}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DETAILS MODAL SHEET */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>
                  {selectedOrder.orderNumber}
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Placed on {new Date(selectedOrder.createdAt).toLocaleDateString()} at {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'var(--surface-hover)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <IoClose size={18} />
              </button>
            </div>

            {/* Status Banner */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: selectedOrder.status === 'Ready' ? 'var(--ready-bg)' : 'var(--pending-bg)',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Status:</span>
                <span className={getStatusBadge(selectedOrder.status)}>{selectedOrder.status}</span>
              </div>
              <p style={{ fontSize: 13, marginTop: 4, fontWeight: 500, color: 'var(--text)' }}>
                {getStatusMessage(selectedOrder.status)}
              </p>
            </div>

            {/* Food Items Breakdown */}
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <IoFastFoodOutline color="var(--primary)" size={18} />
              Reserved Food Items
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {selectedOrder.items?.map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (item.menuItemId) {
                      setSelectedOrder(null);
                      navigate(`/food/${item.menuItemId}`);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface-hover)',
                    cursor: item.menuItemId ? 'pointer' : 'default',
                  }}
                >
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 'var(--radius-md)',
                      background: '#E2E8F0',
                      overflow: 'hidden',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.itemName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 20 }}>🍔</span>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{item.itemName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      ₱{item.price?.toFixed(2)} × {item.quantity}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </div>
                    {item.menuItemId && (
                      <div style={{ fontSize: 11, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end', marginTop: 2 }}>
                        View Food <IoChevronForward size={10} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Price Summary */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 20 }}>
              <div className="price-row">
                <span className="text-muted">Subtotal</span>
                <span>₱{selectedOrder.subTotal?.toFixed(2)}</span>
              </div>
              <div className="price-row total">
                <span>Total Payment</span>
                <span style={{ color: 'var(--primary)' }}>₱{selectedOrder.totalAmount?.toFixed(2)}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                💡 Pay ₱{selectedOrder.totalAmount?.toFixed(2)} at the canteen counter upon pickup.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {selectedOrder.status === 'Pending' && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1, borderColor: '#EF4444', color: '#EF4444' }}
                  onClick={() => {
                    const target = selectedOrder;
                    setSelectedOrder(null);
                    setCancelTarget(target);
                  }}
                >
                  Cancel Order
                </button>
              )}
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => setSelectedOrder(null)}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
