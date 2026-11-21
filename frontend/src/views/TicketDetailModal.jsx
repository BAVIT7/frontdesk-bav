import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Lock, 
  MessageSquare, 
  History, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  UserCheck, 
  UserPlus, 
  AlertCircle,
  PauseCircle,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import { ticketsAPI } from '../services/api';
import SLABadge, { StatusBadge, PriorityBadge, formatDurationMinutes } from '../components/SLABadge';
import { useAuth } from '../context/AuthContext';
import { DateTime } from 'luxon';

export default function TicketDetailModal({ ticketId, onClose, onTicketUpdated }) {
  const { agent, agents } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('conversation'); // 'conversation' | 'internal' | 'audit'

  // Form states
  const [replyText, setReplyText] = useState('');
  const [replyStatusChange, setReplyStatusChange] = useState('');
  const [noteText, setNoteText] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const res = await ticketsAPI.getTicket(ticketId);
      setTicket(res.data.ticket);
    } catch (err) {
      console.error('Error fetching ticket detail:', err);
      setErrorMessage('Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketId) {
      fetchTicket();
    }
  }, [ticketId]);

  // Handle Safe Ticket Assignment (INC-0291 Concurrency Fix)
  const handleAssign = async (targetAgentId) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      const res = await ticketsAPI.assignTicket(ticket.id, { targetAgentId });
      setSuccessMessage(res.data.message);
      fetchTicket();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      if (err.response?.status === 409) {
        setErrorMessage(err.response.data.error || 'Conflict (INC-0291): Another agent has already taken this ticket!');
      } else {
        setErrorMessage(err.response?.data?.error || 'Failed to assign ticket.');
      }
    }
  };

  // Handle Status Change
  const handleStatusChange = async (newStatus) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      const res = await ticketsAPI.updateStatus(ticket.id, newStatus);
      setSuccessMessage(res.data.message);
      fetchTicket();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to update status.');
    }
  };

  // Handle Priority Change (SLA recalculation)
  const handlePriorityChange = async (newPriority) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      const res = await ticketsAPI.updatePriority(ticket.id, newPriority);
      setSuccessMessage(res.data.message);
      fetchTicket();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to update priority.');
    }
  };

  // Send Public Customer Reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);
      await ticketsAPI.sendReply(ticket.id, {
        content: replyText.trim(),
        statusChange: replyStatusChange || undefined
      });
      setReplyText('');
      setReplyStatusChange('');
      setSuccessMessage('Reply sent to customer.');
      fetchTicket();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to send reply.');
    } finally {
      setSubmitting(false);
    }
  };

  // Add Internal Private Note (INC-0304)
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);
      await ticketsAPI.addInternalNote(ticket.id, noteText.trim());
      setNoteText('');
      setSuccessMessage('Internal confidential note added.');
      fetchTicket();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to add note.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reopen Ticket
  const handleReopen = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMessage(null);
      await ticketsAPI.reopenTicket(ticket.id, reopenReason);
      setShowReopenModal(false);
      setReopenReason('');
      setSuccessMessage('Ticket reopened successfully.');
      fetchTicket();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to reopen ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!ticketId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="p-4 px-6 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-sm font-bold bg-blue-600 px-2.5 py-1 rounded text-white shadow-sm">
              {ticket?.ticketNumber || '...'}
            </span>
            <h2 className="font-bold text-base text-white truncate max-w-xl">
              {ticket?.subject || 'Loading ticket...'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-600 font-bold hover:underline">Dismiss</button>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs text-emerald-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 font-bold hover:underline">Dismiss</button>
          </div>
        )}

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500">Loading ticket intelligence...</p>
          </div>
        ) : ticket ? (
          <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
            {/* Left Main Pane: Conversation & Notes */}
            <div className="flex-1 flex flex-col border-r border-slate-200 min-w-0">
              {/* Problem Description Banner */}
              <div className="p-5 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Customer Problem Description
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Reported {DateTime.fromISO(ticket.createdAt).toFormat('dd MMM yyyy, hh:mm a')}
                  </span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-normal">
                  {ticket.description}
                </p>
              </div>

              {/* Tabs Header */}
              <div className="flex border-b border-slate-200 bg-white px-6">
                <button
                  onClick={() => setActiveTab('conversation')}
                  className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center space-x-2 transition ${
                    activeTab === 'conversation'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Customer Conversation ({ticket.messages?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('internal')}
                  className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center space-x-2 transition ${
                    activeTab === 'internal'
                      ? 'border-amber-500 text-amber-700 bg-amber-50/50'
                      : 'border-transparent text-amber-600 hover:text-amber-700'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Internal Notes ({ticket.internalNotes?.length || 0})</span>
                  <span className="text-[10px] bg-amber-200/80 text-amber-800 px-1.5 py-0.2 rounded font-mono">
                    Team Only
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('audit')}
                  className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center space-x-2 transition ${
                    activeTab === 'audit'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>Audit Trail ({ticket.auditLogs?.length || 0})</span>
                </button>
              </div>

              {/* Tab 1: Customer Conversation */}
              {activeTab === 'conversation' && (
                <div className="flex-1 flex flex-col p-6 space-y-4">
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-96">
                    {ticket.messages?.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No public customer replies yet. Use the box below to send the first response.
                      </div>
                    ) : (
                      ticket.messages.map((m) => {
                        const isAgent = m.senderType === 'AGENT';
                        return (
                          <div
                            key={m.id}
                            className={`p-3.5 rounded-xl border text-xs max-w-xl ${
                              isAgent
                                ? 'ml-auto bg-blue-50/70 border-blue-200 text-blue-950'
                                : 'mr-auto bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1 gap-4">
                              <span className="font-semibold text-[11px] text-slate-700">
                                {m.senderName} {isAgent ? '(Support Agent)' : '(Customer)'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {DateTime.fromISO(m.createdAt).toFormat('hh:mm a, dd MMM')}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Reply Form */}
                  <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-200 space-y-2">
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type a public reply to the customer..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800"
                    />
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <label className="text-[11px] text-slate-600 font-medium">After sending:</label>
                        <select
                          value={replyStatusChange}
                          onChange={(e) => setReplyStatusChange(e.target.value)}
                          className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none"
                        >
                          <option value="">Keep status as-is</option>
                          <option value="WAITING_CUSTOMER">Set to Waiting on Customer (Pauses SLA)</option>
                          <option value="RESOLVED">Mark as Resolved</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || !replyText.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Customer Reply</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tab 2: Internal Private Notes (INC-0304) */}
              {activeTab === 'internal' && (
                <div className="flex-1 flex flex-col p-6 space-y-4 bg-amber-50/20">
                  {/* Strict Isolation Notice */}
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start space-x-2.5 text-xs text-amber-900">
                    <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Confidential Team Notes (INC-0304 Compliance)</p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        These notes are visible <strong>only to support agents</strong>. They are never transmitted in customer-facing API responses, customer screens, or export lists.
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-96">
                    {ticket.internalNotes?.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No internal private notes recorded yet.
                      </div>
                    ) : (
                      ticket.internalNotes.map((n) => (
                        <div
                          key={n.id}
                          className="p-3.5 rounded-xl border bg-amber-50/80 border-amber-200 text-xs text-slate-900 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px] text-amber-900 font-semibold">
                            <span className="flex items-center space-x-1.5">
                              <Lock className="w-3 h-3 text-amber-600" />
                              <span>{n.authorName}</span>
                            </span>
                            <span className="text-[10px] text-amber-700 font-mono">
                              {DateTime.fromISO(n.createdAt).toFormat('hh:mm a, dd MMM yyyy')}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed text-slate-800">{n.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Private Note Form */}
                  <form onSubmit={handleAddNote} className="pt-3 border-t border-slate-200 space-y-2">
                    <textarea
                      rows={3}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Write an internal confidential note for the support team..."
                      className="w-full p-3 bg-white border border-amber-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none text-slate-800"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submitting || !noteText.trim()}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Save Private Note</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tab 3: Immutable Audit Trail (INC-0318) */}
              {activeTab === 'audit' && (
                <div className="p-6 space-y-3 overflow-y-auto max-h-[500px]">
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
                    <span className="font-semibold flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>Legally Defensible Immutable Audit Record (INC-0318)</span>
                    </span>
                    <span className="text-[10px] text-indigo-700 font-mono">No edits or deletions allowed</span>
                  </div>

                  <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 ml-3">
                    {ticket.auditLogs?.map((log) => (
                      <div key={log.id} className="relative group text-xs">
                        {/* Dot indicator */}
                        <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white ring-2 ring-slate-200" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-900">{log.action}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600 font-medium">{log.actorName}</span>
                            <span className="text-slate-400 font-mono text-[10px]">
                              {DateTime.fromISO(log.createdAt).toFormat('dd MMM yyyy, hh:mm:ss a')}
                            </span>
                          </div>
                          <p className="text-slate-700 mt-0.5">{log.description}</p>
                          {(log.previousValue || log.newValue) && (
                            <div className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono text-slate-600">
                              {log.previousValue && <div><strong>Prev:</strong> {log.previousValue}</div>}
                              {log.newValue && <div><strong>New:</strong> {log.newValue}</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar: Ticket Metadata, SLA Controls, Customer Info */}
            <div className="w-full lg:w-80 p-6 bg-slate-50/60 flex flex-col space-y-5 flex-shrink-0 text-xs">
              {/* Assignment Box */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Assigned Agent
                  </span>
                  {ticket.assignedAgent ? (
                    <span className="text-[10px] text-emerald-600 font-medium">Assigned</span>
                  ) : (
                    <span className="text-[10px] text-amber-600 font-medium">Unassigned</span>
                  )}
                </div>

                <div className="flex items-center space-x-2.5">
                  <img
                    src={ticket.assignedAgent?.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}
                    alt="Agent"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20"
                  />
                  <div className="truncate">
                    <p className="font-semibold text-slate-800 truncate">
                      {ticket.assignedAgent?.name || 'Unassigned'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {ticket.assignedAgent?.email || 'Nobody has taken this ticket'}
                    </p>
                  </div>
                </div>

                {/* Claim / Reassign Button */}
                <div className="pt-1">
                  {!ticket.assignedAgentId ? (
                    <button
                      onClick={() => handleAssign(agent.id)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition flex items-center justify-center space-x-1.5 shadow-sm"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Take This Ticket</span>
                    </button>
                  ) : (
                    <select
                      value={ticket.assignedAgentId || ''}
                      onChange={(e) => handleAssign(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none"
                    >
                      {agents.map((ag) => (
                        <option key={ag.id} value={ag.id}>
                          Reassign to {ag.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Status & Priority Controls */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Workflow State
                </span>

                <div>
                  <label className="text-[11px] text-slate-600 font-medium block mb-1">Status</label>
                  <select
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="WAITING_CUSTOMER">Waiting on Customer (SLA Paused)</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-medium block mb-1">
                    Priority (Affects SLA)
                  </label>
                  <select
                    value={ticket.priority}
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                  >
                    <option value="URGENT">Urgent (2h Resp / Same-day Fix)</option>
                    <option value="MEDIUM">Medium (4.5h Resp / 3 Days Fix)</option>
                    <option value="LOW">Low (1 Day Resp / 1 Week Fix)</option>
                  </select>
                </div>
              </div>

              {/* SLA Engine Live Status Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    SLA Deadlines
                  </span>
                  <SLABadge ticket={ticket} />
                </div>

                {ticket.status === 'WAITING_CUSTOMER' ? (
                  <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-[11px] space-y-1">
                    <p className="font-semibold flex items-center space-x-1">
                      <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Timer Currently Paused</span>
                    </p>
                    <p className="text-[10px] text-amber-700">
                      Waiting for customer response. SLA will automatically resume when customer replies.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>First Response:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {ticket.firstResponseDeadline ? DateTime.fromISO(ticket.firstResponseDeadline).toFormat('dd MMM, hh:mm a') : 'N/A'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span>Resolution Target:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {ticket.resolutionDeadline ? DateTime.fromISO(ticket.resolutionDeadline).toFormat('dd MMM, hh:mm a') : 'N/A'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Reopen Check Banner */}
              {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-slate-700">Reopening Window</span>
                    <span className="text-[10px] font-mono text-slate-500">7 Calendar Days</span>
                  </div>
                  {ticket.reopenCheck?.allowed ? (
                    <div>
                      <p className="text-[11px] text-emerald-700">
                        Eligible to reopen ({ticket.reopenCheck.daysRemaining} days left).
                      </p>
                      <button
                        onClick={() => setShowReopenModal(true)}
                        className="mt-2 w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reopen Ticket</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-rose-700">
                      Reopening expired ({ticket.reopenCheck?.reason}). A new ticket must be created.
                    </p>
                  )}
                </div>
              )}

              {/* Customer Contact Details */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Customer Profile
                </span>
                <div>
                  <p className="font-bold text-slate-800">{ticket.customerName}</p>
                  <p className="text-slate-500">{ticket.customerEmail}</p>
                  {ticket.customerPhone && <p className="text-slate-500">{ticket.customerPhone}</p>}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Reopen Dialog Modal */}
        {showReopenModal && (
          <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Reopen Ticket {ticket.ticketNumber}</h3>
              <p className="text-xs text-slate-600">
                Customer requested follow-up within the 7-day allowed window. Please provide the reason.
              </p>
              <textarea
                rows={3}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Reason for reopening..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowReopenModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReopen}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                >
                  Confirm Reopen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
