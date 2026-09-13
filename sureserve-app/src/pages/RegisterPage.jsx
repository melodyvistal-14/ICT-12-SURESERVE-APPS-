import { useState, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IoEye, IoEyeOff, IoArrowBack, IoCloudUpload, IoIdCard, IoCheckmarkCircle, IoWarning } from 'react-icons/io5';
import api from '../services/api';

// Helper component for Image Uploads
function ImageUploadBox({ title, subtitle, icon, fileUrl, uploading, onFileSelect, accept = "image/jpeg,image/jpg,image/png,image/webp" }) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      onFileSelect(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      onFileSelect(file);
    }
  };

  return (
    <div style={{
      background: fileUrl
        ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)'
        : 'linear-gradient(135deg, #F8FAFF 0%, #EEF2FF 100%)',
      border: dragOver
        ? '2px dashed var(--primary)'
        : fileUrl
          ? '2px solid #22C55E'
          : '2px dashed #CBD5E1',
      borderRadius: 16,
      padding: '18px 16px',
      marginBottom: 16,
      transition: 'all 0.25s ease',
    }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: fileUrl ? '#22C55E' : 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', flexShrink: 0,
        }}>
          {fileUrl ? <IoCheckmarkCircle size={20} /> : icon}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: fileUrl ? '#15803D' : '#1E293B' }}>
            {fileUrl ? `✅ ${title} Uploaded` : `📸 Upload ${title}`}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {fileUrl ? 'Image saved successfully.' : subtitle}
          </div>
        </div>
      </div>

      {preview && (
        <div style={{ marginBottom: 14, textAlign: 'center' }}>
          <img
            src={preview}
            alt="Preview"
            style={{
              maxWidth: '100%',
              maxHeight: 180,
              borderRadius: 12,
              objectFit: 'contain',
              border: '2px solid #E2E8F0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          />
          {uploading && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
              ⏳ Uploading photo...
            </div>
          )}
          {fileUrl && !uploading && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#22C55E', fontWeight: 600 }}>
              ✅ Upload complete!
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleSelect}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{
          width: '100%', padding: '11px', borderRadius: 12, border: 'none',
          background: fileUrl ? 'rgba(34,197,94,0.12)' : 'rgba(21,128,61,0.10)',
          color: fileUrl ? '#15803D' : 'var(--primary)',
          fontWeight: 700, fontSize: 14, cursor: uploading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.2s',
        }}
      >
        <IoCloudUpload size={18} />
        {uploading ? 'Uploading...' : fileUrl ? 'Change Photo' : 'Choose / Drop Photo Here'}
      </button>

      {!fileUrl && (
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 10, marginBottom: 0 }}>
          Max 5MB · JPG, PNG, WEBP
        </p>
      )}
    </div>
  );
}


export default function RegisterPage({ defaultRole }) {
  const location = useLocation();
  const isVendorRoute = defaultRole === 'Vendor' || location.pathname === '/vendor/register';
  const initialRole = isVendorRoute ? 'Vendor' : 'Student';

  const [form, setForm] = useState({
    username: '', password: '', fullName: '', firstName: '', lastName: '',
    role: initialRole, shopName: '', vendorCode: '', studentId: '', teacherId: '',
    gradeLevel: 'Grade 10', sectionName: 'Section A', strand: 'STEM', department: '',
    age: '', birthday: '', address: '', building: '', floor: '', room: '', section: '',
  });

  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Upload States (School ID for students, Teacher ID for teachers; all profile & stall photos are managed in Profile)
  const [idPhotoUrl, setIdPhotoUrl] = useState('');
  const [idPhotoUploading, setIdPhotoUploading] = useState(false);

  const isSeniorHigh = form.gradeLevel === 'Grade 11' || form.gradeLevel === 'Grade 12';
  const isTeacher = form.role === 'Teacher';

  const calculateAge = (birthdayStr) => {
    if (!birthdayStr) return '';
    const birthDate = new Date(birthdayStr);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) calculatedAge--;
    return calculatedAge.toString();
  };

  const handleFileUpload = async (file, setUrl, setUploading) => {
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5 MB.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/auth/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUrl(res.data.url);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isVendorRoute && idPhotoUploading) {
      setError('Please wait — ID photo is still uploading...');
      return;
    }

    if (!isVendorRoute && !idPhotoUrl) {
      setError('Please upload your ID photo before registering.');
      return;
    }

    // Validate Teacher ID format
    if (isTeacher && form.teacherId && !form.teacherId.startsWith('T-')) {
      setError('Teacher ID must start with "T-" (e.g., T-2026-00125)');
      return;
    }

    setLoading(true);

    const calculatedGradeSection = isVendorRoute ? '' : (isSeniorHigh ? `${form.gradeLevel} - ${form.strand} (${form.sectionName})` : `${form.gradeLevel} - ${form.sectionName}`);

    const payload = {
      ...form,
      // Students use Student ID as username; Teachers use Teacher ID as username; Vendors use their Passkey as username
      username: !isVendorRoute ? (isTeacher ? form.teacherId.trim() : form.studentId.trim()) : form.vendorCode.trim(),
      role: isTeacher ? 'Teacher' : initialRole,
      fullName: isVendorRoute ? form.fullName : `${form.firstName} ${form.lastName}`.trim(),
      gradeSection: isTeacher ? '' : calculatedGradeSection,
      age: form.age ? parseInt(form.age) : 0,
      studentIdPhotoUrl: isTeacher ? '' : idPhotoUrl,
      teacherIdPhotoUrl: isTeacher ? idPhotoUrl : '',
      profileImageUrl: '', // Profile & stall photos can be uploaded/edited in the Profile page
      stallImageUrl: '',
    };

    try {
      const res = await api.post('/auth/register', payload);
      login(res.data.user, res.data.token);
      if (res.data.user.role === 'Vendor') navigate('/vendor');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ padding: 0 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', padding: '36px 24px 28px', color: 'white', borderRadius: '0 0 28px 28px' }}>
        <button onClick={() => navigate('/login')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', marginBottom: 12 }}>
          <IoArrowBack size={20} />
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>{isVendorRoute ? 'Register Canteen Stall 🏪' : 'Create Account 🎓'}</h1>
        <p style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>{isVendorRoute ? 'Canteen Stall Manager Registration' : 'Join SureServe School Canteen'}</p>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
        {error && (
          <div style={{ background: 'var(--cancelled-bg)', color: 'var(--cancelled)', padding: '10px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <IoWarning size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Role Selection for Students/Teachers */}
        {!isVendorRoute && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: 14, color: '#1E293B', marginBottom: 8 }}>I am a:</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setForm({ ...form, role: 'Student' })}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: 12,
                  border: form.role === 'Student' ? '2px solid var(--primary)' : '2px solid #E2E8F0',
                  background: form.role === 'Student' ? 'var(--primary-bg)' : 'white',
                  color: form.role === 'Student' ? 'var(--primary-dark)' : '#64748B',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                🎓 Student
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, role: 'Teacher' })}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: 12,
                  border: form.role === 'Teacher' ? '2px solid var(--primary)' : '2px solid #E2E8F0',
                  background: form.role === 'Teacher' ? 'var(--primary-bg)' : 'white',
                  color: form.role === 'Teacher' ? 'var(--primary-dark)' : '#64748B',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                👨‍🏫 Teacher
              </button>
            </div>
          </div>
        )}

        {form.role === 'Vendor' ? (
          <>
            <div className="input-group" style={{ background: 'var(--surface-hover)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 16 }}>
              <label style={{ color: 'var(--primary-dark)', fontWeight: 700 }}>🔒 School Vendor Verification Passkey</label>
              <input className="input" type="text" placeholder="Enter your assigned Vendor Passkey" value={form.vendorCode} onChange={(e) => setForm({ ...form, vendorCode: e.target.value })} required style={{ background: 'white' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>🛡️ Enter the unique passkey provided by the School Admin to verify your canteen stall registration.</span>
            </div>

            <div className="input-group">
              <label>Canteen / Shop Name</label>
              <input className="input" type="text" placeholder="e.g. Tia Mel's Canteen" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group"><label>First Name</label><input className="input" type="text" placeholder="e.g. Maria" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
              <div className="input-group"><label>Last Name</label><input className="input" type="text" placeholder="e.g. Santos" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12 }}>
              <div className="input-group"><label>Age</label><input className="input" type="text" placeholder="Auto-calculated" value={form.age} readOnly style={{ background: 'var(--surface-hover)', cursor: 'not-allowed', color: 'var(--text-muted)', fontWeight: 600 }} /></div>
              <div className="input-group"><label>Birthday</label><input className="input" type="date" value={form.birthday} onChange={(e) => { const newBday = e.target.value; setForm({ ...form, birthday: newBday, age: calculateAge(newBday) }); }} required /></div>
            </div>

            <div className="input-group"><label>Home / Business Address</label><input className="input" type="text" placeholder="e.g. 456 Canteen Lane, Manila" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></div>
          </>
        ) : (
          <>
            {/* First & Last Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group"><label>First Name</label><input className="input" type="text" placeholder="e.g. Juan" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
              <div className="input-group"><label>Last Name</label><input className="input" type="text" placeholder="e.g. Dela Cruz" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
            </div>

            {/* ID Number - Student or Teacher */}
            <div className="input-group">
              <label>{isTeacher ? 'Teacher ID Number' : 'Student ID Number'}</label>
              <input 
                className="input" 
                type="text" 
                placeholder={isTeacher ? 'e.g. T-2026-00125' : 'e.g. 2026-00125'} 
                value={isTeacher ? form.teacherId : form.studentId} 
                onChange={(e) => isTeacher ? setForm({ ...form, teacherId: e.target.value }) : setForm({ ...form, studentId: e.target.value })} 
                required 
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                {isTeacher ? '⚠️ Teacher IDs must start with "T-" (e.g., T-2026-00125). Each teacher can only create one account.' : '⚠️ Each student can only create one account. Duplicate IDs will be rejected.'}
              </span>
            </div>

            {/* School ID Upload — Strictly Required */}
            <div style={{ background: '#FFF7ED', border: '2px solid #FB923C', borderRadius: 14, padding: '10px 14px', marginBottom: 8, fontSize: 12, color: '#9A3412', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoIdCard size={16} style={{ flexShrink: 0 }} />
              <span>🚨 {isTeacher ? 'Teacher' : 'School'} ID Photo is <u>required</u> — registration will be declined without it. This is used for ID scanning verification every time you log in.</span>
            </div>
            <ImageUploadBox 
              title={`${isTeacher ? 'Teacher' : 'School'} ID Photo`} 
              subtitle="REQUIRED — No ID = No Account" 
              icon={<IoIdCard size={20} />} 
              fileUrl={idPhotoUrl} 
              uploading={idPhotoUploading} 
              onFileSelect={(f) => handleFileUpload(f, setIdPhotoUrl, setIdPhotoUploading)} 
            />

            {/* Student-specific fields */}
            {!isTeacher && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="input-group">
                    <label>Grade Level</label>
                    <select className="input" value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}>
                      <option value="Grade 7">Grade 7</option><option value="Grade 8">Grade 8</option><option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option><option value="Grade 11">Grade 11 (Senior High)</option><option value="Grade 12">Grade 12 (Senior High)</option>
                    </select>
                  </div>
                  <div className="input-group"><label>Section Name</label><input className="input" type="text" placeholder="e.g. Section A" value={form.sectionName} onChange={(e) => setForm({ ...form, sectionName: e.target.value })} required /></div>
                </div>

                {isSeniorHigh && (
                  <div className="input-group" style={{ background: 'var(--primary-bg)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-light)' }}>
                    <label style={{ color: 'var(--primary-dark)', fontWeight: 700 }}>Senior High Strand Name 🎓</label>
                    <select className="input" value={form.strand} onChange={(e) => setForm({ ...form, strand: e.target.value })} style={{ background: 'white' }}>
                      <option value="STEM">STEM (Science, Tech, Engineering & Math)</option><option value="ABM">ABM (Accountancy, Business & Management)</option><option value="HUMSS">HUMSS (Humanities & Social Sciences)</option><option value="TVL">TVL (Technical-Vocational-Livelihood)</option><option value="GAS">GAS (General Academic Strand)</option>
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Teacher-specific fields */}
            {isTeacher && (
              <div className="input-group">
                <label>Department</label>
                <select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                  <option value="">Select Department</option>
                  <option value="Science">Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="English">English</option>
                  <option value="Filipino">Filipino</option>
                  <option value="Social Studies">Social Studies</option>
                  <option value="Physical Education">Physical Education</option>
                  <option value="Arts">Arts</option>
                  <option value="Technology">Technology</option>
                  <option value="General">General</option>
                </select>
              </div>
            )}

            {/* Common fields for both students and teachers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div className="input-group">
                <label>Building</label>
                <input className="input" type="text" placeholder="e.g. Main Building" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Floor</label>
                <input className="input" type="text" placeholder="e.g. 2nd Floor" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Room</label>
                <input className="input" type="text" placeholder="e.g. Room 201" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
              </div>
            </div>

            <div className="input-group">
              <label>Section</label>
              <input className="input" type="text" placeholder="e.g. Section A" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12 }}>
              <div className="input-group"><label>Age</label><input className="input" type="text" placeholder="Auto-calculated" value={form.age} readOnly style={{ background: 'var(--surface-hover)', cursor: 'not-allowed', color: 'var(--text-muted)', fontWeight: 600 }} /></div>
              <div className="input-group"><label>Birthday</label><input className="input" type="date" value={form.birthday} onChange={(e) => { const newBday = e.target.value; setForm({ ...form, birthday: newBday, age: calculateAge(newBday) }); }} required /></div>
            </div>

            <div className="input-group"><label>Home Address</label><input className="input" type="text" placeholder="e.g. 123 Sampaguita St, Brgy. Central, Manila" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></div>
          </>
        )}

        {/* No username field needed — Students use Student ID, Vendors use Passkey */}

        <div className="input-group">
          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <input className="input" type={showPwd ? 'text' : 'password'} placeholder="Create a password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required style={{ paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20 }}>{showPwd ? <IoEyeOff /> : <IoEye />}</button>
          </div>
        </div>

        <button
          className="btn btn-primary"
          disabled={loading || (!isVendorRoute && (idPhotoUploading || !idPhotoUrl))}
          style={{ marginTop: 8 }}
        >
          {loading ? 'Creating Account...' : (!isVendorRoute && idPhotoUploading) ? 'Uploading ID...' : (isVendorRoute ? 'Create Canteen Stall Account 🏪' : (isTeacher ? 'Register Teacher Account 👨‍🏫' : 'Register Student Account 🎓'))}
        </button>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
          {isVendorRoute ? 'Already registered your canteen stall?' : (isTeacher ? 'Already have a teacher account?' : 'Already have a student account?')} <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>{isVendorRoute ? 'Sign In as Vendor' : (isTeacher ? 'Sign In as Teacher' : 'Sign In as Student')}</Link>
        </p>
      </form>
    </div>
  );
}
