import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';

const BookingRow = ({ booking }) => {
  const statusColor = {
    Confirmed: "bg-emerald-100 text-emerald-700",
    Pending: "bg-amber-100 text-amber-700",
    Completed: "bg-slate-100 text-slate-700",
    Cancelled: "bg-red-100 text-red-700"
  }[booking.status] || "bg-slate-100 text-slate-700";

  const paymentColor = {
    Paid: "text-emerald-600",
    Pending: "text-amber-600",
  }[booking.paymentStatus] || "text-slate-600";

  return (
    <div className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white/60 border border-slate-100 hover:bg-slate-50 rounded-2xl transition-all duration-200 cursor-pointer">
      <img 
        src={booking.propertyImage} 
        alt={booking.propertyName} 
        className="w-full sm:w-24 h-24 sm:h-24 rounded-xl object-cover shadow-sm"
      />
      
      <div className="flex-grow min-w-0">
        <h4 className="text-base font-bold text-slate-800 truncate mb-1">{booking.propertyName}</h4>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Calendar size={14} />
          <span>{booking.checkIn} — {booking.checkOut}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${statusColor}`}>
            {booking.status}
          </span>
          <span className={`text-sm font-medium ${paymentColor}`}>
            Payment: {booking.paymentStatus}
          </span>
        </div>
      </div>
      
      <div className="hidden sm:flex items-center justify-center p-3 text-slate-400 group-hover:text-indigo-600 transition-colors">
        <ChevronRight size={20} />
      </div>
    </div>
  );
};

export default BookingRow;
