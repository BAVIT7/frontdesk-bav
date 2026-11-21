import React, { useState } from 'react';
import { Layers, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginView() {
  const { login, demoLogin } = useAuth();
  const [email, setEmail] = useState('meera@arvo.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const demoAgents = [
    { name: 'Meera Nair', email: 'meera@arvo.com', role: 'Support Lead' },
    { name: 'Rahul Sharma', email: 'rahul@arvo.com', role: 'Support Agent' },
    { name: 'Priya Patel', email: 'priya@arvo.com', role: 'Support Agent' },
    { name: 'Amit Verma', email: 'amit@arvo.com', role: 'Support Agent' },
    { name: 'Sneha Rao', email: 'sneha@arvo.com', role: 'Support Agent' },
    { name: 'Vikram Menon', email: 'vikram@arvo.com', role: 'Support Agent' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (agentEmail) => {
    try {
      setLoading(true);
      setError(null);
      await demoLogin(agentEmail);
    } catch (err) {
      setError('Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-blue-600 mx-auto flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
          <Layers className="w-7 h-7" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-white tracking-tight">Frontdesk</h2>
        <p className="mt-1 text-xs text-blue-400 font-medium">Arvo Systems Support Operations Center</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl border border-slate-200 sm:px-10 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Agent Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold text-xs transition shadow-sm flex items-center justify-center space-x-1.5"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In as Agent'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Demo Agent Quick Buttons */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                1-Click Demo Agent Login
              </span>
              <span className="text-[10px] text-slate-400 font-mono">pw: password123</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {demoAgents.map((ag) => (
                <button
                  key={ag.email}
                  type="button"
                  onClick={() => handleQuickLogin(ag.email)}
                  className="p-2 text-left bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition group"
                >
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">{ag.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{ag.role}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
