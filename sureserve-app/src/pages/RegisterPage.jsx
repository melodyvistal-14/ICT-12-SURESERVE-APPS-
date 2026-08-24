import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IoEye, IoEyeOff, IoArrowBack, IoSchool, IoStorefront } from 'react-icons/io5';
import api from '../services/api';

export default function RegisterPage({ defaultRole }) {
  const location = useLocation();
  const isVendorRoute = defaultRole === 'Vendor' || location.pathname === '/vendor/register';
  const initialRole = isVendorRoute ? 'Vendor' : 'Student';

  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    firstName: '',
    lastName: '',
    role: initialRole,
    shopName: '',
    vendorCode: '',
    studentId: '',
    gradeLevel: 'Grade 10',
    sectionName: 'Section A',
    strand: 'STEM',
    age: '',
    birthday: '',
    address: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const isSeniorHigh = form.gradeLevel === 'Grade 11' || form.gradeLevel === 'Grade 12';

  const calculateAge = (birthdayStr) => {
    if (!birthdayStr) return '';
    const birthDate = new Date(birthdayStr);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    return calculatedAge.toString();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const calculatedGradeSection = isVendorRoute
      ? ''
      : (isSeniorHigh ? `${form.gradeLevel} - ${form.strand} (${form.sectionName})` : `${form.gradeLevel} - ${form.sectionName}`);

    const payload = {
      ...form,
      role: initialRole,
      fullName: isVendorRoute ? form.fullName : `${form.firstName} ${form.lastName}`.trim(),
      gradeSection: calculatedGradeSection,
      age: form.age ? parseInt(form.age) : 0,
    };

    try {
      const res = await api.post('/auth/register', payload);
      login(res.data.user, res.data.token);
      if (res.data.user.role === 'Vendor') {
        navigate('/vendor');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ padding: 0 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
        padding: '36px 24px 28px',
        color: 'white',
        borderRadius: '0 0 28px 28px',
      }}>
        <button
          onClick={() => navigate('/login')}
          style={{
            background: 'rgba(255,255,255,0.2)', border: 'none',
            width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'white', marginBottom: 12,
          }}
        >
          <IoArrowBack size={20} />
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>
          {isVendorRoute ? 'Register Canteen Stall 🏪' : 'Create Student Account 🎓'}
        </h1>
        <p style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
          {isVendorRoute ? 'Canteen Stall Manager Registration' : 'Join SureServe School Canteen'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
        {error && (
          <div style={{
            background: 'var(--cancelled-bg)', color: 'var(--cancelled)',
            padding: '10px 16px', borderRadius: 'var(--radius-md)',
            fontSize: 13, fontWeight: 500, marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {form.role === 'Vendor' ? (
          <>
            <div className="input-group" style={{ background: 'var(--surface-hover)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 16 }}>
              <label style={{ color: 'var(--primary-dark)', fontWeight: 700 }}>🔒 School Vendor Verification Passkey</label>
              <input
                className="input"
                type="text"
                placeholder="Enter your assigned Vendor Passkey"
                value={form.vendorCode}
                onChange={(e) => setForm({ ...form, vendorCode: e.target.value })}
                required
                style={{ background: 'white' }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                🛡️ Enter the unique passkey provided by the School Admin to verify your canteen stall registration.
              </span>
            </div>

            <div className="input-group">
              <label>Canteen / Shop Name</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Tia Mel's Canteen"
                value={form.shopName}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                required
              />
            </div>

            {/* Vendor First & Last Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label>First Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Maria"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="input-group">
                <label>Last Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Santos"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Vendor Age & Birthday */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12 }}>
              <div className="input-group">
                <label>Age</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Auto-calculated"
                  value={form.age}
                  readOnly
                  style={{ background: 'var(--surface-hover)', cursor: 'not-allowed', color: 'var(--text-muted)', fontWeight: 600 }}
                />
              </div>
              <div className="input-group">
                <label>Birthday</label>
                <input
                  className="input"
                  type="date"
                  value={form.birthday}
                  onChange={(e) => {
                    const newBday = e.target.value;
                    setForm({ ...form, birthday: newBday, age: calculateAge(newBday) });
                  }}
                  required
                />
              </div>
            </div>

            {/* Vendor Address */}
            <div className="input-group">
              <label>Home / Business Address</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. 456 Canteen Lane, Manila"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
            </div>
          </>
        ) : (
          <>
            {/* Student First & Last Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label>First Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Princess"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="input-group">
                <label>Last Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Sabino"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Student ID Number */}
            <div className="input-group">
              <label>Student ID Number</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. 2026-00125"
                value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                required
              />
            </div>

            {/* Grade Level & Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label>Grade Level</label>
                <select
                  className="input"
                  value={form.gradeLevel}
                  onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
                >
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11 (Senior High)</option>
                  <option value="Grade 12">Grade 12 (Senior High)</option>
                </select>
              </div>
              <div className="input-group">
                <label>Section Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Section A"
                  value={form.sectionName}
                  onChange={(e) => setForm({ ...form, sectionName: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Senior High Strand (Shown only if Senior High) */}
            {isSeniorHigh && (
              <div className="input-group" style={{ background: 'var(--primary-bg)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-light)' }}>
                <label style={{ color: 'var(--primary-dark)', fontWeight: 700 }}>Senior High Strand Name 🎓</label>
                <select
                  className="input"
                  value={form.strand}
                  onChange={(e) => setForm({ ...form, strand: e.target.value })}
                  style={{ background: 'white' }}
                >
                  <option value="STEM">STEM (Science, Tech, Engineering & Math)</option>
                  <option value="ABM">ABM (Accountancy, Business & Management)</option>
                  <option value="HUMSS">HUMSS (Humanities & Social Sciences)</option>
                  <option value="TVL">TVL (Technical-Vocational-Livelihood)</option>
                  <option value="GAS">GAS (General Academic Strand)</option>
                </select>
              </div>
            )}

            {/* Age & Birthday */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12 }}>
              <div className="input-group">
                <label>Age</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Auto-calculated"
                  value={form.age}
                  readOnly
                  style={{ background: 'var(--surface-hover)', cursor: 'not-allowed', color: 'var(--text-muted)', fontWeight: 600 }}
                />
              </div>
              <div className="input-group">
                <label>Birthday</label>
                <input
                  className="input"
                  type="date"
                  value={form.birthday}
                  onChange={(e) => {
                    const newBday = e.target.value;
                    setForm({ ...form, birthday: newBday, age: calculateAge(newBday) });
                  }}
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div className="input-group">
              <label>Home Address</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. 123 Sampaguita St, Brgy. Central, Manila"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
            </div>
          </>
        )}

        {/* Username & Password */}
        <div className="input-group">
          <label>Username</label>
          <input
            className="input"
            type="text"
            placeholder="Choose a username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
        </div>

        <div className="input-group">
          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type={showPwd ? 'text' : 'password'}
              placeholder="Create a password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: 20,
              }}
            >
              {showPwd ? <IoEyeOff /> : <IoEye />}
            </button>
          </div>
        </div>

        <button className="btn btn-primary" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? 'Creating Account...' : (isVendorRoute ? 'Create Canteen Stall Account 🏪' : 'Register Student Account 🎓')}
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
          {isVendorRoute ? 'Already registered your canteen stall?' : 'Already have a student account?'}{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
            {isVendorRoute ? 'Sign In as Vendor' : 'Sign In as Student'}
          </Link>
        </p>
      </form>
    </div>
  );
}
