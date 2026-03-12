import React, { useState } from 'react';
import { apiCall } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { X, Plus, Trash2, Save } from 'lucide-react';

const SettingsModal = ({ business, onClose, onSave }) => {
  const [name, setName] = useState(business.name);
  const [location, setLocation] = useState(business.location);
  const [products, setProducts] = useState(business.products || []);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleProductChange = (index, field, value) => {
    const newProducts = [...products];
    newProducts[index][field] = value;
    setProducts(newProducts);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiCall('/api/business/setup', 'POST', { 
        name, 
        type: business.type, 
        location, 
        currency: business.currency 
      });
      await apiCall('/api/business/products', 'POST', { products });
      showToast('Settings saved successfully', 'success');
      onSave();
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
       
       <div className="glass-card w-full max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
          <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
             <h2 className="text-xl font-bold text-gradient-orange">Settings</h2>
             <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full text-white/50">
                <X size={20} />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
             <div className="space-y-4">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">General</h3>
                <div>
                   <label className="text-[10px] text-white/50 mb-1 block">Business Name</label>
                   <input 
                    className="input-glass w-full text-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                   />
                </div>
                <div>
                   <label className="text-[10px] text-white/50 mb-1 block">Location</label>
                   <input 
                    className="input-glass w-full text-sm"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                   />
                </div>
             </div>

             <div className="h-[1px] bg-white/5" />

             <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">Products & Pricing</h3>
                   <button 
                    onClick={() => setProducts([...products, { name: '', price: '', unit: '' }])}
                    className="text-orange inline-flex items-center gap-1 text-xs font-bold"
                   >
                     <Plus size={14} /> Add New
                   </button>
                </div>
                
                <div className="space-y-3">
                   {products.map((p, i) => (
                    <div key={i} className="flex gap-2 items-start py-2 group">
                       <div className="flex-1 space-y-2">
                          <input 
                            className="input-glass w-full text-xs"
                            placeholder="Name"
                            value={p.name}
                            onChange={(e) => handleProductChange(i, 'name', e.target.value)}
                          />
                          <div className="flex gap-2">
                             <input className="input-glass flex-1 text-xs" placeholder="Price" value={p.price} onChange={(e) => handleProductChange(i, 'price', e.target.value)} />
                             <input className="input-glass w-16 text-xs" placeholder="Unit" value={p.unit} onChange={(e) => handleProductChange(i, 'unit', e.target.value)} />
                          </div>
                       </div>
                       <button 
                        onClick={() => setProducts(products.filter((_, idx) => idx !== i))}
                        className="p-1 text-white/10 group-hover:text-red-500 transition-all mt-1"
                       >
                          <Trash2 size={16} />
                       </button>
                    </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="p-6 border-t border-white/10">
             <button 
              onClick={handleSave}
              disabled={loading}
              className="btn-primary w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2"
             >
                {loading ? 'Saving...' : <><Save size={18} /> Save Settings</>}
             </button>
          </div>
       </div>
    </div>
  );
};

export default SettingsModal;
