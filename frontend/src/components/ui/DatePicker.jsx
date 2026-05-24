import React, { useState, useEffect, useRef } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const DatePicker = ({ selected, onChange, minDate, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse initial selected date safely
  const getSafeDate = (dateStr) => {
    if (!dateStr) return new Date();
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const initialDate = getSafeDate(selected);
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

  useEffect(() => {
    if (selected) {
      const d = new Date(selected);
      if (!isNaN(d.getTime())) {
        setCurrentMonth(d.getMonth());
        setCurrentYear(d.getFullYear());
      }
    }
  }, [selected]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Helper functions
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDayClick = (day) => {
    // Format: YYYY-MM-DD
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  // Generate calendar days
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  const daysGrid = [];
  // Empty slots for preceding month days
  for (let i = 0; i < firstDayIndex; i++) {
    daysGrid.push(<div key={`empty-${i}`} className="h-9 w-9" />);
  }

  // Actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dayDateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
    const dayDate = new Date(currentYear, currentMonth, day);
    
    // Check if day is disabled (before minDate)
    let isDisabled = false;
    if (minDate) {
      const minD = new Date(minDate);
      // Reset hours to compare pure dates
      dayDate.setHours(0, 0, 0, 0);
      minD.setHours(0, 0, 0, 0);
      isDisabled = dayDate < minD;
    }

    const isSelected = selected === dayDateStr;
    const isToday = new Date().toDateString() === dayDate.toDateString();

    daysGrid.push(
      <button
        key={`day-${day}`}
        type="button"
        disabled={isDisabled}
        onClick={(e) => {
          e.stopPropagation();
          handleDayClick(day);
        }}
        className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
          isDisabled
            ? 'text-slate-600 cursor-not-allowed hover:bg-transparent'
            : isSelected
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105'
            : isToday
            ? 'border border-blue-500/50 text-blue-400 hover:bg-white/5'
            : 'text-slate-300 hover:bg-white/5 hover:text-white'
        }`}
      >
        {day}
      </button>
    );
  }

  // Handle keyboard accessibility
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      setIsOpen(true);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Convert date format from YYYY-MM-DD to DD-MM-YYYY for premium display
  const getDisplayValue = () => {
    if (!selected) return '';
    const parts = selected.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return selected;
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    
    // Support typing DD-MM-YYYY
    const dmyRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
    const ymdRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
    
    if (dmyRegex.test(val)) {
      const [, day, month, year] = val.match(dmyRegex);
      const dateStr = `${year}-${month}-${day}`;
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        onChange(dateStr);
      }
    } else if (ymdRegex.test(val)) {
      const date = new Date(val);
      if (!isNaN(date.getTime())) {
        onChange(val);
      }
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">
          {label}
        </label>
      )}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between bg-[#0a0b0e] border border-white/10 rounded-xl px-4 py-2.5 hover:border-white/20 focus-within:border-blue-500 transition-all duration-200 cursor-pointer shadow-inner"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className="flex flex-col text-left">
          <input
            type="text"
            value={getDisplayValue()}
            onChange={handleInputChange}
            placeholder="DD-MM-YYYY"
            className="bg-transparent text-white text-sm outline-none cursor-pointer w-24 md:w-28 font-bold placeholder-slate-600"
          />
        </div>
        <CalendarDays size={18} className="text-blue-500 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute top-[105%] left-0 z-50 bg-[#13151a]/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl w-72 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-white tracking-wide">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {daysOfWeek.map((day) => (
              <div key={day} className="text-[10px] font-bold text-slate-500 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 justify-items-center">
            {daysGrid}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
