import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  IoLogOut,
  IoPersonCircle,
  IoSchool,
  IoLocation,
  IoCard,
  IoPencil,
  IoClose,
  IoStorefront,
  IoRestaurant,
  IoChevronForward,
  IoNotifications,
  IoCheckmarkCircle,
  IoAlertCircle
} from 'react-icons/io5';
import api from '../services/api';
import { registerPushNotifications, getNotificationPermission } from '../services/notifications';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    gradeSection: '',
    building: '',
    floor: '',
    room: '',
  });
  const [saving, setSaving] = useState(false);

  // Notification State
  const [notifPermission, setNotifPermission] = useState('default');
  const [enablingNotif, setEnablingNotif] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');

  useEffect(() => {
    loadProfile();
    getNotificationPermission().then(setNotifPermission);
  }, []);

  const handleEnableNotifications = async () => {
    setEnablingNotif(true);
    setNotifMessage('');
    const success = await registerPushNotifications();
    const perm = await getNotificationPermission();
    setNotifPermission(perm);
    if (success) {
      setNotifMessage('✅ Notifications enabled! You will now receive order updates.');
    } else if (perm === 'denied') {
      setNotifMessage('❌ Notifications blocked. Go to your browser/app settings to allow them.');
    } else {
      setNotifMessage('⚠️ Could not enable notifications. Try again.');
    }
    setEnablingNotif(false);
  };

  const loadProfile = async () => {
    try {
      const res = await api.get('/users/me');
      setProfileData(res.data);
      if (res.data) {
        setEditForm({
          fullName: res.data.fullName || '',
          gradeSection: res.data.studentProfile?.gradeSection || 'Grade 12 - ABM A',
          building: res.data.studentProfile?.building || 'Main Academic Building',
          floor: res.data.studentProfile?.floor || '3rd Floor',
          room: res.data.studentProfile?.room || 'Room 302',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/users/me', {
        fullName: editForm.fullName,
        studentInfo: {
          gradeSection: editForm.gradeSection,
          building: editForm.building,
          floor: editForm.floor,
          room: editForm.room,
        },
      });
      await loadProfile();
      setShowEditModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const isStudent = user?.role === 'Student' || profileData?.role === 'Student';
  const studentInfo = profileData?.studentProfile;
  const vendorInfo = profileData?.vendorProfile;

  if (loading) {
    return (
      <div className="page">
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: '100px' }}>
      {/* Profile Header */}
      <div style={{ padding: '32px 0 24px', textAlign: 'center', position: 'relative', background: 'linear-gradient(to bottom, var(--surface-hover), transparent)' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {vendorInfo?.logoUrl ? (
            <img src={vendorInfo.logoUrl} alt="Logo" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
          ) : (
            <IoPersonCircle size={90} color="var(--primary)" style={{ opacity: 0.9, filter: 'drop-shadow(0 4px 8px rgba(22, 101, 52, 0.15))' }} />
          )}
        </div>
        <h2 style={{ marginTop: 10, fontSize: 22, fontWeight: 800 }}>{profileData?.fullName || user?.fullName}</h2>
        <p className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>@{profileData?.username || user?.username}</p>
        <div style={{ marginTop: 8 }}>
          <span
            className={`badge ${isStudent ? 'badge-preparing' : 'badge-ready'}`}
            style={{ fontSize: 12, padding: '6px 14px', borderRadius: '9999px', textTransform: 'none' }}
          >
            {isStudent ? '🎓 Student Account' : '🏪 Vendor Account'}
          </span>
        </div>
      </div>

      {/* STUDENT SPECIFIC INFORMATION CARD */}
      {isStudent && (
        <div
          style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid #DCFCE7',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 4px 14px rgba(22, 101, 52, 0.06)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#145C2E', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IoSchool size={20} color="#15803D" />
              Student Academic Info
            </h3>
            <button
              onClick={() => setShowEditModal(true)}
              style={{
                background: '#FFFFFF',
                border: '1px solid #15803D',
                color: '#15803D',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <IoPencil size={14} /> Edit Info
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Student ID */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <IoCard size={20} color="#15803D" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Student ID</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  {studentInfo?.studentId || 'STU-2026-001'}
                </div>
              </div>
            </div>

            {/* Grade & Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <IoSchool size={20} color="#0284C7" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Grade & Section / Track</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  {studentInfo?.gradeSection || 'Grade 12 - STEM A'}
                </div>
              </div>
            </div>

            {/* Building & Room Location */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <IoLocation size={20} color="#D97706" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Classroom Location</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  {studentInfo?.building || 'Main Academic Building'}
                  {(studentInfo?.floor || studentInfo?.room) && (
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginTop: 2 }}>
                      {studentInfo?.floor} • {studentInfo?.room}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VENDOR SPECIFIC INFO */}
      {!isStudent && vendorInfo && (
        <div
          style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid #DCFCE7',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 4px 14px rgba(22, 101, 52, 0.06)',
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#145C2E', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <IoStorefront size={20} color="#15803D" />
            Canteen Stall Details
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <IoStorefront size={20} color="#15803D" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Shop Name</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  {vendorInfo.shopName}
                </div>
              </div>
            </div>

            {vendorInfo.description && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#FFFFFF', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <IoRestaurant size={20} color="#0284C7" style={{ marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Description</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 }}>
                    {vendorInfo.description}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => navigate('/vendor/menu')}
              style={{
                marginTop: 8,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#FFFFFF',
                border: '1px solid #15803D',
                borderRadius: 12,
                padding: '12px 16px',
                cursor: 'pointer',
                color: '#15803D',
                fontWeight: 700,
                fontSize: 14,
                boxShadow: '0 2px 4px rgba(22, 101, 52, 0.05)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IoRestaurant size={18} />
                Manage Food Menu
              </div>
              <IoChevronForward size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ACCOUNT DETAILS LIST */}
      <div className="card" style={{ padding: '4px 16px', marginBottom: 20 }}>
        {[
          { label: 'Username', value: profileData?.username },
          { label: 'Account Type', value: profileData?.role },
          { label: 'Contact', value: profileData?.contactNumber || 'Not provided' },
          { label: 'Email', value: profileData?.email || 'Not provided' },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: i === 3 ? 'none' : '1px solid var(--border-light)',
            }}
          >
            <span className="text-muted" style={{ fontSize: 13 }}>{item.label}</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* Notifications Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)',
          borderRadius: 'var(--radius-lg)',
          border: '1.5px solid #DBEAFE',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.06)',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <IoNotifications size={20} color="#2563EB" />
          Push Notifications
        </h3>

        {/* Permission Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 14px', background: '#FFFFFF', borderRadius: 10, border: '1px solid #E2E8F0' }}>
          {notifPermission === 'granted'
            ? <IoCheckmarkCircle size={20} color="#15803D" />
            : <IoAlertCircle size={20} color="#D97706" />
          }
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Status</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: notifPermission === 'granted' ? '#15803D' : '#D97706' }}>
              {notifPermission === 'granted' ? 'Enabled ✓' : notifPermission === 'denied' ? 'Blocked ✗' : 'Not Enabled'}
            </div>
          </div>
        </div>

        {/* Feedback message */}
        {notifMessage && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, lineHeight: 1.5 }}>
            {notifMessage}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          {notifPermission !== 'granted' && notifPermission !== 'denied' && (
            <button
              onClick={handleEnableNotifications}
              disabled={enablingNotif}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <IoNotifications size={16} />
              {enablingNotif ? 'Enabling...' : 'Enable Notifications'}
            </button>
          )}
          {notifPermission === 'denied' && (
            <p style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>Notifications are blocked. Open your browser settings and allow notifications for this site, then refresh.</p>
          )}
        </div>
      </div>

      {/* Logout Button */}
      <button className="btn btn-danger" onClick={handleLogout}>
        <IoLogOut size={18} />
        Logout Account
      </button>

      {/* EDIT STUDENT INFO MODAL */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>Edit Student Information 🎓</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <IoClose />
              </button>
            </div>

            <form onSubmit={handleSaveProfile}>
              <div className="input-group">
                <label>Full Name</label>
                <input
                  className="input"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label>Grade & Section / Strand</label>
                <input
                  className="input"
                  placeholder="e.g. Grade 12 - STEM A"
                  value={editForm.gradeSection}
                  onChange={(e) => setEditForm({ ...editForm, gradeSection: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label>School Building</label>
                <input
                  className="input"
                  placeholder="e.g. Main Academic Building / Bldg B"
                  value={editForm.building}
                  onChange={(e) => setEditForm({ ...editForm, building: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label>Floor</label>
                  <input
                    className="input"
                    placeholder="e.g. 3rd Floor"
                    value={editForm.floor}
                    onChange={(e) => setEditForm({ ...editForm, floor: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Room Number</label>
                  <input
                    className="input"
                    placeholder="e.g. Room 302"
                    value={editForm.room}
                    onChange={(e) => setEditForm({ ...editForm, room: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
