import { useState, useEffect } from 'react';
import { IoAdd, IoTrash, IoPencil, IoClose } from 'react-icons/io5';
import api from '../services/api';

export default function VendorMenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', categoryId: 1, imageUrl: '', isSpecial: false, stock: 50 });
  const [imageMode, setImageMode] = useState('upload');
  const [editingItem, setEditingItem] = useState(null);
  const [editImageMode, setEditImageMode] = useState('upload');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => { loadCategories(); loadMenuItems(); }, []);

  const loadCategories = async () => {
    try { const res = await api.get('/categories'); setCategories(res.data); } catch (err) { console.error(err); }
  };

  const loadMenuItems = async () => {
    try { const res = await api.get('/vendor/menuitems'); setMenuItems(res.data); } catch (err) { console.error(err); }
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const convertGoogleDriveUrl = (url) => {
    if (!url) return '';
    const match = url.match(/\/file\/d\/([^\/\?]+)/) || url.match(/[?&]id=([^&]+)/);
    if (match && match[1]) return `https://lh3.googleusercontent.com/d/${match[1]}`;
    return url;
  };

  const handleImageFileUpload = (e, setter) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('File too large. Max 10MB.'); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 600;
        let { width, height } = img;
        if (width > height) { if (width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; } }
        else { if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; } }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        setter(prev => ({ ...prev, imageUrl: canvas.toDataURL('image/jpeg', 0.8) }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handlePostItem = async (e) => {
    e.preventDefault();
    try {
      await api.post('/menuitems', { ...newItem, price: parseFloat(newItem.price), categoryId: parseInt(newItem.categoryId), stock: parseInt(newItem.stock) });
      setShowAddModal(false);
      setNewItem({ name: '', description: '', price: '', categoryId: 1, imageUrl: '', isSpecial: false, stock: 50 });
      loadMenuItems();
      showToast('Food item posted! 🍔');
    } catch (err) { showToast(err.response?.data?.message || 'Failed to post item'); }
  };

  const handleToggleAvailability = async (itemId, currentAvailable) => {
    try {
      await api.put(`/menuitems/${itemId}`, { isAvailable: !currentAvailable });
      loadMenuItems();
      showToast(currentAvailable ? 'Marked as SOLD OUT 🚫' : 'Marked as IN STOCK ✓');
    } catch (err) { showToast('Failed to update'); }
  };

  const handleStartEdit = (item) => {
    const category = categories.find(c => c.name === item.category);
    setEditingItem({ id: item.id, name: item.name, description: item.description || '', price: item.price, stock: item.stock ?? 50, categoryId: category ? category.id : 1, imageUrl: item.imageUrl || '', isSpecial: item.isSpecial || false, isAvailable: item.isAvailable });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await api.put(`/menuitems/${editingItem.id}`, { name: editingItem.name, description: editingItem.description, price: parseFloat(editingItem.price), stock: parseInt(editingItem.stock), categoryId: parseInt(editingItem.categoryId), imageUrl: editingItem.imageUrl, isSpecial: editingItem.isSpecial, isAvailable: editingItem.isAvailable });
      setEditingItem(null);
      loadMenuItems();
      showToast('Food item updated! ✏️');
    } catch (err) { showToast('Failed to update item'); }
  };

  const confirmDeleteItem = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/menuitems/${deleteTarget.id}`);
      loadMenuItems(); showToast('Food item deleted'); setDeleteTarget(null);
    } catch (err) { showToast('Failed to delete item'); }
  };

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <div style={{ padding: '24px 0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>My Menu 🍔</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Manage your canteen food listings</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)} style={{ gap: 4 }}>
          <IoAdd size={18} /> Post Food
        </button>
      </div>

      {menuItems.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 20px' }}>
          <div className="empty-state-icon">🍔</div>
          <div className="empty-state-title">No food items yet</div>
          <div className="empty-state-text">Click "Post Food" to add items to your canteen menu.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {menuItems.map(item => (
            <div key={item.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <img
                src={item.imageUrl || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500'}
                alt={item.name}
                style={{ width: 60, height: 60, borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 14 }}>₱{item.price}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.category} • Stock: {item.stock ?? 50} pcs</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <button type="button" onClick={() => handleToggleAvailability(item.id, item.isAvailable)}
                  style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: item.isAvailable ? '#DCFCE7' : '#FEE2E2', color: item.isAvailable ? '#15803D' : '#DC2626' }}>
                  {item.isAvailable ? '✓ In Stock' : '🚫 Sold Out'}
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => handleStartEdit(item)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 4 }}><IoPencil size={18} /></button>
                  <button onClick={() => setDeleteTarget(item)} style={{ background: 'none', border: 'none', color: 'var(--cancelled)', cursor: 'pointer', padding: 4 }}><IoTrash size={18} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* POST FOOD MODAL */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={{ marginBottom: 16 }}>Post New Food Item 🍔</h2>
            <form onSubmit={handlePostItem}>
              <div className="input-group"><label>Item Name</label><input className="input" placeholder="e.g. Cheesy Chicken Burger" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} required /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group"><label>Price (₱)</label><input className="input" type="number" step="0.01" placeholder="85.00" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} required /></div>
                <div className="input-group"><label>Stock (pcs)</label><input className="input" type="number" placeholder="50" value={newItem.stock} onChange={e => setNewItem({ ...newItem, stock: e.target.value })} required /></div>
              </div>
              <div className="input-group"><label>Category</label>
                <select className="input" value={newItem.categoryId} onChange={e => setNewItem({ ...newItem, categoryId: e.target.value })}>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div className="input-group"><label>Description</label><input className="input" placeholder="Short description" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} /></div>
              <div className="input-group">
                <label>Food Photo</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <button type="button" className={`btn btn-sm ${imageMode === 'upload' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, fontSize: 12 }} onClick={() => setImageMode('upload')}>📁 Upload</button>
                  <button type="button" className={`btn btn-sm ${imageMode === 'gdrive' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, fontSize: 12 }} onClick={() => setImageMode('gdrive')}>🔗 URL</button>
                </div>
                {imageMode === 'upload' ? (
                  <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'center', background: 'var(--surface-hover)' }}>
                    <input type="file" id="food-photo-upload" accept="image/*" onChange={e => handleImageFileUpload(e, setNewItem)} style={{ display: 'none' }} />
                    <label htmlFor="food-photo-upload" style={{ cursor: 'pointer', margin: 0, display: 'block' }}>
                      <div style={{ fontSize: 24 }}>📷</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>Click to select photo</div>
                    </label>
                  </div>
                ) : (
                  <input className="input" placeholder="Paste Google Drive link or Image URL..." value={newItem.imageUrl} onChange={e => setNewItem({ ...newItem, imageUrl: convertGoogleDriveUrl(e.target.value) })} />
                )}
                {newItem.imageUrl && <div style={{ marginTop: 12 }}><img src={newItem.imageUrl} alt="preview" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} onError={e => e.target.style.display = 'none'} /></div>}
              </div>
              <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="isSpecial" checked={newItem.isSpecial} onChange={e => setNewItem({ ...newItem, isSpecial: e.target.checked })} style={{ width: 18, height: 18 }} />
                <label htmlFor="isSpecial" style={{ marginBottom: 0, cursor: 'pointer' }}>Mark as Today's Special 🔥</label>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Post Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FOOD MODAL */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Edit Food Item ✏️</h2>
              <button type="button" onClick={() => setEditingItem(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}><IoClose /></button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="input-group"><label>Item Name</label><input className="input" value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} required /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group"><label>Price (₱)</label><input className="input" type="number" step="0.01" value={editingItem.price} onChange={e => setEditingItem({ ...editingItem, price: e.target.value })} required /></div>
                <div className="input-group"><label>Stock (pcs)</label><input className="input" type="number" value={editingItem.stock} onChange={e => setEditingItem({ ...editingItem, stock: e.target.value })} required /></div>
              </div>
              <div className="input-group"><label>Category</label>
                <select className="input" value={editingItem.categoryId} onChange={e => setEditingItem({ ...editingItem, categoryId: e.target.value })}>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div className="input-group"><label>Description</label><input className="input" value={editingItem.description} onChange={e => setEditingItem({ ...editingItem, description: e.target.value })} /></div>
              <div className="input-group">
                <label>Food Photo</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  <button type="button" className={`btn btn-sm ${editImageMode === 'upload' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, fontSize: 12 }} onClick={() => setEditImageMode('upload')}>📁 Upload</button>
                  <button type="button" className={`btn btn-sm ${editImageMode === 'gdrive' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, fontSize: 12 }} onClick={() => setEditImageMode('gdrive')}>🔗 URL</button>
                </div>
                {editImageMode === 'upload' ? (
                  <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'center', background: 'var(--surface-hover)' }}>
                    <input type="file" id="edit-food-photo-upload" accept="image/*" onChange={e => handleImageFileUpload(e, setEditingItem)} style={{ display: 'none' }} />
                    <label htmlFor="edit-food-photo-upload" style={{ cursor: 'pointer', margin: 0, display: 'block' }}>
                      <div style={{ fontSize: 24 }}>📷</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>Click to change photo</div>
                    </label>
                  </div>
                ) : (
                  <input className="input" placeholder="Paste Google Drive link or Image URL..." value={editingItem.imageUrl} onChange={e => setEditingItem({ ...editingItem, imageUrl: convertGoogleDriveUrl(e.target.value) })} />
                )}
                {editingItem.imageUrl && <div style={{ marginTop: 12 }}><img src={editingItem.imageUrl} alt="Preview" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} /></div>}
              </div>
              <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="editIsSpecial" checked={editingItem.isSpecial} onChange={e => setEditingItem({ ...editingItem, isSpecial: e.target.checked })} style={{ width: 18, height: 18 }} />
                <label htmlFor="editIsSpecial" style={{ marginBottom: 0, cursor: 'pointer' }}>Mark as Today's Special 🔥</label>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingItem(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '24px' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Delete Menu Item?</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>Are you sure you want to delete <strong>{deleteTarget.name}</strong>?</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={confirmDeleteItem}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
