const express = require('express');
const router = express.Router();
const prisma = require('../db');
const slaService = require('../services/slaService');
const { authenticateAgent } = require('../middleware/auth');

/**
 * GET /api/tickets/dashboard
 * Aggregated metrics & summary for Arvo Systems dashboard
 */
router.get('/dashboard', authenticateAgent, async (req, res) => {
  try {
    const holidays = await prisma.holiday.findMany({ select: { date: true } });
    const holidayDates = holidays.map(h => h.date);
    const now = new Date();

    const allTickets = await prisma.ticket.findMany({
      include: {
        assignedAgent: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    let openCount = 0;
    let inProgressCount = 0;
    let waitingCustomerCount = 0;
    let resolvedCount = 0;
    let closedCount = 0;
    let urgentCount = 0;
    let overdueCount = 0;
    let myTicketsCount = 0;

    const ticketsWithSLA = allTickets.map(ticket => {
      const sla = slaService.getSLAStatus(ticket, now, holidayDates);

      if (ticket.status === 'OPEN') openCount++;
      else if (ticket.status === 'IN_PROGRESS') inProgressCount++;
      else if (ticket.status === 'WAITING_CUSTOMER') waitingCustomerCount++;
      else if (ticket.status === 'RESOLVED') resolvedCount++;
      else if (ticket.status === 'CLOSED') closedCount++;

      if (ticket.priority === 'URGENT' && ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED') {
        urgentCount++;
      }

      if (sla.isOverdue) {
        overdueCount++;
      }

      if (ticket.assignedAgentId === req.agent.id && ticket.status !== 'CLOSED') {
        myTicketsCount++;
      }

      return {
        ...ticket,
        slaStatus: sla
      };
    });

    const recentlyUpdated = ticketsWithSLA.slice(0, 7);
    const urgentTickets = ticketsWithSLA.filter(t => t.priority === 'URGENT' && t.status !== 'RESOLVED' && t.status !== 'CLOSED').slice(0, 5);
    const overdueTickets = ticketsWithSLA.filter(t => t.slaStatus.isOverdue).slice(0, 5);

    return res.json({
      metrics: {
        totalTickets: allTickets.length,
        openTickets: openCount,
        inProgressTickets: inProgressCount,
        waitingCustomerTickets: waitingCustomerCount,
        resolvedTickets: resolvedCount,
        closedTickets: closedCount,
        urgentTickets: urgentCount,
        overdueTickets: overdueCount,
        myTickets: myTicketsCount
      },
      recentlyUpdated,
      urgentTickets,
      overdueTickets
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Failed to load dashboard metrics.' });
  }
});

/**
 * GET /api/tickets
 * List tickets with filters (all, my, waiting, overdue, search, priority, status)
 */
router.get('/', authenticateAgent, async (req, res) => {
  try {
    const { filter, status, priority, agentId, search } = req.query;
    const holidays = await prisma.holiday.findMany({ select: { date: true } });
    const holidayDates = holidays.map(h => h.date);
    const now = new Date();

    const where = {};

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (agentId) {
      if (agentId === 'unassigned') {
        where.assignedAgentId = null;
      } else {
        where.assignedAgentId = agentId;
      }
    }

    if (filter === 'my') {
      where.assignedAgentId = req.agent.id;
    } else if (filter === 'waiting') {
      where.status = 'WAITING_CUSTOMER';
    }

    if (search) {
      const q = search.trim();
      where.OR = [
        { ticketNumber: { contains: q } },
        { subject: { contains: q } },
        { customerName: { contains: q } },
        { customerEmail: { contains: q } }
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        assignedAgent: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        _count: {
          select: {
            messages: true,
            internalNotes: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    let ticketsWithSLA = tickets.map(ticket => {
      const sla = slaService.getSLAStatus(ticket, now, holidayDates);
      return {
        ...ticket,
        slaStatus: sla
      };
    });

    if (filter === 'overdue') {
      ticketsWithSLA = ticketsWithSLA.filter(t => t.slaStatus.isOverdue);
    }

    return res.json({ tickets: ticketsWithSLA });
  } catch (error) {
    console.error('Get tickets error:', error);
    return res.status(500).json({ error: 'Failed to fetch tickets.' });
  }
});

/**
 * GET /api/tickets/:id
 * Full ticket details (including internal notes, messages, assignments, and audit logs)
 */
router.get('/:id', authenticateAgent, async (req, res) => {
  try {
    const { id } = req.params;
    const holidays = await prisma.holiday.findMany({ select: { date: true } });
    const holidayDates = holidays.map(h => h.date);

    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [{ id }, { ticketNumber: id }]
      },
      include: {
        assignedAgent: {
          select: { id: true, name: true, email: true, avatar: true, role: true }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        internalNotes: { // Allowed only because user is an authenticated AGENT (INC-0304)
          orderBy: { createdAt: 'desc' }
        },
        assignments: {
          include: {
            agent: { select: { id: true, name: true } },
            assignedByAgent: { select: { id: true, name: true } }
          },
          orderBy: { assignedAt: 'desc' }
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' }
        },
        slaEvents: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const slaStatus = slaService.getSLAStatus(ticket, new Date(), holidayDates);
    const reopenCheck = slaService.canReopenTicket(ticket, new Date());

    return res.json({
      ticket: {
        ...ticket,
        slaStatus,
        reopenCheck
      }
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    return res.status(500).json({ error: 'Failed to retrieve ticket details.' });
  }
});

/**
 * POST /api/tickets
 * Create new customer support ticket
 */
router.post('/', authenticateAgent, async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, subject, description, priority = 'MEDIUM' } = req.body;

    if (!customerName || !customerEmail || !subject || !description) {
      return res.status(400).json({ error: 'Customer name, email, subject, and description are required.' });
    }

    const holidays = await prisma.holiday.findMany({ select: { date: true } });
    const holidayDates = holidays.map(h => h.date);
    const now = new Date();

    // Generate unique sequential ticket number
    const count = await prisma.ticket.count();
    const ticketNumber = `ARVO-${1001 + count}`;

    // SLA calculation
    const initialSLA = slaService.calculateInitialSLADeadlines(now, priority, holidayDates);

    const newTicket = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          ticketNumber,
          customerName: customerName.trim(),
          customerEmail: customerEmail.toLowerCase().trim(),
          customerPhone: customerPhone ? customerPhone.trim() : null,
          subject: subject.trim(),
          description: description.trim(),
          priority,
          status: 'OPEN',
          createdAt: now,
          firstResponseDeadline: initialSLA.firstResponseDeadline,
          resolutionDeadline: initialSLA.resolutionDeadline
        }
      });

      // Immutable Audit Log
      await tx.auditLog.create({
        data: {
          ticketId: ticket.id,
          actorType: 'AGENT',
          actorId: req.agent.id,
          actorName: req.agent.name,
          action: 'CREATED',
          newValue: JSON.stringify({ priority, status: 'OPEN', subject: ticket.subject }),
          description: `Ticket ${ticket.ticketNumber} created by ${req.agent.name}`
        }
      });

      // SLA Initial Event
      await tx.sLAEvent.create({
        data: {
          ticketId: ticket.id,
          eventType: 'INITIAL_CALCULATION',
          newPriority: priority,
          reason: `Initial SLA deadlines configured for ${priority} priority`
        }
      });

      return ticket;
    });

    return res.status(201).json({
      message: 'Ticket created successfully',
      ticket: newTicket
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    return res.status(500).json({ error: 'Failed to create ticket.' });
  }
});

/**
 * POST /api/tickets/:id/assign
 * CRITICAL REQUIREMENT (INC-0291): Safe ticket assignment with concurrency protection!
 * Two agents must NEVER be able to take the same unassigned ticket simultaneously.
 */
router.post('/:id/assign', authenticateAgent, async (req, res) => {
  try {
    const { id } = req.params;
    const { targetAgentId, note } = req.body;
    const agentToAssignId = targetAgentId || req.agent.id;

    const assignedAgent = await prisma.agent.findUnique({
      where: { id: agentToAssignId }
    });

    if (!assignedAgent) {
      return res.status(404).json({ error: 'Assigned agent not found.' });
    }

    // Execute atomic check-and-set transaction with optimistic locking
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.ticket.findFirst({
        where: { OR: [{ id }, { ticketNumber: id }] },
        include: { assignedAgent: true }
      });

      if (!existing) {
        const err = new Error('Ticket not found.');
        err.statusCode = 404;
        throw err;
      }

      // Check if self-taking an already assigned ticket
      if (existing.assignedAgentId && existing.assignedAgentId !== agentToAssignId) {
        // If an agent tries to take a ticket that has already been taken by someone else
        const err = new Error(
          `Conflict (INC-0291): This ticket has already been taken by ${existing.assignedAgent?.name || 'another agent'}. Duplicate assignment prevented.`
        );
        err.statusCode = 409;
        err.conflict = true;
        err.currentAssignee = existing.assignedAgent;
        throw err;
      }

      // Atomic update with version check
      const updated = await tx.ticket.update({
        where: {
          id: existing.id,
          version: existing.version
        },
        data: {
          assignedAgentId: agentToAssignId,
          assignedAt: new Date(),
          status: existing.status === 'OPEN' ? 'IN_PROGRESS' : existing.status,
          version: { increment: 1 }
        },
        include: {
          assignedAgent: {
            select: { id: true, name: true, email: true, avatar: true }
          }
        }
      });

      // Record assignment history
      await tx.ticketAssignment.create({
        data: {
          ticketId: existing.id,
          agentId: agentToAssignId,
          assignedByAgentId: req.agent.id,
          note: note || (agentToAssignId === req.agent.id ? 'Self-assigned' : `Assigned by ${req.agent.name}`)
        }
      });

      // Record immutable Audit Log
      await tx.auditLog.create({
        data: {
          ticketId: existing.id,
          actorType: 'AGENT',
          actorId: req.agent.id,
          actorName: req.agent.name,
          action: 'ASSIGNED',
          previousValue: JSON.stringify({ assignedAgentId: existing.assignedAgentId, status: existing.status }),
          newValue: JSON.stringify({ assignedAgentId: agentToAssignId, status: updated.status }),
          description: `Ticket assigned to ${assignedAgent.name} by ${req.agent.name}`
        }
      });

      return updated;
    });

    return res.json({
      message: `Ticket successfully assigned to ${assignedAgent.name}`,
      ticket: result
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({
        error: error.message,
        conflict: true,
        currentAssignee: error.currentAssignee
      });
    }
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Assignment error:', error);
    return res.status(500).json({ error: 'Failed to assign ticket.' });
  }
});

/**
 * PATCH /api/tickets/:id/status
 * Update ticket status with SLA pause/resume rules
 */
router.patch('/:id/status', authenticateAgent, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const holidays = await prisma.holiday.findMany({ select: { date: true } });
    const holidayDates = holidays.map(h => h.date);
    const now = new Date();

    const existing = await prisma.ticket.findFirst({
      where: { OR: [{ id }, { ticketNumber: id }] }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    if (existing.status === status) {
      return res.json({ message: 'Status is already ' + status, ticket: existing });
    }

    // Reopen validation if moving from RESOLVED/CLOSED to OPEN/IN_PROGRESS
    if ((existing.status === 'RESOLVED' || existing.status === 'CLOSED') && (status === 'OPEN' || status === 'IN_PROGRESS')) {
      const reopenCheck = slaService.canReopenTicket(existing, now);
      if (!reopenCheck.allowed) {
        return res.status(400).json({ error: reopenCheck.reason });
      }
    }

    let updateData = {
      status,
      version: { increment: 1 }
    };

    let slaEventData = null;

    // Moving TO WAITING_CUSTOMER: Pause SLA timer!
    if (status === 'WAITING_CUSTOMER' && existing.status !== 'WAITING_CUSTOMER') {
      updateData.slaPausedAt = now;
      slaEventData = {
        eventType: 'PAUSE',
        pausedAt: now,
        reason: 'SLA paused while waiting for customer response'
      };
    }

    // Moving AWAY from WAITING_CUSTOMER: Resume SLA timer!
    if (existing.status === 'WAITING_CUSTOMER' && status !== 'WAITING_CUSTOMER') {
      const resumeResult = slaService.resumeSLAAfterCustomerReply(existing, now, holidayDates);
      updateData.firstResponseDeadline = resumeResult.firstResponseDeadline;
      updateData.resolutionDeadline = resumeResult.resolutionDeadline;
      updateData.slaPausedAt = null;
      updateData.totalPausedWorkingMinutes = { increment: resumeResult.pausedWorkingMinutes };

      slaEventData = {
        eventType: 'RESUME',
        resumedAt: now,
        workingMinutesAdded: resumeResult.pausedWorkingMinutes,
        reason: `SLA resumed. Deadlines extended by ${resumeResult.pausedWorkingMinutes} working minutes.`
      };
    }

    // Moving to RESOLVED
    if (status === 'RESOLVED' && !existing.resolvedAt) {
      updateData.resolvedAt = now;
    }

    // Moving to CLOSED
    if (status === 'CLOSED' && !existing.closedAt) {
      updateData.closedAt = now;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.update({
        where: { id: existing.id },
        data: updateData,
        include: {
          assignedAgent: {
            select: { id: true, name: true, email: true, avatar: true }
          }
        }
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          ticketId: existing.id,
          actorType: 'AGENT',
          actorId: req.agent.id,
          actorName: req.agent.name,
          action: 'STATUS_CHANGE',
          previousValue: JSON.stringify({ status: existing.status }),
          newValue: JSON.stringify({ status }),
          description: note || `Status changed from ${existing.status} to ${status} by ${req.agent.name}`
        }
      });

      if (slaEventData) {
        await tx.sLAEvent.create({
          data: {
            ticketId: existing.id,
            ...slaEventData
          }
        });
      }

      return ticket;
    });

    return res.json({
      message: `Status updated to ${status}`,
      ticket: updated
    });
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ error: 'Failed to update ticket status.' });
  }
});

/**
 * PATCH /api/tickets/:id/priority
 * Change ticket priority with documented SLA recalculation rule
 */
router.patch('/:id/priority', authenticateAgent, async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    const validPriorities = ['URGENT', 'MEDIUM', 'LOW'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` });
    }

    const holidays = await prisma.holiday.findMany({ select: { date: true } });
    const holidayDates = holidays.map(h => h.date);
    const now = new Date();

    const existing = await prisma.ticket.findFirst({
      where: { OR: [{ id }, { ticketNumber: id }] }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    if (existing.priority === priority) {
      return res.json({ message: 'Priority is already ' + priority, ticket: existing });
    }

    // SLA recalculation rule
    const slaRecalc = slaService.recalculateOnPriorityChange(existing, priority, now, holidayDates);

    const updated = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.update({
        where: { id: existing.id },
        data: {
          priority,
          firstResponseDeadline: slaRecalc.firstResponseDeadline,
          resolutionDeadline: slaRecalc.resolutionDeadline,
          version: { increment: 1 }
        },
        include: {
          assignedAgent: {
            select: { id: true, name: true, email: true, avatar: true }
          }
        }
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          ticketId: existing.id,
          actorType: 'AGENT',
          actorId: req.agent.id,
          actorName: req.agent.name,
          action: 'PRIORITY_CHANGE',
          previousValue: JSON.stringify({ priority: existing.priority, deadlines: { firstResponse: existing.firstResponseDeadline, resolution: existing.resolutionDeadline } }),
          newValue: JSON.stringify({ priority, deadlines: { firstResponse: slaRecalc.firstResponseDeadline, resolution: slaRecalc.resolutionDeadline } }),
          description: `Priority updated from ${existing.priority} to ${priority} by ${req.agent.name}. SLA deadlines recalculated.`
        }
      });

      // SLA Event
      await tx.sLAEvent.create({
        data: {
          ticketId: existing.id,
          eventType: 'PRIORITY_CHANGE',
          previousPriority: existing.priority,
          newPriority: priority,
          reason: slaRecalc.reason
        }
      });

      return ticket;
    });

    return res.json({
      message: `Priority changed to ${priority}. SLA deadlines updated.`,
      ticket: updated,
      recalculation: slaRecalc
    });
  } catch (error) {
    console.error('Update priority error:', error);
    return res.status(500).json({ error: 'Failed to update ticket priority.' });
  }
});

/**
 * POST /api/tickets/:id/reply
 * Agent sends a public reply to the customer
 */
router.post('/:id/reply', authenticateAgent, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, statusChange } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Reply message content cannot be empty.' });
    }

    const existing = await prisma.ticket.findFirst({
      where: { OR: [{ id }, { ticketNumber: id }] }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const now = new Date();
    const isFirstAgentResponse = !existing.firstResponseAt;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create message
      const message = await tx.message.create({
        data: {
          ticketId: existing.id,
          senderType: 'AGENT',
          senderId: req.agent.id,
          senderName: req.agent.name,
          content: content.trim(),
          createdAt: now
        }
      });

      // 2. Determine ticket updates
      const ticketUpdates = {
        updatedAt: now,
        version: { increment: 1 }
      };

      if (isFirstAgentResponse) {
        ticketUpdates.firstResponseAt = now;
      }

      // If agent specifies moving to WAITING_CUSTOMER or custom status
      let newStatus = statusChange || (existing.status === 'OPEN' ? 'IN_PROGRESS' : existing.status);
      if (statusChange && statusChange !== existing.status) {
        ticketUpdates.status = statusChange;
        if (statusChange === 'WAITING_CUSTOMER') {
          ticketUpdates.slaPausedAt = now;
        }
      }

      const updatedTicket = await tx.ticket.update({
        where: { id: existing.id },
        data: ticketUpdates
      });

      // 3. Audit log
      await tx.auditLog.create({
        data: {
          ticketId: existing.id,
          actorType: 'AGENT',
          actorId: req.agent.id,
          actorName: req.agent.name,
          action: 'CUSTOMER_REPLY',
          description: `Agent reply sent to customer by ${req.agent.name}`,
          newValue: JSON.stringify({ messageId: message.id, status: updatedTicket.status })
        }
      });

      return { message, ticket: updatedTicket };
    });

    return res.status(201).json({
      message: 'Reply sent to customer successfully',
      data: result
    });
  } catch (error) {
    console.error('Reply error:', error);
    return res.status(500).json({ error: 'Failed to send customer reply.' });
  }
});

/**
 * POST /api/tickets/:id/internal-notes
 * Add internal private team note (INC-0304 - team only, never exposed to customers)
 */
router.post('/:id/internal-notes', authenticateAgent, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Private note content cannot be empty.' });
    }

    const existing = await prisma.ticket.findFirst({
      where: { OR: [{ id }, { ticketNumber: id }] }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const now = new Date();

    const note = await prisma.$transaction(async (tx) => {
      const createdNote = await tx.internalNote.create({
        data: {
          ticketId: existing.id,
          authorId: req.agent.id,
          authorName: req.agent.name,
          content: content.trim(),
          createdAt: now
        }
      });

      await tx.auditLog.create({
        data: {
          ticketId: existing.id,
          actorType: 'AGENT',
          actorId: req.agent.id,
          actorName: req.agent.name,
          action: 'INTERNAL_NOTE',
          description: `Internal private team note added by ${req.agent.name}`,
          newValue: JSON.stringify({ noteId: createdNote.id })
        }
      });

      await tx.ticket.update({
        where: { id: existing.id },
        data: { updatedAt: now }
      });

      return createdNote;
    });

    return res.status(201).json({
      message: 'Internal private note saved successfully',
      note
    });
  } catch (error) {
    console.error('Internal note error:', error);
    return res.status(500).json({ error: 'Failed to save internal note.' });
  }
});

/**
 * POST /api/tickets/:id/reopen
 * Reopen a resolved ticket within 7-day window
 */
router.post('/:id/reopen', authenticateAgent, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existing = await prisma.ticket.findFirst({
      where: { OR: [{ id }, { ticketNumber: id }] }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const now = new Date();
    const reopenCheck = slaService.canReopenTicket(existing, now);

    if (!reopenCheck.allowed) {
      return res.status(400).json({ error: reopenCheck.reason });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.update({
        where: { id: existing.id },
        data: {
          status: 'IN_PROGRESS',
          resolvedAt: null,
          closedAt: null,
          version: { increment: 1 }
        }
      });

      await tx.auditLog.create({
        data: {
          ticketId: existing.id,
          actorType: 'AGENT',
          actorId: req.agent.id,
          actorName: req.agent.name,
          action: 'REOPENED',
          previousValue: JSON.stringify({ status: existing.status }),
          newValue: JSON.stringify({ status: 'IN_PROGRESS' }),
          description: `Ticket reopened by ${req.agent.name}. Reason: ${reason || 'Customer requested follow-up'}`
        }
      });

      return ticket;
    });

    return res.json({
      message: 'Ticket reopened successfully',
      ticket: updated
    });
  } catch (error) {
    console.error('Reopen ticket error:', error);
    return res.status(500).json({ error: 'Failed to reopen ticket.' });
  }
});

/**
 * POST /api/tickets/run-auto-close
 * Auto-close tickets in WAITING_CUSTOMER for >= 5 working days (1 working week)
 */
router.post('/run-auto-close', authenticateAgent, async (req, res) => {
  try {
    const holidays = await prisma.holiday.findMany({ select: { date: true } });
    const holidayDates = holidays.map(h => h.date);
    const now = new Date();

    const waitingTickets = await prisma.ticket.findMany({
      where: { status: 'WAITING_CUSTOMER' }
    });

    const closedTickets = [];

    for (const ticket of waitingTickets) {
      if (slaService.shouldAutoCloseInactiveTicket(ticket, now, holidayDates)) {
        await prisma.$transaction(async (tx) => {
          await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              status: 'CLOSED',
              closedAt: now,
              slaPausedAt: null,
              version: { increment: 1 }
            }
          });

          await tx.auditLog.create({
            data: {
              ticketId: ticket.id,
              actorType: 'SYSTEM',
              actorName: 'Frontdesk Auto-Closer',
              action: 'AUTO_CLOSED',
              previousValue: JSON.stringify({ status: 'WAITING_CUSTOMER' }),
              newValue: JSON.stringify({ status: 'CLOSED' }),
              description: 'Ticket automatically closed after 5 working days (1 working week) of customer inactivity.'
            }
          });
        });

        closedTickets.push(ticket.ticketNumber);
      }
    }

    return res.json({
      message: `Checked ${waitingTickets.length} waiting tickets. Automatically closed ${closedTickets.length} inactive tickets.`,
      closedTickets
    });
  } catch (error) {
    console.error('Auto close error:', error);
    return res.status(500).json({ error: 'Failed to run auto-close process.' });
  }
});

module.exports = router;
