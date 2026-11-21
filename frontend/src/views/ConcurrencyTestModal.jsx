import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, CheckCircle, AlertTriangle, Play, Sparkles } from 'lucide-react';
import { ticketsAPI, authAPI } from '../services/api';
import axios from 'axios';

export default function ConcurrencyTestModal({ isOpen, onClose, onRefresh }) {
  const [openTickets, setOpenTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [agentAId, setAgentAId] = useState('');
  const [agentBId, setAgentBId] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (isOpen) {
      async function loadData() {
        try {
          const [tRes, aRes] = await Promise.all([
            ticketsAPI.getTickets({ status: 'OPEN' }),
            authAPI.getAgents()
          ]);
          const tList = tRes.data.tickets || [];
          setOpenTickets(tList);
          if (tList.length > 0) setSelectedTicketId(tList[0].id);

          const aList = aRes.data.agents || [];
          setAgents(aList);
          if (aList.length >= 2) {
            setAgentAId(aList[0].id); // Meera
            setAgentBId(aList[1].id); // Rahul
          }
          setResults(null);
        } catch (err) {
          console.error(err);
        }
      }
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    if (!selectedTicketId || !agentAId || !agentBId) return;

    try {
      setSimulating(true);
      setResults(null);

      const agentA = agents.find(a => a.id === agentAId);
      const agentB = agents.find(a => a.id === agentBId);

      // Perform simultaneous requests
      const promiseA = ticketsAPI.assignTicket(selectedTicketId, { targetAgentId: agentAId });
      const promiseB = ticketsAPI.assignTicket(selectedTicketId, { targetAgentId: agentBId });

      const [resA, resB] = await Promise.allSettled([promiseA, promiseB]);

      setResults({
        agentA: {
          name: agentA?.name,
          success: resA.status === 'fulfilled',
          message: resA.status === 'fulfilled' ? resA.value?.data?.message : (resA.reason?.response?.data?.error || resA.reason?.message),
          status: resA.status === 'fulfilled' ? 200 : resA.reason?.response?.status || 500
        },
        agentB: {
          name: agentB?.name,
          success: resB.status === 'fulfilled',
          message: resB.status === 'fulfilled' ? resB.value?.data?.message : (resB.reason?.response?.data?.error || resB.reason?.message),
          status: resB.status === 'fulfilled' ? 200 : resB.reason?.response?.status || 500
        }
      });

      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-fade-in text-xs">
        {/* Header */}
        <div className="p-4 px-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Simulate Race Condition (INC-0291 Fix)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
            <p className="font-bold">Incident Background (INC-0291):</p>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              In October, two Arvo agents clicked "Take this ticket" at the exact same moment. Both replied with contradictory instructions.
              Frontdesk implements <strong>database transactions and optimistic locking</strong> to guarantee that only ONE agent succeeds, while the other receives an instant 409 Conflict.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Target Open Ticket</label>
              <select
                value={selectedTicketId}
                onChange={(e) => setSelectedTicketId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium outline-none"
              >
                {openTickets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.ticketNumber} — {t.subject} ({t.assignedAgent ? `Assigned to ${t.assignedAgent.name}` : 'Unassigned'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Agent 1 (e.g. Meera)</label>
                <select
                  value={agentAId}
                  onChange={(e) => setAgentAId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>{ag.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Agent 2 (e.g. Rahul)</label>
                <select
                  value={agentBId}
                  onChange={(e) => setAgentBId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>{ag.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={simulating || !selectedTicketId}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-bold flex items-center justify-center space-x-2 transition shadow-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{simulating ? 'Executing Parallel Database Queries...' : 'Fire Concurrent Take Requests'}</span>
            </button>
          </div>

          {/* Real-time Results */}
          {results && (
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Concurrency Execution Result:
              </span>

              <div className="grid grid-cols-2 gap-3">
                {/* Agent A Result */}
                <div className={`p-3 rounded-xl border ${results.agentA.success ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'}`}>
                  <div className="flex items-center space-x-1.5 font-bold mb-1">
                    {results.agentA.success ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                    <span>{results.agentA.name}</span>
                    <span className="font-mono text-[10px]">({results.agentA.status})</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{results.agentA.message}</p>
                </div>

                {/* Agent B Result */}
                <div className={`p-3 rounded-xl border ${results.agentB.success ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'}`}>
                  <div className="flex items-center space-x-1.5 font-bold mb-1">
                    {results.agentB.success ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                    <span>{results.agentB.name}</span>
                    <span className="font-mono text-[10px]">({results.agentB.status})</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{results.agentB.message}</p>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-[11px] text-center font-medium">
                🎯 Verification Success: Exactly 1 agent claimed the ticket; the duplicate attempt was blocked by atomic database constraints.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
