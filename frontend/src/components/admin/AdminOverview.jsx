import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { BedDouble, CalendarDays, Receipt, Users, MapPin } from 'lucide-react';
import api from '../../utils/api';

const AdminOverview = () => {
  const { user } = useContext(AuthContext);
  const [hotelProfile, setHotelProfile] = useState(null);

  useEffect(() => {
    const fetchHotel = async () => {
      try {
        const res = await api.get('/admin/hotel');
        setHotelProfile(res.data);
      } catch (error) {
        console.error('Failed to fetch hotel profile', error);
      }
    };
    fetchHotel();
  }, []);

  const stats = [
    { label: 'Available Rooms', value: '--', icon: BedDouble, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: "Today's Check-ins", value: '--', icon: CalendarDays, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: "Today's Revenue", value: '₹--', icon: Receipt, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { label: 'Active Staff', value: '--', icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }
  ];

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-8">
      {/* Luxurious Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/bg-room.png')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>
        
        <div className="relative z-10 p-10 md:p-14">
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2 drop-shadow-lg">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">{user?.name}</span>
          </h2>
          {hotelProfile && (
            <div className="flex items-center gap-2 text-blue-200 mb-6 drop-shadow-md font-medium tracking-wide">
              <span className="text-white text-sm font-bold">{hotelProfile.name}</span>
              {hotelProfile.address && (
                <>
                  <span className="text-blue-400/50">•</span>
                  <MapPin size={16} className="text-emerald-400" />
                  <span className="text-slate-300 text-sm">{hotelProfile.address}</span>
                </>
              )}
            </div>
          )}
          <p className="text-lg text-slate-300 max-w-xl leading-relaxed drop-shadow-md">
            Here is an overview of your property's performance today. The environment is active and guests are arriving.
          </p>
        </div>
      </div>

      {/* Glassmorphism Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex items-center justify-between hover:bg-white/5 transition-all duration-300 group hover:-translate-y-1">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 group-hover:text-slate-300 transition-colors">{stat.label}</p>
              <h3 className="text-3xl font-black text-white drop-shadow-md">{stat.value}</h3>
            </div>
            <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center border ${stat.border} shadow-lg`}>
              <stat.icon className={stat.color} size={28} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity placeholder */}
        <div className="lg:col-span-2 bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-bold text-white mb-6">Recent Activity</h3>
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <CalendarDays size={48} className="mb-4 opacity-50" />
            <p>No activity recorded yet.</p>
          </div>
        </div>

        {/* Quick Actions placeholder */}
        <div className="bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-bold text-white mb-6">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-300 font-medium">
              Create New Booking
            </button>
            <button className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-300 font-medium">
              Add Room Type
            </button>
            <button className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-300 font-medium">
              Invite Staff Member
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
