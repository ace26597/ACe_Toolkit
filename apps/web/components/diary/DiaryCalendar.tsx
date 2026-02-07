'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarData {
  [date: string]: {
    hasEntry: boolean;
    wordCount: number;
    tags: string[];
    agents?: string[];
  };
}

interface DiaryCalendarProps {
  calendar: CalendarData;
  onDateSelect: (date: string) => void;
  selectedDate: string | null;
}

export default function DiaryCalendar({ calendar, onDateSelect, selectedDate }: DiaryCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const formatDate = (day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };
  
  const getIntensity = (wordCount: number): string => {
    if (wordCount > 1000) return 'bg-emerald-400';
    if (wordCount > 500) return 'bg-emerald-500';
    if (wordCount > 200) return 'bg-emerald-600';
    if (wordCount > 0) return 'bg-emerald-700';
    return '';
  };
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // Generate calendar grid
  const days: (number | null)[] = [];
  for (let i = 0; i < startingDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={prevMonth}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold">
          {monthNames[month]} {year}
        </h2>
        <button 
          onClick={nextMonth}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      
      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }
          
          const dateStr = formatDate(day);
          const entry = calendar[dateStr];
          const hasEntry = entry?.hasEntry;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          
          return (
            <button
              key={dateStr}
              onClick={() => hasEntry && onDateSelect(dateStr)}
              disabled={!hasEntry}
              className={`
                aspect-square rounded-lg flex flex-col items-center justify-center
                text-sm transition-all relative
                ${hasEntry 
                  ? 'cursor-pointer hover:ring-2 hover:ring-emerald-400' 
                  : 'cursor-default opacity-50'
                }
                ${isSelected 
                  ? 'ring-2 ring-emerald-400 bg-emerald-900/30' 
                  : ''
                }
                ${isToday && !isSelected
                  ? 'ring-2 ring-blue-400' 
                  : ''
                }
              `}
            >
              <span className={isToday ? 'font-bold text-blue-400' : ''}>{day}</span>
              {hasEntry && (
                <div className="flex gap-0.5 mt-1" title={`${entry.wordCount} words`}>
                  {entry.agents?.includes('alfred') && (
                    <div className={`w-2 h-2 rounded-full ${getIntensity(entry.wordCount)}`} title="Entry" />
                  )}
                  {entry.agents?.includes('pip') && (
                    <div className="w-2 h-2 rounded-full bg-purple-500" title="Pip" />
                  )}
                  {!entry.agents?.length && (
                    <div className={`w-2 h-2 rounded-full ${getIntensity(entry.wordCount)}`} />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-6 flex items-center gap-4 text-xs text-gray-400">
        <span>Activity:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-700" />
          <span>&lt;200</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-600" />
          <span>200-500</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span>500-1000</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-400" />
          <span>1000+</span>
        </div>
      </div>
    </div>
  );
}
