import React from 'react';

const EmptyState = ({ icon: Icon, title, message, actionText, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white/40 backdrop-blur-md border border-dashed border-slate-300 rounded-3xl">
      <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-4">
        <Icon size={32} />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 max-w-md mb-6">{message}</p>
      {actionText && onAction && (
        <button 
          onClick={onAction}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-indigo-200"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
