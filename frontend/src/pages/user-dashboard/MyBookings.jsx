import React, { useState, useEffect } from 'react';
import BookingRow from '../../components/ui/BookingRow';
import { RowSkeleton } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import { recentBookings } from '../../data/dummyData';
import { CalendarX } from 'lucide-react';

const MyBookings = () => {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, [filter]);

  const filters = ['All', 'Upcoming', 'Completed', 'Cancelled'];

  const filteredBookings = recentBookings.filter(b => {
    if (filter === 'All') return true;
    if (filter === 'Upcoming') return b.status === 'Confirmed' || b.status === 'Pending';
    return b.status === filter;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">My Bookings</h1>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => {
                setLoading(true);
                setFilter(f);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                filter === f 
                  ? 'bg-slate-800 text-white shadow-md' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/40 backdrop-blur-md border border-slate-200/60 rounded-3xl p-4 md:p-6 shadow-sm min-h-[500px]">
        {loading ? (
          <div className="flex flex-col gap-4">
            {Array(4).fill(0).map((_, i) => <RowSkeleton key={i} />)}
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="flex flex-col gap-4">
            {filteredBookings.map((booking) => (
              <BookingRow key={booking.id} booking={booking} />
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center mt-20">
            <EmptyState 
              icon={CalendarX}
              title="No Bookings Found"
              message={`You don't have any ${filter.toLowerCase()} bookings at the moment.`}
              actionText="Explore Properties"
              onAction={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings;
