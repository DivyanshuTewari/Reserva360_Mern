import React, { useState, useEffect } from 'react';
import PropertyCard from '../../components/ui/PropertyCard';
import { CardSkeleton } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import { savedProperties } from '../../data/dummyData';
import { HeartCrack } from 'lucide-react';

const SavedProperties = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Saved Properties</h1>
        <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-lg text-sm font-bold">
          {savedProperties.length} Saved
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : savedProperties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {savedProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <div className="mt-12">
          <EmptyState 
            icon={HeartCrack}
            title="No Saved Properties"
            message="You haven't saved any properties yet. Click the heart icon on any property to save it for later."
            actionText="Discover Places"
            onAction={() => {}}
          />
        </div>
      )}
    </div>
  );
};

export default SavedProperties;
