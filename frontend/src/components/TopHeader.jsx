import React, { useState, useEffect } from 'react';
import { Plus, Search, ShieldAlert, Sparkles, RefreshCw, Clock } from 'lucide-react';
import { DateTime } from 'luxon';

export default function TopHeader({ 
  title, 
  subtitle, 
  onNewTicket, 
  onOpenConcurrencyTest,
  onRunAutoClose,
  searchQuery,
  setSearchQuery,
  onRefresh
}) {
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [isWithinHours, setIsWithinHours] = useState(false);

  useEffect(() => {
    function updateClock() {
      const now = DateTime.now().setZone('Asia/Kolkata');
      setCurrentTimeStr(now.toFormat('hh:mm:ss a'));
      
      const isWeekend = now.weekday === 6 || now.weekday === 7;
      const hour = now.hour;
      const min = now.minute;
      const currentMinutes = hour * 60 + min;
      const startMinutes = 9 * 60 + 30; // 09:30 AM
      const endMinutes = 18 * 60 + 30;  // 06:30 PM

      setIsWithinHours(!isWeekend && currentMinutes >= startMinutes && currentMinutes < endMinutes);
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center flex-wrap gap-2.5">
        {/* Working Hours Indicator */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
          <span className={`w-2 h-2 rounded-full ${isWithinHours ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="font-medium text-slate-700">
            {isWithinHours ? 'Working Hours Active' : 'Off Hours / SLA Paused'}
          </span>
          <span className="text-slate-400">|</span>
          <span className="font-mono text-slate-600 font-medium">{currentTimeStr} IST</span>
        </div>

        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh ticket data"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Concurrency Simulator Button */}
        {onOpenConcurrencyTest && (
          <button
            onClick={onOpenConcurrencyTest}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold transition shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Simulate INC-0291 Concurrency</span>
          </button>
        )}

        {/* Auto Close Button */}
        {onRunAutoClose && (
          <button
            onClick={onRunAutoClose}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition"
            title="Check and close tickets waiting on customer > 5 working days"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Run Auto-Close</span>
          </button>
        )}

        {/* New Ticket Button */}
        {onNewTicket && (
          <button
            onClick={onNewTicket}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Ticket</span>
          </button>
        )}
      </div>
    </header>
  );
}
