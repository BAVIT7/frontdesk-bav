import React from 'react';
import { Clock, AlertCircle, CheckCircle, PauseCircle } from 'lucide-react';

export function formatDurationMinutes(mins) {
  if (mins === null || mins === undefined) return '--';
  const abs = Math.abs(mins);
  const hours = Math.floor(abs / 60);
  const remainingMins = abs % 60;

  if (hours === 0) {
    return `${remainingMins}m`;
  }
  return `${hours}h ${remainingMins}m`;
}

export default function SLABadge({ ticket }) {
  const sla = ticket?.slaStatus;

  if (!sla) return null;

  if (ticket.status === 'WAITING_CUSTOMER') {
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <PauseCircle className="w-3 h-3 text-amber-500" />
        <span>SLA Paused</span>
      </span>
    );
  }

  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle className="w-3 h-3 text-emerald-500" />
        <span>Completed</span>
      </span>
    );
  }

  if (sla.isOverdue) {
    const overdueTime = sla.resolutionRemainingWorkingMinutes !== null && sla.resolutionRemainingWorkingMinutes < 0
      ? formatDurationMinutes(sla.resolutionRemainingWorkingMinutes)
      : sla.firstResponseRemainingWorkingMinutes !== null && sla.firstResponseRemainingWorkingMinutes < 0
      ? formatDurationMinutes(sla.firstResponseRemainingWorkingMinutes)
      : 'Overdue';

    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
        <AlertCircle className="w-3 h-3 text-rose-500" />
        <span>Overdue by {overdueTime}</span>
      </span>
    );
  }

  // Active SLA
  const timeRemaining = sla.firstResponseRemainingWorkingMinutes !== null && !ticket.firstResponseAt
    ? `Resp: ${formatDurationMinutes(sla.firstResponseRemainingWorkingMinutes)}`
    : sla.resolutionRemainingWorkingMinutes !== null
    ? `Fix: ${formatDurationMinutes(sla.resolutionRemainingWorkingMinutes)}`
    : 'Within SLA';

  return (
    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
      <Clock className="w-3 h-3 text-blue-500" />
      <span>{timeRemaining}</span>
    </span>
  );
}

export function StatusBadge({ status }) {
  const configs = {
    OPEN: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', label: 'Open' },
    IN_PROGRESS: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'In Progress' },
    WAITING_CUSTOMER: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Waiting on Customer' },
    RESOLVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Resolved' },
    CLOSED: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', label: 'Closed' },
  };

  const c = configs[status] || configs.OPEN;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${c.bg} ${c.text} border ${c.border}`}>
      {c.label}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const configs = {
    URGENT: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', label: 'Urgent' },
    MEDIUM: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'Medium' },
    LOW: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', label: 'Low / Small' },
  };

  const c = configs[priority] || configs.MEDIUM;

  return (
    <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      <span>{c.label}</span>
    </span>
  );
}
