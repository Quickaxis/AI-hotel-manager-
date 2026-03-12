import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiCall('/api/auth/login', 'POST', { email, password });
      localStorage.setItem('bizagent_token', data.token);
      showToast('Login successful!', 'success');
      
      if (!data.business) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen relative overflow-hidden px-4">
      {/* Decorative Glow Orb */}
      <div className="glow-orb top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      
      <div className="glass-card w-full max-w-[400px] p-8 relative z-10 transition-all hover:shadow-[0_0_60px_rgba(255,107,0,0.2)]">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-white">Biz</span>
            <span className="text-gradient-orange">Agent</span>
          </h1>
          <p className="text-text-muted text-sm">AI-powered business intelligence</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 ml-1">Email</label>
            <input 
              type="email" 
              className="input-glass w-full"
              placeholder="owner@business.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 ml-1">Password</label>
            <input 
              type="password" 
              className="input-glass w-full"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full py-3 rounded-xl font-bold text-white mt-4 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <p className="text-text-muted">Want access?</p>
          <a 
            href="https://wa.me/918822095217" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-orange font-bold hover:underline inline-flex items-center gap-1 mt-1 transition-all"
          >
            Chat with us on WhatsApp →
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
