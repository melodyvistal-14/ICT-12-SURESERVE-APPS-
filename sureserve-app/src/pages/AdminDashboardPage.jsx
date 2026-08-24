import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  IoShieldCheckmark, IoPeople, IoStorefront, IoReceipt, IoCash,
  IoKey, IoCopy, IoRefresh, IoCheckmarkCircle, IoSearch, IoLogOut, IoWarning,
  IoGridOutline, IoListOutline, IoBanOutline, IoPauseCircleOutline, IoTrashOutline
} from 'react-icons/io5';
import api from '../services/api';

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'passkey', 'students', 'vendors'
  const [vendorViewMode, setVendorViewMode] = useState('table'); // 'table' or 'card'
  const [studentViewMode, setStudentViewMode] = useState('table'); // 'table', 'card', 'classroom'
  const [studentGradeFilter, setStudentGradeFilter] = useState('All');
  const [studentSectionFilter, setStudentSectionFilter] = useState('All');
  
  // Data states
  const [stats, setStats] = useState(null);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [students, setStudents] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const [vendorPasskeys, setVendorPasskeys] = useState([]);

  const [newStallDescription, setNewStallDescription] = useState('');

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
      setPasskeyInput(res.data.currentPasskey || '');
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/admin/students');
      setStudents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await api.get('/admin/vendors');
      setVendors(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVendorPasskeys = async () => {
    try {
      const res = await api.get('/admin/vendor-passkeys');
      setVendorPasskeys(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchStudents(), fetchVendors(), fetchVendorPasskeys()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const handleCreatePasskey = async (e) => {
    e.preventDefault();
    setActionSuccess('');
    setActionError('');
    const randomCode = `STALL-PASS-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      await api.post('/admin/vendor-passkeys', {
        code: randomCode,
        description: newStallDescription || 'Authorized Canteen Stall Passkey'
      });
      setNewStallDescription('');
      setActionSuccess(`Generated new passkey: ${randomCode}`);
      fetchVendorPasskeys();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to generate passkey');
    }
  };

  const handleDeletePasskey = async (id) => {
    try {
      await api.delete(`/admin/vendor-passkeys/${id}`);
      setActionSuccess('Vendor Passkey revoked successfully');
      fetchVendorPasskeys();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to revoke passkey');
    }
  };

  const handleUpdatePasskey = async (e) => {
    e.preventDefault();
    setActionSuccess('');
    setActionError('');
    try {
      const res = await api.post('/admin/passkey', { passkey: passkeyInput });
      setActionSuccess('Vendor Security Passkey updated successfully!');
      fetchStats();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to update passkey');
    }
  };

  const handleGenerateRandomPasskey = () => {
    const randomCode = `CANTEEN-${Math.random().toString(36).substring(2, 8).toUpperCase()}-2026`;
    setPasskeyInput(randomCode);
  };

  const handleCopyPasskey = () => {
    navigator.clipboard.writeText(passkeyInput);
    setActionSuccess('Passkey copied to clipboard! Share this with authorized canteen vendors.');
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handleVendorStatusAction = async (vendorId, action) => {
    setActionSuccess('');
    setActionError('');
    try {
      const res = await api.post(`/admin/vendors/${vendorId}/status`, { action });
      setActionSuccess(res.data.message || `Stall status updated to ${action}`);
      setTimeout(() => setActionSuccess(''), 4000);
      fetchVendors();
      fetchStats();
    } catch (err) {
      console.error(err);
      try {
        await api.post(`/admin/vendors/${vendorId}/toggle-status`);
        fetchVendors();
        fetchStats();
      } catch (e) {
        setActionError(err.response?.data?.message || 'Failed to update vendor status');
      }
    }
  };

  const [stallToDelete, setStallToDelete] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);

  const confirmDeleteStudent = async (studentId, fullName) => {
    setStudentToDelete(null);
    setActionSuccess('');
    setActionError('');
    try {
      const res = await api.delete(`/admin/students/${studentId}`);
      setActionSuccess(res.data?.message || `Student '${fullName}' deleted successfully!`);
      setTimeout(() => setActionSuccess(''), 4000);
      fetchStudents();
      fetchStats();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response?.data : '') || err.message || 'Failed to delete student account';
      setActionError(errMsg);
    }
  };

  const confirmDeleteVendor = async (vendorId, shopName) => {
    setStallToDelete(null);
    setActionSuccess('');
    setActionError('');
    try {
      const res = await api.delete(`/admin/vendors/${vendorId}`);
      setActionSuccess(res.data?.message || `Vendor stall '${shopName}' deleted successfully!`);
      setTimeout(() => setActionSuccess(''), 4000);
      fetchVendors();
      fetchStats();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response?.data : '') || err.message || 'Failed to delete vendor stall';
      setActionError(errMsg);
    }
  };

  const renderStatusBadge = (vendor) => {
    const currentStatus = vendor.status || (vendor.isActive ? 'Active' : 'Deactivated');
    if (currentStatus === 'Active' || (vendor.isActive && currentStatus !== 'Blocked' && currentStatus !== 'Deactivated')) {
      return <span className="badge-status badge-status-active"><IoCheckmarkCircle size={14} /> Active Stall</span>;
    }
    return <span className="badge-status badge-status-deactive"><IoPauseCircleOutline size={14} /> Deactivated</span>;
  };

  const renderStatusActions = (vendor) => {
    const currentStatus = vendor.status || (vendor.isActive ? 'Active' : 'Deactivated');
    const isActive = currentStatus === 'Active' || vendor.isActive;

    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {!isActive ? (
          <button
            className="btn-action btn-action-activate"
            onClick={() => handleVendorStatusAction(vendor.id, 'activate')}
            title="Activate stall operations"
          >
            ✓ Activate
          </button>
        ) : (
          <button
            className="btn-action btn-action-deactivate"
            onClick={() => handleVendorStatusAction(vendor.id, 'deactivate')}
            title="Temporarily deactivate stall"
          >
            ⏸ Deactivate
          </button>
        )}

        <button
          className="btn-action btn-action-delete"
          onClick={() => setStallToDelete(vendor)}
          title="Delete vendor stall permanently"
        >
          <IoTrashOutline size={14} /> Delete
        </button>
      </div>
    );
  };





  // Derive unique grade levels from gradeSection (e.g. "Grade 12 - ABM A" -> "Grade 12")
  const uniqueGrades = ['All', ...new Set(
    students
      .map(s => (s.gradeSection || '').split('-')[0].trim())
      .filter(g => g)
  )].sort();

  // Derive unique sections based on selected grade filter
  const uniqueSections = ['All', ...new Set(
    students
      .filter(s => {
        const grade = (s.gradeSection || '').split('-')[0].trim();
        return studentGradeFilter === 'All' || grade === studentGradeFilter;
      })
      .map(s => {
        const parts = (s.gradeSection || '').split('-');
        return parts.length > 1 ? parts.slice(1).join('-').trim() : '';
      })
      .filter(sec => sec)
  )].sort();

  const filteredStudents = students.filter(s => {
    const grade = (s.gradeSection || '').split('-')[0].trim();
    const sectionParts = (s.gradeSection || '').split('-');
    const section = sectionParts.length > 1 ? sectionParts.slice(1).join('-').trim() : '';
    const matchGrade = studentGradeFilter === 'All' || grade === studentGradeFilter;
    const matchSection = studentSectionFilter === 'All' || section === studentSectionFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      (s.fullName || '').toLowerCase().includes(q) ||
      (s.studentId || '').toLowerCase().includes(q) ||
      (s.gradeSection || '').toLowerCase().includes(q) ||
      (s.strand || '').toLowerCase().includes(q);
    return matchGrade && matchSection && matchSearch;
  });

  // Group filtered students by their classroom (gradeSection)
  const studentsByClassroom = filteredStudents.reduce((acc, s) => {
    const key = s.gradeSection || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const filteredVendors = vendors.filter(v =>
    v.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );


  return (
    <div className="page" style={{ padding: 0, paddingBottom: 80, background: '#F8FAFC' }}>
      {/* Top Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        color: 'white',
        padding: '32px 24px 24px',
        borderRadius: '0 0 28px 28px',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 40, height: 40, background: '#166534', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
            }}>
              <IoShieldCheckmark size={22} />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#4ADE80' }}>
                ADMIN CONTROL PORTAL
              </span>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>School Canteen Admin</h2>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none',
              padding: '8px 12px', borderRadius: '10px', color: '#F87171',
              fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            <IoLogOut size={16} /> Logout
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: 6, marginTop: 16, background: 'rgba(255,255,255,0.08)', padding: 4, borderRadius: 14 }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              flex: 1, padding: '10px 4px', border: 'none', borderRadius: 10,
              background: activeTab === 'overview' ? '#166534' : 'transparent',
              color: activeTab === 'overview' ? 'white' : '#94A3B8',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            📊 Stats
          </button>
          <button
            onClick={() => setActiveTab('passkey')}
            style={{
              flex: 1, padding: '10px 4px', border: 'none', borderRadius: 10,
              background: activeTab === 'passkey' ? '#166534' : 'transparent',
              color: activeTab === 'passkey' ? 'white' : '#94A3B8',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            🔑 Passkey
          </button>
          <button
            onClick={() => setActiveTab('students')}
            style={{
              flex: 1, padding: '10px 4px', border: 'none', borderRadius: 10,
              background: activeTab === 'students' ? '#166534' : 'transparent',
              color: activeTab === 'students' ? 'white' : '#94A3B8',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            🎓 Students ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            style={{
              flex: 1, padding: '10px 4px', border: 'none', borderRadius: 10,
              background: activeTab === 'vendors' ? '#166534' : 'transparent',
              color: activeTab === 'vendors' ? 'white' : '#94A3B8',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            🏪 Vendors ({vendors.length})
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ padding: '20px 20px' }}>
        {actionSuccess && (
          <div style={{
            background: '#DCFCE7', color: '#166534', padding: '12px 16px',
            borderRadius: '12px', fontSize: 13, fontWeight: 600, marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <IoCheckmarkCircle size={20} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div style={{
            background: '#FEE2E2', color: '#DC2626', padding: '12px 16px',
            borderRadius: '12px', fontSize: 13, fontWeight: 600, marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <IoWarning size={20} />
            <span>{actionError}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW METRICS */}
        {activeTab === 'overview' && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 14 }}>
              Canteen Performance Overview 📈
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {/* Total Students */}
              <div style={{ background: 'white', padding: 18, borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#2563EB', marginBottom: 8 }}>
                  <IoPeople size={24} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>STUDENTS</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A' }}>
                  {stats?.totalStudents || 0}
                </div>
                <span style={{ fontSize: 11, color: '#64748B' }}>Registered school accounts</span>
              </div>

              {/* Total Vendors */}
              <div style={{ background: 'white', padding: 18, borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#166534', marginBottom: 8 }}>
                  <IoStorefront size={24} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>CANTEEN STALLS</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A' }}>
                  {stats?.totalVendors || 0}
                </div>
                <span style={{ fontSize: 11, color: '#64748B' }}>Active vendor stalls</span>
              </div>

              {/* Total Orders */}
              <div style={{ background: 'white', padding: 18, borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#D97706', marginBottom: 8 }}>
                  <IoReceipt size={24} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>TOTAL ORDERS</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A' }}>
                  {stats?.totalOrders || 0}
                </div>
                <span style={{ fontSize: 11, color: '#64748B' }}>Canteen food reservations</span>
              </div>

              {/* Total Revenue */}
              <div style={{ background: 'white', padding: 18, borderRadius: 18, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#059669', marginBottom: 8 }}>
                  <IoCash size={24} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>CANTEEN SALES</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#059669' }}>
                  ₱{stats?.totalRevenue ? stats.totalRevenue.toFixed(2) : '0.00'}
                </div>
                <span style={{ fontSize: 11, color: '#64748B' }}>Processed school revenue</span>
              </div>
            </div>

            {/* Quick Vendor Security Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
              color: 'white', padding: 20, borderRadius: 20, marginTop: 20,
              boxShadow: '0 4px 14px rgba(22, 101, 52, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <IoKey size={24} />
                <h4 style={{ fontSize: 16, fontWeight: 800 }}>Active Vendor Security Passkey</h4>
              </div>
              <p style={{ fontSize: 12, opacity: 0.9, marginBottom: 14 }}>
                This is the secret passkey required for new canteen stall staff to register as a Vendor.
              </p>
              <div style={{
                background: 'rgba(255,255,255,0.15)', padding: '12px 16px', borderRadius: 12,
                fontFamily: 'monospace', fontSize: 18, fontWeight: 800, letterSpacing: '1px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <span>{stats?.currentPasskey || '(No passkey set)'}</span>
                <button
                  onClick={() => setActiveTab('passkey')}
                  style={{
                    background: 'white', color: '#166534', border: 'none',
                    padding: '6px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer'
                  }}
                >
                  Manage Passkey
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VENDOR PASSKEY MANAGEMENT */}
        {activeTab === 'passkey' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Generate New Individual Passkey Box */}
            <div style={{ background: 'white', padding: 24, borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#166534', marginBottom: 12 }}>
                <IoKey size={28} />
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Generate Vendor Passkey</h3>
                  <p style={{ fontSize: 12, color: '#64748B' }}>Issue unique, one-time security passkeys for each canteen stall owner</p>
                </div>
              </div>

              <form onSubmit={handleCreatePasskey} style={{ marginTop: 16 }}>
                <div className="input-group">
                  <label style={{ fontWeight: 700, color: '#0F172A' }}>Stall Owner / Note (Optional)</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. For Tia Mel's Canteen or Stall 4"
                      value={newStallDescription}
                      onChange={(e) => setNewStallDescription(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ background: '#166534', padding: '0 24px', borderRadius: 12, fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                      + Generate Passkey 🔑
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* List of Individual Passkeys */}
            <div style={{ background: 'white', padding: 24, borderRadius: 20, border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 14 }}>
                Active & Issued Vendor Passkeys ({vendorPasskeys.length}) 🗝️
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                {vendorPasskeys.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: '#94A3B8', fontSize: 13 }}>
                    No vendor passkeys generated yet. Click generate above to create one.
                  </div>
                ) : (
                  vendorPasskeys.map(pk => (
                    <div key={pk.id} style={{
                      background: pk.isUsed ? '#F8FAFC' : '#F0FDF4',
                      padding: 16, borderRadius: 16, border: `1.5px solid ${pk.isUsed ? '#CBD5E1' : '#BBF7D0'}`,
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{
                            fontFamily: 'monospace', fontSize: 15, fontWeight: 900,
                            color: pk.isUsed ? '#64748B' : '#166534', letterSpacing: '0.5px'
                          }}>
                            {pk.code}
                          </span>
                          <p style={{ fontSize: 12, color: '#475569', fontWeight: 600, marginTop: 4 }}>
                            {pk.description || 'Authorized Canteen Stall Passkey'}
                          </p>
                        </div>
                        <span style={{
                          background: pk.isUsed ? '#E2E8F0' : '#DCFCE7',
                          color: pk.isUsed ? '#475569' : '#166534',
                          padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                          whiteSpace: 'nowrap', marginLeft: 8
                        }}>
                          {pk.isUsed ? '🔒 Redeemed' : '✓ Active & Ready'}
                        </span>
                      </div>

                      {/* Redeemed info: Stall name + Owner */}
                      {pk.isUsed && (
                        <div style={{
                          background: 'white', border: '1px solid #E2E8F0',
                          borderRadius: 12, padding: '10px 12px',
                          display: 'flex', flexDirection: 'column', gap: 6
                        }}>
                          {pk.shopName && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                background: '#FEF3C7', color: '#92400E',
                                padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap'
                              }}>🏪 STALL</span>
                              <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{pk.shopName}</span>
                            </div>
                          )}
                          {pk.ownerName && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                background: '#EFF6FF', color: '#1D4ED8',
                                padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap'
                              }}>👤 OWNER</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{pk.ownerName}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              background: '#F1F5F9', color: '#64748B',
                              padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap'
                            }}>🔑 USER</span>
                            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>@{pk.usedByUsername}</span>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(pk.code);
                            setActionSuccess(`Copied passkey: ${pk.code}`);
                            setTimeout(() => setActionSuccess(''), 3000);
                          }}
                          style={{
                            flex: 1, background: 'white', border: '1px solid #CBD5E1',
                            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                          }}
                        >
                          <IoCopy size={14} /> Copy Passkey
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePasskey(pk.id)}
                          style={{
                            background: '#FEE2E2', border: 'none',
                            padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            color: '#DC2626', cursor: 'pointer'
                          }}
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STUDENTS MONITOR */}
        {activeTab === 'students' && (
          <div>
            {/* Header controls & View Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Registered Students ({filteredStudents.length})
                </h3>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0, marginTop: 2 }}>
                  Manage registered student profiles, orders, and student account deletion
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* View Switcher Toggle */}
                <div style={{ display: 'flex', background: '#E2E8F0', padding: 3, borderRadius: 12, gap: 2 }}>
                  <button
                    onClick={() => setStudentViewMode('table')}
                    className={`view-toggle-btn ${studentViewMode === 'table' ? 'active' : ''}`}
                    type="button"
                  >
                    <IoListOutline size={16} /> Table View
                  </button>
                  <button
                    onClick={() => setStudentViewMode('card')}
                    className={`view-toggle-btn ${studentViewMode === 'card' ? 'active' : ''}`}
                    type="button"
                  >
                    <IoGridOutline size={16} /> Card View
                  </button>
                  <button
                    onClick={() => setStudentViewMode('classroom')}
                    className={`view-toggle-btn ${studentViewMode === 'classroom' ? 'active' : ''}`}
                    type="button"
                  >
                    🏫 By Classroom
                  </button>
                </div>

                {/* Search Bar */}
                <div style={{ position: 'relative', width: 180 }}>
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px 8px 30px', borderRadius: 10,
                      border: '1px solid #CBD5E1', fontSize: 12
                    }}
                  />
                  <IoSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                </div>
              </div>
            </div>

            {/* GRADE & SECTION FILTER BAR */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
              background: 'white', padding: '12px 16px', borderRadius: 14,
              border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginRight: 4 }}>🏫 Filter by:</span>

              {/* Grade Level Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Grade Level</label>
                <select
                  value={studentGradeFilter}
                  onChange={e => { setStudentGradeFilter(e.target.value); setStudentSectionFilter('All'); }}
                  style={{
                    padding: '6px 10px', borderRadius: 8, border: '1.5px solid #CBD5E1',
                    fontSize: 12, fontWeight: 700, color: '#0F172A', background: 'white',
                    cursor: 'pointer', minWidth: 120
                  }}
                >
                  {uniqueGrades.map(g => (
                    <option key={g} value={g}>{g === 'All' ? '📚 All Grades' : g}</option>
                  ))}
                </select>
              </div>

              <span style={{ color: '#E2E8F0', fontSize: 16 }}>|</span>

              {/* Section / Classroom Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Section</label>
                <select
                  value={studentSectionFilter}
                  onChange={e => setStudentSectionFilter(e.target.value)}
                  style={{
                    padding: '6px 10px', borderRadius: 8, border: '1.5px solid #CBD5E1',
                    fontSize: 12, fontWeight: 700, color: '#0F172A', background: 'white',
                    cursor: 'pointer', minWidth: 120
                  }}
                >
                  {uniqueSections.map(sec => (
                    <option key={sec} value={sec}>{sec === 'All' ? '🏫 All Sections' : sec}</option>
                  ))}
                </select>
              </div>

              {/* Active Filter Pills */}
              {(studentGradeFilter !== 'All' || studentSectionFilter !== 'All') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                  {studentGradeFilter !== 'All' && (
                    <span style={{
                      background: '#EFF6FF', color: '#2563EB', padding: '4px 10px',
                      borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4
                    }}>
                      {studentGradeFilter}
                      <button onClick={() => { setStudentGradeFilter('All'); setStudentSectionFilter('All'); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB', fontWeight: 900, fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  )}
                  {studentSectionFilter !== 'All' && (
                    <span style={{
                      background: '#F0FDF4', color: '#166534', padding: '4px 10px',
                      borderRadius: 20, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4
                    }}>
                      {studentSectionFilter}
                      <button onClick={() => setStudentSectionFilter('All')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534', fontWeight: 900, fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  )}
                  <button
                    onClick={() => { setStudentGradeFilter('All'); setStudentSectionFilter('All'); }}
                    style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}
                  >Clear all</button>
                </div>
              )}
            </div>

            {/* TABULAR VIEW FOR STUDENTS */}
            {studentViewMode === 'table' ? (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Student ID</th>
                      <th>Grade Level</th>
                      <th>Section / Classroom</th>
                      <th>Strand</th>
                      <th>Total Orders</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: 36, color: '#94A3B8', fontSize: 13 }}>
                          No registered students found matching search.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map(student => {
                        const gradeParts = (student.gradeSection || '').split('-');
                        const gradeLevel = gradeParts[0]?.trim() || 'N/A';
                        const section = gradeParts.length > 1 ? gradeParts.slice(1).join('-').trim() : 'N/A';
                        return (
                          <tr key={student.id}>
                            <td>
                              <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 14 }}>
                                🎓 {student.fullName}
                              </div>
                              {student.username && <div style={{ fontSize: 11, color: '#64748B' }}>@{student.username}</div>}
                            </td>
                            <td>
                              <span style={{ fontSize: 12, color: '#2563EB', fontWeight: 700 }}>
                                🆔 {student.studentId}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                background: '#EFF6FF', color: '#1D4ED8', padding: '4px 10px',
                                borderRadius: 20, fontSize: 11, fontWeight: 700
                              }}>
                                📚 {gradeLevel}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                background: '#F0FDF4', color: '#166534', padding: '4px 10px',
                                borderRadius: 20, fontSize: 11, fontWeight: 700
                              }}>
                                🏫 {section}
                              </span>
                            </td>
                            <td>
                              {student.strand
                                ? <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{student.strand}</span>
                                : <span style={{ fontSize: 11, color: '#CBD5E1' }}>—</span>}
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0F172A' }}>📦 {student.totalOrders} orders</div>
                              {student.stalls && student.stalls.length > 0 && (
                                <div style={{ fontSize: 11, color: '#64748B', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {student.stalls.map((stall, idx) => (
                                    <span key={idx} style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>🏪 {stall}</span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td>
                              <button
                                className="btn-action btn-action-delete"
                                onClick={() => setStudentToDelete(student)}
                                title="Delete student account permanently"
                              >
                                <IoTrashOutline size={14} /> Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : studentViewMode === 'card' ? (
              /* CARD VIEW FOR STUDENTS */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {filteredStudents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 14 }}>
                    No registered students found matching search.
                  </div>
                ) : (
                  filteredStudents.map(student => {
                    const gradeParts = (student.gradeSection || '').split('-');
                    const gradeLevel = gradeParts[0]?.trim() || 'N/A';
                    const section = gradeParts.length > 1 ? gradeParts.slice(1).join('-').trim() : 'N/A';
                    return (
                      <div key={student.id} style={{
                        background: 'white', padding: 18, borderRadius: 16, border: '1px solid #E2E8F0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14
                      }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <div>
                              <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                🎓 {student.fullName}
                              </h4>
                              <span style={{ fontSize: 12, color: '#2563EB', fontWeight: 700 }}>ID: {student.studentId}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                              <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800 }}>📚 {gradeLevel}</span>
                              <span style={{ background: '#F0FDF4', color: '#166534', padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800 }}>🏫 {section}</span>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12, color: '#64748B', background: '#F8FAFC', padding: 10, borderRadius: 10 }}>
                            {student.strand && <div style={{ gridColumn: 'span 2' }}>📚 Strand: <b>{student.strand}</b></div>}
                            <div>📦 Orders: <b>{student.totalOrders}</b></div>
                            <div>🏠 <b>{student.address || 'N/A'}</b></div>
                            {student.stalls && student.stalls.length > 0 && (
                              <div style={{ gridColumn: 'span 2', display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                                {student.stalls.map((stall, idx) => (
                                  <span key={idx} style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: 4, fontSize: 10, color: '#475569', fontWeight: 600 }}>🏪 {stall}</span>
                                ))}
                              </div>
                            )}
                            {student.birthday && <div style={{ gridColumn: 'span 2' }}>🎂 {student.birthday} ({student.age} yrs)</div>}
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            className="btn-action btn-action-delete"
                            onClick={() => setStudentToDelete(student)}
                            title="Delete student account permanently"
                          >
                            <IoTrashOutline size={14} /> Delete Student
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* CLASSROOM GROUPED VIEW */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {Object.keys(studentsByClassroom).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 14 }}>
                    No registered students found.
                  </div>
                ) : (
                  Object.entries(studentsByClassroom)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([classroom, classStudents]) => {
                      const gradeParts = classroom.split('-');
                      const gradeLevel = gradeParts[0]?.trim();
                      const section = gradeParts.length > 1 ? gradeParts.slice(1).join('-').trim() : '';
                      return (
                        <div key={classroom} style={{
                          background: 'white', borderRadius: 18, border: '1px solid #E2E8F0',
                          overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
                        }}>
                          {/* Classroom Header */}
                          <div style={{
                            background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 100%)',
                            padding: '14px 20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 22 }}>🏫</span>
                              <div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>{classroom}</div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                                  <span style={{ background: 'rgba(59,130,246,0.3)', color: '#93C5FD', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>📚 {gradeLevel}</span>
                                  {section && <span style={{ background: 'rgba(74,222,128,0.2)', color: '#4ADE80', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>🏫 Section {section}</span>}
                                </div>
                              </div>
                            </div>
                            <span style={{
                              background: 'rgba(255,255,255,0.15)', color: 'white',
                              padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 800
                            }}>
                              {classStudents.length} student{classStudents.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Students in Classroom */}
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                              <thead>
                                <tr style={{ background: '#F8FAFC' }}>
                                  <th style={{ padding: '10px 16px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student</th>
                                  <th style={{ padding: '10px 16px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student ID</th>
                                  <th style={{ padding: '10px 16px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Strand</th>
                                  <th style={{ padding: '10px 16px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Orders</th>
                                  <th style={{ padding: '10px 16px', textAlign: 'left', color: '#64748B', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {classStudents.map((student, idx) => (
                                  <tr key={student.id} style={{ borderTop: '1px solid #F1F5F9', background: idx % 2 === 0 ? 'white' : '#FAFBFC' }}>
                                    <td style={{ padding: '10px 16px' }}>
                                      <div style={{ fontWeight: 700, color: '#0F172A' }}>🎓 {student.fullName}</div>
                                      <div style={{ fontSize: 11, color: '#94A3B8' }}>@{student.username}</div>
                                    </td>
                                    <td style={{ padding: '10px 16px' }}>
                                      <span style={{ fontSize: 12, color: '#2563EB', fontWeight: 700 }}>🆔 {student.studentId}</span>
                                    </td>
                                    <td style={{ padding: '10px 16px', color: '#475569', fontSize: 12 }}>
                                      {student.strand || <span style={{ color: '#CBD5E1' }}>—</span>}
                                    </td>
                                    <td style={{ padding: '10px 16px' }}>
                                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 12 }}>📦 {student.totalOrders}</div>
                                      {student.stalls && student.stalls.length > 0 && (
                                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                          {student.stalls.map((stall, idx) => (
                                            <span key={idx} style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>🏪 {stall}</span>
                                          ))}
                                        </div>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px 16px' }}>
                                      <button
                                        className="btn-action btn-action-delete"
                                        onClick={() => setStudentToDelete(student)}
                                        title="Delete student account"
                                      >
                                        <IoTrashOutline size={13} /> Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: VENDORS STALL MONITOR */}
        {activeTab === 'vendors' && (
          <div>
            {/* Header controls & View Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Canteen Vendor Stalls ({filteredVendors.length})
                </h3>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0, marginTop: 2 }}>
                  Manage stall availability, activation, deactivation, and stall deletion
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* View Switcher Toggle */}
                <div style={{ display: 'flex', background: '#E2E8F0', padding: 3, borderRadius: 12, gap: 2 }}>
                  <button
                    onClick={() => setVendorViewMode('table')}
                    className={`view-toggle-btn ${vendorViewMode === 'table' ? 'active' : ''}`}
                    type="button"
                  >
                    <IoListOutline size={16} /> Table View
                  </button>
                  <button
                    onClick={() => setVendorViewMode('card')}
                    className={`view-toggle-btn ${vendorViewMode === 'card' ? 'active' : ''}`}
                    type="button"
                  >
                    <IoGridOutline size={16} /> Card View
                  </button>
                </div>

                {/* Search Bar */}
                <div style={{ position: 'relative', width: 180 }}>
                  <input
                    type="text"
                    placeholder="Search stalls..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px 8px 30px', borderRadius: 10,
                      border: '1px solid #CBD5E1', fontSize: 12
                    }}
                  />
                  <IoSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                </div>
              </div>
            </div>

            {/* TABULAR VIEW */}
            {vendorViewMode === 'table' ? (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Stall / Shop Name</th>
                      <th>Manager / Owner</th>
                      <th>Menu Dishes</th>
                      <th>Address & Info</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: 36, color: '#94A3B8', fontSize: 13 }}>
                          No canteen vendor stalls found.
                        </td>
                      </tr>
                    ) : (
                      filteredVendors.map(vendor => (
                        <tr key={vendor.id}>
                          <td>
                            <div style={{ fontWeight: 800, color: '#166534', fontSize: 14 }}>
                              🏪 {vendor.shopName}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>{vendor.fullName}</div>
                            <div style={{ fontSize: 11, color: '#64748B' }}>@{vendor.username}</div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>🍔 {vendor.itemCount} dishes</span>
                          </td>
                          <td>
                            <div style={{ fontSize: 12, color: '#475569' }}>📍 {vendor.address || 'N/A'}</div>
                            {vendor.birthday && (
                              <div style={{ fontSize: 11, color: '#94A3B8' }}>🎂 {vendor.birthday} ({vendor.age} yrs)</div>
                            )}
                          </td>
                          <td>
                            {renderStatusBadge(vendor)}
                          </td>
                          <td>
                            {renderStatusActions(vendor)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* CARD VIEW */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                {filteredVendors.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 14 }}>
                    No canteen vendor stalls found.
                  </div>
                ) : (
                  filteredVendors.map(vendor => (
                    <div key={vendor.id} style={{
                      background: 'white', padding: 18, borderRadius: 16, border: '1px solid #E2E8F0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14
                    }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <h4 style={{ fontSize: 16, fontWeight: 800, color: '#166534', margin: 0 }}>
                              🏪 {vendor.shopName}
                            </h4>
                            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                              Manager: {vendor.fullName} (@{vendor.username})
                            </span>
                          </div>
                          {renderStatusBadge(vendor)}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, fontSize: 12, color: '#64748B', background: '#F8FAFC', padding: 12, borderRadius: 12 }}>
                          <div>🎂 Manager Birthday: <br /><b>{vendor.birthday || 'N/A'}</b> ({vendor.age} yrs)</div>
                          <div>🍔 Menu Items: <br /><b>{vendor.itemCount} dishes</b></div>
                          <div style={{ gridColumn: 'span 2' }}>🏠 Address: <br /><b>{vendor.address || 'N/A'}</b></div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 6 }}>STALL ACTIONS</div>
                        {renderStatusActions(vendor)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CUSTOM DELETE STALL POPUP DIALOG */}
      {stallToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20, animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: 'white', borderRadius: 24, padding: 28, width: '100%',
            maxWidth: 420, boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            textAlign: 'center', animation: 'scaleIn 0.25s ease'
          }}>
            <div style={{
              width: 60, height: 60, background: '#FEE2E2', color: '#DC2626',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px', border: '4px solid #FEF2F2'
            }}>
              <IoWarning size={32} />
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
              Delete Canteen Stall?
            </h3>

            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, marginBottom: 24 }}>
              Are you sure you want to delete stall <b style={{ color: '#0F172A' }}>"{stallToDelete.shopName || stallToDelete.fullName}"</b>? This will permanently delete the vendor account and all registered menu dishes.
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setStallToDelete(null)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid #CBD5E1',
                  background: 'white', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteVendor(stallToDelete.id, stallToDelete.shopName || stallToDelete.fullName)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                  background: '#DC2626', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)', transition: 'all 0.2s'
                }}
              >
                Yes, Delete Stall 🗑️
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CUSTOM DELETE STUDENT POPUP DIALOG */}
      {studentToDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20, animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            background: 'white', borderRadius: 24, padding: 28, width: '100%',
            maxWidth: 420, boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            textAlign: 'center', animation: 'scaleIn 0.25s ease'
          }}>
            <div style={{
              width: 60, height: 60, background: '#FEE2E2', color: '#DC2626',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px', border: '4px solid #FEF2F2'
            }}>
              <IoWarning size={32} />
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
              Delete Student Account?
            </h3>

            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5, marginBottom: 24 }}>
              Are you sure you want to delete student account <b style={{ color: '#0F172A' }}>"{studentToDelete.fullName}"</b> (ID: {studentToDelete.studentId})? This will permanently delete the student account, order history, and cart items.
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid #CBD5E1',
                  background: 'white', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteStudent(studentToDelete.id, studentToDelete.fullName)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 12, border: 'none',
                  background: '#DC2626', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)', transition: 'all 0.2s'
                }}
              >
                Yes, Delete Account 🗑️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

