import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Save, Building2, MapPin, Phone, FileText, Clock, DollarSign, Image as ImageIcon, Settings, Tags, LayoutGrid } from 'lucide-react';
import RoomCategories from './RoomCategories';
import RoomMatrix from './RoomMatrix';

const PropertySettings = () => {
  const [activeTab, setActiveTab] = useState('general');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    adminPhone: '',
    gstDetails: '',
    timeZone: 'Asia/Kolkata',
    currency: 'INR',
    logoUrl: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchHotelData();
  }, []);

  const fetchHotelData = async () => {
    try {
      const res = await api.get('/admin/hotel');
      if (res.data) {
        setFormData({
          name: res.data.name || '',
          address: res.data.address || '',
          adminPhone: res.data.adminPhone || '',
          gstDetails: res.data.gstDetails || '',
          timeZone: res.data.timeZone || 'Asia/Kolkata',
          currency: res.data.currency || 'INR',
          logoUrl: res.data.logoUrl || ''
        });
      }
    } catch (error) {
      toast.error('Failed to fetch property details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/admin/hotel', formData);
      toast.success('Property settings updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="text-white">Loading property data...</div>;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 max-w-6xl space-y-8">
      {/* Luxurious Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/bg-spa.png')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>
        
        <div className="relative z-10 p-10 md:p-14">
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 drop-shadow-lg">
            Property Configuration
          </h2>
          <p className="text-lg text-slate-300 max-w-xl leading-relaxed drop-shadow-md">
            Manage your hotel's core identity, room categories, and physical matrix.
          </p>
        </div>
      </div>

      {/* Sleek Tab Navigation */}
      <div className="flex bg-[#13151a]/80 backdrop-blur-xl p-1.5 rounded-2xl border border-white/5 shadow-lg overflow-x-auto whitespace-nowrap custom-scrollbar">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'general' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings size={18} className="mr-2" /> General Setup
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'categories' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Tags size={18} className="mr-2" /> Categories
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'matrix' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutGrid size={18} className="mr-2" /> Physical Matrix
        </button>
      </div>

      {activeTab === 'general' && (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
          {/* Core Identity */}
          <div className="bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <Building2 className="text-blue-500 mr-3" /> Core Identity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Property Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Brand Logo URL</label>
                <div className="flex">
                  <div className="flex-1">
                    <input
                      type="url"
                      name="logoUrl"
                      value={formData.logoUrl}
                      onChange={handleChange}
                      placeholder="https://..."
                      className="w-full px-4 py-3 bg-[#0f1115] text-white rounded-l-xl border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="w-12 bg-white/5 border border-l-0 border-white/10 rounded-r-xl flex items-center justify-center">
                    <ImageIcon size={20} className="text-slate-400" />
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Physical Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-slate-400" size={20} />
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows="3"
                    className="w-full pl-10 pr-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          {/* Business & Locale */}
          <div className="bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <FileText className="text-emerald-500 mr-3" /> Business & Locale
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Primary Admin Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input
                    type="text"
                    name="adminPhone"
                    value={formData.adminPhone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">GST Identification Number</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input
                    type="text"
                    name="gstDetails"
                    value={formData.gstDetails}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Time Zone</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <select
                    name="timeZone"
                    value={formData.timeZone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Default Currency</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none"
                  >
                    <option value="INR">Indian Rupee (₹)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="EUR">Euro (€)</option>
                    <option value="GBP">British Pound (£)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Save size={20} className="mr-2" />
              {isSaving ? 'Saving Changes...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'categories' && <RoomCategories />}
      {activeTab === 'matrix' && <RoomMatrix />}
    </div>
  );
};

export default PropertySettings;
