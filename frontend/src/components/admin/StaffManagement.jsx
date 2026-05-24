import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Users, Plus, Shield, Mail, KeyRound, Trash2, X } from 'lucide-react';

const StaffManagement = () => {
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await api.get('/admin/staff');
      setStaffList(res.data);
    } catch (error) {
      toast.error('Failed to load staff accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/admin/staff', newStaff);
      setStaffList([...staffList, res.data]);
      toast.success('Staff account provisioned successfully');
      setShowModal(false);
      setNewStaff({ name: '', email: '', password: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create staff account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id) => {
    if (window.confirm('Are you sure you want to revoke access for this user?')) {
      // In a real app, we'd have a delete route. 
      // For now, we'll just show a toast or implement it later.
      toast.error('Revoke access API not implemented yet.');
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 max-w-5xl space-y-8">
      {/* Luxurious Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/bg-reception.png')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>
        
        <div className="relative z-10 p-10 md:p-14 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 drop-shadow-lg">
              Staff Accounts
            </h2>
            <p className="text-lg text-slate-300 max-w-xl leading-relaxed drop-shadow-md">
              Provision roles, manage access, and monitor team activity at the reception.
            </p>
          </div>
          <div>
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center px-6 py-3.5 bg-blue-600/90 backdrop-blur-md hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 border border-blue-400/30"
            >
              <Plus size={20} className="mr-2" />
              Provision New Staff
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-slate-400">Loading directory...</div>
      ) : (
        <div className="bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/5 text-slate-300 text-sm tracking-wider uppercase">
                  <th className="px-6 py-4 font-semibold">Name & Email</th>
                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-slate-500">
                      No staff accounts found. Provision one to get started.
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff) => (
                    <tr key={staff._id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold mr-4">
                            {staff.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-semibold">{staff.name}</p>
                            <p className="text-slate-400 text-sm">{staff.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          staff.role === 'admin' 
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {staff.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-emerald-400 text-sm font-medium">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></div>
                          Active
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {staff.role !== 'admin' && (
                          <button 
                            onClick={() => handleDeleteStaff(staff._id)}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Revoke Access"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Provision Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-[#13151a] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
                <Shield className="text-blue-400" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Provision Access</h3>
                <p className="text-sm text-slate-400">Create a new staff credential</p>
              </div>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                <div className="relative">
                  <Users className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="john@hotel.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Temporary Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3.5 text-slate-400" size={18} />
                  <input
                    type="password"
                    required
                    value={newStaff.password}
                    onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-3 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all tracking-widest"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                >
                  {isSubmitting ? 'Provisioning...' : 'Grant Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
