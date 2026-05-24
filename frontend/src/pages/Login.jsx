import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { X, Phone, Mail, Users, Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showContact, setShowContact] = useState(false);
  const [contactMode, setContactMode] = useState('register');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data);
      if (res.data.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/staff');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-[#0f1115]">
      {/* Left section - Form */}
      <div className="w-full md:w-[40%] flex flex-col justify-center px-8 sm:px-16 lg:px-24 relative z-10">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-lg bg-[#3b82f6] flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-blue-500/20">
              H
            </div>
            <span className="text-xl font-black tracking-widest text-white">RESERVA360</span>
          </div>

          <h1 className="text-[2rem] font-extrabold text-white tracking-tight mb-2 leading-tight">Sign in to your account</h1>
          <p className="text-sm text-gray-400 mb-10">
            Or <a href="#" onClick={(e) => { e.preventDefault(); setContactMode('register'); setShowContact(true); }} className="text-[#3b82f6] hover:text-blue-400 font-medium transition-colors">register your hotel</a>
          </p>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-3 rounded-xl text-sm font-medium">
                <p>{error}</p>
                {error.includes('subscription has expired') && (
                  <button 
                    type="button" 
                    onClick={() => { setContactMode('expired'); setShowContact(true); }} 
                    className="mt-2 text-red-400 hover:text-red-300 font-bold underline"
                  >
                    View Contact Details
                  </button>
                )}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">Email address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3.5 bg-[#f0f4f8] text-gray-900 rounded-xl border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-white">Password</label>
              </div>
              <input
                type="password"
                required
                className="w-full px-4 py-3.5 bg-[#f0f4f8] text-gray-900 rounded-xl border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-lg tracking-widest"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#2563eb] hover:bg-blue-600 text-white rounded-xl font-bold transition-all active:scale-[0.98] mt-2 shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Authenticating...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right section - Image */}
      <div className="hidden md:block md:w-[60%] relative">
        <img
          src="https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=2000&q=80"
          alt="Luxury Hotel Room"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Deep gradient overlay to ensure text is readable and blends smoothly */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1115] via-[#0f1115]/40 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1115] via-transparent to-transparent opacity-80"></div>
        
        {/* Text at bottom */}
        <div className="absolute bottom-16 left-16 right-16 z-10">
          <h2 className="text-[2.75rem] font-black text-white mb-3 tracking-tight drop-shadow-lg">Enterprise Operations, Simplified.</h2>
          <p className="text-xl text-gray-200 font-semibold drop-shadow-md">360° Control. 360° Growth</p>
        </div>
      </div>

      {/* Contact Modal */}
      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowContact(false)}></div>
          <div className="relative bg-[#0f1115] border border-white/10 rounded-2xl p-8 max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowContact(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-[#3b82f6]/20 rounded-full flex items-center justify-center mb-4 border border-[#3b82f6]/30">
                <Users className="text-[#3b82f6]" size={32} />
              </div>
              <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
                {contactMode === 'register' ? 'Partner With Us' : 'Subscription Suspended'}
              </h2>
              <p className="text-gray-400 text-sm max-w-lg mx-auto">
                {contactMode === 'register' 
                  ? 'Reserva360 is an exclusive enterprise platform. To ensure the highest quality of service, we manually onboard every property. Contact our deployment team to schedule a face-to-face consultation and get your dedicated instance provisioned.'
                  : 'Your property\'s enterprise instance has been temporarily suspended due to subscription expiry. Please contact our master administration team immediately to renew your subscription and restore access without data loss.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                <h3 className="text-white font-semibold mb-4 flex items-center">
                  <Phone className="w-5 h-5 mr-2 text-[#3b82f6]" /> Direct Lines
                </h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li><a href="tel:+917505738477" className="hover:text-[#3b82f6] transition-colors">+91 75057 38477</a></li>
                  <li><a href="tel:+917302174046" className="hover:text-[#3b82f6] transition-colors">+91 73021 74046</a></li>
                  <li><a href="tel:+918954780441" className="hover:text-[#3b82f6] transition-colors">+91 89547 80441</a></li>
                  <li><a href="tel:+917505527715" className="hover:text-[#3b82f6] transition-colors">+91 75055 27715</a></li>
                  <li><a href="tel:+919528299930" className="hover:text-[#3b82f6] transition-colors">+91 95282 99930</a></li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                <h3 className="text-white font-semibold mb-4 flex items-center">
                  <Mail className="w-5 h-5 mr-2 text-[#3b82f6]" /> Email Desks
                </h3>
                <ul className="space-y-3 text-sm text-gray-300 break-all">
                  <li><a href="mailto:divyanshutiwari500@gmail.com" className="hover:text-[#3b82f6] transition-colors">divyanshutiwari500@gmail.com</a></li>
                  <li><a href="mailto:charanjeetrawat9442@gmail.com" className="hover:text-[#3b82f6] transition-colors">charanjeetrawat9442@gmail.com</a></li>
                  <li><a href="mailto:anujbhatt84@gmail.com" className="hover:text-[#3b82f6] transition-colors">anujbhatt84@gmail.com</a></li>
                </ul>
              </div>
            </div>
            
            <button onClick={() => setShowContact(false)} className="w-full mt-8 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all">
              Close Window
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Login;
