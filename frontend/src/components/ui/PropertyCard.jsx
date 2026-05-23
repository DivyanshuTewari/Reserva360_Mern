import React from 'react';
import { Star, MapPin } from 'lucide-react';

const PropertyCard = ({ property }) => {
  return (
    <div className="bg-white/80 backdrop-blur-md border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={property.image} 
          alt={property.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-sm font-semibold text-slate-800 shadow-sm">
          <Star size={14} className="fill-amber-400 text-amber-400" />
          <span>{property.rating}</span>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1">{property.name}</h3>
        <div className="flex items-center gap-1 text-slate-500 text-sm mb-4">
          <MapPin size={14} />
          <span className="line-clamp-1">{property.location}</span>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-indigo-600">${property.pricePerNight}</span>
            <span className="text-slate-500 text-sm"> / night</span>
          </div>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
