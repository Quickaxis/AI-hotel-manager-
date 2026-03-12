import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { Plus, Trash2, ArrowRight, Check } from 'lucide-react';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [bizData, setBizData] = useState({
    name: '',
    type: 'Hotel',
    location: '',
  });
  const [products, setProducts] = useState([
    { name: '', price: '', unit: '' }
  ]);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleBizChange = (e) => {
    setBizData({ ...bizData, [e.target.name]: e.target.value });
  };

  const handleProductChange = (index, field, value) => {
    const newProducts = [...products];
    newProducts[index][field] = value;
    setProducts(newProducts);
  };

  const addProduct = () => {
    setProducts([...products, { name: '', price: '', unit: '' }]);
  };

  const removeProduct = (index) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const handleFinalSubmit = async () => {
    // Basic validation
    if (products.some(p => !p.name || !p.price)) {
      showToast('Please fill in all product names and prices');
      return;
    }

    setLoading(true);
    try {
      await apiCall('/api/business/setup', 'POST', bizData);
      await apiCall('/api/business/products', 'POST', { products });
      showToast('Account setup complete!', 'success');
      navigate('/dashboard');
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="glow-orb top-0 -right-20 opacity-50" />
      <div className="glow-orb bottom-0 -left-20 opacity-30" />

      <div className="glass-card w-full max-w-[600px] p-8 relative z-10">
        {/* Progress Bar */}
        <div className="flex items-center gap-4 mb-8">
           <div className={`h-1 flex-1 rounded-full transition-all ${step >= 1 ? 'bg-orange shadow-[0_0_10px_#ff6b00]' : 'bg-white/10'}`} />
           <div className={`h-1 flex-1 rounded-full transition-all ${step >= 2 ? 'bg-orange shadow-[0_0_10px_#ff6b00]' : 'bg-white/10'}`} />
        </div>

        {step === 1 ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-gradient-orange">Business Details</h2>
              <p className="text-text-muted text-sm">Tell us about your business to get started.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Business Name</label>
                <input 
                  name="name"
                  value={bizData.name}
                  onChange={handleBizChange}
                  className="input-glass w-full" 
                  placeholder="e.g. Grand Heritage Hotel"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Business Type</label>
                <select 
                  name="type"
                  value={bizData.type}
                  onChange={handleBizChange}
                  className="input-glass w-full appearance-none bg-orange/5"
                >
                  {['Hotel', 'Homestay', 'Restaurant', 'Cafe', 'Salon', 'Spa', 'Gym', 'Retail', 'Clinic', 'Other'].map(t => (
                    <option key={t} value={t} className="bg-bg-dark">{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Location</label>
                <input 
                  name="location"
                  value={bizData.location}
                  onChange={handleBizChange}
                  className="input-glass w-full" 
                  placeholder="City, State"
                />
              </div>
            </div>

            <button 
              onClick={() => {
                if (!bizData.name) return showToast('Business name is required');
                setStep(2);
              }}
              className="btn-primary w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 group"
            >
              Next <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h2 className="text-2xl font-bold text-gradient-orange">What do you sell?</h2>
              <p className="text-text-muted text-sm">Add your main products or services.</p>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {products.map((p, index) => (
                <div key={index} className="flex gap-2 items-start">
                   <div className="flex-1 space-y-2">
                     <input 
                        className="input-glass w-full text-sm py-2" 
                        placeholder="Product Name"
                        value={p.name}
                        onChange={(e) => handleProductChange(index, 'name', e.target.value)}
                     />
                     <div className="flex gap-2">
                        <input 
                          type="number"
                          className="input-glass flex-1 text-sm py-1" 
                          placeholder="Price"
                          value={p.price}
                          onChange={(e) => handleProductChange(index, 'price', e.target.value)}
                        />
                        <input 
                          className="input-glass w-24 text-sm py-1" 
                          placeholder="Unit"
                          value={p.unit}
                          onChange={(e) => handleProductChange(index, 'unit', e.target.value)}
                        />
                     </div>
                   </div>
                   <button 
                    disabled={products.length === 1}
                    onClick={() => removeProduct(index)}
                    className="p-2 text-white/20 hover:text-red-500 transition-colors mt-1 disabled:opacity-0"
                   >
                     <Trash2 size={20} />
                   </button>
                </div>
              ))}
            </div>

            <button 
              onClick={addProduct}
              className="w-full py-2 border border-dashed border-white/20 rounded-lg text-sm text-text-muted hover:text-orange hover:border-orange/50 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Add Another
            </button>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setStep(1)}
                className="flex-1 py-4 glass-card font-bold text-white/70"
              >
                Back
              </button>
              <button 
                onClick={handleFinalSubmit}
                disabled={loading}
                className="btn-primary flex-[2] py-4 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                {loading ? 'Setting up...' : 'Save & Continue'} <Check size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
