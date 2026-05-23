import React from 'react';

const Placeholder = ({ title }) => {
  return (
    <div className="h-[80vh] flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-white/40 backdrop-blur-md p-12 rounded-3xl border border-slate-200/60 shadow-sm text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
        <p className="text-slate-500">This module is currently under development.</p>
      </div>
    </div>
  );
};

export default Placeholder;
