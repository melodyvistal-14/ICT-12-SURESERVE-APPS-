import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  IoSchool, IoEye, IoEyeOff, IoStorefront, IoFastFoodOutline,
  IoChevronBack, IoIdCard, IoCloudUpload, IoCheckmarkCircle,
  IoCloseCircle, IoWarning, IoRefresh,
} from 'react-icons/io5';
import CanteenIllustration from '../components/CanteenIllustration';
import api from '../services/api';

// ── Face verification step ──────────────────────────────────────────────────
function IdVerificationStep({ username, password, onSuccess, onCancel }) {
  const [storedPhotoUrl, setStoredPhotoUrl] = useState(null);
  const [uploadedPhotoFile, setUploadedPhotoFile] = useState(null);
  const [uploadedPhotoPreview, setUploadedPhotoPreview] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading-models | matching | matched | failed | error
  const [message, setMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const storedImgRef = useRef(null);
  const uploadedImgRef = useRef(null);

  // Load stored photo URL on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await api.post('/auth/verify-id-photo', { username, password });
        if (!res.data.requiresIdVerification) {
          // No ID photo stored — skip verification
          onSuccess(res.data.token);
          return;
        }
        setStoredPhotoUrl(res.data.studentIdPhotoUrl);
      } catch {
        setStatus('error');
        setMessage('Could not retrieve your ID photo. Please try again.');
      }
    })();
  }, [username, password]);

  const handlePhotoSelect = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage('Please upload a JPG, PNG, or WEBP image.');
      return;
    }
    setUploadedPhotoFile(file);
    setUploadedPhotoPreview(URL.createObjectURL(file));
    setStatus('idle');
    setMessage('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handlePhotoSelect(file);
  };

  const runFaceMatch = async () => {
    if (!uploadedPhotoPreview || !storedPhotoUrl) return;

    setStatus('loading-models');
    setMessage('Loading face recognition models...');

    try {
      // Dynamically import face-api.js (tree-shaken, only loaded when needed)
      const faceapi = await import('face-api.js');

      const MODEL_URL = '/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

      setStatus('matching');
      setMessage('Comparing faces — please wait...');

      const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 });

      const storedImg = storedImgRef.current;
      const uploadedImg = uploadedImgRef.current;

      if (!storedImg || !uploadedImg) {
        throw new Error('Images not ready. Please try again.');
      }

      // Get face descriptors from both images
      const [desc1, desc2] = await Promise.all([
        faceapi.detectSingleFace(storedImg, opts).withFaceLandmarks().withFaceDescriptor(),
        faceapi.detectSingleFace(uploadedImg, opts).withFaceLandmarks().withFaceDescriptor(),
      ]);

      if (!desc1) {
        setStatus('failed');
        setMessage('⚠️ No face detected in your registered School ID photo. Please contact the school admin.');
        return;
      }
      if (!desc2) {
        setStatus('failed');
        setMessage('⚠️ No face detected in your uploaded photo. Please try a clearer photo of your School ID card.');
        return;
      }

      const distance = faceapi.euclideanDistance(desc1.descriptor, desc2.descriptor);
      // distance < 0.5 means the faces are likely the same person
      const THRESHOLD = 0.52;

      if (distance <= THRESHOLD) {
        setStatus('matched');
        setMessage(`✅ Identity verified! (Match confidence: ${Math.round((1 - distance) * 100)}%)`);
      } else {
        setStatus('failed');
        setMessage(`❌ Face mismatch detected. The uploaded photo does not match your registered School ID. (Distance: ${distance.toFixed(2)})`);
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Face verification failed. Please try again.');
    }
  };

  const handleConfirmLogin = async () => {
    try {
      const res = await api.post('/auth/complete-login', { username, password });
      onSuccess(res.data.token, res.data.user);
    } catch {
      setStatus('error');
      setMessage('Login failed. Please go back and try again.');
    }
  };

  return (
    <div style={{ animation: 'slideUp 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: '#F1F5F9', border: 'none', borderRadius: '50%',
            width: 34, height: 34, display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: '#475569',
          }}
        >
          <IoChevronBack size={20} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#15803D', margin: 0 }}>🔒 ID Verification</h3>
          <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>Step 2 of 2</p>
        </div>
        <div style={{ width: 34 }} />
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: '#E2E8F0', borderRadius: 4, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #15803D, #22C55E)', borderRadius: 4 }} />
      </div>

      <p style={{ fontSize: 13, color: '#475569', textAlign: 'center', marginBottom: 20, lineHeight: 1.5 }}>
        Upload a photo of your <strong>School ID card</strong>. Our system will automatically verify your identity using face recognition.
      </p>

      {/* Side-by-side comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* Stored ID photo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Your Registered ID
          </div>
          <div style={{
            border: '2px solid #E2E8F0', borderRadius: 12, overflow: 'hidden',
            background: '#F8FAFC', aspectRatio: '4/3',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {storedPhotoUrl ? (
              <img
                ref={storedImgRef}
                src={storedPhotoUrl}
                alt="Registered ID"
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ color: '#CBD5E1', fontSize: 28 }}><IoIdCard /></div>
            )}
          </div>
        </div>

        {/* Uploaded photo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Your Current ID
          </div>
          <div
            style={{
              border: dragOver ? '2px dashed #15803D' : '2px dashed #CBD5E1',
              borderRadius: 12, overflow: 'hidden',
              background: dragOver ? '#F0FDF4' : '#F8FAFC',
              aspectRatio: '4/3', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {uploadedPhotoPreview ? (
              <img
                ref={uploadedImgRef}
                src={uploadedPhotoPreview}
                alt="Uploaded ID"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 8 }}>
                <IoCloudUpload size={22} style={{ color: '#94A3B8' }} />
                <span style={{ fontSize: 10, color: '#94A3B8', textAlign: 'center' }}>Tap to upload</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => handlePhotoSelect(e.target.files?.[0])}
      />

      {/* Status message */}
      {message && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 14,
          background: status === 'matched' ? '#F0FDF4' : status === 'failed' || status === 'error' ? '#FEF2F2' : '#EFF6FF',
          color: status === 'matched' ? '#15803D' : status === 'failed' || status === 'error' ? '#DC2626' : '#1D4ED8',
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          {status === 'matched' ? <IoCheckmarkCircle size={16} style={{ flexShrink: 0 }} />
            : status === 'failed' || status === 'error' ? <IoCloseCircle size={16} style={{ flexShrink: 0 }} />
              : <IoWarning size={16} style={{ flexShrink: 0 }} />}
          <span>{message}</span>
        </div>
      )}

      {/* Action buttons */}
      {status === 'matched' ? (
        <button
          type="button"
          onClick={handleConfirmLogin}
          style={{
            width: '100%', padding: '14px', borderRadius: 14,
            border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700,
            background: 'linear-gradient(135deg, #15803D, #22C55E)',
            color: 'white', boxShadow: '0 4px 14px rgba(21,128,61,0.3)',
          }}
        >
          ✅ Verified — Enter SureServe 🎓
        </button>
      ) : status === 'failed' || status === 'error' ? (
        <button
          type="button"
          onClick={() => {
            setUploadedPhotoFile(null);
            setUploadedPhotoPreview(null);
            setStatus('idle');
            setMessage('');
          }}
          style={{
            width: '100%', padding: '14px', borderRadius: 14,
            border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700,
            background: '#F1F5F9', color: '#475569',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <IoRefresh size={18} /> Try Again
        </button>
      ) : (
        <button
          type="button"
          onClick={runFaceMatch}
          disabled={!uploadedPhotoPreview || !storedPhotoUrl || status === 'loading-models' || status === 'matching'}
          style={{
            width: '100%', padding: '14px', borderRadius: 14,
            border: 'none', fontSize: 15, fontWeight: 700,
            background: (!uploadedPhotoPreview || !storedPhotoUrl)
              ? '#E2E8F0'
              : 'linear-gradient(135deg, #15803D, #22C55E)',
            color: (!uploadedPhotoPreview || !storedPhotoUrl) ? '#94A3B8' : 'white',
            cursor: (!uploadedPhotoPreview || !storedPhotoUrl || status === 'loading-models' || status === 'matching') ? 'not-allowed' : 'pointer',
            boxShadow: (!uploadedPhotoPreview || !storedPhotoUrl) ? 'none' : '0 4px 14px rgba(21,128,61,0.25)',
            transition: 'all 0.25s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {status === 'loading-models' || status === 'matching'
            ? '🔍 Analyzing...'
            : uploadedPhotoPreview
              ? '🔍 Verify My School ID'
              : '📸 Upload Your School ID First'}
        </button>
      )}
    </div>
  );
}

// ── Main Login Page ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const [showForm, setShowForm] = useState(false);
  const [loginRole, setLoginRole] = useState('Student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 2 face verification
  const [verificationStep, setVerificationStep] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleOpenPortal = (role) => {
    setLoginRole(role);
    setError('');
    setUsername('');
    setPassword('');
    setShowForm(true);
    setVerificationStep(false);
    setPendingCredentials(null);
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
        portalRole: loginRole,
      });

      // If student and requires ID verification → go to Step 2
      if (res.data.requiresIdVerification && loginRole === 'Student') {
        setPendingCredentials({ username: userToLogin, password: pwdToLogin });
        setVerificationStep(true);
        setLoading(false);
        return;
      }

      // Vendor / Admin / student without ID photo → log in immediately
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

  const handleVerificationSuccess = (token, userData) => {
    if (userData) {
      login(userData, token);
      if (userData.role === 'Admin') navigate('/admin');
      else if (userData.role === 'Vendor') navigate('/vendor');
      else navigate('/');
    } else {
      // No userData yet — complete-login already returned it; navigate to home
      navigate('/');
    }
  };

  const handleVerificationCancel = () => {
    setVerificationStep(false);
    setPendingCredentials(null);
    setError('');
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
            width: 58, height: 58,
            background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 10px',
            color: 'white',
            boxShadow: '0 6px 16px rgba(22, 101, 52, 0.25)',
          }}
        >
          <IoFastFoodOutline size={30} />
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#145C2E', letterSpacing: '-0.5px', marginBottom: 2, fontFamily: 'Inter, sans-serif' }}>
          SureServe
        </h1>
        <p style={{ fontSize: 12, fontWeight: 800, color: '#15803D', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16 }}>
          SCHOOL CANTEEN
        </p>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#15803D', color: 'white',
          padding: '6px 16px', borderRadius: '9999px',
          fontSize: 12, fontWeight: 800, letterSpacing: '0.8px',
          boxShadow: '0 2px 8px rgba(21, 128, 61, 0.2)',
          marginBottom: 12,
        }}>
          <IoSchool size={15} />
          <span>SCHOOL ONLY</span>
        </div>

        <p style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 2 }}>
          For Students, By School.
        </p>
        <p style={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>
          School only access.
        </p>
      </div>

      {/* Main Illustration Section — hidden during form steps */}
      {!showForm && (
        <div style={{ padding: '16px 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CanteenIllustration />
        </div>
      )}

      {/* Interactive Actions & Login Sheet */}
      <div style={{ padding: '0 24px 32px' }}>
        {showForm ? (
          <div
            style={{
              background: '#FFFFFF', borderRadius: '24px', padding: '24px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0',
              animation: 'slideUp 0.3s ease',
            }}
          >
            {verificationStep && pendingCredentials ? (
              /* ── Step 2: Face verification ── */
              <IdVerificationStep
                username={pendingCredentials.username}
                password={pendingCredentials.password}
                onSuccess={handleVerificationSuccess}
                onCancel={handleVerificationCancel}
              />
            ) : (
              /* ── Step 1: Username & Password ── */
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    style={{
                      background: '#F1F5F9', border: 'none', borderRadius: '50%',
                      width: 34, height: 34, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', cursor: 'pointer', color: '#475569',
                    }}
                  >
                    <IoChevronBack size={20} />
                  </button>
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: loginRole === 'Vendor' ? '#166534' : '#15803D', margin: 0 }}>
                      {loginRole === 'Vendor' ? 'Canteen Vendor Login 🏪' : 'Student Login 🎓'}
                    </h3>
                    {loginRole === 'Student' && (
                      <p style={{ fontSize: 11, color: '#64748B', margin: 0 }}>Step 1 of 2</p>
                    )}
                  </div>
                  <div style={{ width: 34 }} />
                </div>

                {/* Step indicator for students */}
                {loginRole === 'Student' && (
                  <div style={{ height: 4, background: '#E2E8F0', borderRadius: 4, marginBottom: 20, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '50%', background: 'linear-gradient(90deg, #15803D, #22C55E)', borderRadius: 4, transition: 'width 0.4s ease' }} />
                  </div>
                )}

                {error && (
                  <div style={{
                    background: '#FEE2E2', color: '#DC2626',
                    padding: '10px 14px', borderRadius: '10px',
                    fontSize: 12, fontWeight: 600, marginBottom: 14,
                  }}>
                    {error}
                  </div>
                )}

                <form onSubmit={(e) => handleLoginSubmit(e)}>
                  <div className="input-group">
                    <label>{loginRole === 'Vendor' ? 'Vendor Passkey' : 'Student ID Number'}</label>
                    <input
                      className="input"
                      type="text"
                      placeholder={loginRole === 'Vendor' ? 'Enter your vendor passkey' : 'e.g. 2026-00125'}
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
                          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#94A3B8', fontSize: 18,
                        }}
                      >
                        {showPwd ? <IoEyeOff /> : <IoEye />}
                      </button>
                    </div>
                  </div>

                  {loginRole === 'Student' && (
                    <div style={{
                      background: '#F0FDF4', border: '1px solid #BBF7D0',
                      borderRadius: 10, padding: '10px 12px', marginBottom: 14,
                      fontSize: 12, color: '#15803D', fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <IoIdCard size={16} style={{ flexShrink: 0 }} />
                      <span>After credentials are verified, you'll be asked to scan your <strong>School ID card</strong> for identity confirmation.</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    style={{
                      background: loginRole === 'Vendor' ? '#166534' : '#15803D',
                      padding: '14px', borderRadius: '14px', fontSize: 15, fontWeight: 700, marginTop: 6,
                    }}
                  >
                    {loading
                      ? 'Verifying...'
                      : loginRole === 'Vendor'
                        ? 'Sign In as Vendor 🏪'
                        : 'Continue →'}
                  </button>

                  <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#64748B' }}>
                    {loginRole === 'Student' ? (
                      <p>Don't have a student account? <Link to="/register" style={{ color: '#15803D', fontWeight: 700, textDecoration: 'none' }}>Register Student Account</Link></p>
                    ) : (
                      <p>New Canteen Stall Staff? <Link to="/vendor/register" style={{ color: '#166534', fontWeight: 700, textDecoration: 'underline' }}>Register Canteen Stall</Link></p>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>
        ) : (
          /* Main Portal Choice Buttons */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              type="button"
              className="btn"
              onClick={() => handleOpenPortal('Student')}
              style={{
                background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
                color: 'white', padding: '16px', borderRadius: '16px',
                fontSize: 15, fontWeight: 700,
                boxShadow: '0 6px 18px rgba(22, 101, 52, 0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <IoSchool size={20} />
              <span>Student Login</span>
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => handleOpenPortal('Vendor')}
              style={{
                background: '#FFFFFF', color: '#166534', padding: '14px', borderRadius: '16px',
                fontSize: 15, fontWeight: 700, border: '2px solid #BBF7D0',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <IoStorefront size={20} />
              <span>Canteen Vendor Login</span>
            </button>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, fontWeight: 500, color: '#94A3B8' }}>
          Only students and school staff
        </p>
      </div>
    </div>
  );
}
