import React, { useEffect, useState } from 'react';
import { 
  Ticket as TicketIcon, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  PauseCircle, 
  ArrowRight,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  CalendarDays
} from 'lucide-react';
import { ticketsAPI } from '../services/api';
import SLABadge, { StatusBadge, PriorityBadge } from '../components/SLABadge';
import { useAuth } from '../context/AuthContext';

export default function DashboardView({ onSelectTicket, onNavigateTab }) {
  const { agent } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await ticketsAPI.getDashboard();
      setDashboardData(res.data);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading Arvo Systems support dashboard...</p>
        </div>
      </div>
    );
  }

  const { metrics, recentlyUpdated = [], urgentTickets = [], overdueTickets = [] } = dashboardData || {};

  const statCards = [
    {
      title: 'Total Tickets',
      value: metrics?.totalTickets || 0,
      icon: TicketIcon,
      color: 'blue',
      tabId: 'all-tickets',
      desc: 'Active company backlog'
    },
    {
      title: 'Open Tickets',
      value: metrics?.openTickets || 0,
      icon: AlertCircle,
      color: 'sky',
      tabId: 'all-tickets',
      desc: 'Awaiting triage or assignment'
    },
    {
      title: 'In Progress',
      value: metrics?.inProgressTickets || 0,
      icon: TrendingUp,
      color: 'indigo',
      tabId: 'all-tickets',
      desc: 'Being actively resolved'
    },
    {
      title: 'Urgent Priority',
      value: metrics?.urgentTickets || 0,
      icon: AlertTriangle,
      color: 'rose',
      tabId: 'all-tickets',
      desc: 'Same-day resolution SLA'
    },
    {
      title: 'Overdue Tickets',
      value: metrics?.overdueTickets || 0,
      icon: AlertTriangle,
      color: 'red',
      tabId: 'overdue',
      desc: 'Breached working-hours SLA',
      isWarning: (metrics?.overdueTickets || 0) > 0
    },
    {
      title: 'Waiting on Customer',
      value: metrics?.waitingCustomerTickets || 0,
      icon: PauseCircle,
      color: 'amber',
      tabId: 'waiting',
      desc: 'SLA timer paused'
    },
    {
      title: 'My Assigned Tickets',
      value: metrics?.myTickets || 0,
      icon: Users,
      color: 'emerald',
      tabId: 'my-tickets',
      desc: `Assigned to ${agent?.name?.split(' ')[0]}`
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-700/60 text-blue-200 text-xs font-medium mb-2 border border-blue-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Arvo Systems Centralized Support Intelligence</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Welcome back, {agent?.name}
          </h2>
          <p className="text-sm text-blue-100/90 mt-1 max-w-2xl leading-relaxed">
            All 9 support agents are connected. Real-time working-hours SLA calculation (09:30–18:30 IST), atomic assignment locking (INC-0291), and strict private note isolation (INC-0304) are active.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 text-xs space-y-1.5 flex-shrink-0">
          <div className="font-semibold text-white flex items-center space-x-1.5">
            <CalendarDays className="w-4 h-4 text-blue-300" />
            <span>SLA Working Rules</span>
          </div>
          <p className="text-blue-100 text-[11px]">
            • Urgent: 2h Response / Same-Day Fix<br/>
            • Medium: 4.5h Response / 3 Days Fix<br/>
            • Low: 1 Day Response / 1 Week Fix<br/>
            • Weekends & Holidays Excluded
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <button
              key={idx}
              onClick={() => onNavigateTab && onNavigateTab(card.tabId)}
              className={`p-4 rounded-xl border text-left transition hover:shadow-md flex flex-col justify-between ${
                card.isWarning
                  ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/20'
                  : 'bg-white border-slate-200/80 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {card.title}
                </span>
                <Icon className={`w-4 h-4 ${card.isWarning ? 'text-rose-600' : 'text-slate-400'}`} />
              </div>
              <div className="mt-2">
                <span className={`text-2xl font-bold tracking-tight ${card.isWarning ? 'text-rose-600' : 'text-slate-900'}`}>
                  {card.value}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{card.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Overdue Alert Banner if any */}
      {(metrics?.overdueTickets || 0) > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-rose-900">
                {metrics.overdueTickets} ticket(s) have breached Arvo working-hours SLA deadlines!
              </p>
              <p className="text-xs text-rose-700">
                Review overdue items immediately to prevent customer escalation.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('overdue')}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <span>View Overdue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Urgent & Overdue Action Queue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-sm text-slate-800">Critical & Urgent Priority Queue</h3>
            </div>
            <button
              onClick={() => onNavigateTab('all-tickets')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {urgentTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                No urgent tickets requiring immediate resolution.
              </div>
            ) : (
              urgentTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTicket(t)}
                  className="p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-blue-600">{t.ticketNumber}</span>
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="text-xs font-medium text-slate-900 mt-1 truncate">{t.subject}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">Customer: {t.customerName}</p>
                  </div>

                  <div className="flex flex-col items-end flex-shrink-0 space-y-1">
                    <SLABadge ticket={t} />
                    <span className="text-[10px] text-slate-400">
                      {t.assignedAgent ? t.assignedAgent.name : 'Unassigned'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recently Updated Tickets */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-800">Recently Updated Tickets</h3>
            </div>
            <button
              onClick={() => onNavigateTab('all-tickets')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
            >
              <span>Full Queue</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentlyUpdated.slice(0, 5).map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTicket(t)}
                className="p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-blue-600">{t.ticketNumber}</span>
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-xs font-medium text-slate-900 mt-1 truncate">{t.subject}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {t.customerName} ({t.customerEmail})
                  </p>
                </div>

                <div className="flex flex-col items-end flex-shrink-0 space-y-1">
                  <SLABadge ticket={t} />
                  <span className="text-[10px] text-slate-400">
                    {t.assignedAgent ? t.assignedAgent.name : 'Unassigned'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
