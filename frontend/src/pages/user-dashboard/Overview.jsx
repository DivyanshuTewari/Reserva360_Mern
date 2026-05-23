import React, { useState, useEffect } from 'react';
import { 
  Briefcase, CalendarDays, DollarSign, LogOut, CheckCircle, 
  ShoppingBag, Coffee, ArrowRightLeft, TrendingUp, CalendarCheck, 
  Clock, CheckCircle2, Circle, CheckSquare, Heart
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import { StatSkeleton } from '../../components/ui/SkeletonLoader';
import { stats, todayTasks, todayBookingsTable } from '../../data/dummyData';

const Overview = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* 1. Daily Core Metrics */}
      <section>
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <CalendarDays size={20} className="text-blue-600"/> Today's Core Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {loading ? Array(4).fill(0).map((_, i) => <StatSkeleton key={i} />) : (
            <>
              <StatCard title="Today's Bookings" value={stats.todayBookings} subtitle={stats.todayBookingsGrowth} icon={Briefcase} colorClass="bg-blue-100 text-blue-600" />
              <StatCard title="Today's Earnings" value={`$${stats.todayEarnings}`} subtitle={stats.todayEarningsGrowth} icon={DollarSign} colorClass="bg-emerald-100 text-emerald-600" />
              <StatCard title="Today's Check-ins" value={stats.todayCheckIns} icon={LogOut} colorClass="bg-cyan-100 text-cyan-600" />
              <StatCard title="Today's Check-outs" value={stats.todayCheckOuts} icon={CheckCircle} colorClass="bg-rose-100 text-rose-600" />
            </>
          )}
        </div>
      </section>

      {/* 2. Month Core Metrics */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {loading ? Array(2).fill(0).map((_, i) => <StatSkeleton key={i} />) : (
            <>
              <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex items-center justify-between group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                 <div className="relative z-10">
                   <p className="text-blue-200 font-medium mb-1">Current Month Bookings</p>
                   <h3 className="text-4xl font-extrabold">{stats.monthBookings}</h3>
                 </div>
                 <div className="relative z-10 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                   <TrendingUp size={32} className="text-cyan-300" />
                 </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex items-center justify-between group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                 <div className="relative z-10">
                   <p className="text-emerald-200 font-medium mb-1">Current Month Earnings</p>
                   <h3 className="text-4xl font-extrabold">${stats.monthEarnings.toLocaleString()}</h3>
                 </div>
                 <div className="relative z-10 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                   <DollarSign size={32} className="text-emerald-300" />
                 </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 3. Daily POS Metrics */}
      <section>
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2 mt-8">
          <ShoppingBag size={20} className="text-indigo-600"/> Today's POS & Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {loading ? Array(4).fill(0).map((_, i) => <StatSkeleton key={i} />) : (
            <>
              <StatCard title="POS Orders" value={stats.todayPOSOrders} icon={Coffee} colorClass="bg-indigo-100 text-indigo-600" />
              <StatCard title="POS Earnings" value={`$${stats.todayPOSEarnings}`} icon={DollarSign} colorClass="bg-teal-100 text-teal-600" />
              <StatCard title="Room Transfers" value={stats.todayPOSRoomTransfers} icon={ArrowRightLeft} colorClass="bg-violet-100 text-violet-600" />
              <StatCard title="Complimentary" value={stats.todayComplimentaryPOS} icon={Heart} colorClass="bg-pink-100 text-pink-600" />
            </>
          )}
        </div>
      </section>

      {/* 4. Month POS Metrics */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {loading ? Array(2).fill(0).map((_, i) => <StatSkeleton key={i} />) : (
            <>
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center justify-between group hover:border-indigo-300 hover:shadow-md transition-all">
                 <div>
                   <p className="text-slate-500 font-medium mb-1">Current Month POS Orders</p>
                   <h3 className="text-3xl font-extrabold text-slate-800">{stats.monthPOSOrders.toLocaleString()}</h3>
                 </div>
                 <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
                   <ShoppingBag size={28} />
                 </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center justify-between group hover:border-teal-300 hover:shadow-md transition-all">
                 <div>
                   <p className="text-slate-500 font-medium mb-1">Current Month POS Earnings</p>
                   <h3 className="text-3xl font-extrabold text-slate-800">${stats.monthPOSEarnings.toLocaleString()}</h3>
                 </div>
                 <div className="bg-teal-50 p-4 rounded-2xl text-teal-600 group-hover:scale-110 transition-transform">
                   <DollarSign size={28} />
                 </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 5. Bottom Section: Tasks and Table */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 pt-8">
        
        {/* Bookings Table (Left 3/4) */}
        <section className="xl:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><CalendarCheck size={20} className="text-blue-600"/> Today's Bookings</h2>
            <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">View All</button>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="p-4 pl-6">ID</th>
                    <th className="p-4">Source</th>
                    <th className="p-4">Guest Name</th>
                    <th className="p-4">Dates</th>
                    <th className="p-4">Room</th>
                    <th className="p-4 pr-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-medium">Loading bookings...</td></tr>
                  ) : (
                    todayBookingsTable.map((booking) => (
                      <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-4 pl-6 font-medium text-slate-700">{booking.id}</td>
                        <td className="p-4 text-slate-500">{booking.source}</td>
                        <td className="p-4 font-bold text-slate-800">{booking.guest}</td>
                        <td className="p-4 text-sm text-slate-500">
                          {new Date(booking.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(booking.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="p-4 text-slate-600 font-medium">{booking.room}</td>
                        <td className="p-4 pr-6">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border
                            ${booking.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                            ${booking.status === 'Checked In' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                            ${booking.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                          `}>
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Tasks Block (Right 1/3) */}
        <section className="xl:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><CheckSquare size={20} className="text-indigo-600"/> Today's Tasks</h2>
            <span className="text-sm font-semibold text-slate-500">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
              <div className="text-center px-4">
                <p className="text-3xl font-extrabold text-slate-800">{todayTasks.filter(t => t.status === 'pending' || t.status === 'in-progress').length}</p>
                <p className="text-sm font-bold text-amber-600 mt-1">Pending</p>
              </div>
              <div className="w-px h-12 bg-slate-200"></div>
              <div className="text-center px-4">
                <p className="text-3xl font-extrabold text-slate-800">{todayTasks.filter(t => t.status === 'completed').length}</p>
                <p className="text-sm font-bold text-emerald-600 mt-1">Completed</p>
              </div>
            </div>

            <div className="space-y-4">
              {loading ? (
                 <div className="p-8 text-center text-slate-400 font-medium">Loading tasks...</div>
              ) : (
                todayTasks.map(task => (
                  <div key={task.id} className="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group cursor-pointer">
                    <div className="mt-1">
                      {task.status === 'completed' ? (
                        <CheckCircle2 size={20} className="text-emerald-500" />
                      ) : task.status === 'in-progress' ? (
                        <Clock size={20} className="text-amber-500" />
                      ) : (
                        <Circle size={20} className="text-slate-300 group-hover:text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-bold transition-colors ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800 group-hover:text-blue-600'}`}>{task.title}</p>
                      <p className="text-xs text-slate-500 mt-1 font-medium">{task.time} • {task.id}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <button className="w-full mt-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-bold rounded-xl transition-colors border border-slate-200">
              + Add New Task
            </button>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Overview;
