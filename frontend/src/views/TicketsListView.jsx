import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  UserPlus, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  ArrowUpDown,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { ticketsAPI } from '../services/api';
import SLABadge, { StatusBadge, PriorityBadge } from '../components/SLABadge';
import { useAuth } from '../context/AuthContext';

export default function TicketsListView({ 
  filterPreset = 'all', 
  onSelectTicket,
  onRefreshTrigger
}) {
  const { agent, agents } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [takeConflictError, setTakeConflictError] = useState(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterPreset === 'my') params.filter = 'my';
      if (filterPreset === 'waiting') params.filter = 'waiting';
      if (filterPreset === 'overdue') params.filter = 'overdue';

      if (selectedStatus) params.status = selectedStatus;
      if (selectedPriority) params.priority = selectedPriority;
      if (selectedAgent) params.agentId = selectedAgent;
      if (search) params.search = search;

      const res = await ticketsAPI.getTickets(params);
      setTickets(res.data.tickets || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filterPreset, selectedStatus, selectedPriority, selectedAgent, onRefreshTrigger]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTickets();
  };

  // Safe Assignment Handler (INC-0291)
  const handleQuickTake = async (e, ticket) => {
    e.stopPropagation();
    try {
      setTakeConflictError(null);
      await ticketsAPI.assignTicket(ticket.id, { targetAgentId: agent.id });
      fetchTickets();
    } catch (err) {
      if (err.response?.status === 409) {
        setTakeConflictError(err.response.data.error || 'Conflict: Ticket was already taken by another agent!');
      } else {
        alert(err.response?.data?.error || 'Failed to claim ticket');
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Concurrency Error Alert Banner if triggered */}
      {takeConflictError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start justify-between shadow-sm">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Concurrency Protection Triggered (INC-0291)</p>
              <p className="text-xs text-amber-800 mt-0.5">{takeConflictError}</p>
            </div>
          </div>
          <button
            onClick={() => setTakeConflictError(null)}
            className="text-xs text-amber-700 hover:text-amber-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, customer name, email, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder-slate-400"
          />
        </form>

        {/* Dropdown Filters */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_CUSTOMER">Waiting on Customer</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent (2h / Same Day)</option>
            <option value="MEDIUM">Medium (4.5h / 3 Days)</option>
            <option value="LOW">Low (1 Day / 1 Week)</option>
          </select>

          {/* Agent Filter */}
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Agents</option>
            <option value="unassigned">Unassigned Only</option>
            {agents.map((ag) => (
              <option key={ag.id} value={ag.id}>{ag.name}</option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearch('');
              setSelectedStatus('');
              setSelectedPriority('');
              setSelectedAgent('');
              fetchTickets();
            }}
            className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Ticket List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500">Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No tickets found</p>
            <p className="text-xs text-slate-400">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200 font-semibold select-none">
                <tr>
                  <th className="py-3.5 px-4">Ticket</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">SLA Deadline</th>
                  <th className="py-3.5 px-4">Assignee</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTicket(t)}
                    className="hover:bg-blue-50/40 transition cursor-pointer group"
                  >
                    {/* Ticket ID & Subject */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-blue-600 group-hover:text-blue-700">
                          {t.ticketNumber}
                        </span>
                      </div>
                      <p className="font-medium text-slate-900 mt-0.5 truncate">{t.subject}</p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{t.description}</p>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-semibold text-slate-800">{t.customerName}</p>
                      <p className="text-[11px] text-slate-400">{t.customerEmail}</p>
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PriorityBadge priority={t.priority} />
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={t.status} />
                    </td>

                    {/* SLA Monitor */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <SLABadge ticket={t} />
                    </td>

                    {/* Assigned Agent */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {t.assignedAgent ? (
                        <div className="flex items-center space-x-2">
                          <img
                            src={t.assignedAgent.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}
                            alt={t.assignedAgent.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="text-slate-700 font-medium">{t.assignedAgent.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic font-mono text-[11px]">Unassigned</span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {!t.assignedAgentId ? (
                        <button
                          onClick={(e) => handleQuickTake(e, t)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 rounded-md text-xs font-semibold transition"
                          title="Claim this unassigned ticket"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Take Ticket</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onSelectTicket(t)}
                          className="text-xs text-slate-500 hover:text-blue-600 font-medium"
                        >
                          View Details →
                        </button>
                      )}
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
