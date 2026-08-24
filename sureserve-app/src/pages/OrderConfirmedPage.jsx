import { useLocation, useNavigate } from 'react-router-dom';
import { IoCheckmarkCircle } from 'react-icons/io5';

export default function OrderConfirmedPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingTop: 80 }}>
      <div style={{ animation: 'scaleIn 0.5s ease' }}>
        <IoCheckmarkCircle size={80} color="var(--primary)" />
      </div>
      <h1 style={{ marginTop: 20, fontSize: 22 }}>Order Placed! 🎉</h1>
      <p className="text-muted" style={{ marginTop: 8, fontSize: 14, maxWidth: 280, lineHeight: 1.6 }}>
        Your order has been sent to the canteen. They'll start preparing it soon!
      </p>

      {state && (
        <div style={{
          marginTop: 24, padding: 20,
          background: 'var(--primary-bg)', borderRadius: 'var(--radius-lg)',
          width: '100%', maxWidth: 300,
        }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Order Number</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{state.orderNumber}</p>
          <div className="divider" />
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Total Amount</p>
          <p style={{ fontSize: 20, fontWeight: 700 }}>₱{state.totalAmount?.toFixed(2)}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Pay at the canteen when you pick up</p>
        </div>
      )}

      <button className="btn btn-primary" onClick={() => navigate('/orders')} style={{ marginTop: 32, width: 'auto', padding: '12px 32px' }}>
        View My Orders
      </button>
      <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ marginTop: 8 }}>
        Back to Home
      </button>

      <p style={{ marginTop: 40, fontSize: 13, color: 'var(--text-muted)' }}>
        Thank you for supporting our canteen vendors! 💚
      </p>
    </div>
  );
}
