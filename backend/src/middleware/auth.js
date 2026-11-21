const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../db');

/**
 * Middleware to authenticate support agents via Bearer JWT token
 */
async function authenticateAgent(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. No valid Bearer token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);

    const agent = await prisma.agent.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true
      }
    });

    if (!agent) {
      return res.status(401).json({ error: 'Agent account not found or has been deactivated.' });
    }

    req.agent = agent;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Authentication token has expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

/**
 * Optional authentication middleware: if token is valid agent, sets req.agent, otherwise continues
 */
async function optionalAgentAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.JWT_SECRET);
      const agent = await prisma.agent.findUnique({
        where: { id: decoded.id },
        select: { id: true, name: true, email: true, role: true, avatar: true }
      });
      if (agent) {
        req.agent = agent;
      }
    }
  } catch (err) {
    // Ignore invalid token in optional auth
  }
  next();
}

module.exports = {
  authenticateAgent,
  optionalAgentAuth
};
