const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const config = require('../config');
const { authenticateAgent } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Log in support agent
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const agent = await prisma.agent.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!agent) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, agent.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: agent.id, email: agent.email, role: agent.role },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful',
      token,
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        avatar: agent.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'An error occurred during login.' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated agent
 */
router.get('/me', authenticateAgent, async (req, res) => {
  return res.json({ agent: req.agent });
});

/**
 * GET /api/auth/agents
 * List all 9 Arvo Systems support agents
 */
router.get('/agents', authenticateAgent, async (req, res) => {
  try {
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: {
                  in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER']
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return res.json({ agents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return res.status(500).json({ error: 'Failed to fetch support agents.' });
  }
});

/**
 * POST /api/auth/demo-login
 * Direct demo login for testing purposes (switches active agent instantly)
 */
router.post('/demo-login', async (req, res) => {
  try {
    const { agentId, email } = req.body;
    let agent;

    if (agentId) {
      agent = await prisma.agent.findUnique({ where: { id: agentId } });
    } else if (email) {
      agent = await prisma.agent.findUnique({ where: { email: email.toLowerCase().trim() } });
    } else {
      // Default to Meera (Support Lead)
      agent = await prisma.agent.findFirst({ orderBy: { name: 'asc' } });
    }

    if (!agent) {
      return res.status(404).json({ error: 'Demo agent not found.' });
    }

    const token = jwt.sign(
      { id: agent.id, email: agent.email, role: agent.role },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: `Logged in as demo agent ${agent.name}`,
      token,
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
        avatar: agent.avatar
      }
    });
  } catch (error) {
    console.error('Demo login error:', error);
    return res.status(500).json({ error: 'Failed to perform demo login.' });
  }
});

module.exports = router;
