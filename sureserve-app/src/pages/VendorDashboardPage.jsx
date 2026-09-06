import { useState, useEffect } from 'react';
import { IoRefresh, IoStorefront, IoChevronForward, IoPencil, IoPerson } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function VendorDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Poll for updates every 3 seconds
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [dashRes, ordersRes] = await Promise.all([
        api.get('/vendor/dashboard'),
        api.get('/vendor/orders') // getting all orders
      ]);
      setDashboard(dashRes.data);
      
      // Filter out completed and cancelled orders for the dashboard view
      const active = ordersRes.data.filter(o => 
        ['Pending', 'Preparing', 'Ready'].includes(o.status)
      );
      setActiveOrders(active);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const getStatusBadge = (status) => {
    const map = { Pending: 'badge-pending', Preparing: 'badge-preparing', Ready: 'badge-ready' };
    return `badge ${map[status] || ''}`;
  };

  if (loading) return <div className="page"><div className="loading-spinner"><div className="spinner" /></div></div>;

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      {/* Vendor Stall Banner & Header */}
      <div style={{
        background: 'white',
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
        marginBottom: 16,
      }}>
        {/* Stall Banner Image (Owner with Food) */}
        <div style={{
          width: '100%',
          height: 120,
          position: 'relative',
          background: dashboard?.stallImageUrl
            ? `url(${dashboard.stallImageUrl}) center/cover no-repeat`
            : 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          padding: '12px 16px',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%)'
          }} />

          <span style={{
            position: 'relative', zIndex: 2,
            background: 'rgba(255,255,255,0.95)',
            color: '#15803D',
            padding: '3px 10px',
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <IoStorefront size={13} /> Active Canteen Stall
          </span>

          <button
            className="btn btn-ghost btn-sm"
            onClick={loadData}
            style={{
              position: 'relative', zIndex: 2,
              background: 'rgba(255,255,255,0.9)',
              padding: '6px', borderRadius: '50%',
              color: '#15803D',
            }}
            title="Refresh dashboard"
          >
            <IoRefresh size={18} />
          </button>
        </div>

        {/* Owner Info and Quick Edit */}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Owner Face Avatar */}
            {dashboard?.ownerProfileImageUrl || dashboard?.logoUrl ? (
              <img
                src={dashboard.ownerProfileImageUrl || dashboard.logoUrl}
                alt={dashboard.ownerName || "Owner"}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #15803D',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            ) : (
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 18,
                border: '2px solid #15803D'
              }}>
                {(dashboard?.shopName || 'V').charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                {dashboard?.shopName || "Vendor Dashboard"}
              </h1>
              <p className="text-muted" style={{ fontSize: 12, margin: '2px 0 0' }}>
                {dashboard?.ownerName ? `Owner: ${dashboard.ownerName}` : 'Canteen Vendor'}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/profile')}
            style={{
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              color: '#15803D',
              borderRadius: 10,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <IoPencil size={13} /> Edit Profile
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Total Orders', value: dashboard?.totalOrders || 0, color: 'var(--primary)' },
          { label: 'Items Sold', value: dashboard?.totalItems || 0, color: 'var(--preparing)' },
          { label: 'Total Sales', value: `₱${(dashboard?.estimatedSales || 0).toLocaleString()}`, color: 'var(--ready)' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)',
            padding: '12px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Alert Banner */}
      {(dashboard?.pendingOrders > 0 || dashboard?.preparingOrders > 0 || dashboard?.readyForPickup > 0) && (
        <div style={{
          background: 'var(--pending-bg)', borderRadius: 'var(--radius-md)',
          padding: '12px 16px', marginBottom: 20, fontSize: 13,
        }}>
          {dashboard?.pendingOrders > 0 && <div style={{ color: 'var(--pending)', fontWeight: 600 }}>🔔 {dashboard.pendingOrders} new order(s) waiting for acceptance!</div>}
          {dashboard?.preparingOrders > 0 && <div>👨‍🍳 {dashboard.preparingOrders} order(s) currently being prepared</div>}
          {dashboard?.readyForPickup > 0 && <div>✅ {dashboard.readyForPickup} order(s) waiting for student pickup</div>}
        </div>
      )}

      {/* Recent Active Orders */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Active Orders</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vendor/orders')} style={{ color: 'var(--primary)', fontSize: 13 }}>
          View All
        </button>
      </div>

      {activeOrders.length === 0 ? (
        <div className="empty-state" style={{ padding: '30px 20px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
          <div className="empty-state-icon" style={{ fontSize: 24 }}>✨</div>
          <div className="empty-state-title" style={{ fontSize: 14 }}>No active orders right now</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activeOrders.map((order, i) => (
            <div 
              key={order.id} 
              onClick={() => navigate('/vendor/orders')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: 'var(--surface-hover)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                animationDelay: `${i * 0.05}s`
              }}
              className="card"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {order.student?.profileImageUrl ? (
                  <img
                    src={order.student.profileImageUrl}
                    alt={order.student?.fullName || "Student"}
                    style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: 40, height: 40, borderRadius: '20px', 
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 14
                  }}>
                    {order.student?.fullName?.charAt(0) || '👤'}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{order.student?.fullName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.orderNumber} • ₱{order.totalAmount?.toFixed(2)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={getStatusBadge(order.status)}>{order.status}</span>
                <IoChevronForward color="var(--text-muted)" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
