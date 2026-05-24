import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { DollarSign, Plus, Trash2, X } from 'lucide-react';

const RoomRatePlan = ({ roomTypes }) => {
  const [ratePlans, setRatePlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [newPlan, setNewPlan] = useState({ roomTypeId: '', planName: '', price: '', description: '' });

  useEffect(() => {
    fetchRatePlans();
  }, []);

  const fetchRatePlans = async () => {
    try {
      const res = await api.get('/admin/rate-plans');
      setRatePlans(res.data);
    } catch (error) {
      toast.error('Failed to load rate plans');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/rate-plans', newPlan);
      setRatePlans([...ratePlans, res.data]);
      setShowModal(false);
      toast.success('Rate plan created');
      setNewPlan({ roomTypeId: '', planName: '', price: '', description: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create plan');
    }
  };

  const handleDeletePlan = async (id) => {
    if (window.confirm('Are you sure you want to delete this rate plan?')) {
      try {
        await api.delete(`/admin/rate-plans/${id}`);
        setRatePlans(ratePlans.filter(p => p._id !== id));
        toast.success('Rate plan deleted');
      } catch (error) {
        toast.error('Failed to delete plan');
      }
    }
  };

  if (isLoading) return <div className="p-8 text-slate-400">Loading rate plans...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 mt-6">
      <div className="flex justify-end">
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus size={18} className="mr-2" /> Add Rate Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ratePlans.length === 0 ? (
          <div className="lg:col-span-3 text-center py-12 text-slate-500 bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
            No rate plans configured yet. Add EP, CP, MAP plans here.
          </div>
        ) : (
          ratePlans.map(plan => (
            <div key={plan._id} className="bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl relative group">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDeletePlan(plan._id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="flex items-center text-blue-400 mb-2">
                <DollarSign size={20} className="mr-1" />
                <span className="font-bold text-sm uppercase tracking-wider">{plan.roomTypeId?.name || 'Unknown Room'}</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{plan.planName}</h3>
              <p className="text-slate-400 text-sm mb-4 min-h-[40px]">{plan.description}</p>
              <div className="text-2xl font-black text-emerald-400">
                ₹{plan.price.toLocaleString('en-IN')}
                <span className="text-sm font-medium text-slate-500"> / night</span>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-[#13151a] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold text-white mb-6">Add Rate Plan</h3>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Room Category</label>
                <select required value={newPlan.roomTypeId} onChange={e => setNewPlan({...newPlan, roomTypeId: e.target.value})} className="w-full px-4 py-2.5 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 outline-none appearance-none">
                  <option value="">Select a category</option>
                  {roomTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Plan Name (e.g., EP, CP)</label>
                <input type="text" required value={newPlan.planName} onChange={e => setNewPlan({...newPlan, planName: e.target.value})} className="w-full px-4 py-2.5 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 outline-none" placeholder="CP (Room + Breakfast)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nightly Price (₹)</label>
                <input type="number" required value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: e.target.value})} className="w-full px-4 py-2.5 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea rows="2" value={newPlan.description} onChange={e => setNewPlan({...newPlan, description: e.target.value})} className="w-full px-4 py-2.5 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 outline-none resize-none" placeholder="Includes complimentary breakfast..."></textarea>
              </div>
              <button type="submit" className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]">Save Plan</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomRatePlan;
