import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const AvailabilityCalendar = ({ roomTypes, rooms }) => {
  const [startDate, setStartDate] = useState(new Date());
  const daysToShow = 14;

  // Generate date headers
  const getDates = () => {
    const dates = [];
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const dates = getDates();

  const handlePrev = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() - 7);
    setStartDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + 7);
    setStartDate(newDate);
  };

  const getCellColor = (available, total) => {
    if (available === 0) return 'bg-red-500 text-white font-bold';
    if (available <= Math.ceil(total * 0.2)) return 'bg-orange-500 text-white font-bold';
    return 'bg-emerald-500 text-white font-bold';
  };

  // Calculate daily stats across all rooms
  const dailyStats = dates.map(date => {
    let totalAvailable = 0;
    let totalInventory = rooms.length;

    roomTypes.forEach(type => {
      const typeRooms = rooms.filter(r => r.roomTypeId?._id === type._id || r.roomTypeId === type._id);
      const blocked = typeRooms.filter(r => r.status === 'maintenance' || r.status === 'cleaning').length;
      // Since we don't have a booking engine yet, all non-blocked rooms are available
      const booked = 0; 
      const available = typeRooms.length - blocked - booked;
      totalAvailable += available;
    });

    const occupancyPercent = totalInventory === 0 ? 0 : Math.round(((totalInventory - totalAvailable) / totalInventory) * 100);

    return { available: totalAvailable, occupancy: occupancyPercent };
  });

  return (
    <div className="bg-[#13151a]/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-xl overflow-hidden mt-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-[#1a1d24]">
              <th className="p-4 border-b border-r border-white/10 w-64">
                <div className="text-orange-500 font-bold uppercase tracking-wider">Room Category</div>
              </th>
              <th className="p-4 border-b border-r border-white/10 w-24 text-center text-blue-400 font-bold uppercase">Pre</th>
              <th className="p-4 border-b border-r border-white/10 w-28 text-center text-purple-400 font-bold uppercase">Type</th>
              
              {dates.map((date, i) => (
                <th key={i} className="p-2 border-b border-white/10 text-center text-emerald-400 w-16">
                  <div className="text-xs uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="font-bold text-lg">{date.getDate()}</div>
                  <div className="text-xs uppercase">{date.toLocaleDateString('en-US', { month: 'short' })}</div>
                </th>
              ))}
              <th className="p-4 border-b border-white/10 w-24 text-center text-blue-400 font-bold uppercase">Next</th>
            </tr>
          </thead>
          <tbody>
            {roomTypes.map((type, index) => {
              const typeRooms = rooms.filter(r => r.roomTypeId?._id === type._id || r.roomTypeId === type._id);
              const total = typeRooms.length;
              // Mock real-time availability: for now it's static since no booking engine
              // Blocked are those in maintenance or cleaning
              const blocked = typeRooms.filter(r => r.status === 'maintenance' || r.status === 'cleaning').length;
              const booked = 0;
              const available = total - blocked - booked;

              return (
                <React.Fragment key={type._id}>
                  {/* AVAILABLE ROW */}
                  <tr className="border-b border-white/5 bg-[#0f1115]/50">
                    <td rowSpan={3} className="p-4 border-r border-white/10 align-top">
                      <div className="font-bold text-white mb-1">{type.name}</div>
                      <div className="text-slate-400 text-xs">Total Units: {total}</div>
                    </td>
                    {index === 0 && (
                      <td rowSpan={roomTypes.length * 3} className="p-2 border-r border-white/10 align-middle text-center bg-[#0f1115]">
                        <button onClick={handlePrev} className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors inline-flex">
                          <ChevronLeft size={28} className="text-slate-300" />
                        </button>
                      </td>
                    )}
                    <td className="p-2 border-r border-white/10 text-slate-300 text-xs font-semibold tracking-wider">AVAILABLE</td>
                    {dates.map((_, i) => (
                      <td key={`avail-${i}`} className="p-1 border-white/5 text-center">
                        <div className={`py-2 px-1 rounded text-sm ${getCellColor(available, total)}`}>
                          {available}
                        </div>
                      </td>
                    ))}
                    {index === 0 && (
                      <td rowSpan={roomTypes.length * 3} className="p-2 border-l border-white/10 align-middle text-center bg-[#0f1115]">
                        <button onClick={handleNext} className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors inline-flex">
                          <ChevronRight size={28} className="text-slate-300" />
                        </button>
                      </td>
                    )}
                  </tr>
                  {/* BOOKED ROW */}
                  <tr className="border-b border-white/5 bg-[#0f1115]/30">
                    <td className="p-2 border-r border-white/10 text-slate-400 text-xs tracking-wider">BOOKED</td>
                    {dates.map((_, i) => (
                      <td key={`book-${i}`} className="p-1 border-white/5 text-center text-slate-400">
                        {booked}
                      </td>
                    ))}
                  </tr>
                  {/* BLOCKED ROW */}
                  <tr className="border-b border-white/10 bg-[#0f1115]/30">
                    <td className="p-2 border-r border-white/10 text-slate-400 text-xs tracking-wider">BLOCKED</td>
                    {dates.map((_, i) => (
                      <td key={`block-${i}`} className="p-1 border-white/5 text-center text-slate-400">
                        {blocked}
                      </td>
                    ))}
                  </tr>
                </React.Fragment>
              );
            })}
            {roomTypes.length === 0 && (
              <tr>
                <td colSpan={17} className="p-8 text-center text-slate-500">
                  No room categories configured.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-[#1a1d24]">
            <tr>
              <td colSpan={3} className="p-3 border-r border-white/10 font-bold text-white">Available Inventory</td>
              {dailyStats.map((stat, i) => (
                <td key={`inv-${i}`} className="p-3 text-center font-bold text-white">{stat.available}</td>
              ))}
              <td></td>
            </tr>
            <tr className="border-t border-white/5">
              <td colSpan={3} className="p-3 border-r border-white/10 font-bold text-slate-400">Occupancy %</td>
              {dailyStats.map((stat, i) => (
                <td key={`occ-${i}`} className="p-3 text-center text-slate-400">{stat.occupancy}%</td>
              ))}
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;
