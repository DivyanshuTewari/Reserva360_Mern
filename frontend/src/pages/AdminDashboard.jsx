import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Settings, Users, BedDouble, Key, LogOut } from 'lucide-react';

const AdminDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col shadow-sm">
        <div className="flex items-center mb-10">
          <Settings className="text-primary-600 mr-2" size={28} />
          <span className="text-xl font-bold tracking-tight text-slate-800">Hotel Admin</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          <a href="#" className="flex items-center px-4 py-3 bg-primary-50 text-primary-700 rounded-lg transition font-medium">
            <BedDouble size={20} className="mr-3" />
            Rooms Setup
          </a>
          <a href="#" className="flex items-center px-4 py-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition">
            <Users size={20} className="mr-3" />
            Staff Accounts
          </a>
        </nav>

        <button onClick={handleLogout} className="flex items-center px-4 py-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition mt-auto">
          <LogOut size={20} className="mr-3" />
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-10 overflow-y-auto">
         <div className="max-w-4xl mx-auto">
           <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name}</h1>
           <p className="text-slate-500 mb-10">Manage your hotel property, rooms, and staff access.</p>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="card text-center flex flex-col items-center justify-center p-8 border-t-4 border-t-primary-500 hover:-translate-y-1 transition-transform">
               <div className="bg-primary-100 p-4 rounded-full mb-4">
                 <BedDouble className="text-primary-600" size={32} />
               </div>
               <h3 className="text-xl font-semibold mb-2">Configure Rooms</h3>
               <p className="text-slate-500 mb-4">Set up room types, pricing, and generate physical room numbers.</p>
               <button className="btn-primary w-full">Start Setup</button>
             </div>

             <div className="card text-center flex flex-col items-center justify-center p-8 border-t-4 border-t-indigo-500 hover:-translate-y-1 transition-transform">
               <div className="bg-indigo-100 p-4 rounded-full mb-4">
                 <Key className="text-indigo-600" size={32} />
               </div>
               <h3 className="text-xl font-semibold mb-2">Provision Staff</h3>
               <p className="text-slate-500 mb-4">Create accounts for your receptionists, housekeeping, and managers.</p>
               <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition w-full shadow-md shadow-indigo-500/30">Add Staff</button>
             </div>
           </div>
         </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
