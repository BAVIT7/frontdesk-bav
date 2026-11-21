import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import DashboardView from './views/DashboardView';
import TicketsListView from './views/TicketsListView';
import TicketDetailModal from './views/TicketDetailModal';
import CreateTicketModal from './views/CreateTicketModal';
import ConcurrencyTestModal from './views/ConcurrencyTestModal';
import ActivityHistoryView from './views/ActivityHistoryView';
import HolidaysView from './views/HolidaysView';
import CustomerPortalSimulator from './views/CustomerPortalSimulator';
import LoginView from './views/LoginView';
import { ticketsAPI } from './services/api';

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isConcurrencyOpen, setIsConcurrencyOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [metrics, setMetrics] = useState(null);
  const [notification, setNotification] = useState(null);

  // Fetch metrics for sidebar counters
  const fetchSidebarMetrics = async () => {
    try {
      const res = await ticketsAPI.getDashboard();
      setMetrics(res.data.metrics);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSidebarMetrics();
    }
  }, [isAuthenticated, refreshTrigger]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRunAutoClose = async () => {
    try {
      const res = await ticketsAPI.runAutoClose();
      setNotification({
        type: 'success',
        text: res.data.message
      });
      handleRefresh();
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setNotification({
        type: 'error',
        text: 'Failed to run auto-close process'
      });
    }
  };

  const viewTitles = {
    'dashboard': { title: 'Support Operations Dashboard', subtitle: 'Arvo Systems 9-Agent Centralized Queue & Deadlines' },
    'all-tickets': { title: 'All Support Tickets', subtitle: 'Search, filter, and assign tickets across the entire backlog' },
    'my-tickets': { title: 'My Assigned Tickets', subtitle: 'Active tickets in your personal working queue' },
    'waiting': { title: 'Tickets Waiting on Customer', subtitle: 'SLA timer is paused until customer reply is received' },
    'overdue': { title: 'Overdue Tickets Queue', subtitle: 'Tickets that breached working-hours SLA deadlines' },
    'audit': { title: 'Immutable Activity History', subtitle: 'Comprehensive audit trail proving who did what and when (INC-0318)' },
    'holidays': { title: 'Festival Holidays & SLA Architecture', subtitle: 'Kerala holiday calendar & working hours engine specifications' },
    'customer-simulator': { title: 'Customer Experience Simulator', subtitle: 'Verify customer view and confirm zero internal note leaks (INC-0304)' },
  };

  const currentInfo = viewTitles[currentView] || viewTitles.dashboard;

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        metrics={metrics}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <TopHeader
          title={currentInfo.title}
          subtitle={currentInfo.subtitle}
          onNewTicket={() => setIsCreateOpen(true)}
          onOpenConcurrencyTest={() => setIsConcurrencyOpen(true)}
          onRunAutoClose={handleRunAutoClose}
          onRefresh={handleRefresh}
        />

        {/* Global Notification Toast */}
        {notification && (
          <div className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between shadow-sm ${
            notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}>
            <span>{notification.text}</span>
            <button onClick={() => setNotification(null)} className="hover:opacity-75">✕</button>
          </div>
        )}

        {/* Dynamic Body Views */}
        <main className="flex-1 overflow-y-auto bg-slate-100/70">
          {currentView === 'dashboard' && (
            <DashboardView
              onSelectTicket={(t) => setSelectedTicket(t)}
              onNavigateTab={(tab) => setCurrentView(tab)}
            />
          )}

          {currentView === 'all-tickets' && (
            <TicketsListView
              filterPreset="all"
              onSelectTicket={(t) => setSelectedTicket(t)}
              onRefreshTrigger={refreshTrigger}
            />
          )}

          {currentView === 'my-tickets' && (
            <TicketsListView
              filterPreset="my"
              onSelectTicket={(t) => setSelectedTicket(t)}
              onRefreshTrigger={refreshTrigger}
            />
          )}

          {currentView === 'waiting' && (
            <TicketsListView
              filterPreset="waiting"
              onSelectTicket={(t) => setSelectedTicket(t)}
              onRefreshTrigger={refreshTrigger}
            />
          )}

          {currentView === 'overdue' && (
            <TicketsListView
              filterPreset="overdue"
              onSelectTicket={(t) => setSelectedTicket(t)}
              onRefreshTrigger={refreshTrigger}
            />
          )}

          {currentView === 'audit' && (
            <ActivityHistoryView
              onSelectTicketNumber={(num) => {
                // look up ticket
              }}
            />
          )}

          {currentView === 'holidays' && (
            <HolidaysView />
          )}

          {currentView === 'customer-simulator' && (
            <CustomerPortalSimulator />
          )}
        </main>
      </div>

      {/* Modals */}
      {selectedTicket && (
        <TicketDetailModal
          ticketId={selectedTicket.id}
          onClose={() => setSelectedTicket(null)}
          onTicketUpdated={handleRefresh}
        />
      )}

      {isCreateOpen && (
        <CreateTicketModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(newTicket) => {
            handleRefresh();
            setSelectedTicket(newTicket);
          }}
        />
      )}

      {isConcurrencyOpen && (
        <ConcurrencyTestModal
          isOpen={isConcurrencyOpen}
          onClose={() => setIsConcurrencyOpen(false)}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
