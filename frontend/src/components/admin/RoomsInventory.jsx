import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Calendar, BarChart2, DollarSign, Settings2 } from 'lucide-react';
import AvailabilityCalendar from './AvailabilityCalendar';
import RoomRatePlan from './RoomRatePlan';
import RoomChart from './RoomChart';

const RoomsInventory = () => {
  const [activeTab, setActiveTab] = useState('calendar');
  const [roomTypes, setRoomTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [roomBlocks, setRoomBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const [typesRes, roomsRes, bookingsRes, blocksRes] = await Promise.all([
        api.get('/admin/room-types'),
        api.get('/admin/rooms'),
        api.get('/admin/bookings'),
        api.get('/admin/room-blocks')
      ]);
      setRoomTypes(typesRes.data);
      setRooms(roomsRes.data);
      setBookings(bookingsRes.data);
      setRoomBlocks(blocksRes.data);
    } catch (error) {
      toast.error('Failed to load inventory data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="text-white p-8">Loading inventory...</div>;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-8">
      {/* Luxurious Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/bg-hotel.png')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>
        
        <div className="relative z-10 p-10 md:p-14">
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 drop-shadow-lg">
            Rooms & Inventory
          </h2>
          <p className="text-lg text-slate-300 max-w-xl leading-relaxed drop-shadow-md">
            View your availability calendar, daily room charts, and rate plans.
          </p>
        </div>
      </div>

      {/* Sleek Tab Navigation */}
      <div className="flex bg-[#13151a]/80 backdrop-blur-xl p-1.5 rounded-2xl border border-white/5 shadow-lg overflow-x-auto whitespace-nowrap custom-scrollbar">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'calendar' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Calendar size={18} className="mr-2" /> Availability Calendar
        </button>
        <button
          onClick={() => setActiveTab('chart')}
          className={`flex items-center px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'chart' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart2 size={18} className="mr-2" /> Room Chart
        </button>
        <button
          onClick={() => setActiveTab('rates')}
          className={`flex items-center px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === 'rates' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <DollarSign size={18} className="mr-2" /> Room & Rate Plan
        </button>
      </div>

      {activeTab === 'calendar' && (
        <AvailabilityCalendar 
          roomTypes={roomTypes} 
          rooms={rooms} 
          bookings={bookings} 
          roomBlocks={roomBlocks}
          onBlocksChange={setRoomBlocks}
        />
      )}
      
      {activeTab === 'rates' && (
        <RoomRatePlan roomTypes={roomTypes} />
      )}

      {activeTab === 'chart' && (
        <div className="mt-6">
          <RoomChart />
        </div>
      )}
    </div>
  );
};

export default RoomsInventory;
