import { useState, useEffect } from 'react';
import { Pill, Plus, Search, Edit3, Trash2, Save, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import AnimatedPage from '../components/AnimatedPage';
import { useToastContext } from '../context/ToastContext';

export default function VendorInventory() {
  const { user } = useAuth();
  const toast = useToastContext();

  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'All' | 'Low' | 'Out'>('All');
  
  // Modals & Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    medicineName: '',
    sku: '',
    quantity: 100,
    price: 0,
    manufacturer: '',
    expiryDate: '',
    category: 'General',
    description: '',
    dosageInfo: '',
    isPrescriptionRequired: false
  });

  const vendorId = user?.id || 'V001';

  async function loadInventory() {
    try {
      const res = await api.getInventory();
      // Filter for current vendor
      const filtered = (res.data || []).filter((i: any) => i.vendorId === vendorId);
      setInventory(filtered);
    } catch (err) {
      console.error(err);
      toast.error('Load Error', 'Failed to retrieve inventory items');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, [user?.id]);

  // Quick quantity increment handler
  const handleQuickRestock = async (itemId: string, currentQty: number, increment: number) => {
    try {
      const targetItem = inventory.find(i => i.id === itemId);
      if (!targetItem) return;
      
      const newQty = currentQty + increment;
      await api.updateInventoryItem(itemId, { ...targetItem, quantity: newQty });
      toast.success('Inventory Updated', `Restocked ${targetItem.medicineName} by +${increment} units`);
      await loadInventory();
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Could not restock item');
    }
  };

  // Open Add modal
  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      medicineName: '',
      sku: `MED-${Math.floor(100 + Math.random() * 900)}`,
      quantity: 100,
      price: 10.0,
      manufacturer: '',
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // default 1 year out
      category: 'General',
      description: '',
      dosageInfo: '',
      isPrescriptionRequired: false
    });
    setModalOpen(true);
  };

  // Open Edit modal
  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({
      medicineName: item.medicineName,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price,
      manufacturer: item.manufacturer || '',
      expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
      category: item.category || 'General',
      description: item.description || '',
      dosageInfo: item.dosageInfo || '',
      isPrescriptionRequired: !!item.isPrescriptionRequired
    });
    setModalOpen(true);
  };

  // Delete item
  const handleDeleteItem = async (itemId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from your catalog?`)) return;
    try {
      await api.deleteInventoryItem(itemId);
      toast.success('Deleted', `${name} removed from catalog`);
      await loadInventory();
    } catch (err: any) {
      toast.error('Action Failed', err.message || 'Could not delete item');
    }
  };

  // Form Submit (Add or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.medicineName.trim()) {
      toast.error('Validation Error', 'Medicine Name is required');
      return;
    }
    if (formData.price <= 0) {
      toast.error('Validation Error', 'Price must be greater than zero');
      return;
    }

    try {
      if (editingItem) {
        // Edit Mode
        await api.updateInventoryItem(editingItem.id, {
          ...editingItem,
          ...formData
        });
        toast.success('Catalog Updated', `${formData.medicineName} details modified`);
      } else {
        // Add Mode
        await api.addInventoryItem({
          vendorId,
          ...formData
        });
        toast.success('Added to Catalog', `${formData.medicineName} added to inventory`);
      }
      setModalOpen(false);
      await loadInventory();
    } catch (err: any) {
      toast.error('Filing Failed', err.message || 'Database error, failed to save item');
    }
  };

  // Filtering + Searching logic
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      item.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (filterMode === 'Low') return item.quantity > 0 && item.quantity < 20;
    if (filterMode === 'Out') return item.quantity === 0;
    return true; // 'All'
  });

  return (
    <AnimatedPage>
      <div className="page-header">
        <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="stagger-in">Inventory Catalog 📋</h1>
            <p className="stagger-in" style={{ animationDelay: '0.1s' }}>
              Maintain catalog prices, check stock levels, and perform fast dosage restocks.
            </p>
          </div>
          <button className="btn btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} /> Add Medicine
          </button>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="glass-card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        
        {/* Search */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-input)', padding: '8px 14px', borderRadius: 10, width: 300, border: '1px solid var(--border-color)' }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search medicine name or SKU..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '0.85rem' }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8 }}>
          {(['All', 'Low', 'Out'] as const).map(mode => (
            <button
              key={mode}
              className={`btn btn-secondary ${filterMode === mode ? 'btn-primary' : ''}`}
              onClick={() => setFilterMode(mode)}
              style={{
                fontSize: '0.8rem',
                padding: '6px 14px',
                background: filterMode === mode ? 'var(--accent-primary)' : 'transparent',
                color: filterMode === mode ? 'white' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              {mode === 'All' && 'All Catalog'}
              {mode === 'Low' && 'Low Stock (<20)'}
              {mode === 'Out' && 'Out of Stock'}
            </button>
          ))}
        </div>

      </div>

      {/* Main Inventory Grid */}
      <div className="glass-card" style={{ padding: 24 }}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading inventory catalog...</p>
        ) : filteredInventory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Pill size={64} style={{ opacity: 0.2, marginBottom: 16 }} />
            <h3>No Medicines Found</h3>
            <p style={{ fontSize: '0.85rem' }}>No medicines fit the current filters. Expand your search or add a new dosage.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>SKU</th>
                  <th>Manufacturer</th>
                  <th>Price / Unit</th>
                  <th>Expiry Date</th>
                  <th>Quantity</th>
                  <th>Quick Restock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map(item => {
                  const isLow = item.quantity > 0 && item.quantity < 20;
                  const isOut = item.quantity === 0;
                  
                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'start', gap: 10 }}>
                          <span style={{ fontSize: '1.25rem', marginTop: 2 }}>💊</span>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.medicineName}</span>
                              {item.isPrescriptionRequired && <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 4, fontWeight: 700 }}>Rx</span>}
                              {item.category && <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)', borderRadius: 4, fontWeight: 600 }}>{item.category}</span>}
                              {isOut && <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 4, fontWeight: 700 }}>OUT OF STOCK</span>}
                              {isLow && <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: 4, fontWeight: 700 }}>LOW STOCK</span>}
                            </div>
                            {item.description && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description}>
                                {item.description}
                              </div>
                            )}
                            {item.dosageInfo && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 2 }}>
                                Dosage: {item.dosageInfo}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.sku}</span></td>
                      <td>{item.manufacturer || 'Generic'}</td>
                      <td><strong style={{ color: 'var(--accent-primary)' }}>₹{item.price.toFixed(2)}</strong></td>
                      <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <span 
                          style={{ 
                            fontWeight: 700, 
                            color: isOut ? '#ef4444' : isLow ? '#f97316' : '#10b981' 
                          }}
                        >
                          {item.quantity} units
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => handleQuickRestock(item.id, item.quantity, 50)}>+50</button>
                          <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => handleQuickRestock(item.id, item.quantity, 100)}>+100</button>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(item)} style={{ padding: 6 }}>
                            <Edit3 size={14} />
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleDeleteItem(item.id, item.medicineName)} style={{ padding: 6, color: '#ef4444' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card modal-content" style={{ padding: 24, width: 460, maxWidth: '95%', animation: 'scaleUp 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{editingItem ? 'Edit Medicine Details' : 'Add New Medicine'}</h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              {/* Medicine Name */}
              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Medicine Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Amlodipine 5mg"
                  value={formData.medicineName}
                  onChange={e => setFormData(d => ({ ...d, medicineName: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* SKU */}
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>SKU Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.sku}
                    onChange={e => setFormData(d => ({ ...d, sku: e.target.value }))}
                    required
                  />
                </div>

                {/* Price */}
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Price per Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.price}
                    onChange={e => setFormData(d => ({ ...d, price: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Quantity */}
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Initial Quantity</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.quantity}
                    onChange={e => setFormData(d => ({ ...d, quantity: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </div>

                {/* Expiry Date */}
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Expiry Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.expiryDate}
                    onChange={e => setFormData(d => ({ ...d, expiryDate: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Category */}
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Category</label>
                  <select
                    className="form-input"
                    value={formData.category}
                    onChange={e => setFormData(d => ({ ...d, category: e.target.value }))}
                    style={{ width: '100%' }}
                  >
                    <option value="General">General</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Diabetes">Diabetes</option>
                    <option value="Thyroid">Thyroid</option>
                    <option value="Analgesic">Analgesic</option>
                    <option value="Vitamins">Vitamins</option>
                    <option value="Antibiotics">Antibiotics</option>
                  </select>
                </div>

                {/* Dosage Info */}
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Dosage Info</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 1 tab daily"
                    value={formData.dosageInfo}
                    onChange={e => setFormData(d => ({ ...d, dosageInfo: e.target.value }))}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Description</label>
                <textarea
                  className="form-input"
                  placeholder="Enter details about medicine usage..."
                  value={formData.description}
                  onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Prescription Required Toggle */}
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 4 }}>
                <input
                  type="checkbox"
                  id="isPrescriptionRequired"
                  checked={formData.isPrescriptionRequired}
                  onChange={e => setFormData(d => ({ ...d, isPrescriptionRequired: e.target.checked }))}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <label htmlFor="isPrescriptionRequired" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Prescription Required (Rx)</span>
                  <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: formData.isPrescriptionRequired ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: formData.isPrescriptionRequired ? '#ef4444' : '#10b981', borderRadius: 4, fontWeight: 700 }}>
                    {formData.isPrescriptionRequired ? 'Rx Restricted' : 'OTC Available'}
                  </span>
                </label>
              </div>

              {/* Manufacturer */}
              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Manufacturer</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sun Pharma, Cipla"
                  value={formData.manufacturer}
                  onChange={e => setFormData(d => ({ ...d, manufacturer: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Save size={16} /> Save Product
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </AnimatedPage>
  );
}
