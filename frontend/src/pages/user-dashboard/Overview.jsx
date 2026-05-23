import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  CalendarDays, 
  Heart, 
  CreditCard 
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import BookingRow from '../../components/ui/BookingRow';
import PropertyCard from '../../components/ui/PropertyCard';
import { StatSkeleton, RowSkeleton, CardSkeleton } from '../../components/ui/SkeletonLoader';
import { stats, recentBookings, recommendedProperties } from '../../data/dummyData';

const Overview = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Stats Section */}
      <section>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Dashboard Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {loading ? (
            Array(4).fill(0).map((_, i) => <StatSkeleton key={i} />)
          ) : (
            <>
              <StatCard title="Total Bookings" value={stats.totalBookings} icon={Briefcase} colorClass="bg-indigo-100 text-indigo-600" />
              <StatCard title="Upcoming Stays" value={stats.upcomingStays} icon={CalendarDays} colorClass="bg-emerald-100 text-emerald-600" />
              <StatCard title="Saved Properties" value={stats.savedProperties} icon={Heart} colorClass="bg-rose-100 text-rose-600" />
              <StatCard title="Pending Payments" value={stats.pendingPayments} icon={CreditCard} colorClass="bg-amber-100 text-amber-600" />
            </>
          )}
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Recent Bookings */}
        <section className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">Recent Bookings</h2>
            <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">View All</button>
          </div>
          <div className="bg-white/40 backdrop-blur-md border border-slate-200/60 rounded-3xl p-4 md:p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              {loading ? (
                Array(3).fill(0).map((_, i) => <RowSkeleton key={i} />)
              ) : (
                recentBookings.map((booking) => (
                  <BookingRow key={booking.id} booking={booking} />
                ))
              )}
            </div>
          </div>
        </section>

        {/* Recommended Properties */}
        <section className="xl:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">Recommended</h2>
            <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">See More</button>
          </div>
          <div className="flex flex-col gap-6">
            {loading ? (
              Array(2).fill(0).map((_, i) => <CardSkeleton key={i} />)
            ) : (
              recommendedProperties.slice(0, 2).map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

export default Overview;
