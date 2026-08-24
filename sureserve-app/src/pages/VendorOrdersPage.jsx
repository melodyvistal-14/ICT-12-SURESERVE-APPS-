import { useState, useEffect } from 'react';
import { IoRefresh, IoClipboard } from 'react-icons/io5';
import api from '../services/api';

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 3000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      const res = await api.get('/vendor/orders', { params: { status: statusFilter } });
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      loadOrders();
      showToast(`Order status updated to ${newStatus}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update order');
    }
  };

  const getStatusBadge = (status) => {
    const map = { Pending: 'badge-pending', Preparing: 'badge-preparing', Ready: 'badge-ready', Completed: 'badge-completed', Cancelled: 'badge-cancelled' };
    return `badge ${map[status] || ''}`;
  };

  const getNextAction = (status) => {
    switch (status) {
      case 'Pending': return { label: 'Accept & Prepare', next: 'Preparing', className: 'btn-primary' };
      case 'Preparing': return { label: 'Mark Ready for Pickup', next: 'Ready', className: 'btn-primary' };
      case 'Ready': return { label: 'Complete Order (Paid)', next: 'Completed', className: 'btn-primary' };
      default: return null;
    }
  };

  if (loading) return <div className="page"><div className="loading-spinner"><div className="spinner" /></div></div>;

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: '20px 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IoClipboard size={24} color="var(--primary)" />
          <h1 style={{ fontSize: 20 }}>Order Management</h1>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadOrders} style={{ padding: 8 }}>
          <IoRefresh size={20} />
        </button>
      </div>

      {/* Orders Status Filter Tabs */}
      <div className="tab-bar" style={{ background: 'transparent', padding: 0, marginBottom: 16 }}>
        {['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'].map(s => (
          <button key={s} className={`tab-item ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">No {statusFilter.toLowerCase()} orders</div>
          <div className="empty-state-text">New student orders will appear here automatically.</div>
        </div>
      ) : (
        orders.map((order, i) => {
          const action = getNextAction(order.status);
          return (
            <div key={order.id} className="order-card" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="order-card-header">
                <span className="order-number">{order.orderNumber}</span>
                <span className={getStatusBadge(order.status)}>{order.status}</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 12px', background: 'var(--surface-hover)',
                borderRadius: 'var(--radius-md)', marginBottom: 8, fontSize: 13,
              }}>
                <span style={{ fontWeight: 600 }}>👤 {order.student?.fullName}</span>
                <span className="text-muted">{order.student?.gradeSection}</span>
              </div>
              <div className="order-items-preview" style={{ fontWeight: 500, fontSize: 14 }}>
                {order.items?.map((item, j) => (
                  <div key={j} style={{ padding: '2px 0' }}>• {item.itemName} <strong>x{item.quantity}</strong> (₱{(item.price * item.quantity).toFixed(2)})</div>
                ))}
              </div>
              <div className="order-card-footer" style={{ marginTop: 8 }}>
                <span className="order-total">₱{order.totalAmount?.toFixed(2)}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {order.status === 'Pending' && (
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ borderColor: 'var(--cancelled)', color: 'var(--cancelled)', fontSize: 12, padding: '4px 10px' }}
                      onClick={() => updateStatus(order.id, 'Cancelled')}
                    >
                      Decline Order
                    </button>
                  )}
                  {action && (
                    <button
                      className={`btn ${action.className} btn-sm`}
                      onClick={() => updateStatus(order.id, action.next)}
                    >
                      {action.label}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
