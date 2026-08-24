import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoSearch, IoStar, IoFlame, IoStorefront, IoChevronBack } from 'react-icons/io5';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../services/api';

export default function HomePage() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [specials, setSpecials] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadMenuItems();
  }, [selectedCategory, selectedVendor]);

  const loadData = async () => {
    try {
      const [catRes, specialsRes, vendorRes] = await Promise.all([
        api.get('/categories'),
        api.get('/menuitems/specials'),
        api.get('/menuitems/vendors'),
      ]);
      setCategories(catRes.data);
      setSpecials(specialsRes.data);
      setVendors(vendorRes.data);
    } catch (err) {
      console.error(err);
    }
    loadMenuItems();
  };

  const loadMenuItems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCategory) params.categoryId = selectedCategory;
      if (selectedVendor) params.vendorId = selectedVendor;
      const res = await api.get('/menuitems', { params });
      setMenuItems(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAddToCart = async (e, itemId) => {
    e.stopPropagation();
    try {
      await addToCart(itemId, 1);
      setToast('Added to cart! 🛒');
      setTimeout(() => setToast(''), 2000);
    } catch (err) {
      setToast(err.response?.data?.message || 'Failed to add');
      setTimeout(() => setToast(''), 2000);
    }
  };

  const handleBuyNow = async (e, itemId) => {
    e.stopPropagation();
    try {
      await addToCart(itemId, 1);
      navigate('/cart');
    } catch (err) {
      setToast(err.response?.data?.message || 'Failed to process');
      setTimeout(() => setToast(''), 2000);
    }
  };

  const handleSelectVendor = (vendorId) => {
    setSelectedVendor(vendorId);
    setSelectedCategory(null);
  };

  const selectedVendorName = vendors.find(v => v.id === selectedVendor)?.shopName;

  return (
    <div className="page">
      {/* Greeting */}
      <div style={{ padding: '20px 0 16px' }}>
        <p className="text-muted" style={{ fontSize: 14 }}>Hello, {user?.fullName?.split(' ')[0]} 👋</p>
        <h1 style={{ fontSize: 22 }}>
          {!selectedVendor ? 'Where would you like to eat?' : `${selectedVendorName} Menu 🏪`}
        </h1>
      </div>

      {!selectedVendor ? (
        <>
          {/* Main Home View - Stalls Grid */}
          <div className="search-bar">
            <IoSearch className="search-icon" />
            <input
              placeholder="Search for a canteen stall..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>


          {/* Vendor Stalls Grid */}
          <div className="section-header" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <IoStorefront color="var(--primary)" size={18} />
              <span className="section-title">Explore Canteen Stalls</span>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, paddingBottom: 24 }}>
            {vendors.filter(v => v.shopName.toLowerCase().includes(search.toLowerCase())).map(vendor => (
              <div
                key={vendor.id}
                onClick={() => handleSelectVendor(vendor.id)}
                style={{
                  background: 'white',
                  borderRadius: 20,
                  padding: '24px 16px',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(21, 128, 61, 0.12)';
                  e.currentTarget.style.borderColor = 'var(--primary-light)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                  boxShadow: '0 4px 12px rgba(21, 128, 61, 0.15)',
                }}>
                  <IoStorefront color="var(--primary-dark)" size={32} />
                </div>
                <div style={{
                  fontSize: 16, fontWeight: 800, color: 'var(--text-dark)',
                  lineHeight: 1.2, marginBottom: 8,
                }}>
                  {vendor.shopName}
                </div>
                <div style={{
                  background: 'var(--surface-hover)',
                  color: 'var(--primary-dark)',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                  marginBottom: 8
                }}>
                  {vendor.itemCount} Menu Item{vendor.itemCount !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, opacity: 0.8 }}>
                  {vendor.description || "Fresh and delicious school meals."}
                </div>
              </div>
            ))}
          </div>



        </>
      ) : (
        <>
          {/* Vendor Specific View */}
          <button
            onClick={() => { setSelectedVendor(null); setSearch(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'white', border: '1px solid var(--border)',
              padding: '8px 16px', borderRadius: '12px',
              color: 'var(--text-dark)', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', marginBottom: 16,
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <IoChevronBack size={16} /> Back to all stalls
          </button>

          {/* Categories for Vendor */}
          <div className="category-scroll">
            <button
              className={`category-pill ${!selectedCategory ? 'active' : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="section-header" style={{ marginTop: 16 }}>
            <span className="section-title">Menu</span>
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : menuItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🍽️</div>
              <div className="empty-state-title">No items found</div>
              <div className="empty-state-text">This stall has no available items right now</div>
            </div>
          ) : (
            <div className="food-grid">
              {menuItems.map((item, i) => renderFoodCard(item, i, navigate, handleAddToCart, handleBuyNow))}
            </div>
          )}
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// Helper component for rendering a food card
function renderFoodCard(item, i, navigate, handleAddToCart, handleBuyNow) {
  const isItemAvailable = item.isAvailable && item.stock > 0;
  return (
    <div
      key={item.id}
      className="food-card"
      onClick={() => navigate(`/food/${item.id}`)}
      style={{ animationDelay: `${i * 0.05}s` }}
    >
      <div style={{
        width: '100%', height: 120, background: 'var(--surface-hover)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}>
        {!isItemAvailable && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: '1px',
              zIndex: 2,
            }}
          >
            🚫 SOLD OUT
          </div>
        )}
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="food-card-img" style={{ opacity: isItemAvailable ? 1 : 0.5 }} />
        ) : (
          <span style={{ fontSize: 36, opacity: 0.3 }}>🍔</span>
        )}
      </div>
      <div className="food-card-body">
        <div className="food-card-name">{item.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <div className="food-card-price" style={{ color: isItemAvailable ? 'var(--primary)' : 'var(--text-muted)' }}>
            ₱{item.price}
          </div>
          {item.averageRating > 0 && (
            <div className="food-card-rating">
              <IoStar /> {item.averageRating}
            </div>
          )}
        </div>
        {isItemAvailable ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
            <button
              className="btn btn-outline btn-sm"
              style={{ fontSize: 11, padding: '5px 0', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 600 }}
              onClick={(e) => handleAddToCart(e, item.id)}
            >
              + Cart
            </button>
            <button
              className="btn btn-primary btn-sm"
              style={{ fontSize: 11, padding: '5px 0', fontWeight: 700 }}
              onClick={(e) => handleBuyNow(e, item.id)}
            >
              ⚡ Buy
            </button>
          </div>
        ) : (
          <button
            className="btn btn-ghost btn-sm"
            disabled
            style={{ marginTop: 8, fontSize: 12, padding: '6px 0', width: '100%', background: '#F1F5F9', color: '#94A3B8', cursor: 'not-allowed' }}
          >
            Sold Out
          </button>
        )}
      </div>
    </div>
  );
}
