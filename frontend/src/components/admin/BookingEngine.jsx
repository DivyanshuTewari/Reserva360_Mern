import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, X, Search, ChevronDown, ChevronRight, CreditCard, User, CalendarDays } from 'lucide-react';

const BookingEngine = () => {
  const [bookings, setBookings] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [ratePlans, setRatePlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState([]);
  
  // Accordion state
  const [activeSection, setActiveSection] = useState('rooms'); // 'rooms', 'guest', 'payment'

  // Form State
  const [dates, setDates] = useState({
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });

  const [selectedRooms, setSelectedRooms] = useState([]); 
  // { categoryId, roomId, adults, children, infants, ratePlanId, baseCost, gst, total }

  const [guestDetails, setGuestDetails] = useState({
    bookingSource: 'Direct',
    sourceType: '',
    guestName: '',
    guestContact: '',
    specialNote: ''
  });

  const [paymentDetails, setPaymentDetails] = useState({
    paymentMethod: 'Cash',
    amountPaid: 0,
    status: 'pending'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bookingsRes, typesRes, roomsRes, ratesRes] = await Promise.all([
        api.get('/admin/bookings'),
        api.get('/admin/room-types'),
        api.get('/admin/rooms'),
        api.get('/admin/rate-plans')
      ]);
      setBookings(bookingsRes.data);
      setRoomTypes(typesRes.data);
      setRooms(roomsRes.data);
      setRatePlans(ratesRes.data);
    } catch (error) {
      toast.error('Failed to load booking engine data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoomSelect = (categoryId, roomId) => {
    if (!roomId) return;
    
    // Check if already selected
    if (selectedRooms.find(r => r.roomId === roomId)) return;

    const room = rooms.find(r => r._id === roomId);
    const category = roomTypes.find(c => c._id === categoryId);
    
    // Default rate plan (first available for this category)
    const availablePlans = ratePlans.filter(p => p.roomTypeId?._id === categoryId || p.roomTypeId === categoryId);
    const defaultPlan = availablePlans[0];
    
    const days = Math.max(1, Math.ceil((new Date(dates.checkOut) - new Date(dates.checkIn)) / (1000 * 60 * 60 * 24)));
    const baseCost = (defaultPlan?.price || category?.basePrice || 0) * days;
    const gst = baseCost * 0.18; // 18% GST

    setSelectedRooms([...selectedRooms, {
      categoryId,
      roomId,
      roomNumber: room.roomNumber,
      categoryName: category.name,
      adults: 2,
      children: 0,
      infants: 0,
      ratePlanId: defaultPlan?._id || '',
      baseCost,
      gst,
      total: baseCost + gst
    }]);
  };

  const removeSelectedRoom = (roomId) => {
    setSelectedRooms(selectedRooms.filter(r => r.roomId !== roomId));
  };

  const updateSelectedRoom = (roomId, field, value) => {
    setSelectedRooms(selectedRooms.map(r => {
      if (r.roomId === roomId) {
        const updated = { ...r, [field]: value };
        // Recalculate cost if rate plan changes
        if (field === 'ratePlanId') {
          const plan = ratePlans.find(p => p._id === value);
          const days = Math.max(1, Math.ceil((new Date(dates.checkOut) - new Date(dates.checkIn)) / (1000 * 60 * 60 * 24)));
          updated.baseCost = (plan?.price || 0) * days;
        }
        
        // Handle manual custom cost override
        if (field === 'customCost') {
          updated.baseCost = value;
        }

        updated.gst = updated.baseCost * 0.18;
        updated.total = updated.baseCost + updated.gst;
        
        return updated;
      }
      return r;
    }));
  };

  // Calculations
  const totalNetCost = selectedRooms.reduce((acc, curr) => acc + curr.baseCost, 0);
  const totalGST = selectedRooms.reduce((acc, curr) => acc + curr.gst, 0);
  const payableAmount = totalNetCost + totalGST;

  const groupedBookings = Object.values(bookings.reduce((acc, b) => {
    const key = b.bookingGroupId || b._id;
    if (!acc[key]) {
      acc[key] = {
        groupId: key,
        guestName: b.guestName,
        guestContact: b.guestContact,
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        totalAmount: 0,
        rooms: [],
        status: b.status,
        paymentStatus: b.paymentStatus
      };
    }
    acc[key].totalAmount += b.totalAmount;
    acc[key].rooms.push(b);
    return acc;
  }, {}));

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
  };

  const handleSubmit = async () => {
    if (selectedRooms.length === 0) return toast.error('Please select at least one room');
    if (!guestDetails.guestName || !guestDetails.guestContact) return toast.error('Please provide guest details');

    try {
      const bookingGroupId = Date.now().toString();
      // In a real system, you'd send an array of bookings or a multi-room booking object.
      // Here, we create individual bookings for each selected room to match the backend schema.
      for (const room of selectedRooms) {
        await api.post('/admin/bookings', {
          roomId: room.roomId,
          guestName: guestDetails.guestName,
          guestContact: guestDetails.guestContact,
          checkInDate: dates.checkIn,
          checkOutDate: dates.checkOut,
          totalAmount: room.total,
          status: 'confirmed',
          paymentStatus: paymentDetails.status,
          bookingGroupId
        });
      }
      
      toast.success('Reservation(s) created successfully');
      setShowModal(false);
      
      // Reset
      setSelectedRooms([]);
      setGuestDetails({ bookingSource: 'Direct', sourceType: '', guestName: '', guestContact: '', specialNote: '' });
      setPaymentDetails({ paymentMethod: 'Cash', amountPaid: 0, status: 'pending' });
      
      fetchData();
    } catch (error) {
      toast.error('Failed to create booking: ' + (error.response?.data?.message || error.message));
      console.error(error);
    }
  };

  if (isLoading) return <div className="text-white">Loading Booking Engine...</div>;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-8">
      {/* Luxurious Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/bg-room.png')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>
        
        <div className="relative z-10 p-10 md:p-14 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 drop-shadow-lg">
              Booking Engine
            </h2>
            <p className="text-lg text-slate-300 max-w-xl leading-relaxed drop-shadow-md">
              Advanced reservation wizard with rate plans and payment integration.
            </p>
          </div>
          <div>
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center px-6 py-3.5 bg-emerald-600/90 backdrop-blur-md hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 border border-emerald-400/30"
            >
              <Plus size={20} className="mr-2" /> New Reservation
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#1a1d24] text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Guest</th>
                <th className="px-6 py-4 font-medium">Dates</th>
                <th className="px-6 py-4 font-medium">Room</th>
                <th className="px-6 py-4 font-medium">Total</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {groupedBookings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                    No reservations found. Click "New Reservation" to create one.
                  </td>
                </tr>
              ) : (
                groupedBookings.map(group => (
                  <React.Fragment key={group.groupId}>
                    <tr onClick={() => toggleGroup(group.groupId)} className="hover:bg-white/[0.02] transition-colors cursor-pointer group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white flex items-center">
                          {expandedGroups.includes(group.groupId) ? <ChevronDown size={16} className="mr-2 text-blue-400"/> : <ChevronRight size={16} className="mr-2 text-slate-500 group-hover:text-blue-400"/>}
                          {group.guestName}
                        </div>
                        <div className="text-slate-400 text-xs ml-6">{group.guestContact}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300">{new Date(group.checkInDate).toLocaleDateString('en-GB')}</div>
                        <div className="text-slate-500 text-xs">to {new Date(group.checkOutDate).toLocaleDateString('en-GB')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-blue-400 font-bold bg-blue-500/10 px-2 py-1 rounded-md inline-block">
                          {group.rooms.length} {group.rooms.length === 1 ? 'Room' : 'Rooms'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-emerald-400 font-bold">₹{group.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className={`text-[10px] uppercase font-bold mt-1 ${group.paymentStatus === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {group.paymentStatus}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border uppercase tracking-wider ${
                          group.status === 'confirmed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          group.status === 'checked-in' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          group.status === 'checked-out' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
                          group.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        }`}>
                          {group.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {/* Group Actions */}
                      </td>
                    </tr>
                    
                    {/* Expanded Individual Rooms */}
                    {expandedGroups.includes(group.groupId) && group.rooms.map(room => (
                      <tr key={room._id} className="bg-black/20 border-b border-white/5 last:border-b-0">
                        <td className="px-6 py-3 pl-12">
                          <div className="text-xs text-slate-500 flex items-center"><div className="w-2 h-2 rounded-full bg-slate-600 mr-2"></div> Sub-booking</div>
                        </td>
                        <td className="px-6 py-3">
                          {/* Empty spacer */}
                        </td>
                        <td className="px-6 py-3">
                          <div className="text-slate-300 font-medium">Room {room.roomId?.roomNumber || 'N/A'}</div>
                          <div className="text-[10px] text-slate-500">{room.roomId?.roomTypeId?.name}</div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="text-slate-300">₹{room.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-[10px] text-slate-500 uppercase">{room.status}</span>
                        </td>
                        <td className="px-6 py-3"></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advanced Booking Wizard Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-[#0a0b0e] border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#13151a] rounded-t-2xl">
              <h3 className="text-xl font-bold text-white flex items-center">
                <CalendarDays className="mr-3 text-blue-500" /> Create Reservation
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-[#0a0b0e] px-4 py-2 rounded-lg border border-white/10">
                  <span className="text-xs text-slate-400 mr-2">Check In</span>
                  <input type="date" value={dates.checkIn} onChange={e => setDates({...dates, checkIn: e.target.value})} className="bg-transparent text-white text-sm outline-none cursor-pointer" />
                </div>
                <span className="text-slate-500">→</span>
                <div className="flex items-center bg-[#0a0b0e] px-4 py-2 rounded-lg border border-white/10">
                  <span className="text-xs text-slate-400 mr-2">Check Out</span>
                  <input type="date" value={dates.checkOut} onChange={e => setDates({...dates, checkOut: e.target.value})} className="bg-transparent text-white text-sm outline-none cursor-pointer" />
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 ml-4 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4 custom-scrollbar">
              
              {/* SECTION 1: SELECT ROOMS */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-[#13151a]">
                <div 
                  className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${activeSection === 'rooms' ? 'bg-blue-600/20 border-b border-blue-500/30' : 'bg-white/5 hover:bg-white/10'}`}
                  onClick={() => setActiveSection('rooms')}
                >
                  <div className="flex items-center font-bold text-white tracking-wide">
                    <Search className="mr-3 text-blue-400" size={18} /> 1. SELECT ROOMS
                  </div>
                  {activeSection === 'rooms' ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
                
                {activeSection === 'rooms' && (
                  <div className="p-0 flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x divide-white/10">
                    {/* Left: Category List */}
                    <div className="w-full xl:w-1/3">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-[#1a1d24]">
                          <tr>
                            <th className="p-3 text-slate-300 font-medium">Room Category</th>
                            <th className="p-3 text-slate-300 font-medium border-l border-white/5">Available Rooms</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {roomTypes.map(category => {
                            const availableRooms = rooms.filter(r => (r.roomTypeId?._id === category._id || r.roomTypeId === category._id) && r.status === 'available');
                            return (
                              <tr key={category._id} className="hover:bg-white/5">
                                <td className="p-3 text-white">{category.name}</td>
                                <td className="p-2 border-l border-white/5">
                                  {availableRooms.length === 0 ? (
                                    <span className="text-xs text-red-400 px-2">No Room Available</span>
                                  ) : (
                                    <select 
                                      onChange={(e) => handleRoomSelect(category._id, e.target.value)}
                                      className="w-full bg-[#0a0b0e] border border-white/10 rounded p-1.5 text-slate-300 outline-none text-xs"
                                    >
                                      <option value="">Select Room</option>
                                      {availableRooms.map(r => (
                                        <option key={r._id} value={r._id} disabled={selectedRooms.some(sr => sr.roomId === r._id)}>
                                          Room {r.roomNumber}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Right: Selected Rooms Configuration */}
                    <div className="w-full xl:w-2/3 bg-[#0f1115]">
                      {selectedRooms.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500 p-8">
                          Select a room from the left panel to configure rates and occupants.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-[#1a1d24] text-slate-400">
                              <tr>
                                <th className="p-3">Room</th>
                                <th className="p-3">Adults</th>
                                <th className="p-3">Children</th>
                                <th className="p-3">Meal Plan</th>
                                <th className="p-3 text-right">Cost</th>
                                <th className="p-3 text-right">GST (18%)</th>
                                <th className="p-3 text-right">Total</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {selectedRooms.map(room => (
                                <tr key={room.roomId} className="text-slate-300">
                                  <td className="p-3 font-medium text-white">
                                    {room.categoryName} <br/>
                                    <span className="text-[10px] text-blue-400">Room {room.roomNumber}</span>
                                  </td>
                                  <td className="p-2">
                                    <select value={room.adults} onChange={(e) => updateSelectedRoom(room.roomId, 'adults', e.target.value)} className="bg-[#1a1d24] border border-white/10 rounded p-1 outline-none w-12">
                                      {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                  </td>
                                  <td className="p-2">
                                    <select value={room.children} onChange={(e) => updateSelectedRoom(room.roomId, 'children', e.target.value)} className="bg-[#1a1d24] border border-white/10 rounded p-1 outline-none w-12">
                                      {[0,1,2,3].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                  </td>
                                  <td className="p-2">
                                    <select value={room.ratePlanId} onChange={(e) => updateSelectedRoom(room.roomId, 'ratePlanId', e.target.value)} className="bg-[#1a1d24] border border-white/10 rounded p-1 outline-none w-32 truncate">
                                      {ratePlans.filter(p => p.roomTypeId?._id === room.categoryId || p.roomTypeId === room.categoryId).map(p => (
                                        <option key={p._id} value={p._id}>{p.planName}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-2">
                                    <input 
                                      type="number" 
                                      value={room.baseCost} 
                                      onChange={(e) => updateSelectedRoom(room.roomId, 'customCost', Number(e.target.value))}
                                      className="bg-[#13151a] border border-white/20 rounded p-1.5 outline-none w-24 text-right focus:border-blue-500 font-bold text-white transition-colors"
                                      title="Manually override price"
                                    />
                                  </td>
                                  <td className="p-3 text-right">₹{room.gst.toFixed(2)}</td>
                                  <td className="p-3 text-right font-bold text-emerald-400">₹{room.total.toFixed(2)}</td>
                                  <td className="p-2">
                                    <button onClick={() => removeSelectedRoom(room.roomId)} className="text-red-400 hover:text-red-300"><X size={14}/></button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          
                          <div className="p-4 border-t border-white/5 bg-[#13151a] flex justify-between items-center text-sm">
                            <div className="flex gap-6 text-slate-400">
                              <div>Total Rooms: <span className="text-white font-bold">{selectedRooms.length}</span></div>
                            </div>
                            <div className="flex gap-6 items-center">
                              <div className="text-slate-400">Net Cost: <span className="text-white">₹{totalNetCost.toFixed(2)}</span></div>
                              <div className="text-slate-400">Total GST: <span className="text-white">₹{totalGST.toFixed(2)}</span></div>
                              <div className="text-lg font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg">
                                Payable: ₹{payableAmount.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: GUEST DETAILS */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-[#13151a]">
                <div 
                  className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${activeSection === 'guest' ? 'bg-rose-500/20 border-b border-rose-500/30' : 'bg-white/5 hover:bg-white/10'}`}
                  onClick={() => setActiveSection('guest')}
                >
                  <div className="flex items-center font-bold text-white tracking-wide">
                    <User className="mr-3 text-rose-400" size={18} /> 2. GUEST DETAILS
                  </div>
                  {activeSection === 'guest' ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
                
                {activeSection === 'guest' && (
                  <div className="p-6 flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Booking Source</label>
                          <select value={guestDetails.bookingSource} onChange={e => setGuestDetails({...guestDetails, bookingSource: e.target.value})} className="w-full bg-[#0a0b0e] border border-white/10 rounded-lg p-2.5 text-white outline-none">
                            <option>Direct</option>
                            <option>Walk-In</option>
                            <option>OTA (Booking.com, etc)</option>
                            <option>Corporate</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Source Type / ID</label>
                          <input type="text" value={guestDetails.sourceType} onChange={e => setGuestDetails({...guestDetails, sourceType: e.target.value})} className="w-full bg-[#0a0b0e] border border-white/10 rounded-lg p-2.5 text-white outline-none" placeholder="e.g. BKG-12345" />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Guest Full Name</label>
                          <input type="text" value={guestDetails.guestName} onChange={e => setGuestDetails({...guestDetails, guestName: e.target.value})} className="w-full bg-[#0a0b0e] border border-white/10 rounded-lg p-2.5 text-white outline-none" placeholder="John Doe" />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Guest Phone/Email</label>
                          <input type="text" value={guestDetails.guestContact} onChange={e => setGuestDetails({...guestDetails, guestContact: e.target.value})} className="w-full bg-[#0a0b0e] border border-white/10 rounded-lg p-2.5 text-white outline-none" placeholder="+91 9876543210" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Special Note</label>
                        <textarea value={guestDetails.specialNote} onChange={e => setGuestDetails({...guestDetails, specialNote: e.target.value})} className="w-full bg-[#0a0b0e] border border-white/10 rounded-lg p-3 text-white outline-none h-24 resize-none" placeholder="Allergies, late check-in request, etc..."></textarea>
                      </div>
                    </div>
                    
                    {/* Summary Widget */}
                    <div className="w-full md:w-72 bg-[#0a0b0e] border border-white/5 rounded-xl p-5 h-fit">
                      <h4 className="text-white font-bold mb-4 border-b border-white/10 pb-2">Booking Summary</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Check In</span>
                          <span className="text-white font-medium">{new Date(dates.checkIn).toLocaleDateString('en-GB')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Check Out</span>
                          <span className="text-white font-medium">{new Date(dates.checkOut).toLocaleDateString('en-GB')}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/5 pt-2">
                          <span className="text-slate-400">Number of Rooms</span>
                          <span className="text-white font-bold">{selectedRooms.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Net Cost</span>
                          <span className="text-white">₹{totalNetCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-slate-400">Total GST</span>
                          <span className="text-white">₹{totalGST.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-slate-300 font-bold">Payable Amount</span>
                          <span className="text-xl font-black text-emerald-400">₹{payableAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: FINAL STEP (PAYMENT) */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-[#13151a]">
                <div 
                  className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${activeSection === 'payment' ? 'bg-emerald-500/20 border-b border-emerald-500/30' : 'bg-white/5 hover:bg-white/10'}`}
                  onClick={() => setActiveSection('payment')}
                >
                  <div className="flex items-center font-bold text-white tracking-wide">
                    <CreditCard className="mr-3 text-emerald-400" size={18} /> 3. FINAL STEP (PAYMENT)
                  </div>
                  {activeSection === 'payment' ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
                
                {activeSection === 'payment' && (
                  <div className="p-6">
                    <div className="bg-[#0a0b0e] border border-white/10 rounded-xl p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex-1 w-full">
                        <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider">Payment Method</label>
                        <div className="flex gap-2">
                          {['Cash', 'Card', 'UPI', 'Bank Transfer', 'Pay Later'].map(method => (
                            <button 
                              key={method}
                              onClick={() => setPaymentDetails({...paymentDetails, paymentMethod: method})}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${paymentDetails.paymentMethod === method ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#13151a] border-white/10 text-slate-400 hover:text-white'}`}
                            >
                              {method}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="w-full md:w-64">
                        <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider">Amount Paid Now (₹)</label>
                        <input 
                          type="number" 
                          value={paymentDetails.amountPaid} 
                          onChange={e => {
                            const val = Number(e.target.value);
                            setPaymentDetails({
                              ...paymentDetails, 
                              amountPaid: val,
                              status: val >= payableAmount ? 'paid' : val > 0 ? 'partial' : 'pending'
                            });
                          }} 
                          className="w-full bg-[#13151a] border border-emerald-500/30 rounded-lg p-3 text-white font-bold text-lg outline-none focus:border-emerald-500" 
                        />
                        <div className="text-right text-xs text-slate-500 mt-1">
                          Balance: ₹{Math.max(0, payableAmount - paymentDetails.amountPaid)}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={handleSubmit}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-lg transition-all shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.6)]"
                    >
                      CONFIRM BOOKING (₹{payableAmount.toFixed(2)})
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingEngine;
