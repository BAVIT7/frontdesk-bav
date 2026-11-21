const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticateAgent } = require('../middleware/auth');

/**
 * GET /api/audit-logs
 * Read-only immutable audit history log explorer (INC-0318)
 * Allows Arvo Systems managers and agents to prove who did what, and when.
 * NO PUT/PATCH/DELETE endpoints exist for audit logs!
 */
router.get('/', authenticateAgent, async (req, res) => {
  try {
    const { ticketId, action, search, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (ticketId) where.ticketId = ticketId;
    if (action) where.action = action;
    if (search) {
      where.OR = [
        { actorName: { contains: search } },
        { description: { contains: search } },
        { ticket: { ticketNumber: { contains: search } } }
      ];
    }

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          ticket: {
            select: { id: true, ticketNumber: true, subject: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit, 10),
        skip: parseInt(offset, 10)
      }),
      prisma.auditLog.count({ where })
    ]);

    return res.json({
      totalCount,
      logs
    });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    return res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});

module.exports = router;
