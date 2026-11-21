import React, { useState, useEffect } from 'react';
import { History, Search, ShieldCheck, Filter, Calendar } from 'lucide-react';
import { auditAPI } from '../services/api';
import { DateTime } from 'luxon';

export default function ActivityHistoryView({ onSelectTicketNumber }) {
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = { limit: 50 };
      if (search) params.search = search;
      if (selectedAction) params.action = selectedAction;
      const res = await auditAPI.getAuditLogs(params);
      setLogs(res.data.logs || []);
      setTotalCount(res.data.totalCount || 0);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedAction]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-700 font-bold text-base">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>Immutable Audit History Explorer (INC-0318)</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Every critical action across tickets, assignments, replies, private notes, and SLA status transitions is permanently recorded. These records cannot be edited or erased by any user.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">Total Audit Entries</span>
          <p className="text-xl font-bold font-mono text-slate-900">{totalCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ticket number, agent, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800"
          />
        </form>

        <div className="flex items-center space-x-2">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none"
          >
            <option value="">All Actions</option>
            <option value="CREATED">Created</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="STATUS_CHANGE">Status Change</option>
            <option value="PRIORITY_CHANGE">Priority Change</option>
            <option value="CUSTOMER_REPLY">Customer Reply</option>
            <option value="INTERNAL_NOTE">Internal Note</option>
            <option value="REOPENED">Reopened</option>
            <option value="AUTO_CLOSED">Auto Closed</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setSelectedAction('');
              fetchLogs();
            }}
            className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading audit history...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No audit records match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Previous &rarr; New Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {DateTime.fromISO(log.createdAt).toFormat('dd MMM yyyy, hh:mm:ss a')}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.ticket ? (
                        <span className="font-mono font-bold text-blue-600">
                          {log.ticket.ticketNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{log.actorName}</span>
                      <span className="text-[10px] text-slate-400 ml-1">({log.actorType})</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-sm">
                      {log.description}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px] max-w-xs truncate">
                      {log.previousValue && <span className="text-rose-600">Prev: {log.previousValue} </span>}
                      {log.newValue && <span className="text-emerald-600">New: {log.newValue}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
