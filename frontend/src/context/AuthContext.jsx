import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [agent, setAgent] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('frontdesk_token') || null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize auth
  useEffect(() => {
    async function initAuth() {
      if (token) {
        try {
          const res = await authAPI.getMe();
          setAgent(res.data.agent);
          const agentsRes = await authAPI.getAgents();
          setAgents(agentsRes.data.agents || []);
        } catch (err) {
          console.error('Failed to verify token:', err);
          logout();
        }
      }
      setLoading(false);
    }
    initAuth();
  }, [token]);

  const loadAgents = async () => {
    try {
      const res = await authAPI.getAgents();
      setAgents(res.data.agents || []);
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  };

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    const { token: newToken, agent: newAgent } = res.data;
    localStorage.setItem('frontdesk_token', newToken);
    localStorage.setItem('frontdesk_agent', JSON.stringify(newAgent));
    setToken(newToken);
    setAgent(newAgent);
    loadAgents();
    return newAgent;
  };

  const demoLogin = async (email, agentId) => {
    const res = await authAPI.demoLogin(email, agentId);
    const { token: newToken, agent: newAgent } = res.data;
    localStorage.setItem('frontdesk_token', newToken);
    localStorage.setItem('frontdesk_agent', JSON.stringify(newAgent));
    setToken(newToken);
    setAgent(newAgent);
    loadAgents();
    return newAgent;
  };

  const logout = () => {
    localStorage.removeItem('frontdesk_token');
    localStorage.removeItem('frontdesk_agent');
    setToken(null);
    setAgent(null);
  };

  return (
    <AuthContext.Provider
      value={{
        agent,
        token,
        agents,
        loading,
        login,
        demoLogin,
        logout,
        loadAgents,
        isAuthenticated: !!agent
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
