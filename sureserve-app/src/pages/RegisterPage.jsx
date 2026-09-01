import { useState, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IoEye, IoEyeOff, IoArrowBack, IoCloudUpload, IoIdCard, IoCheckmarkCircle, IoWarning } from 'react-icons/io5';
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

  // ID Photo state
  const [idPhotoFile, setIdPhotoFile] = useState(null);
  const [idPhotoPreview, setIdPhotoPreview] = useState(null);
  const [idPhotoUploading, setIdPhotoUploading] = useState(false);
  const [idPhotoUrl, setIdPhotoUrl] = useState('');
  const [idPhotoDragOver, setIdPhotoDragOver] = useState(false);
  const fileInputRef = useRef(null);

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

  // ── Handle ID photo file selection ──
  const handlePhotoSelect = async (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a JPG, PNG, or WEBP image for your School ID.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('ID photo must be smaller than 5 MB.');
      return;
    }

    setIdPhotoFile(file);
    setIdPhotoPreview(URL.createObjectURL(file));
    setError('');

    // Upload immediately so we have the URL ready
    setIdPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/auth/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setIdPhotoUrl(res.data.url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload ID photo. Please try again.');
      setIdPhotoFile(null);
      setIdPhotoPreview(null);
    } finally {
      setIdPhotoUploading(false);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIdPhotoDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handlePhotoSelect(file);
  };

  // ── Form submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isVendorRoute && !idPhotoUrl) {
      setError('Please upload a photo of your School ID before registering.');
      return;
    }

    if (idPhotoUploading) {
      setError('Please wait — your ID photo is still uploading...');
      return;
    }

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
      studentIdPhotoUrl: idPhotoUrl,
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
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <IoWarning size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
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
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                ⚠️ Each student can only create one account. Duplicate Student IDs will be rejected.
              </span>
            </div>

            {/* ── School ID Photo Upload ── */}
            <div style={{
              background: idPhotoUrl
                ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)'
                : 'linear-gradient(135deg, #F8FAFF 0%, #EEF2FF 100%)',
              border: idPhotoDragOver
                ? '2px dashed var(--primary)'
                : idPhotoUrl
                  ? '2px solid #22C55E'
                  : '2px dashed #CBD5E1',
              borderRadius: 16,
              padding: '18px 16px',
              marginBottom: 16,
              transition: 'all 0.25s ease',
            }}
              onDragOver={(e) => { e.preventDefault(); setIdPhotoDragOver(true); }}
              onDragLeave={() => setIdPhotoDragOver(false)}
              onDrop={handleDrop}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: idPhotoUrl ? '#22C55E' : 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', flexShrink: 0,
                }}>
                  {idPhotoUrl ? <IoCheckmarkCircle size={20} /> : <IoIdCard size={20} />}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: idPhotoUrl ? '#15803D' : '#1E293B' }}>
                    {idPhotoUrl ? '✅ School ID Photo Uploaded' : '📸 Upload Your School ID Photo'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {idPhotoUrl
                      ? 'Your ID photo is saved. It will be used to verify your identity at login.'
                      : 'Required · Used for identity verification when you log in'}
                  </div>
                </div>
              </div>

              {idPhotoPreview && (
                <div style={{ marginBottom: 14, textAlign: 'center' }}>
                  <img
                    src={idPhotoPreview}
                    alt="School ID preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 180,
                      borderRadius: 12,
                      objectFit: 'contain',
                      border: '2px solid #E2E8F0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  />
                  {idPhotoUploading && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                      ⏳ Uploading photo...
                    </div>
                  )}
                  {idPhotoUrl && !idPhotoUploading && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#22C55E', fontWeight: 600 }}>
                      ✅ Upload complete!
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                style={{ display: 'none' }}
                id="id-photo-input"
                onChange={handleFileInputChange}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={idPhotoUploading}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: 12,
                  border: 'none',
                  background: idPhotoUrl
                    ? 'rgba(34,197,94,0.12)'
                    : 'rgba(21,128,61,0.10)',
                  color: idPhotoUrl ? '#15803D' : 'var(--primary)',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: idPhotoUploading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.2s',
                }}
              >
                <IoCloudUpload size={18} />
                {idPhotoUploading
                  ? 'Uploading...'
                  : idPhotoUrl
                    ? 'Change ID Photo'
                    : 'Choose / Drop Photo Here'}
              </button>

              {!idPhotoUrl && (
                <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 10, marginBottom: 0 }}>
                  📱 Take a clear photo of your physical School ID card · Max 5MB · JPG, PNG, WEBP
                </p>
              )}
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

        <button
          className="btn btn-primary"
          disabled={loading || idPhotoUploading || (!isVendorRoute && !idPhotoUrl)}
          style={{ marginTop: 8 }}
        >
          {loading
            ? 'Creating Account...'
            : idPhotoUploading
              ? 'Uploading ID Photo...'
              : (isVendorRoute ? 'Create Canteen Stall Account 🏪' : 'Register Student Account 🎓')}
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
