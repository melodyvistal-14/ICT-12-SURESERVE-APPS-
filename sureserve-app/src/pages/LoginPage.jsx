import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IoSchool, IoEye, IoEyeOff, IoStorefront, IoFastFoodOutline, IoChevronBack } from 'react-icons/io5';
import CanteenIllustration from '../components/CanteenIllustration';
import api from '../services/api';

export default function LoginPage() {
  const [showForm, setShowForm] = useState(false);
  const [loginRole, setLoginRole] = useState('Student'); // 'Student' or 'Vendor'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleOpenPortal = (role) => {
    setLoginRole(role);
    setError('');
    setUsername('');
    setPassword('');
    setShowForm(true);
  };

  const handleLoginSubmit = async (e, customUser, customPwd) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    const userToLogin = customUser || username;
    const pwdToLogin = customPwd || password;

    try {
      const res = await api.post('/auth/login', {
        username: userToLogin,
        password: pwdToLogin,
        portalRole: loginRole
      });
      login(res.data.user, res.data.token);
      if (res.data.user.role === 'Admin') {
        navigate('/admin');
      } else if (res.data.user.role === 'Vendor') {
        navigate('/vendor');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || (loginRole === 'Vendor' ? 'Incorrect passkey or password.' : 'Incorrect username or password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = () => {
    handleLoginSubmit(null, 'student', 'student123');
  };

  return (
    <div
      className="page"
      style={{
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 35%, #F8FAFC 100%)',
        position: 'relative',
        justifyContent: 'space-between',
        overflowY: 'auto',
      }}
    >
      {/* Top Branding Section */}
      <div style={{ textAlign: 'center', paddingTop: '36px', paddingLeft: '24px', paddingRight: '24px' }}>
        {/* Cloche Logo */}
        <div
          style={{
            width: 58,
            height: 58,
            background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px',
            color: 'white',
            boxShadow: '0 6px 16px rgba(22, 101, 52, 0.25)',
          }}
        >
          <IoFastFoodOutline size={30} />
        </div>

        {/* Brand Name */}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: '#145C2E',
            letterSpacing: '-0.5px',
            marginBottom: 2,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          SureServe
        </h1>
        <p
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: '#15803D',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          SCHOOL CANTEEN
        </p>

        {/* SCHOOL ONLY Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#15803D',
            color: 'white',
            padding: '6px 16px',
            borderRadius: '9999px',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.8px',
            boxShadow: '0 2px 8px rgba(21, 128, 61, 0.2)',
            marginBottom: 12,
          }}
        >
          <IoSchool size={15} />
          <span>SCHOOL ONLY</span>
        </div>

        {/* Tagline */}
        <p style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 2 }}>
          For Students, By School.
        </p>
        <p style={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>
          School only access.
        </p>
      </div>

      {/* Main Illustration Section */}
      <div style={{ padding: '16px 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CanteenIllustration />
      </div>

      {/* Interactive Actions & Login Sheet */}
      <div style={{ padding: '0 24px 32px' }}>
        {showForm ? (
          /* Full Username & Password Form */
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
              border: '1px solid #E2E8F0',
              animation: 'slideUp 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                <IoChevronBack size={20} />
              </button>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: loginRole === 'Vendor' ? '#166534' : '#15803D' }}>
                {loginRole === 'Vendor' ? 'Canteen Vendor Login 🏪' : 'Student Login 🎓'}
              </h3>
              <div style={{ width: 34 }}></div>
            </div>

            {error && (
              <div
                style={{
                  background: '#FEE2E2',
                  color: '#DC2626',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 14,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={(e) => handleLoginSubmit(e)}>
              <div className="input-group">
                <label>{loginRole === 'Vendor' ? 'Vendor Passkey' : 'Student Username'}</label>
                <input
                  className="input"
                  type="text"
                  placeholder={loginRole === 'Vendor' ? 'Enter your vendor passkey' : 'e.g. princess or student ID'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94A3B8',
                      fontSize: 18,
                    }}
                  >
                    {showPwd ? <IoEyeOff /> : <IoEye />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  background: loginRole === 'Vendor' ? '#166534' : '#15803D',
                  padding: '14px',
                  borderRadius: '14px',
                  fontSize: 15,
                  fontWeight: 700,
                  marginTop: 6,
                }}
              >
                {loading ? 'Logging in...' : (loginRole === 'Vendor' ? 'Sign In as Vendor 🏪' : 'Sign In as Student 🎓')}
              </button>

              <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#64748B' }}>
                {loginRole === 'Student' ? (
                  <p>Don't have a student account? <Link to="/register" style={{ color: '#15803D', fontWeight: 700, textDecoration: 'none' }}>Register Student Account</Link></p>
                ) : (
                  <p>New Canteen Stall Staff? <Link to="/vendor/register" style={{ color: '#166534', fontWeight: 700, textDecoration: 'underline' }}>Register Canteen Stall</Link></p>
                )}
              </div>
            </form>
          </div>
        ) : (
          /* Main Portal Choice Buttons */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Student Login Button */}
            <button
              type="button"
              className="btn"
              onClick={() => handleOpenPortal('Student')}
              style={{
                background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
                color: 'white',
                padding: '16px',
                borderRadius: '16px',
                fontSize: 15,
                fontWeight: 700,
                boxShadow: '0 6px 18px rgba(22, 101, 52, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <IoSchool size={20} />
              <span>Student Login</span>
            </button>

            {/* Vendor Login Button */}
            <button
              type="button"
              className="btn"
              onClick={() => handleOpenPortal('Vendor')}
              style={{
                background: '#FFFFFF',
                color: '#166534',
                padding: '14px',
                borderRadius: '16px',
                fontSize: 15,
                fontWeight: 700,
                border: '2px solid #BBF7D0',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <IoStorefront size={20} />
              <span>Canteen Vendor Login</span>
            </button>
          </div>
        )}

        {/* Footer info */}
        <p
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: 12,
            fontWeight: 500,
            color: '#94A3B8',
          }}
        >
          Only students and school staff
        </p>
      </div>
    </div>
  );
}
