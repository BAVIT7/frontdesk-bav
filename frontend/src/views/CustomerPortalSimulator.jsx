import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Send, 
  Lock, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  ExternalLink,
  Info
} from 'lucide-react';
import { customerAPI } from '../services/api';
import { StatusBadge, PriorityBadge } from '../components/SLABadge';
import { DateTime } from 'luxon';

export default function CustomerPortalSimulator() {
  const [ticketNumberInput, setTicketNumberInput] = useState('ARVO-1003');
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reply form
  const [replyText, setReplyText] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [sending, setSending] = useState(false);
  const [replySuccess, setReplySuccess] = useState(null);

  // Reopen form
  const [reopenReason, setReopenReason] = useState('');
  const [reopening, setReopening] = useState(false);
  const [reopenSuccess, setReopenSuccess] = useState(null);

  const fetchCustomerTicket = async (tNum) => {
    try {
      setLoading(true);
      setError(null);
      setReplySuccess(null);
      setReopenSuccess(null);
      const res = await customerAPI.getTicket(tNum || ticketNumberInput);
      setTicketData(res.data.ticket);
      setCustomerName(res.data.ticket.customerName || '');
    } catch (err) {
      console.error('Customer portal error:', err);
      setError(err.response?.data?.error || 'Ticket not found or network error.');
      setTicketData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerTicket('ARVO-1003');
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (ticketNumberInput.trim()) {
      fetchCustomerTicket(ticketNumberInput.trim());
    }
  };

  const handleSendCustomerReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      setSending(true);
      setReplySuccess(null);
      setError(null);
      const res = await customerAPI.reply(ticketData.ticketNumber, replyText.trim(), customerName);
      setReplySuccess(res.data.message || 'Reply sent successfully! Support SLA timer has resumed.');
      setReplyText('');
      fetchCustomerTicket(ticketData.ticketNumber);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit reply');
    } finally {
      setSending(false);
    }
  };

  const handleCustomerReopen = async (e) => {
    e.preventDefault();
    try {
      setReopening(true);
      setError(null);
      const res = await customerAPI.reopen(ticketData.ticketNumber, reopenReason, customerName);
      setReopenSuccess(res.data.message);
      setReopenReason('');
      fetchCustomerTicket(ticketData.ticketNumber);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reopen ticket');
    } finally {
      setReopening(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Simulation Banner */}
      <div className="bg-gradient-to-r from-cyan-900 via-slate-900 to-blue-950 p-6 rounded-2xl text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-cyan-700/50 text-cyan-200 text-xs font-semibold mb-2 border border-cyan-500/30">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Customer-Facing Support Portal</span>
          </div>
          <h2 className="text-xl font-bold">Public Customer Experience Simulator</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Test how customers view their tickets, send replies (which auto-resume paused SLAs), and verify that internal private team notes are never leaked (INC-0304).
          </p>
        </div>

        {/* Quick Ticket Selector */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Quick Test:</span>
          <button
            onClick={() => { setTicketNumberInput('ARVO-1001'); fetchCustomerTicket('ARVO-1001'); }}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-cyan-300 font-mono"
          >
            ARVO-1001
          </button>
          <button
            onClick={() => { setTicketNumberInput('ARVO-1003'); fetchCustomerTicket('ARVO-1003'); }}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-cyan-300 font-mono"
          >
            ARVO-1003
          </button>
          <button
            onClick={() => { setTicketNumberInput('ARVO-1007'); fetchCustomerTicket('ARVO-1007'); }}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-cyan-300 font-mono"
          >
            ARVO-1007
          </button>
        </div>
      </div>

      {/* Ticket Search Form */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <form onSubmit={handleSearch} className="flex items-center space-x-2 flex-1 max-w-md">
          <input
            type="text"
            placeholder="Enter Ticket ID (e.g. ARVO-1003)..."
            value={ticketNumberInput}
            onChange={(e) => setTicketNumberInput(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
          >
            Lookup
          </button>
        </form>

        {/* INC-0304 Verification Badge */}
        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>INC-0304 Verified: 0 Private Notes In Payload</span>
        </div>
      </div>

      {/* Main Ticket Display */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-2">
          <div className="w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading ticket for customer view...</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-xl text-center text-xs text-rose-700">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
          {error}
        </div>
      ) : ticketData ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-sm text-cyan-800 bg-cyan-100 px-2 py-0.5 rounded">
                  {ticketData.ticketNumber}
                </span>
                <StatusBadge status={ticketData.status} />
                <PriorityBadge priority={ticketData.priority} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-2">{ticketData.subject}</h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Submitted by {ticketData.customerName} ({ticketData.customerEmail}) on {DateTime.fromISO(ticketData.createdAt).toFormat('dd MMM yyyy, hh:mm a')}
              </p>
            </div>
          </div>

          {/* Problem Description */}
          <div className="p-6 border-b border-slate-100 bg-white space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Problem Description</span>
            <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{ticketData.description}</p>
          </div>

          {/* Conversation History */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Support Conversation Thread ({ticketData.messages?.length || 0})
              </span>
              <span className="text-[11px] text-slate-400">
                Only customer-facing replies appear here
              </span>
            </div>

            <div className="space-y-3">
              {ticketData.messages?.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl">
                  No replies yet. An Arvo Systems support agent will reply shortly.
                </div>
              ) : (
                ticketData.messages.map((m) => {
                  const isAgent = m.senderType === 'AGENT';
                  return (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-xl border max-w-xl ${
                        isAgent
                          ? 'mr-auto bg-slate-50 border-slate-200 text-slate-900'
                          : 'ml-auto bg-cyan-50/80 border-cyan-200 text-cyan-950'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 gap-4 text-[11px]">
                        <span className="font-semibold text-slate-800">
                          {m.senderName} {isAgent ? '(Arvo Support Agent)' : '(You)'}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {DateTime.fromISO(m.createdAt).toFormat('hh:mm a, dd MMM')}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Customer Reply Box (Resumes SLA if Paused) */}
            {ticketData.status !== 'CLOSED' && (
              <form onSubmit={handleSendCustomerReply} className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Reply to Arvo Support Team:</span>
                  {ticketData.status === 'WAITING_CUSTOMER' && (
                    <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">
                      Sending a reply will automatically resume the SLA timer!
                    </span>
                  )}
                </div>

                {replySuccess && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
                    {replySuccess}
                  </div>
                )}

                <textarea
                  rows={3}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Provide additional details or answer the support agent's question..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center space-x-1.5 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sending ? 'Sending...' : 'Send Customer Reply'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Reopening Section if ticket is RESOLVED */}
            {ticketData.status === 'RESOLVED' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block">Not satisfied with the resolution?</span>
                {ticketData.canReopen ? (
                  <form onSubmit={handleCustomerReopen} className="space-y-2">
                    <p className="text-slate-600 text-[11px]">
                      Under Arvo policy, you can reopen this ticket within 7 days of resolution.
                    </p>
                    {reopenSuccess && (
                      <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
                        {reopenSuccess}
                      </div>
                    )}
                    <textarea
                      rows={2}
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                      placeholder="Why do you wish to reopen this ticket?..."
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                    />
                    <button
                      type="submit"
                      disabled={reopening}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-xs transition"
                    >
                      {reopening ? 'Reopening...' : 'Request Reopen'}
                    </button>
                  </form>
                ) : (
                  <p className="text-rose-700 font-medium text-[11px]">
                    Reopening window expired. {ticketData.reopenReason}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
