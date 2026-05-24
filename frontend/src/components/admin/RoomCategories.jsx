import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { BedDouble, Plus, X } from 'lucide-react';

const RoomCategories = () => {
  const [roomTypes, setRoomTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [newType, setNewType] = useState({ name: '', occupancy: 2, basePrice: 1000, amenities: '', description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [typesRes, roomsRes] = await Promise.all([
        api.get('/admin/room-types'),
        api.get('/admin/rooms')
      ]);
      setRoomTypes(typesRes.data);
      setRooms(roomsRes.data);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateType = async (e) => {
    e.preventDefault();
    try {
      const formattedData = {
        ...newType,
        amenities: newType.amenities.split(',').map(a => a.trim())
      };
      const res = await api.post('/admin/room-types', formattedData);
      setRoomTypes([...roomTypes, res.data]);
      setShowTypeModal(false);
      toast.success('Room category created');
      setNewType({ name: '', occupancy: 2, basePrice: 1000, amenities: '', description: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create category');
    }
  };

  if (isLoading) return <div className="text-slate-400 p-8">Loading categories...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-end">
        <button 
          onClick={() => setShowTypeModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus size={18} className="mr-2" /> Add Category
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {roomTypes.length === 0 ? (
          <div className="lg:col-span-3 text-center py-12 text-slate-500 bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl">
            No room categories configured yet.
          </div>
        ) : (
          roomTypes.map(type => (
            <div key={type._id} className="bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <BedDouble size={64} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{type.name}</h3>
              <div className="text-3xl font-black text-blue-400 mb-6">₹{type.basePrice.toLocaleString('en-IN')}<span className="text-sm font-medium text-slate-500">/night</span></div>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Max Occupancy</span>
                  <span className="text-white font-medium">{type.occupancy} Guests</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Units</span>
                  <span className="text-white font-medium">{rooms.filter(r => r.roomTypeId?._id === type._id || r.roomTypeId === type._id).length} Rooms</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {type.amenities?.slice(0, 3).map((am, i) => (
                  <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-slate-300">{am}</span>
                ))}
                {type.amenities?.length > 3 && <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-slate-300">+{type.amenities.length - 3}</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowTypeModal(false)}></div>
          <div className="relative bg-[#13151a] border border-white/10 rounded-2xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowTypeModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold text-white mb-6">Add Room Category</h3>
            <form onSubmit={handleCreateType} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Category Name</label>
                  <input type="text" required value={newType.name} onChange={e => setNewType({...newType, name: e.target.value})} className="w-full px-4 py-2.5 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 outline-none" placeholder="e.g. Presidential Suite" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Base Price (₹)</label>
                  <input type="number" required value={newType.basePrice} onChange={e => setNewType({...newType, basePrice: e.target.value})} className="w-full px-4 py-2.5 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Max Occupancy</label>
                  <input type="number" required value={newType.occupancy} onChange={e => setNewType({...newType, occupancy: e.target.value})} className="w-full px-4 py-2.5 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Amenities (comma separated)</label>
                  <input type="text" value={newType.amenities} onChange={e => setNewType({...newType, amenities: e.target.value})} className="w-full px-4 py-2.5 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 outline-none" placeholder="WiFi, AC, Mini Bar, TV" />
                </div>
              </div>
              <button type="submit" className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]">Create Category</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomCategories;
