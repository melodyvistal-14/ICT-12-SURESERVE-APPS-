import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoSearch, IoStar, IoFlame, IoStorefront, IoChevronBack, IoPerson } from 'react-icons/io5';
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

  const activeVendor = vendors.find(v => v.id === selectedVendor);

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      {/* Greeting */}
      {!selectedVendor && (
        <div style={{ padding: '20px 0 16px' }}>
          <p className="text-muted" style={{ fontSize: 14 }}>Hello, {user?.fullName?.split(' ')[0]} 👋</p>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>
            Where would you like to eat?
          </h1>
        </div>
      )}

      {!selectedVendor ? (
        <>
          {/* Main Home View - Stalls Grid */}
          <div className="search-bar" style={{ marginBottom: 20 }}>
            <IoSearch className="search-icon" />
            <input
              placeholder="Search for a canteen stall..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Vendor Stalls Grid */}
          <div className="section-header" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IoStorefront color="var(--primary)" size={20} />
              <span className="section-title">Explore Canteen Stalls</span>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, paddingBottom: 24 }}>
            {vendors.filter(v => v.shopName.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '48px 20px',
                background: 'var(--surface-hover)',
                borderRadius: 20,
                border: '1.5px dashed var(--border)',
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 6 }}>
                  {search ? 'No stalls match your search' : 'No Canteen Stalls Yet'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {search ? `Try searching a different name.` : 'Canteen stalls will appear here once vendors register.'}
                </div>
              </div>
            ) : (
              vendors.filter(v => v.shopName.toLowerCase().includes(search.toLowerCase())).map(vendor => (
                <div
                  key={vendor.id}
                  onClick={() => handleSelectVendor(vendor.id)}
                  style={{
                    background: 'white',
                    borderRadius: 20,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(21, 128, 61, 0.12)';
                    e.currentTarget.style.borderColor = 'var(--primary-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.04)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  {/* Stall Image Banner (Owner with Food / Stall Photo) */}
                  <div style={{
                    width: '100%',
                    height: 125,
                    position: 'relative',
                    background: vendor.stallImageUrl
                      ? `url(${vendor.stallImageUrl}) center/cover no-repeat`
                      : 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {!vendor.stallImageUrl && (
                      <IoStorefront size={44} color="#15803D" style={{ opacity: 0.7 }} />
                    )}

                    {/* Gradient overlay on banner */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 70%)'
                    }} />

                    {/* Menu Item Count badge */}
                    <div style={{
                      position: 'absolute', top: 10, right: 10,
                      background: 'rgba(255, 255, 255, 0.95)',
                      color: 'var(--primary-dark)',
                      padding: '4px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 800,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                    }}>
                      {vendor.itemCount} Item{vendor.itemCount !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Stall Details & Owner Avatar */}
                  <div style={{ padding: '14px 16px 16px', position: 'relative' }}>
                    {/* Owner Face Profile Picture (overlapping banner) */}
                    <div style={{
                      marginTop: -38,
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                    }}>
                      {vendor.ownerProfileImageUrl || vendor.logoUrl ? (
                        <img
                          src={vendor.ownerProfileImageUrl || vendor.logoUrl}
                          alt={vendor.ownerName || vendor.shopName}
                          style={{
                            width: 50,
                            height: 50,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '3px solid white',
                            boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
                            background: 'white'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 50,
                          height: 50,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 18,
                          border: '3px solid white',
                          boxShadow: '0 3px 10px rgba(0,0,0,0.15)'
                        }}>
                          {(vendor.ownerName || vendor.shopName || 'V').charAt(0).toUpperCase()}
                        </div>
                      )}

                      <span style={{ fontSize: 11, color: '#15803D', fontWeight: 700, background: '#F0FDF4', padding: '3px 8px', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                        Open for Orders
                      </span>
                    </div>

                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.3, marginBottom: 2 }}>
                      {vendor.shopName}
                    </div>

                    {vendor.ownerName && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                        <IoPerson size={12} color="#15803D" />
                        <span>Owner: <strong>{vendor.ownerName}</strong></span>
                      </div>
                    )}

                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, opacity: 0.9 }}>
                      {vendor.description || "Fresh and delicious school meals."}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          {/* Selected Vendor Hero Header */}
          <div style={{ marginBottom: 16 }}>
            {/* Back Button */}
            <button
              onClick={() => { setSelectedVendor(null); setSearch(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'white', border: '1px solid var(--border)',
                padding: '8px 16px', borderRadius: '12px',
                color: 'var(--text-dark)', fontWeight: 700, fontSize: 13,
                cursor: 'pointer', marginBottom: 12,
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              <IoChevronBack size={16} /> Back to all stalls
            </button>

            {/* Stall Hero Banner */}
            <div style={{
              width: '100%',
              borderRadius: 20,
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              border: '1px solid var(--border)',
              background: 'white',
              marginBottom: 16
            }}>
              {/* Stall Cover (Owner with Food) */}
              <div style={{
                height: 150,
                width: '100%',
                position: 'relative',
                background: activeVendor?.stallImageUrl
                  ? `url(${activeVendor.stallImageUrl}) center/cover no-repeat`
                  : 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)'
                }} />
              </div>

              {/* Stall details */}
              <div style={{ padding: '16px 20px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -42, marginBottom: 10 }}>
                  {activeVendor?.ownerProfileImageUrl || activeVendor?.logoUrl ? (
                    <img
                      src={activeVendor.ownerProfileImageUrl || activeVendor.logoUrl}
                      alt={activeVendor.ownerName || activeVendor.shopName}
                      style={{
                        width: 60, height: 60, borderRadius: '50%',
                        objectFit: 'cover', border: '3px solid white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        background: 'white'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 60, height: 60, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #15803D 0%, #166534 100%)',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 22, border: '3px solid white',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}>
                      {(activeVendor?.ownerName || activeVendor?.shopName || 'V').charAt(0).toUpperCase()}
                    </div>
                  )}

                  <span className="badge badge-ready" style={{ fontSize: 12, padding: '4px 12px' }}>
                    🏪 Active Stall
                  </span>
                </div>

                <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                  {activeVendor?.shopName || "Canteen Stall"}
                </h1>
                
                {activeVendor?.ownerName && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Owner: <strong>{activeVendor.ownerName}</strong>
                  </p>
                )}

                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.4 }}>
                  {activeVendor?.description || "Fresh food prepared daily."}
                </p>
              </div>
            </div>
          </div>

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
            <span className="section-title">Menu Items</span>
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
