import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

const MasterLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/master-login', { email, password });
      login(res.data);
      navigate('/master');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex w-full font-sans">
      {/* Left Form Section */}
      <div className="w-full lg:w-[45%] xl:w-[35%] bg-[#0f1115] text-white flex flex-col px-10 py-12 justify-center relative z-10">
        
        <div className="w-full max-w-[400px] mx-auto">
          {/* Logo Area */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xl shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              H
            </div>
            <span className="text-xl font-bold tracking-wide">RESERVA360</span>
          </div>

          <h1 className="text-[2.5rem] font-extrabold leading-tight tracking-tight mb-8">
            Sign in to your account
          </h1>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 bg-[#eef1f6] text-gray-900 rounded-lg border-0 focus:ring-2 focus:ring-blue-600 outline-none transition-shadow font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-[#eef1f6] text-gray-900 rounded-lg border-0 focus:ring-2 focus:ring-blue-600 outline-none transition-shadow tracking-widest font-bold"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full mt-8 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold py-3.5 rounded-lg transition-colors duration-200"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>

      {/* Right Image Section */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[65%] relative bg-gray-900">
        <img
          src="https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=2000"
          alt="Luxury Hotel Room"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1115] via-[#0f1115]/40 to-transparent"></div>
        
        <div className="absolute bottom-16 left-16 max-w-2xl">
          <h2 className="text-white text-5xl font-extrabold tracking-tight mb-4">
            Enterprise Operations, Simplified.
          </h2>
          <p className="text-gray-300 text-xl font-medium">
            360° Control. 360° Growth.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MasterLogin;
