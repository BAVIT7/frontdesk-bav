import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Clock, CheckCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { holidaysAPI } from '../services/api';
import { DateTime } from 'luxon';

export default function HolidaysView() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  // SLA interactive simulator
  const [simPriority, setSimPriority] = useState('URGENT');
  const [simDate, setSimDate] = useState('2026-11-20T18:00'); // Friday 6:00 PM test!

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await holidaysAPI.getHolidays();
      setHolidays(res.data.holidays || []);
    } catch (err) {
      console.error('Error fetching holidays:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!name || !date) return;
    try {
      setAdding(true);
      setError(null);
      await holidaysAPI.addHoliday({ name, date, description });
      setName('');
      setDate('');
      setDescription('');
      fetchHolidays();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add holiday');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this festival holiday?')) return;
    try {
      await holidaysAPI.deleteHoliday(id);
      fetchHolidays();
    } catch (err) {
      alert('Failed to delete holiday');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* SLA Policy Architecture Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-blue-300 font-bold text-sm">
          <Clock className="w-5 h-5" />
          <span>Arvo Systems SLA & Working Hours Engine Specification</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white/10 p-4 rounded-xl border border-white/10 space-y-2">
            <span className="font-bold text-blue-200 uppercase tracking-wider text-[11px]">Working Hours</span>
            <p className="text-white font-medium">Monday to Friday</p>
            <p className="text-blue-100 text-[11px]">09:30 AM to 06:30 PM (9.0 Working Hours / Day)</p>
            <p className="text-slate-300 text-[10px]">Timezone: Asia/Kolkata (HQ Kochi, Kerala)</p>
          </div>

          <div className="bg-white/10 p-4 rounded-xl border border-white/10 space-y-2">
            <span className="font-bold text-rose-300 uppercase tracking-wider text-[11px]">Excluded Intervals</span>
            <p className="text-white font-medium">Weekends & Holidays</p>
            <p className="text-rose-100 text-[11px]">Saturdays & Sundays paused automatically.</p>
            <p className="text-slate-300 text-[10px]">Festival holidays do not consume SLA minutes.</p>
          </div>

          <div className="bg-white/10 p-4 rounded-xl border border-white/10 space-y-2">
            <span className="font-bold text-emerald-300 uppercase tracking-wider text-[11px]">Pause & Recalculation</span>
            <p className="text-white font-medium">Customer Wait & Priority Change</p>
            <p className="text-emerald-100 text-[11px]">Timer pauses in "Waiting on Customer".</p>
            <p className="text-slate-300 text-[10px]">Priority changes recalculate remaining SLA.</p>
          </div>
        </div>
      </div>

      {/* Grid: Holidays Management + Add Holiday */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Holidays List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-800">Festival Holidays Calendar ({holidays.length})</h3>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading holidays...</div>
            ) : holidays.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No festival holidays configured.</div>
            ) : (
              holidays.map((h) => (
                <div key={h.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">{h.name}</span>
                    {h.description && <span className="text-slate-400 text-[11px] ml-2">({h.description})</span>}
                    <p className="font-mono text-blue-600 text-[11px] mt-0.5">
                      {DateTime.fromISO(h.date).toFormat('cccc, dd MMMM yyyy')} ({h.date})
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(h.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                    title="Delete holiday"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add Holiday Form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 text-xs">
          <div className="flex items-center space-x-2 font-bold text-slate-900">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Add Festival Holiday</span>
          </div>

          {error && (
            <div className="p-2.5 rounded bg-rose-50 text-rose-700 text-[11px] border border-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleAddHoliday} className="space-y-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Holiday Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Onam / Diwali"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Date (YYYY-MM-DD) *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Description (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Kerala State Festival"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={adding}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold text-xs transition"
            >
              {adding ? 'Adding...' : 'Save Holiday'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
