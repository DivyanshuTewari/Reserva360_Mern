import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarCheck, 
  Heart, 
  Bell, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/staff', icon: LayoutDashboard },
    { name: 'My Bookings', path: '/staff/bookings', icon: CalendarCheck },
    { name: 'Saved Properties', path: '/staff/saved', icon: Heart },
    { name: 'Notifications', path: '/staff/notifications', icon: Bell },
    { name: 'Profile Settings', path: '/staff/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-md text-slate-600"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-72 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-8 flex items-center justify-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Reserva<span className="text-indigo-400">360</span></h1>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/staff'}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 font-medium
                ${isActive 
                  ? 'bg-indigo-600/10 text-indigo-400' 
                  : 'hover:bg-slate-800 hover:text-white'}
              `}
            >
              <item.icon size={20} className="shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center gap-4 px-4 py-3 w-full rounded-2xl hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 font-medium text-slate-400">
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
