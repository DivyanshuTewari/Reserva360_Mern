import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { LogOut, Plus, List, Hotel as HotelIcon, MapPin, CalendarDays, KeyRound, Phone, AtSign, Edit2, X, ShieldQuestion, Key, Search, ArrowUpDown, Users, ChevronDown, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const MasterDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    hotelName: '',
    address: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPhone: '',
    instagram: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    subscriptionMonths: 12,
    securityQuestion: '',
    securityAnswer: ''
  });
  const [editingHotel, setEditingHotel] = useState(null);
  const [resettingHotel, setResettingHotel] = useState(null);
  const [revokingHotel, setRevokingHotel] = useState(null);
  const [revokeConfirmName, setRevokeConfirmName] = useState('');
  const [editFormData, setEditFormData] = useState({
    name: '',
    address: '',
    adminPhone: '',
    instagram: '',
    subscriptionMonths: 12,
    securityQuestion: '',
    securityAnswer: ''
  });
  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: ''
  });
  
  // Client Management States
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdDesc');
  const [isSortOpen, setIsSortOpen] = useState(false);

  const sortOptions = [
    { value: 'createdDesc', label: 'Newest First' },
    { value: 'createdAsc', label: 'Oldest First' },
    { value: 'expireAsc', label: 'Expiring Soonest' },
    { value: 'expireDesc', label: 'Expiring Latest' }
  ];

  useEffect(() => {
    if (!user || user.role !== 'master') {
      navigate('/master-secure-login');
      return;
    }
    fetchHotels();
  }, [user, navigate]);

  const fetchHotels = async () => {
    try {
      const res = await api.get('/master/hotels');
      setHotels(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch hotels', error);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateHotel = async (e) => {
    e.preventDefault();
    try {
      await api.post('/master/create-hotel', formData);
      toast.success('Property & Admin provisioned successfully!');
      setFormData({
        hotelName: '',
        address: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        adminPhone: '',
        instagram: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        subscriptionMonths: 12,
        securityQuestion: '',
        securityAnswer: ''
      });
      fetchHotels();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating property');
    }
  };

  const handleEditClick = (hotel) => {
    setEditingHotel(hotel);
    setEditFormData({
      name: hotel.name,
      address: hotel.address,
      adminPhone: hotel.adminPhone || '',
      instagram: hotel.instagram || '',
      subscriptionMonths: hotel.subscriptionMonths || 12,
      securityQuestion: hotel.adminDetails?.securityQuestion || '',
      securityAnswer: hotel.adminDetails?.securityAnswer || ''
    });
  };

  const handleEditClose = () => {
    setEditingHotel(null);
  };

  const handleResetClick = (hotel) => {
    setResettingHotel(hotel);
    setResetPasswordData({ newPassword: '' });
  };

  const handleResetClose = () => {
    setResettingHotel(null);
  };

  const handleRevokeClick = (hotel) => {
    setRevokingHotel(hotel);
    setRevokeConfirmName('');
  };

  const handleRevokeClose = () => {
    setRevokingHotel(null);
    setRevokeConfirmName('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/master/edit-hotel/${editingHotel._id}`, editFormData);
      toast.success('Property details updated!');
      setEditingHotel(null);
      fetchHotels();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update property');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/master/reset-admin-password/${resettingHotel._id}`, resetPasswordData);
      toast.success('Admin password has been reset!');
      setResettingHotel(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleRevokeSubmit = async (e) => {
    e.preventDefault();
    if (revokeConfirmName.trim().toLowerCase() !== revokingHotel.name.trim().toLowerCase()) {
      toast.error('Property name does not match');
      return;
    }
    try {
      await api.delete(`/master/revoke-hotel/${revokingHotel._id}`);
      toast.success('Property and all associated data completely revoked.');
      setRevokingHotel(null);
      fetchHotels();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to revoke property');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/master-secure-login');
  };

  if (loading) return <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center text-white">Loading...</div>;

  // Filter and Sort Logic for Client Management
  const filteredAndSortedHotels = [...hotels].filter(hotel => {
    const search = (searchTerm || '').toLowerCase();
    const hName = (hotel.name || '').toLowerCase();
    const aName = (hotel.adminDetails?.name || '').toLowerCase();
    const aEmail = (hotel.adminDetails?.email || '').toLowerCase();
    const aPhone = (hotel.adminPhone || '').toLowerCase();
    return hName.includes(search) || aName.includes(search) || aEmail.includes(search) || aPhone.includes(search);
  }).sort((a, b) => {
    if (sortBy.includes('expire')) {
      const dateA = a.subscriptionEndDate ? new Date(a.subscriptionEndDate).getTime() : 0;
      const dateB = b.subscriptionEndDate ? new Date(b.subscriptionEndDate).getTime() : 0;
      return sortBy === 'expireDesc' ? (dateB || 0) - (dateA || 0) : (dateA || 0) - (dateB || 0);
    } else {
      const dateA = new Date(a.createdAt || a.purchaseDate || 0).getTime();
      const dateB = new Date(b.createdAt || b.purchaseDate || 0).getTime();
      return sortBy === 'createdDesc' ? (dateB || 0) - (dateA || 0) : (dateA || 0) - (dateB || 0);
    }
  });

  return (
    <div className="min-h-screen font-sans relative overflow-hidden bg-[#0a0a0b]">
      {/* Background Image with Deep Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&q=80&w=2500"
          alt="Luxury Resort"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0b]/80 via-[#0a0a0b]/95 to-[#0a0a0b]"></div>
      </div>

      {/* Top Navigation */}
      <nav className="relative z-10 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-24">
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-extrabold text-2xl text-white shadow-lg shadow-blue-500/30">
                  H
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black tracking-widest text-white">RESERVA360</span>
                  <span className="text-xs font-semibold tracking-widest text-blue-400 uppercase">Master Console</span>
                </div>
              </div>
              
              <div className="hidden md:flex items-center space-x-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  Overview
                </button>
                <button 
                  onClick={() => setActiveTab('clients')}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center ${activeTab === 'clients' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  <Users size={16} className="mr-2" /> Client Management
                </button>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center text-sm font-semibold text-gray-400 hover:text-white transition-colors px-5 py-2.5 rounded-full hover:bg-white/10 border border-transparent hover:border-white/10">
              <LogOut size={16} className="mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 py-12">
        
        {activeTab === 'overview' && (
          <>
            <div className="mb-14 max-w-2xl">
              <h1 className="text-5xl font-extrabold text-white tracking-tight mb-4">Enterprise Deployment</h1>
              <p className="text-xl text-gray-400 font-light leading-relaxed">Launch and oversee premium hospitality properties globally from your master command center.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
              
              {/* Enhanced Provisioning Form Card */}
          <div className="xl:col-span-8 bg-[#13151a]/80 backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
            
            {/* Left Decorative Image Sidebar within the form */}
            <div className="hidden md:block w-1/3 relative">
              <img 
                src="https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=800" 
                alt="Bedroom" 
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
              <div className="absolute bottom-8 left-6 right-6">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mb-4 border border-white/20">
                  <Plus className="text-white" size={20} />
                </div>
                <h3 className="text-white text-xl font-bold mb-1">New Property</h3>
                <p className="text-gray-300 text-sm font-light">Fill out the details to provision a new isolated database instance.</p>
              </div>
            </div>

            {/* Right Form Area */}
            <div className="w-full md:w-2/3 p-8 lg:p-10">
              <form onSubmit={handleCreateHotel} className="space-y-8">
                
                {/* Property Section */}
                <div>
                  <h4 className="text-xs font-bold tracking-widest text-blue-500 uppercase mb-5 flex items-center">
                    <HotelIcon size={14} className="mr-2" /> Property Details
                  </h4>
                  <div className="grid grid-cols-1 gap-5">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <HotelIcon className="h-5 w-5 text-gray-500" />
                      </div>
                      <input type="text" name="hotelName" value={formData.hotelName} onChange={handleChange} required className="w-full pl-12 pr-4 py-3.5 bg-black/50 text-white rounded-xl border border-white/10 focus:border-blue-500 focus:bg-black/80 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-600 font-medium" placeholder="Property Name (e.g. The Grand Plaza)" />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <MapPin className="h-5 w-5 text-gray-500" />
                      </div>
                      <input type="text" name="address" value={formData.address} onChange={handleChange} required className="w-full pl-12 pr-4 py-3.5 bg-black/50 text-white rounded-xl border border-white/10 focus:border-blue-500 focus:bg-black/80 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-600 font-medium" placeholder="Location / Address" />
                    </div>
                  </div>
                </div>

                {/* Subscription Section */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <CalendarDays className="h-5 w-5 text-gray-500" />
                    </div>
                    <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} required className="w-full pl-12 pr-4 py-3.5 bg-black/50 text-white rounded-xl border border-white/10 focus:border-blue-500 focus:bg-black/80 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-medium text-sm" />
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <CalendarDays className="h-5 w-5 text-gray-500" />
                    </div>
                    <input type="number" name="subscriptionMonths" value={formData.subscriptionMonths} onChange={handleChange} required min="1" className="w-full pl-12 pr-4 py-3.5 bg-black/50 text-white rounded-xl border border-white/10 focus:border-blue-500 focus:bg-black/80 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-600 font-medium" placeholder="Duration (Months)" />
                  </div>
                </div>

                {/* Admin Setup Section */}
                <div className="pt-8 border-t border-white/5">
                  <h4 className="text-xs font-bold tracking-widest text-emerald-500 uppercase mb-5 flex items-center">
                    <KeyRound size={14} className="mr-2" /> Root Administrator
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <input type="text" name="adminName" value={formData.adminName} onChange={handleChange} required className="w-full px-5 py-3.5 bg-black/50 text-white rounded-xl border border-white/10 focus:border-emerald-500 focus:bg-black/80 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-600 font-medium" placeholder="Admin Full Name" />
                    </div>
                    <div>
                      <input type="email" name="adminEmail" value={formData.adminEmail} onChange={handleChange} required className="w-full px-5 py-3.5 bg-black/50 text-white rounded-xl border border-white/10 focus:border-emerald-500 focus:bg-black/80 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-600 font-medium" placeholder="Email Address" />
                    </div>
                    <div>
                      <input type="password" name="adminPassword" value={formData.adminPassword} onChange={handleChange} required className="w-full px-5 py-3.5 bg-black/50 text-white rounded-xl border border-white/10 focus:border-emerald-500 focus:bg-black/80 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-600 font-medium" placeholder="Temporary Password" />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-500" />
                      </div>
                      <input type="tel" name="adminPhone" value={formData.adminPhone} onChange={handleChange} required className="w-full pl-12 pr-4 py-3.5 bg-black/50 text-white rounded-xl border border-white/10 focus:border-emerald-500 focus:bg-black/80 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-600 font-medium" placeholder="Contact Number" />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <AtSign className="h-5 w-5 text-gray-500" />
                      </div>
                      <input type="text" name="instagram" value={formData.instagram} onChange={handleChange} className="w-full pl-12 pr-4 py-3.5 bg-black/50 text-white rounded-xl border border-white/10 focus:border-emerald-500 focus:bg-black/80 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-600 font-medium" placeholder="@handle (Optional)" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <ShieldQuestion className="h-5 w-5 text-gray-500" />
                      </div>
                      <input type="text" name="securityQuestion" value={formData.securityQuestion} onChange={handleChange} required className="w-full pl-12 pr-4 py-3.5 bg-black/50 text-white rounded-xl border border-white/10 focus:border-emerald-500 focus:bg-black/80 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-600 font-medium" placeholder="Security Question (e.g. First pet's name?)" />
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <KeyRound className="h-5 w-5 text-gray-500" />
                      </div>
                      <input type="text" name="securityAnswer" value={formData.securityAnswer} onChange={handleChange} required className="w-full pl-12 pr-4 py-3.5 bg-black/50 text-white rounded-xl border border-white/10 focus:border-emerald-500 focus:bg-black/80 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-600 font-medium" placeholder="Security Answer" />
                    </div>
                  </div>
                </div>

                <button type="submit" className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] active:scale-[0.98]">
                  Deploy Property Instance
                </button>
              </form>
            </div>
          </div>

          {/* Active Properties List */}
          <div className="xl:col-span-4 flex flex-col h-[750px]">
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="text-xl font-bold text-white tracking-wide">Active Clients</h2>
              <span className="bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-full">{hotels.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {hotels.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center bg-[#13151a]/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <List className="text-gray-500" size={28} />
                  </div>
                  <p className="text-gray-300 font-medium text-lg">No deployments yet.</p>
                  <p className="text-gray-500 text-sm mt-2">Provision a property to see it here.</p>
                </div>
              ) : (
                hotels.map((hotel, index) => (
                  <div key={hotel._id} className="group bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1">
                    {/* Tiny thumbnail header for the card */}
                    <div className="h-16 w-full relative overflow-hidden">
                      <img 
                        src="https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&q=80&w=400" 
                        alt="Property Thumbnail" 
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#13151a] to-transparent"></div>
                      
                      <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleRevokeClick(hotel)} title="Revoke Access" className="w-8 h-8 rounded-full bg-red-900/90 hover:bg-red-800 flex items-center justify-center text-white shadow-lg transition-colors border border-white/10">
                          <Trash2 size={14} />
                        </button>
                        <button onClick={() => handleResetClick(hotel)} title="Reset Password" className="w-8 h-8 rounded-full bg-red-600/90 hover:bg-red-500 flex items-center justify-center text-white shadow-lg transition-colors border border-white/10">
                          <Key size={14} />
                        </button>
                        <button onClick={() => handleEditClick(hotel)} title="Edit Details" className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white shadow-lg transition-colors border border-white/10">
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-5 pt-2 relative">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-extrabold text-white text-lg leading-tight group-hover:text-blue-400 transition-colors">{hotel.name}</h3>
                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded uppercase tracking-wider border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                          Online
                        </span>
                      </div>

                      <p className="text-xs text-gray-400 flex items-start gap-1.5 mb-4">
                        <MapPin size={14} className="text-gray-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{hotel.address}</span>
                      </p>

                      <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                            <span className="text-xs font-bold text-blue-400">
                              {hotel.adminDetails?.name ? hotel.adminDetails.name.charAt(0).toUpperCase() : 'A'}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-200 font-bold">{hotel.adminDetails?.name || 'Admin'}</span>
                            <span className="text-[10px] text-gray-500">{hotel.adminDetails?.email || 'No email provided'}</span>
                          </div>
                        </div>
                        {hotel.subscriptionEndDate && (
                          <div className="text-right">
                            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Sub Expires</p>
                            <p className="text-xs text-emerald-400 font-bold">{new Date(hotel.subscriptionEndDate).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        </>
      )}

        {activeTab === 'clients' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Client Management</h1>
                <p className="text-gray-400">Search and filter through all provisioned properties.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-500" />
                  </div>
                  <input 
                    type="text" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    placeholder="Search name, email, phone..." 
                    className="pl-12 pr-4 py-3 bg-[#13151a]/80 backdrop-blur-xl text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-full sm:w-72 transition-all shadow-lg"
                  />
                </div>
                
                <div className="relative">
                  <button 
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    onBlur={() => setTimeout(() => setIsSortOpen(false), 200)}
                    className="pl-12 pr-4 py-3 bg-[#13151a]/80 backdrop-blur-xl text-white rounded-xl border border-white/10 hover:border-blue-500/50 outline-none cursor-pointer shadow-lg font-medium flex items-center justify-between w-full sm:w-56 transition-all"
                  >
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <ArrowUpDown className="h-5 w-5 text-gray-500" />
                    </div>
                    <span className="truncate">{sortOptions.find(opt => opt.value === sortBy)?.label}</span>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isSortOpen && (
                    <div className="absolute z-50 top-full mt-2 w-full bg-[#1a1c23] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200">
                      {sortOptions.map(opt => (
                        <button
                          key={opt.value}
                          onMouseDown={(e) => { e.preventDefault(); setSortBy(opt.value); setIsSortOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sortBy === opt.value ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[#13151a]/80 backdrop-blur-3xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-widest text-gray-400">
                      <th className="px-6 py-5 font-semibold">Property Details</th>
                      <th className="px-6 py-5 font-semibold">Administrator</th>
                      <th className="px-6 py-5 font-semibold">Contact</th>
                      <th className="px-6 py-5 font-semibold">Subscription</th>
                      <th className="px-6 py-5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredAndSortedHotels.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                          No clients match your search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedHotels.map(hotel => (
                        <tr key={hotel._id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-5">
                            <p className="font-bold text-white text-base">{hotel.name}</p>
                            <p className="text-sm text-gray-500 mt-1">{hotel.address}</p>
                          </td>
                          <td className="px-6 py-5">
                            <p className="font-semibold text-gray-200">{hotel.adminDetails?.name || 'Admin'}</p>
                            <p className="text-sm text-gray-500 mt-1">{hotel.adminDetails?.email || 'N/A'}</p>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-sm text-gray-300 font-medium">{hotel.adminPhone || 'N/A'}</p>
                            <p className="text-xs text-gray-500 mt-1">{hotel.instagram || 'No social link'}</p>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
                                ACTIVE
                              </span>
                              <p className="text-xs text-gray-400 mt-1">
                                Ends: <span className="font-semibold text-gray-300">{hotel.subscriptionEndDate ? new Date(hotel.subscriptionEndDate).toLocaleDateString() : 'N/A'}</span>
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleRevokeClick(hotel)} title="Revoke Access" className="w-9 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-500 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/30">
                                <Trash2 size={16} />
                              </button>
                              <button onClick={() => handleResetClick(hotel)} title="Reset Password" className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/30">
                                <Key size={16} />
                              </button>
                              <button onClick={() => handleEditClick(hotel)} title="Edit Details" className="w-9 h-9 rounded-xl bg-white/5 hover:bg-blue-500/20 flex items-center justify-center text-gray-400 hover:text-blue-400 transition-colors border border-transparent hover:border-blue-500/30">
                                <Edit2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Edit Modal */}
      {editingHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleEditClose}></div>
          <div className="relative bg-[#13151a] border border-white/10 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={handleEditClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Edit Property Details</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Property Name</label>
                <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="w-full px-4 py-3 bg-black/50 text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Address</label>
                <input type="text" value={editFormData.address} onChange={(e) => setEditFormData({...editFormData, address: e.target.value})} className="w-full px-4 py-3 bg-black/50 text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Admin Contact</label>
                <input type="text" value={editFormData.adminPhone} onChange={(e) => setEditFormData({...editFormData, adminPhone: e.target.value})} className="w-full px-4 py-3 bg-black/50 text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Instagram Handle</label>
                <input type="text" value={editFormData.instagram} onChange={(e) => setEditFormData({...editFormData, instagram: e.target.value})} className="w-full px-4 py-3 bg-black/50 text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Subscription (Months)</label>
                <input type="number" min="1" value={editFormData.subscriptionMonths} onChange={(e) => setEditFormData({...editFormData, subscriptionMonths: e.target.value})} className="w-full px-4 py-3 bg-black/50 text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none" required />
              </div>
              <div className="pt-4 border-t border-white/10">
                <label className="block text-sm font-medium text-gray-400 mb-1">Security Question</label>
                <input type="text" value={editFormData.securityQuestion} onChange={(e) => setEditFormData({...editFormData, securityQuestion: e.target.value})} className="w-full px-4 py-3 bg-black/50 text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none" placeholder="e.g. First pet's name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Security Answer</label>
                <input type="text" value={editFormData.securityAnswer} onChange={(e) => setEditFormData({...editFormData, securityAnswer: e.target.value})} className="w-full px-4 py-3 bg-black/50 text-white rounded-xl border border-white/10 focus:border-blue-500 outline-none" />
              </div>
              <button type="submit" className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleResetClose}></div>
          <div className="relative bg-[#13151a] border border-white/10 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={handleResetClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold text-white mb-2">Reset Admin Password</h2>
            <p className="text-gray-400 text-sm mb-6">Verify the security question before resetting.</p>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Security Question</p>
              <p className="text-white font-medium mb-4">{resettingHotel.adminDetails?.securityQuestion || 'No question provided during creation'}</p>
              
              <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Stored Answer</p>
              <p className="text-emerald-400 font-mono bg-black/50 px-3 py-1.5 rounded inline-block">{resettingHotel.adminDetails?.securityAnswer || 'N/A'}</p>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">New Password</label>
                <input type="text" value={resetPasswordData.newPassword} onChange={(e) => setResetPasswordData({...resetPasswordData, newPassword: e.target.value})} className="w-full px-4 py-3 bg-black/50 text-white rounded-xl border border-white/10 focus:border-red-500 outline-none" placeholder="Enter new strong password" required />
              </div>
              <button type="submit" className="w-full mt-4 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center">
                <Key size={18} className="mr-2" /> Force Reset Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {revokingHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleRevokeClose}></div>
          <div className="relative bg-[#1a0f0f] border border-red-500/20 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(220,38,38,0.15)] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={handleRevokeClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <div className="flex items-center text-red-500 mb-4">
              <AlertTriangle size={32} className="mr-3" />
              <h2 className="text-2xl font-bold text-white">Revoke Access</h2>
            </div>
            
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <p className="text-red-400 text-sm font-semibold mb-2">WARNING: DESTRUCTIVE ACTION</p>
              <p className="text-gray-300 text-sm">You are about to permanently delete <strong className="text-white">{revokingHotel.name}</strong>. This will instantly erase the property, the administrator account, and <strong className="text-white">all user accounts</strong> associated with this property. This action cannot be undone.</p>
            </div>

            <form onSubmit={handleRevokeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">To confirm, type <strong className="text-white select-all">{revokingHotel.name}</strong> below:</label>
                <input type="text" value={revokeConfirmName} onChange={(e) => setRevokeConfirmName(e.target.value)} className="w-full px-4 py-3 bg-black/50 text-white rounded-xl border border-white/10 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all" placeholder="Enter property name to confirm" required />
              </div>
              <button 
                type="submit" 
                disabled={revokeConfirmName.trim().toLowerCase() !== revokingHotel.name.trim().toLowerCase()} 
                className={`w-full mt-4 font-bold py-3 rounded-xl transition-all flex items-center justify-center ${revokeConfirmName.trim().toLowerCase() === revokingHotel.name.trim().toLowerCase() ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-red-900/50 text-red-300/50 cursor-not-allowed'}`}
              >
                <Trash2 size={18} className="mr-2" /> Permanently Revoke Access
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default MasterDashboard;
