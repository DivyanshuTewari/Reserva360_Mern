import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon, FilterX, Search, X } from 'lucide-react';
import BookingDetailsDrawer from './BookingDetailsDrawer';

const getStartOfCurrentWeek = () => {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const RoomChart = () => {
  const [categories, setCategories] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(null);
  
  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTargetBookingId, setSearchTargetBookingId] = useState(null);
  const searchTimeoutRef = useRef(null);
  
  // Drawer State
  const [drawerBookingId, setDrawerBookingId] = useState(null);

  const [startDate, setStartDate] = useState(() => {
    const saved = localStorage.getItem('reserva_roomchart_startdate');
    if (saved && saved !== 'undefined' && saved !== 'null') {
      const parsed = new Date(saved);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return getStartOfCurrentWeek();
  });
  const [endDate, setEndDate] = useState(() => {
    const savedStart = localStorage.getItem('reserva_roomchart_startdate');
    let date;
    if (savedStart && savedStart !== 'undefined' && savedStart !== 'null') {
      const parsed = new Date(savedStart);
      if (!isNaN(parsed.getTime())) {
        date = new Date(parsed);
      } else {
        date = getStartOfCurrentWeek();
      }
    } else {
      date = getStartOfCurrentWeek();
    }
    date.setDate(date.getDate() + 6); 
    return date;
  });

  useEffect(() => {
    if (startDate && !isNaN(startDate.getTime())) {
      localStorage.setItem('reserva_roomchart_startdate', startDate.toISOString());
    }
  }, [startDate]);

  const fetchRackData = useCallback(async () => {
    try {
      setIsLoading(true);
      const safeStart = (startDate && !isNaN(startDate.getTime())) ? startDate : new Date();
      const safeEnd = (endDate && !isNaN(endDate.getTime())) ? endDate : new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
      
      const startStr = safeStart.toISOString().split('T')[0];
      const endStr = safeEnd.toISOString().split('T')[0];
      
      const response = await api.get(`/admin/room-rack?startDate=${startStr}&endDate=${endStr}`);
      setCategories(response.data.categories || []);
      setBookings(response.data.bookings || []);
      setBlocks(response.data.blocks || []);
    } catch (error) {
      toast.error('Failed to load room rack data');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchRackData();
    const intervalId = setInterval(() => {
      fetchRackData();
    }, 30000);
    return () => clearInterval(intervalId);
  }, [fetchRackData]);

  // Handle auto-scrolling when a target booking is set and data is loaded
  useEffect(() => {
    if (searchTargetBookingId && bookings.length > 0) {
      const isTargetInView = bookings.some(b => b.id === searchTargetBookingId);
      if (isTargetInView) {
        // Wait a tick for rendering to complete
        setTimeout(() => {
          const el = document.getElementById(`booking-block-${searchTargetBookingId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          }
        }, 100);
      }
    }
  }, [searchTargetBookingId, bookings]);

  // Handle Global Search
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (val.trim().length > 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await api.get(`/admin/room-rack/search?q=${val}`);
          setSearchResults(res.data || []);
        } catch (error) {
          console.error("Search error", error);
        } finally {
          setIsSearching(false);
        }
      }, 500); // 500ms debounce
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchTargetBookingId(null);
  };

  const handleJumpToBooking = (booking) => {
    const bIn = new Date(booking.checkInDate);
    // Pad start date by 2 days so it's not right on the edge
    bIn.setDate(bIn.getDate() - 2);
    const newEnd = new Date(bIn);
    newEnd.setDate(newEnd.getDate() + 6);
    
    setStartDate(bIn);
    setEndDate(newEnd);
    setSearchTargetBookingId(booking.id);
    setSearchResults([]); // close dropdown
  };

  const handleJumpToDate = (e) => {
    if (!e.target.value) return;
    const date = new Date(e.target.value);
    const newEnd = new Date(date);
    newEnd.setDate(newEnd.getDate() + 6);
    setStartDate(date);
    setEndDate(newEnd);
  };

  // Nav Handlers
  const handlePrevDays = () => {
    const days = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() - days);
    const newEnd = new Date(endDate);
    newEnd.setDate(newEnd.getDate() - days);
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const handleNextDays = () => {
    const days = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() + days);
    const newEnd = new Date(endDate);
    newEnd.setDate(newEnd.getDate() + days);
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const dateHeaders = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dateHeaders.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const formatHeaderDate = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      dayName: days[date.getDay()],
      dateNum: String(date.getDate()).padStart(2, '0'),
      month: months[date.getMonth()],
      isWeekend: date.getDay() === 0 || date.getDay() === 6
    };
  };

  const normalizeDate = (d) => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const getOperationalStatus = (booking) => {
    const today = normalizeDate(new Date()).getTime();
    const checkIn = normalizeDate(booking.checkInDate).getTime();
    const checkOut = normalizeDate(booking.checkOutDate).getTime();
    
    if (booking.status === 'checked-out') return 'CHECKED_OUT';
    
    if (booking.status === 'checked-in') {
      if (checkOut === today) return 'TODAY_CHECKOUT';
      return 'CHECKED_IN';
    }
    
    if (booking.status === 'confirmed') {
      if (checkIn === today) return 'TODAY_CHECKIN';
      return 'CONFIRMED_BOOKING';
    }
    
    if (booking.status === 'pending' || booking.status === 'hold') {
      return 'HOLD_BOOKING';
    }
    
    return 'CONFIRMED_BOOKING'; 
  };

  const STATUS_COLORS = {
    CHECKED_OUT: { bg: 'bg-[#1e3a8a]', border: 'border-[#1e3a8a]', text: 'text-white', label: 'Checked Out' },
    TODAY_CHECKOUT: { bg: 'bg-[#dc2626]', border: 'border-[#b91c1c]', text: 'text-white', label: "Today's Check Out" },
    CHECKED_IN: { bg: 'bg-[#16a34a]', border: 'border-[#15803d]', text: 'text-white', label: 'Checked In' },
    TODAY_CHECKIN: { bg: 'bg-[#7c3aed]', border: 'border-[#6d28d9]', text: 'text-white', label: "Today's Check In" },
    CONFIRMED_BOOKING: { bg: 'bg-[#ea580c]', border: 'border-[#c2410c]', text: 'text-white', label: 'Booking' },
    HOLD_BOOKING: { bg: 'bg-[#eab308]', border: 'border-[#ca8a04]', text: 'text-black', label: 'Hold Booking' },
  };

  const renderTimelineCells = (room) => {
    const cells = [];
    let i = 0;

    while (i < dateHeaders.length) {
      const currentIterDate = normalizeDate(dateHeaders[i]);
      const isWeekend = currentIterDate.getDay() === 0 || currentIterDate.getDay() === 6;
      
      const booking = bookings.find(b => {
        const bRoomId = b.roomId?._id || b.roomId;
        if (!bRoomId || !room._id) return false;
        if (bRoomId.toString() !== room._id.toString()) return false;
        const bIn = normalizeDate(b.checkInDate);
        const bOut = normalizeDate(b.checkOutDate);
        if (bIn.getTime() === currentIterDate.getTime()) return true;
        if (i === 0 && bIn.getTime() < currentIterDate.getTime() && bOut.getTime() > currentIterDate.getTime()) return true;
        return false;
      });

      const block = blocks.find(b => {
        const bRoomId = b.roomId?._id || b.roomId;
        if (!bRoomId || !room._id) return false;
        if (bRoomId.toString() !== room._id.toString()) return false;
        const bIn = normalizeDate(b.startDate);
        const bOut = normalizeDate(b.endDate); 
        if (bIn.getTime() === currentIterDate.getTime()) return true;
        if (i === 0 && bIn.getTime() < currentIterDate.getTime() && bOut.getTime() >= currentIterDate.getTime()) return true;
        return false;
      });

      if (booking) {
        let bIn = normalizeDate(booking.checkInDate);
        let bOut = normalizeDate(booking.checkOutDate);
        
        if (bIn.getTime() < normalizeDate(dateHeaders[0]).getTime()) {
          bIn = normalizeDate(dateHeaders[0]);
        }
        
        let endIterDate = new Date(bOut);
        if (endIterDate.getTime() > normalizeDate(endDate).getTime()) {
           endIterDate = new Date(normalizeDate(endDate));
           endIterDate.setDate(endIterDate.getDate() + 1); 
        }

        const nights = Math.ceil((endIterDate - bIn) / (1000 * 60 * 60 * 24));
        const colSpan = Math.max(1, nights);

        const opStatusKey = getOperationalStatus(booking);
        const colorConfig = STATUS_COLORS[opStatusKey] || STATUS_COLORS.CONFIRMED_BOOKING;
        
        const isDimmed = activeFilter && activeFilter !== opStatusKey;
        const isTargeted = searchTargetBookingId === booking.id;

        cells.push(
          <td key={`b-${booking.id}-${i}`} colSpan={colSpan} className="p-0 border border-slate-400 relative h-[45px] min-w-[120px]">
            <div 
              id={`booking-block-${booking.id}`}
              onClick={() => setDrawerBookingId(booking.id)}
              className={`absolute inset-y-[2px] inset-x-0 mx-[1px] ${colorConfig.bg} ${colorConfig.text} text-[12px] font-semibold flex items-center px-2 border truncate cursor-pointer group z-10 box-border transition-all duration-200 
              ${isDimmed ? 'opacity-20' : 'opacity-100'} 
              ${isTargeted ? 'ring-4 ring-yellow-400 ring-offset-1 animate-pulse z-20' : ''}`}
            >
               {booking.guestName}
               
               {/* Tooltip */}
               <div className="absolute hidden group-hover:block top-full left-0 mt-0 w-64 bg-white border border-slate-400 text-slate-800 text-xs p-3 shadow-lg z-50">
                  <div className="font-bold border-b border-slate-300 pb-1 mb-2 text-slate-900 text-sm flex justify-between items-center">
                    {booking.guestName}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colorConfig.bg} ${colorConfig.text}`}>{colorConfig.label}</span>
                  </div>
                  <div className="flex justify-between mb-1"><span className="text-slate-600 font-medium">Check-In:</span> <span className="font-bold">{new Date(booking.checkInDate).toLocaleDateString('en-GB')}</span></div>
                  <div className="flex justify-between mb-1"><span className="text-slate-600 font-medium">Check-Out:</span> <span className="font-bold">{new Date(booking.checkOutDate).toLocaleDateString('en-GB')}</span></div>
                  <div className="mt-2 pt-2 border-t border-slate-300 font-bold uppercase text-slate-500 text-[10px]">
                     DB Status: {booking.status}
                  </div>
               </div>
            </div>
          </td>
        );
        i += colSpan;
      } else if (block) {
        let bIn = normalizeDate(block.startDate);
        let bOut = normalizeDate(block.endDate);
        if (bIn.getTime() < normalizeDate(dateHeaders[0]).getTime()) bIn = normalizeDate(dateHeaders[0]);
        
        let endIterDate = new Date(bOut);
        endIterDate.setDate(endIterDate.getDate() + 1);
        if (endIterDate.getTime() > normalizeDate(endDate).getTime()) {
           endIterDate = new Date(normalizeDate(endDate));
           endIterDate.setDate(endIterDate.getDate() + 1);
        }

        const span = Math.ceil((endIterDate - bIn) / (1000 * 60 * 60 * 24));
        const colSpan = Math.max(1, span);

        cells.push(
          <td key={`blk-${block.id}-${i}`} colSpan={colSpan} className="p-0 border border-slate-400 relative h-[45px] min-w-[120px] bg-slate-100">
            <div className={`absolute inset-y-[2px] inset-x-0 mx-[1px] bg-[#64748b] border border-[#475569] text-white text-[11px] font-bold flex items-center justify-center px-1 truncate group z-10 box-border ${activeFilter ? 'opacity-20' : 'opacity-100'}`} title={block.reason}>
               {block.reason ? block.reason.replace('_', ' ').toUpperCase() : 'MAINTENANCE'}
            </div>
          </td>
        );
        i += colSpan;
      } else {
        cells.push(
          <td key={`empty-${i}`} className={`p-0 border border-slate-400 min-w-[120px] w-[120px] h-[45px] ${isWeekend ? 'bg-[#f8fafc]' : 'bg-white'}`}></td>
        );
        i++;
      }
    }
    return cells;
  };

  return (
    <div className="bg-[#f1f5f9] rounded-lg shadow-xl border border-white/20 p-4 relative overflow-hidden text-slate-800 font-sans mt-6 select-none flex flex-col h-[calc(100vh-140px)]">
      
      {/* Top Header - Controls & Search */}
      <div className="flex flex-col xl:flex-row justify-between items-center px-4 py-3 bg-white border border-slate-300 rounded shadow-sm shrink-0 mb-3 gap-4 xl:gap-0">
        
        {/* Title */}
        <div className="flex items-center gap-2 mr-4">
          <CalendarIcon size={18} className="text-slate-600" />
          <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide whitespace-nowrap">Room Rack</h3>
          {isLoading && <RefreshCw size={14} className="animate-spin text-slate-400 ml-2" />}
        </div>

        {/* Global Search */}
        <div className="flex-1 max-w-xl w-full relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search Guest / Booking ID / Room No"
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-10 py-1.5 border border-slate-300 rounded-md bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
            />
            {searchQuery && (
              <button 
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          {/* Search Results Dropdown */}
          {searchQuery.length > 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-md shadow-xl z-50 max-h-64 overflow-y-auto">
              {isSearching ? (
                <div className="p-3 text-center text-sm text-slate-500">Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map(res => (
                  <div 
                    key={res.id} 
                    onClick={() => handleJumpToBooking(res)}
                    className="p-3 border-b border-slate-100 hover:bg-blue-50 cursor-pointer flex justify-between items-center group"
                  >
                    <div>
                      <div className="font-bold text-slate-800 group-hover:text-blue-700">{res.guestName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        In: {new Date(res.checkInDate).toLocaleDateString('en-GB')} | Room: {res.roomNumber}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded uppercase">{res.status}</span>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-sm text-slate-500">No matching booking found</div>
              )}
            </div>
          )}
        </div>

        {/* Date Jump & Navigation */}
        <div className="flex items-center gap-2 xl:ml-4 bg-slate-100 p-1.5 rounded border border-slate-300">
          <input 
            type="date"
            className="px-2 py-1 bg-white border border-slate-300 rounded text-sm font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            onChange={handleJumpToDate}
            title="Jump to date"
          />
          <div className="h-5 w-px bg-slate-300 mx-1"></div>
          
          <button onClick={handlePrevDays} className="p-1 hover:bg-slate-200 rounded text-slate-700 transition-colors">
            <ChevronLeft size={16} />
          </button>
          
          <div className="flex items-center px-2 text-sm font-bold text-slate-700 whitespace-nowrap">
            {(startDate && !isNaN(startDate.getTime())) ? startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'N/A'} 
            <span className="mx-2 text-slate-400 font-normal">to</span> 
            {(endDate && !isNaN(endDate.getTime())) ? endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'N/A'}
          </div>
          
          <button onClick={handleNextDays} className="p-1 hover:bg-slate-200 rounded text-slate-700 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Booking Status Legend */}
      <div className="bg-white border border-slate-300 rounded shadow-sm p-2 mb-3 shrink-0">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between items-center">
          <span>Booking Status Legend</span>
          {activeFilter && (
            <button 
              onClick={() => setActiveFilter(null)}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-2 py-0.5 rounded"
            >
              <FilterX size={12} className="mr-1"/> Clear Filter
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_COLORS).map(([key, config]) => {
            const isActive = activeFilter === key;
            const isDimmed = activeFilter && !isActive;
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(isActive ? null : key)}
                className={`px-3 py-1 rounded text-[11px] font-bold border ${config.bg} ${config.border} ${config.text} transition-all duration-200 hover:opacity-90 active:scale-95 flex items-center ${isDimmed ? 'opacity-30 grayscale-[50%]' : 'opacity-100 shadow-sm'}`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Container */}
      <div className="relative overflow-auto flex-1 bg-white border border-slate-400 shadow-inner custom-scrollbar">
        <table className="w-full text-sm text-left border-collapse" style={{ tableLayout: 'fixed' }}>
          
          <thead className="sticky top-0 z-40 bg-[#f8fafc]">
            <tr>
              {/* Category Header */}
              <th className="sticky left-0 top-0 z-50 bg-[#e2e8f0] p-2 min-w-[140px] w-[140px] border border-slate-400 font-bold text-slate-800">
                Room Category
              </th>
              {/* Room No Header */}
              <th className="sticky left-[140px] top-0 z-50 bg-[#e2e8f0] p-2 min-w-[80px] w-[80px] border border-slate-400 border-r-2 border-r-slate-500 font-bold text-slate-800 text-center shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                Room
              </th>
              
              {/* Date Headers */}
              {dateHeaders.map((date, idx) => {
                const { dayName, dateNum, month, isWeekend } = formatHeaderDate(date);
                const isToday = normalizeDate(new Date()).getTime() === normalizeDate(date).getTime();
                
                return (
                  <th 
                    key={idx} 
                    className={`min-w-[120px] w-[120px] p-0 text-center border border-slate-400 align-middle
                      ${isToday ? 'bg-[#dcfce7] text-[#166534]' : isWeekend ? 'bg-[#fff7ed] text-slate-800' : 'bg-[#f8fafc] text-slate-800'}`}
                  >
                    <div className="flex flex-col h-full py-1.5">
                      <div className="text-[10px] leading-tight font-bold">{dayName}</div>
                      <div className="text-[15px] font-black leading-tight py-0.5">{dateNum}</div>
                      <div className="text-[10px] leading-tight font-bold">{month}</div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          
          <tbody className="bg-white">
            {categories.map((category) => (
              <React.Fragment key={category._id}>
                {category.rooms.map((room, rIdx) => {
                  return (
                    <tr key={room._id}>
                      
                      {/* Room Category Cell */}
                      {rIdx === 0 && (
                        <td 
                          rowSpan={category.rooms.length} 
                          className="sticky left-0 z-30 bg-[#f1f5f9] p-2 border border-slate-400 align-middle w-[140px]"
                        >
                          <div className="font-bold text-slate-800 text-sm whitespace-normal text-center">
                            {category.name}
                          </div>
                        </td>
                      )}
                      
                      {/* Room Number Cell */}
                      <td className="sticky left-[140px] z-30 bg-white p-2 border border-slate-400 border-r-2 border-r-slate-500 text-center font-bold text-slate-800 w-[80px] h-[45px] shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                        {room.roomNumber}
                      </td>
                      
                      {/* Timeline Cells (Dates) */}
                      {renderTimelineCells(room)}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        
        {categories.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-48 bg-white border-t border-slate-300">
            <p className="font-bold text-slate-500">No rooms configured in physical matrix.</p>
          </div>
        )}
      </div>
      
      {/* Booking Details Drawer */}
      <BookingDetailsDrawer 
        bookingId={drawerBookingId} 
        onClose={() => {
          setDrawerBookingId(null);
          fetchRackData();
        }} 
        onRefresh={fetchRackData}
      />
    </div>
  );
};

export default RoomChart;
