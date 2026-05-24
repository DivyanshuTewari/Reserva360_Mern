import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, BedDouble, CalendarDays, Receipt, Network, RefreshCw, LogOut, Settings, Menu, X } from 'lucide-react';
import AdminOverview from '../components/admin/AdminOverview';
import PropertySettings from '../components/admin/PropertySettings';
import StaffManagement from '../components/admin/StaffManagement';
import RoomsInventory from '../components/admin/RoomsInventory';
import BookingEngine from '../components/admin/BookingEngine';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-collapse sidebar on smaller screens on mount/resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize(); // Call on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

      {/* Dim overlay backdrop for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Floating Menu Button (Mobile & Desktop when sidebar is closed) */}
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-6 left-6 z-40 p-3 bg-[#13151a]/95 hover:bg-slate-800 backdrop-blur-md border border-white/10 rounded-xl text-white transition-all shadow-xl hover:shadow-blue-500/10 active:scale-95 flex items-center justify-center"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Sidebar - Glassmorphism */}
      <div className={`fixed top-0 left-0 bottom-0 w-72 bg-black/45 backdrop-blur-3xl border-r border-white/10 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5)] z-30 transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2563eb] flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-blue-500/20">
              H
            </div>
            <div>
              <h1 className="text-xl font-black tracking-widest text-white">RESERVA360</h1>
              <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Admin Portal</span>
            </div>
          </div>
          {/* Close Sidebar button */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 scrollbar-hide">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                // Auto close sidebar on mobile/tablet after selection
                if (window.innerWidth < 1024) {
                  setIsSidebarOpen(false);
                }
              }}
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
      <div className={`flex-1 min-h-screen transition-all duration-300 ease-in-out relative custom-scrollbar overflow-y-auto overflow-x-hidden ${
        isSidebarOpen ? 'lg:ml-72' : 'lg:ml-0'
      }`}>
        <div className="relative h-full p-4 md:p-6 lg:p-8">
          {/* Top spacer when sidebar is closed on desktop/mobile to prevent overlap with the menu toggle button */}
          {!isSidebarOpen && <div className="h-10 w-full" />}
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
