import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Copy, DoorOpen, X, Trash2, Plus, Loader2 } from 'lucide-react';

const StatusDropdown = ({ room, onStatusChange, isUpdating }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statuses = [
    { value: 'available', label: 'Available', colorClass: 'text-emerald-400' },
    { value: 'occupied', label: 'Occupied', colorClass: 'text-blue-400' },
    { value: 'cleaning', label: 'Cleaning', colorClass: 'text-amber-400' },
    { value: 'maintenance', label: 'Maintenance', colorClass: 'text-red-400' }
  ];

  const currentStatus = statuses.find(s => s.value === room.status) || statuses[0];

  return (
    <div className="relative mt-3 w-full" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className="w-full flex items-center justify-between bg-[#0f1115]/80 text-xs py-1.5 px-3 rounded-md outline-none border border-white/10 hover:border-white/30 transition-all shadow-inner text-left font-medium disabled:opacity-70"
      >
        <span className={currentStatus.colorClass}>{currentStatus.label}</span>
        {isUpdating ? (
          <Loader2 size={12} className="animate-spin text-slate-400" />
        ) : (
          <svg className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute z-20 top-full mt-1 left-0 w-full bg-[#13151a] border border-white/10 rounded-md shadow-2xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150 origin-top">
          {statuses.map(s => (
            <button
              key={s.value}
              onClick={() => {
                onStatusChange(room._id, s.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors ${room.status === s.value ? 'bg-white/10 font-bold' : ''} ${s.colorClass}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const RoomMatrix = () => {
  const [roomTypes, setRoomTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generator, setGenerator] = useState({ roomTypeId: '', startingNumber: '101', count: 10 });

  const [showSingleRoomModal, setShowSingleRoomModal] = useState(false);
  const [singleRoom, setSingleRoom] = useState({ roomTypeId: '', roomNumber: '' });

  const [roomToDelete, setRoomToDelete] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

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
    setIsGenerating(true);
    try {
      await api.post('/admin/rooms', generator);
      toast.success(`Successfully generated ${generator.count} physical rooms`);
      setShowGenerateModal(false);
      fetchData(); // reload rooms
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate rooms');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStatusChange = async (roomId, newStatus) => {
    setUpdatingStatusId(roomId);
    try {
      const res = await api.put(`/admin/rooms/${roomId}/status`, { status: newStatus });
      setRooms(rooms.map(r => r._id === roomId ? res.data : r));
      toast.success('Room status updated');
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleAddSingleRoom = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      await api.post('/admin/rooms', {
        roomTypeId: singleRoom.roomTypeId,
        startingNumber: singleRoom.roomNumber,
        count: 1
      });
      toast.success(`Successfully created room ${singleRoom.roomNumber}`);
      setShowSingleRoomModal(false);
      fetchData(); // reload rooms
      setSingleRoom({ roomTypeId: '', roomNumber: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create room');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteRoom = (roomId, roomNumber) => {
    setRoomToDelete({ roomId, roomNumber });
  };

  const confirmDelete = async () => {
    if (!roomToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/admin/rooms/${roomToDelete.roomId}`);
      toast.success(`Room ${roomToDelete.roomNumber} deleted successfully`);
      setRoomToDelete(null);
      fetchData(); // reload rooms
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete room');
    } finally {
      setIsDeleting(false);
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
      <div className="flex justify-end gap-3">
        <button 
          onClick={() => setShowSingleRoomModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <Plus size={18} className="mr-2" /> Add Room
        </button>
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
              <div key={room._id} className={`relative p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-all group ${getStatusColor(room.status)}`}>
                <button 
                  onClick={() => handleDeleteRoom(room._id, room.roomNumber)}
                  className="absolute top-2 right-2 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 p-1 rounded-md"
                  title="Delete Room"
                >
                  <Trash2 size={14} />
                </button>
                <DoorOpen size={24} className="mb-2 opacity-80" />
                <span className="text-lg font-black">{room.roomNumber}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 truncate w-full mt-1">
                  {room.roomTypeId?.name || 'Unknown'}
                </span>
                
                <StatusDropdown room={room} onStatusChange={handleStatusChange} isUpdating={updatingStatusId === room._id} />
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
              <button type="submit" disabled={isGenerating} className="w-full flex justify-center items-center mt-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-70">
                {isGenerating ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                {isGenerating ? 'Generating...' : 'Generate Inventory'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Single Room Modal */}
      {showSingleRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowSingleRoomModal(false)}></div>
          <div className="relative bg-[#13151a] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowSingleRoomModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold text-white mb-6">Add Single Room</h3>
            <form onSubmit={handleAddSingleRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Room Category</label>
                <select required value={singleRoom.roomTypeId} onChange={e => setSingleRoom({...singleRoom, roomTypeId: e.target.value})} className="w-full px-4 py-2.5 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 outline-none appearance-none">
                  <option value="">Select a category</option>
                  {roomTypes.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Room Number / Name</label>
                <input type="text" required value={singleRoom.roomNumber} onChange={e => setSingleRoom({...singleRoom, roomNumber: e.target.value})} className="w-full px-4 py-2.5 bg-[#0f1115] text-white rounded-xl border border-white/10 focus:border-blue-500 focus:ring-1 outline-none" placeholder="e.g. 101 or Suite A" />
              </div>
              <button type="submit" disabled={isAdding} className="w-full flex justify-center items-center mt-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-70">
                {isAdding ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                {isAdding ? 'Adding...' : 'Add Room'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setRoomToDelete(null)}></div>
          <div className="relative bg-[#13151a] border border-red-500/30 rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Room</h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to delete room <span className="text-white font-bold">{roomToDelete.roomNumber}</span>? This action cannot be undone.
              </p>
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setRoomToDelete(null)}
                  className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 flex justify-center items-center py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] disabled:opacity-70"
                >
                  {isDeleting ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomMatrix;
