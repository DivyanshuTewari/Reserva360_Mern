import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, BedDouble, CalendarDays, Receipt, Network, RefreshCw, LogOut, Settings } from 'lucide-react';
import AdminOverview from '../components/admin/AdminOverview';
import PropertySettings from '../components/admin/PropertySettings';
import StaffManagement from '../components/admin/StaffManagement';
import RoomsInventory from '../components/admin/RoomsInventory';
import BookingEngine from '../components/admin/BookingEngine';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'property', label: 'Property Settings', icon: Building2 },
    { id: 'staff', label: 'Staff Accounts', icon: Users },
    { id: 'rooms', label: 'Rooms & Inventory', icon: BedDouble },
    { id: 'pricing', label: 'Rate Plans', icon: Receipt },
    { id: 'booking', label: 'Booking Engine', icon: CalendarDays },
    { id: 'channels', label: 'Channel Manager', icon: Network },
    { id: 'pos', label: 'POS & Billing', icon: Receipt },
    { id: 'migration', label: 'Data Migration', icon: RefreshCw },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <AdminOverview />;
      case 'property': return <PropertySettings />;
      case 'staff': return <StaffManagement />;
      case 'rooms': return <RoomsInventory />;
      case 'booking': return <BookingEngine />;
      // other phases will be added here
      default: return (
        <div className="flex items-center justify-center h-full text-slate-500">
          <div className="text-center">
            <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
            <p>This module is scheduled for a future update.</p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen text-slate-200 flex overflow-hidden relative">
      {/* Premium Dark Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: "url('/assets/bg-hotel.png')" }}
      >
        <div className="absolute inset-0 bg-[#0f1115]/85 backdrop-blur-2xl"></div>
      </div>

      {/* Sidebar - Glassmorphism */}
      <div className="w-72 bg-black/40 backdrop-blur-3xl border-r border-white/10 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5)] relative z-20">
        {/* Header */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2563eb] flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-blue-500/20">
              H
            </div>
            <div>
              <h1 className="text-xl font-black tracking-widest text-white">RESERVA360</h1>
              <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Admin Portal</span>
            </div>
          </div>
        </div>
        
        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 scrollbar-hide">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all font-medium text-sm ${
                activeTab === item.id 
                  ? 'bg-blue-600/10 text-[#3b82f6] shadow-sm border border-blue-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <item.icon size={20} className={`mr-3 ${activeTab === item.id ? 'text-[#3b82f6]' : 'text-slate-500'}`} />
              {item.label}
            </button>
          ))}
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="bg-black/40 rounded-xl p-4 border border-white/10 backdrop-blur-md shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-full bg-blue-500/30 border border-blue-500/50 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  <span className="font-bold text-blue-300">{user?.name?.charAt(0).toUpperCase()}</span>
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                  <p className="text-xs text-blue-200/70 truncate">{user?.email}</p>
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center py-2.5 text-rose-400 hover:text-white hover:bg-rose-500 hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] rounded-lg transition-all duration-300 text-sm font-semibold">
              <LogOut size={16} className="mr-2" /> Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
        <div className="relative h-full p-8 md:p-12">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
