import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Ticket as TicketIcon, 
  UserCheck, 
  Clock, 
  AlertTriangle, 
  History, 
  Calendar, 
  ExternalLink, 
  LogOut, 
  UserCheck2,
  ChevronDown,
  Layers,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentView, setCurrentView, metrics }) {
  const { agent, agents, demoLogin, logout } = useAuth();
  const [showAgentPicker, setShowAgentPicker] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'all-tickets', label: 'All Tickets', icon: TicketIcon, count: metrics?.totalTickets },
    { id: 'my-tickets', label: 'My Tickets', icon: UserCheck, count: metrics?.myTickets },
    { id: 'waiting', label: 'Waiting on Customer', icon: Clock, count: metrics?.waitingCustomerTickets },
    { id: 'overdue', label: 'Overdue Tickets', icon: AlertTriangle, count: metrics?.overdueTickets, isUrgent: (metrics?.overdueTickets || 0) > 0 },
    { id: 'audit', label: 'Activity History', icon: History },
    { id: 'holidays', label: 'Holidays & SLA Rules', icon: Calendar },
    { id: 'customer-simulator', label: 'Customer Portal Simulator', icon: ExternalLink, isSpecial: true },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800 select-none flex-shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-bold">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white tracking-tight leading-tight text-base">Frontdesk</h1>
            <p className="text-xs text-blue-400 font-medium tracking-wide">Arvo Systems Support</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Ticket Management
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : item.isSpecial
                  ? 'text-cyan-400 hover:bg-slate-800/80 hover:text-cyan-300'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : item.isUrgent ? 'text-rose-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : item.isUrgent
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Arvo SLA Hours Notice */}
      <div className="mx-3 mb-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700/50 text-xs text-slate-400">
        <div className="flex items-center space-x-1.5 text-blue-400 font-semibold mb-1">
          <Clock className="w-3.5 h-3.5" />
          <span>Support Hours</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Mon – Fri, 9:30 AM – 6:30 PM IST.<br/>
          Weekends & Holidays paused.
        </p>
      </div>

      {/* Current Agent Profile & Switcher */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="relative">
          <button
            onClick={() => setShowAgentPicker(!showAgentPicker)}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 text-left transition group"
            title="Click to switch support agent account"
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <img
                src={agent?.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}
                alt={agent?.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/30 flex-shrink-0"
              />
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate group-hover:text-blue-300">
                  {agent?.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {agent?.role === 'LEAD' ? '⭐ Support Lead' : 'Support Agent'}
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
          </button>

          {/* Quick Agent Switcher Dropdown */}
          {showAgentPicker && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
              <div className="p-2 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Switch Agent (9 Agents)
                </span>
                <span className="text-[10px] text-blue-400 bg-blue-900/50 px-1.5 py-0.5 rounded">
                  Demo
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-700/50">
                {agents.map((ag) => (
                  <button
                    key={ag.id}
                    onClick={() => {
                      demoLogin(ag.email, ag.id);
                      setShowAgentPicker(false);
                    }}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 text-left hover:bg-slate-700/70 transition text-xs ${
                      ag.id === agent?.id ? 'bg-blue-600/20 text-blue-300 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <img src={ag.avatar} alt={ag.name} className="w-6 h-6 rounded-full object-cover" />
                    <div className="truncate flex-1">
                      <p className="truncate">{ag.name}</p>
                      <p className="text-[10px] text-slate-500">{ag.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className="mt-1 w-full flex items-center justify-center space-x-2 px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
