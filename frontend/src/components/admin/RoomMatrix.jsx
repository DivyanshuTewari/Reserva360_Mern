import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Copy, DoorOpen, X } from 'lucide-react';

const RoomMatrix = () => {
  const [roomTypes, setRoomTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generator, setGenerator] = useState({ roomTypeId: '', startingNumber: '101', count: 10 });

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
      toast.error('Failed to load matrix data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateRooms = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/rooms', generator);
      toast.success(`Successfully generated ${generator.count} physical rooms`);
      setShowGenerateModal(false);
      fetchData(); // reload rooms
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate rooms');
    }
  };

  const handleStatusChange = async (roomId, newStatus) => {
    try {
      const res = await api.put(`/admin/rooms/${roomId}/status`, { status: newStatus });
      setRooms(rooms.map(r => r._id === roomId ? res.data : r));
      toast.success('Room status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'occupied': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'maintenance': return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'cleaning': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  if (isLoading) return <div className="text-slate-400 p-8">Loading matrix...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-end">
        <button 
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
        >
          <Copy size={18} className="mr-2" /> Bulk Generate
        </button>
      </div>

      <div className="bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl">
        {rooms.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No physical rooms generated yet. Use the bulk generator to map your physical property.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {rooms.map(room => (
              <div key={room._id} className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${getStatusColor(room.status)}`}>
                <DoorOpen size={24} className="mb-2 opacity-80" />
                <span className="text-lg font-black">{room.roomNumber}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 truncate w-full mt-1">
                  {room.roomTypeId?.name || 'Unknown'}
                </span>
                
                <select 
                  value={room.status}
                  onChange={(e) => handleStatusChange(room._id, e.target.value)}
                  className="mt-3 w-full bg-black/20 text-xs py-1 rounded outline-none border border-transparent focus:border-white/20 appearance-none text-center cursor-pointer font-medium"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowGenerateModal(false)}></div>
          <div className="relative bg-[#13151a] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowGenerateModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold text-white mb-6">Bulk Generate Physical Rooms</h3>
            <form onSubmit={handleGenerateRooms} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Room Category</label>
                <select required value={generator.roomTypeId} onChange={e => setGenerator({...generator, roomTypeId: e.target.value})} className="w-full px-4 py-2.5 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 outline-none appearance-none">
                  <option value="">Select a category</option>
                  {roomTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Starting Number</label>
                  <input type="text" required value={generator.startingNumber} onChange={e => setGenerator({...generator, startingNumber: e.target.value})} className="w-full px-4 py-2.5 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 outline-none" placeholder="e.g. 101" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Total to Generate</label>
                  <input type="number" required min="1" max="100" value={generator.count} onChange={e => setGenerator({...generator, count: e.target.value})} className="w-full px-4 py-2.5 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 outline-none" />
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                This will automatically create {generator.count} physical rooms starting from {generator.startingNumber} (e.g. {generator.startingNumber}, {Number(generator.startingNumber)+1}, {Number(generator.startingNumber)+2}...).
              </div>
              <button type="submit" className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">Generate Inventory</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomMatrix;
