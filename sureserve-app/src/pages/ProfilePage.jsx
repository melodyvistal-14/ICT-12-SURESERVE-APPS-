import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  IoLogOut,
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
  IoAlertCircle,
  IoCamera,
  IoCloudUpload,
  IoPerson,
  IoCall,
  IoMail,
} from 'react-icons/io5';
import api from '../services/api';
import { registerPushNotifications, getNotificationPermission } from '../services/notifications';

// Reusable image upload box with preview
function ProfileImageUploader({ label, subtitle, currentUrl, icon, onUploaded }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl || '');
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    setPreview(currentUrl || '');
  }, [currentUrl]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be smaller than 5 MB.');
      return;
    }

    setUploadError('');
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/auth/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data.url);
      onUploaded(res.data.url);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      background: preview ? '#F0FDF4' : '#F8FAFC',
      border: preview ? '1.5px solid #86EFAC' : '1.5px dashed #CBD5E1',
      borderRadius: 14,
      padding: '12px 14px',
      marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: preview ? 10 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: preview ? '#15803D' : '#64748B',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {icon || <IoCamera size={16} />}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{label}</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>{subtitle}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            color: '#15803D',
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <IoCloudUpload size={14} />
          {uploading ? 'Uploading...' : preview ? 'Change Photo' : 'Upload'}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {uploadError && (
        <div style={{ color: '#DC2626', fontSize: 11, fontWeight: 600, marginTop: 6 }}>
          ⚠️ {uploadError}
        </div>
      )}

      {preview && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <img
            src={preview}
            alt="Preview"
            style={{
              maxHeight: 120,
              maxWidth: '100%',
              borderRadius: 10,
              objectFit: 'cover',
              border: '2px solid #E2E8F0',
            }}
          />
          {uploading && (
            <div style={{ fontSize: 11, color: '#15803D', fontWeight: 600, marginTop: 4 }}>
              ⏳ Uploading new image...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    profileImageUrl: '',
    contactNumber: '',
    email: '',
    // Student specific
    gradeSection: '',
    building: '',
    floor: '',
    room: '',
    address: '',
    // Vendor specific
    shopName: '',
    description: '',
    stallImageUrl: '',
    logoUrl: '',
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
          profileImageUrl: res.data.profileImageUrl || '',
          contactNumber: res.data.contactNumber || '',
          email: res.data.email || '',
          gradeSection: res.data.studentProfile?.gradeSection || 'Grade 12 - STEM A',
          building: res.data.studentProfile?.building || 'Main Academic Building',
          floor: res.data.studentProfile?.floor || '3rd Floor',
          room: res.data.studentProfile?.room || 'Room 302',
          address: res.data.studentProfile?.address || res.data.vendorProfile?.address || '',
          shopName: res.data.vendorProfile?.shopName || '',
          description: res.data.vendorProfile?.description || '',
          stallImageUrl: res.data.vendorProfile?.stallImageUrl || '',
          logoUrl: res.data.vendorProfile?.logoUrl || '',
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
      const payload = {
        fullName: editForm.fullName,
        profileImageUrl: editForm.profileImageUrl,
        contactNumber: editForm.contactNumber,
        email: editForm.email,
      };

      if (isStudent) {
        payload.studentInfo = {
          gradeSection: editForm.gradeSection,
          building: editForm.building,
          floor: editForm.floor,
          room: editForm.room,
          address: editForm.address,
        };
      } else {
        payload.vendorInfo = {
          shopName: editForm.shopName,
          description: editForm.description,
          stallImageUrl: editForm.stallImageUrl,
          logoUrl: editForm.profileImageUrl || editForm.logoUrl,
          address: editForm.address,
        };
      }

      await api.put('/users/me', payload);
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
  const facePhoto = profileData?.profileImageUrl || user?.profileImageUrl;

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
      
      {/* VENDOR PROFILE HEADER WITH STALL PICTURE & OWNER FACE */}
      {!isStudent && (
        <div style={{ marginBottom: 20 }}>
          {/* Stall Banner / Owner with Food Picture */}
          <div style={{
            width: '100%',
            height: 180,
            borderRadius: '24px 24px 0 0',
            position: 'relative',
            overflow: 'hidden',
            background: vendorInfo?.stallImageUrl
              ? `url(${vendorInfo.stallImageUrl}) center/cover no-repeat`
              : 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.75) 100%)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  background: 'rgba(255,255,255,0.92)',
                  color: '#15803D',
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}>
                  <IoStorefront size={14} /> Canteen Stall
                </span>

                <button
                  onClick={() => setShowEditModal(true)}
                  style={{
                    background: 'rgba(255,255,255,0.92)',
                    border: 'none',
                    color: '#15803D',
                    borderRadius: 20,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}
                >
                  <IoPencil size={14} /> Edit Profile & Stall
                </button>
              </div>

              <div>
                <h1 style={{ color: 'white', fontSize: 22, fontWeight: 800, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
                  {vendorInfo?.shopName || "My Canteen Stall"}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, margin: '2px 0 0', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                  {vendorInfo?.description || "Fresh food prepared daily"}
                </p>
              </div>
            </div>
          </div>

          {/* Owner Profile Row with Face Picture */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '0 0 24px 24px',
            padding: '16px 20px',
            border: '1px solid var(--border)',
            borderTop: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Owner Face Photo */}
              <div style={{ position: 'relative' }}>
                {facePhoto ? (
                  <img
                    src={facePhoto}
                    alt={profileData?.fullName || "Owner"}
                    style={{
                      width: 60, height: 60, borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid #15803D',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                    }}
                  />
                ) : (
                  <div style={{
                    width: 60, height: 60, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '3px solid #15803D',
                    fontSize: 22, fontWeight: 800, color: '#15803D',
                  }}>
                    {(profileData?.fullName || user?.fullName || 'V').charAt(0).toUpperCase()}
                  </div>
                )}
                <div
                  onClick={() => setShowEditModal(true)}
                  style={{
                    position: 'absolute', bottom: -2, right: -2,
                    background: '#15803D', color: 'white',
                    width: 22, height: 22, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid white', cursor: 'pointer',
                  }}
                  title="Change photo"
                >
                  <IoCamera size={12} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-dark)' }}>
                  {profileData?.fullName || user?.fullName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Stall Owner & Manager • @{profileData?.username || user?.username}
                </div>
              </div>
            </div>

            <span className="badge badge-ready" style={{ fontSize: 11, padding: '4px 10px' }}>
              🏪 Vendor
            </span>
          </div>
        </div>
      )}

      {/* STUDENT PROFILE HEADER */}
      {isStudent && (
        <div style={{ padding: '28px 0 20px', textAlign: 'center', position: 'relative', background: 'linear-gradient(to bottom, var(--surface-hover), transparent)', borderRadius: 24, marginBottom: 16 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {facePhoto ? (
              /* Student: actual uploaded face picture */
              <img
                src={facePhoto}
                alt={profileData?.fullName || "Student Face"}
                style={{
                  width: 96, height: 96, borderRadius: '50%',
                  objectFit: 'cover',
                  border: '4px solid #fff',
                  boxShadow: '0 4px 16px rgba(22,101,52,0.25)',
                }}
              />
            ) : (
              /* Student: initials avatar */
              <div style={{
                width: 96, height: 96, borderRadius: '50%',
                background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '4px solid #fff', boxShadow: '0 4px 16px rgba(22,101,52,0.25)',
                fontSize: 34, fontWeight: 800, color: 'white', letterSpacing: '-1px',
              }}>
                {(profileData?.fullName || user?.fullName || 'S').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
            )}

            {/* Quick edit photo badge */}
            <div
              onClick={() => setShowEditModal(true)}
              style={{
                position: 'absolute', bottom: 2, right: 2,
                background: '#15803D', color: 'white',
                width: 30, height: 30, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '3px solid white', cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
              title="Upload Face Photo"
            >
              <IoCamera size={16} />
            </div>
          </div>

          <h2 style={{ marginTop: 12, fontSize: 22, fontWeight: 800 }}>{profileData?.fullName || user?.fullName}</h2>
          <p className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>@{profileData?.username || user?.username}</p>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 8 }}>
            <span
              className="badge badge-preparing"
              style={{ fontSize: 12, padding: '6px 14px', borderRadius: '9999px', textTransform: 'none' }}
            >
              🎓 Student Account
            </span>
          </div>
        </div>
      )}

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



      {/* ACCOUNT DETAILS LIST */}
      <div className="card" style={{ padding: '4px 16px', marginBottom: 20 }}>
        {[
          { label: 'Username', value: profileData?.username, icon: <IoPerson size={16} color="var(--primary)" /> },
          { label: 'Account Type', value: profileData?.role },
          { label: 'Contact', value: profileData?.contactNumber || 'Not provided', icon: <IoCall size={16} color="#0284C7" /> },
          { label: 'Email', value: profileData?.email || 'Not provided', icon: <IoMail size={16} color="#D97706" /> },
          { label: 'Address', value: studentInfo?.address || vendorInfo?.address || 'Not provided', icon: <IoLocation size={16} color="#15803D" /> },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: i === 4 ? 'none' : '1px solid var(--border-light)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {item.icon}
              <span className="text-muted" style={{ fontSize: 13 }}>{item.label}</span>
            </div>
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

      {/* EDIT PROFILE MODAL FOR STUDENT AND VENDOR */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" style={{ maxHeight: '88vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>
                {isStudent ? 'Edit Student Profile 🎓' : 'Edit Stall & Owner Profile 🏪'}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <IoClose />
              </button>
            </div>

            <form onSubmit={handleSaveProfile}>
              
              {/* FACE PROFILE PICTURE UPLOAD */}
              <ProfileImageUploader
                label={isStudent ? "Face Profile Picture" : "Owner Face Profile Picture"}
                subtitle="Upload a clear picture of your face"
                currentUrl={editForm.profileImageUrl}
                icon={<IoPerson size={16} />}
                onUploaded={(url) => setEditForm(prev => ({ ...prev, profileImageUrl: url }))}
              />

              {/* VENDOR STALL PICTURE UPLOAD (OWNER WITH FOOD) */}
              {!isStudent && (
                <ProfileImageUploader
                  label="Stall Showcase Picture"
                  subtitle="Picture of the owner with food sold at the stall"
                  currentUrl={editForm.stallImageUrl}
                  icon={<IoStorefront size={16} />}
                  onUploaded={(url) => setEditForm(prev => ({ ...prev, stallImageUrl: url }))}
                />
              )}

              {/* FULL NAME */}
              <div className="input-group">
                <label>{isStudent ? 'Full Name' : 'Owner Full Name'}</label>
                <input
                  className="input"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  required
                />
              </div>

              {/* CONTACT NUMBER */}
              <div className="input-group">
                <label>Contact Number</label>
                <input
                  className="input"
                  placeholder="e.g. 09123456789"
                  value={editForm.contactNumber}
                  onChange={(e) => setEditForm({ ...editForm, contactNumber: e.target.value })}
                />
              </div>

              {/* EMAIL */}
              <div className="input-group">
                <label>Email Address</label>
                <input
                  className="input"
                  type="email"
                  placeholder="e.g. user@school.edu.ph"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>

              {/* STUDENT SPECIFIC FIELDS */}
              {isStudent ? (
                <>
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

                  <div className="input-group">
                    <label>Home Address</label>
                    <input
                      className="input"
                      placeholder="e.g. 123 Sampaguita St, Manila"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                /* VENDOR SPECIFIC FIELDS */
                <>
                  <div className="input-group">
                    <label>Canteen / Shop Name</label>
                    <input
                      className="input"
                      placeholder="e.g. Tia Mel's Canteen"
                      value={editForm.shopName}
                      onChange={(e) => setEditForm({ ...editForm, shopName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>Shop Description / Food Specialty</label>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="e.g. Serving hot rice meals, burgers, snacks, and refreshing juices."
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    />
                  </div>

                  <div className="input-group">
                    <label>Canteen / Business Address</label>
                    <input
                      className="input"
                      placeholder="e.g. Canteen Booth 2, School Ground"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
