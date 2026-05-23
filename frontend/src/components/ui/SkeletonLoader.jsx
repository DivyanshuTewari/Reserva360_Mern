import React from 'react';

export const CardSkeleton = () => (
  <div className="bg-white/50 backdrop-blur-sm border border-slate-100 rounded-2xl p-4 animate-pulse">
    <div className="h-40 bg-slate-200 rounded-xl mb-4"></div>
    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
    <div className="flex justify-between items-center">
      <div className="h-6 bg-slate-200 rounded w-1/4"></div>
      <div className="h-8 bg-slate-200 rounded w-24"></div>
    </div>
  </div>
);

export const RowSkeleton = () => (
  <div className="flex items-center gap-4 p-4 bg-white/50 backdrop-blur-sm border border-slate-100 rounded-2xl animate-pulse">
    <div className="w-20 h-20 bg-slate-200 rounded-xl shrink-0"></div>
    <div className="flex-grow">
      <div className="h-5 bg-slate-200 rounded w-1/3 mb-2"></div>
      <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
      <div className="h-6 bg-slate-200 rounded w-32"></div>
    </div>
  </div>
);

export const StatSkeleton = () => (
  <div className="bg-white/50 border border-slate-100 rounded-2xl p-6 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="flex-grow">
        <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
        <div className="h-8 bg-slate-200 rounded w-16"></div>
      </div>
      <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
    </div>
  </div>
);
