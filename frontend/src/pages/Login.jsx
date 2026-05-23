import React, { useState, useContext } from 'react';
import { 
  Building2, Mail, Lock, LogIn, Eye, EyeOff, User, Phone, 
  ArrowRight, Shield, Users, Crown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('user'); // 'admin', 'master', 'user'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ email: '', password: '', confirmPassword: '', fullName: '', phone: '' });
  };
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Form States
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      try {
        // 1. Check for simulated local accounts first
        const dummyUsers = JSON.parse(localStorage.getItem('dummyUsers') || '[]');
        const foundDummy = dummyUsers.find(u => u.email === formData.email && u.password === formData.password);
        
        if (foundDummy) {
          login(foundDummy);
          toast.success(`Welcome back, ${foundDummy.name || 'User'}! (Local Account)`);
          
          if (foundDummy.role === 'admin') navigate('/admin');
          else if (foundDummy.role === 'master') navigate('/master');
          else navigate('/staff');
          
          setLoading(false);
          return;
        }

        // 2. If not local, try real API backend
        const res = await api.post('/auth/login', { email: formData.email, password: formData.password });
        login(res.data);
        
        toast.success(`Welcome back, ${res.data.name || 'User'}!`);
        
        // Route based on role
        if (res.data.role === 'admin') navigate('/admin');
        else if (res.data.role === 'master') navigate('/master');
        else navigate('/staff');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Login failed. Please check your credentials.');
      }
    } else {
      // Dummy Signup Logic
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match!');
        setLoading(false);
        return;
      }
      
      setTimeout(() => {
        toast.success('Account created and logged in! (Simulation)');
        
        // Simulate immediate login after dummy signup
        const dummyUser = {
          name: formData.fullName || 'New User',
          email: formData.email,
          password: formData.password, // Saved strictly for local dummy login
          role: role
        };
        
        // Persist dummy user so we can log back into it later
        const existingDummies = JSON.parse(localStorage.getItem('dummyUsers') || '[]');
        localStorage.setItem('dummyUsers', JSON.stringify([...existingDummies, dummyUser]));
        
        login(dummyUser);
        
        // Route to the correct dashboard based on role
        if (role === 'admin') navigate('/admin');
        else if (role === 'master') navigate('/master');
        else navigate('/staff');
        
        setLoading(false);
      }, 1500);
      return; 
    }
    
    setLoading(false);
  };

  // Helper for Role Cards (AsiaTech Science Blue Theme)
  const RoleCard = ({ type, icon: Icon, title, desc }) => (
    <button
      type="button"
      onClick={() => setRole(type)}
      className={`relative flex flex-col p-4 rounded-2xl border transition-all duration-300 text-left w-full
        ${role === type 
          ? 'bg-blue-600/10 border-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.15)] scale-100' 
          : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 hover:scale-[0.98]'
        }
      `}
    >
      <div className={`p-2 rounded-xl inline-flex w-fit mb-3 ${role === type ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
        <Icon size={20} />
      </div>
      <h3 className={`font-bold text-sm ${role === type ? 'text-blue-900' : 'text-slate-700'}`}>{title}</h3>
      <p className={`text-xs mt-1 ${role === type ? 'text-blue-700 font-medium' : 'text-slate-500'}`}>{desc}</p>
      
      {/* Active Indicator Ring */}
      {role === type && (
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
      )}
    </button>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans selection:bg-blue-500/30">
      
      {/* LEFT SECTION - Hero / Branding (AsiaTech Theme) */}
      <div className="hidden lg:flex w-[45%] bg-[#0B1120] text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Animated Background Gradients & Blobs */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-[#0B1120] to-slate-900 z-0" />
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse" />
        <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] bg-cyan-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}/>
        
        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-xl shadow-black/20">
            <Building2 size={24} className="text-blue-400" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight">Reserva<span className="text-blue-400">360</span></span>
        </div>

        {/* Center Content */}
        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-bold mb-6 leading-[1.1] tracking-tight">
            The standard in <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              property management.
            </span>
          </h1>
          <p className="text-lg text-slate-400 font-light leading-relaxed mb-8">
            An intelligent, cloud-based platform designed to elevate your hotel operations, automate accounting, and deliver premium guest experiences.
          </p>
          
          <div className="flex items-center gap-4 text-sm font-medium text-slate-300">
           
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="relative z-10 text-slate-500 text-sm flex justify-between items-center">
          <p>© 2026 Reserva360 Inc.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION - Auth Form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
        
        <div className="w-full max-w-[480px] animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 sm:pb-0">
          
          <div className="mb-8 text-center sm:text-left pt-12 sm:pt-0">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="text-slate-500 text-base">
              {isLogin ? 'Please enter your details to sign in.' : 'Select your role and enter your details to create an account.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Role Selection */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700">Account Type</label>
              <div className="grid grid-cols-3 gap-3">
                <RoleCard type="user" icon={Users} title="Staff" desc="Manage bookings" />
                <RoleCard type="admin" icon={Shield} title="Admin" desc="Property owner" />
                <RoleCard type="master" icon={Crown} title="Master" desc="Super admin" />
              </div>
            </div>

            {/* Inputs Section */}
            <div className="space-y-4">
              
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required={!isLogin} className="w-full pl-11 pr-4 py-3.5 bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800" placeholder="Full Name" />
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required={!isLogin} className="w-full pl-11 pr-4 py-3.5 bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800" placeholder="Phone Number" />
                  </div>
                </div>
              )}

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full pl-11 pr-4 py-3.5 bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800" placeholder="name@company.com" />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} required className="w-full pl-11 pr-12 py-3.5 bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {!isLogin && (
                <div className="relative group animate-in fade-in zoom-in-95 duration-300">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required={!isLogin} className="w-full pl-11 pr-12 py-3.5 bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800" placeholder="Confirm Password" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-600 transition-colors">
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              )}
            </div>

            {/* Remember & Forgot Password (Only on Login) */}
            {isLogin && (
              <div className="flex items-center justify-between animate-in fade-in duration-300">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-5 h-5 border-2 border-slate-300 rounded-md group-hover:border-blue-500 transition-colors">
                    <input type="checkbox" className="peer opacity-0 absolute w-full h-full cursor-pointer" />
                    <div className="hidden peer-checked:block bg-blue-600 w-full h-full rounded-[4px] absolute inset-0"></div>
                  </div>
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Remember me</span>
                </label>
                <button type="button" className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign in to Dashboard' : 'Create Account'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            {/* Toggle Login/Signup */}
            <div className="mt-8 pt-6 border-t border-slate-200 text-center">
              <span className="text-slate-500 text-sm font-medium">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
              </span>
              <button 
                type="button"
                onClick={toggleMode}
                className="ml-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
              >
                {isLogin ? 'Create Account' : 'Sign In'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
