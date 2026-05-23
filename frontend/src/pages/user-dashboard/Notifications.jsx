import React, { useState, useEffect } from 'react';
import { notifications as initialNotifications } from '../../data/dummyData';
import { Bell, CheckCircle, CreditCard, Info, BellOff } from 'lucide-react';
import { RowSkeleton } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';

const Notifications = () => {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications(initialNotifications);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const getIcon = (type) => {
    switch(type) {
      case 'booking': return <CheckCircle className="text-emerald-500" />;
      case 'payment': return <CreditCard className="text-amber-500" />;
      default: return <Info className="text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
        <button 
          onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Mark all as read
        </button>
      </div>

      <div className="bg-white/40 backdrop-blur-md border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm min-h-[400px]">
        {loading ? (
          <div className="p-6 space-y-4">
            {Array(4).fill(0).map((_, i) => <RowSkeleton key={i} />)}
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-6 flex gap-4 transition-colors ${notification.read ? 'bg-transparent' : 'bg-indigo-50/50'}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="shrink-0 mt-1">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-base font-bold ${notification.read ? 'text-slate-700' : 'text-slate-900'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap ml-4">
                      {notification.date}
                    </span>
                  </div>
                  <p className={`text-sm ${notification.read ? 'text-slate-500' : 'text-slate-600 font-medium'}`}>
                    {notification.message}
                  </p>
                </div>
                {!notification.read && (
                  <div className="shrink-0 flex items-center justify-center w-3">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-12 mt-10">
            <EmptyState 
              icon={BellOff}
              title="All Caught Up!"
              message="You don't have any new notifications at the moment."
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
