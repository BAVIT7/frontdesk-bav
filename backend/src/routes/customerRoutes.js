const express = require('express');
const router = express.Router();
const prisma = require('../db');
const slaService = require('../services/slaService');

/**
 * GET /api/customer/tickets/:ticketNumber
 * Customer-facing portal view.
 * STRICT SECURITY AUDIT (INC-0304):
 * Under NO circumstances are internal notes, agent private notes, or internal metadata returned!
 */
router.get('/tickets/:ticketNumber', async (req, res) => {
  try {
    const { ticketNumber } = req.params;

    const ticket = await prisma.ticket.findFirst({
      where: { ticketNumber: ticketNumber.toUpperCase().trim() },
      select: {
        id: true,
        ticketNumber: true,
        customerName: true,
        customerEmail: true,
        subject: true,
        description: true,
        priority: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        closedAt: true,
        // Only public messages are selected!
        messages: {
          select: {
            id: true,
            senderType: true,
            senderName: true,
            content: true,
            createdAt: true
          },
          orderBy: { createdAt: 'asc' }
        }
        // NOTE: internalNotes is deliberately EXCLUDED.
        // Even if requested, this endpoint has no access to internalNotes.
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found.' });
    }

    const reopenCheck = slaService.canReopenTicket(ticket, new Date());

    return res.json({
      ticket: {
        ...ticket,
        canReopen: reopenCheck.allowed,
        reopenReason: reopenCheck.reason
      }
    });
  } catch (error) {
    console.error('Customer view error:', error);
    return res.status(500).json({ error: 'Failed to retrieve ticket.' });
  }
});

/**
 * POST /api/customer/tickets/:ticketNumber/reply
 * Customer sends a response to the support team
 */
router.post('/tickets/:ticketNumber/reply', async (req, res) => {
  try {
    const { ticketNumber } = req.params;
    const { content, senderName } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Reply content cannot be empty.' });
    }

    const holidays = await prisma.holiday.findMany({ select: { date: true } });
    const holidayDates = holidays.map(h => h.date);
    const now = new Date();

    const existing = await prisma.ticket.findFirst({
      where: { ticketNumber: ticketNumber.toUpperCase().trim() }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Support ticket not found.' });
    }

    if (existing.status === 'CLOSED') {
      return res.status(400).json({ error: 'Ticket is closed. Please create a new ticket or request reopening if eligible.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create customer message
      const message = await tx.message.create({
        data: {
          ticketId: existing.id,
          senderType: 'CUSTOMER',
          senderName: senderName || existing.customerName,
          content: content.trim(),
          createdAt: now
        }
      });

      // 2. Resume SLA if ticket was paused in WAITING_CUSTOMER
      let updateData = {
        updatedAt: now,
        version: { increment: 1 }
      };

      let slaEventData = null;

      if (existing.status === 'WAITING_CUSTOMER') {
        const resumeResult = slaService.resumeSLAAfterCustomerReply(existing, now, holidayDates);
        updateData.status = 'IN_PROGRESS';
        updateData.firstResponseDeadline = resumeResult.firstResponseDeadline;
        updateData.resolutionDeadline = resumeResult.resolutionDeadline;
        updateData.slaPausedAt = null;
        updateData.totalPausedWorkingMinutes = { increment: resumeResult.pausedWorkingMinutes };

        slaEventData = {
          eventType: 'RESUME',
          resumedAt: now,
          workingMinutesAdded: resumeResult.pausedWorkingMinutes,
          reason: `Customer replied. SLA resumed automatically and deadlines extended by ${resumeResult.pausedWorkingMinutes} working minutes.`
        };
      }

      const updatedTicket = await tx.ticket.update({
        where: { id: existing.id },
        data: updateData
      });

      // 3. Immutable audit log
      await tx.auditLog.create({
        data: {
          ticketId: existing.id,
          actorType: 'CUSTOMER',
          actorName: senderName || existing.customerName,
          action: 'CUSTOMER_REPLY',
          description: `Customer replied: "${content.slice(0, 80)}${content.length > 80 ? '...' : ''}"`,
          newValue: JSON.stringify({ messageId: message.id, status: updatedTicket.status })
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

      return { message, status: updatedTicket.status };
    });

    return res.status(201).json({
      message: 'Reply submitted successfully',
      data: result
    });
  } catch (error) {
    console.error('Customer reply error:', error);
    return res.status(500).json({ error: 'Failed to submit customer reply.' });
  }
});

/**
 * POST /api/customer/tickets/:ticketNumber/reopen
 * Customer requests ticket reopening after resolution within 7-day window
 */
router.post('/tickets/:ticketNumber/reopen', async (req, res) => {
  try {
    const { ticketNumber } = req.params;
    const { reason, senderName } = req.body;

    const existing = await prisma.ticket.findFirst({
      where: { ticketNumber: ticketNumber.toUpperCase().trim() }
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
          actorType: 'CUSTOMER',
          actorName: senderName || existing.customerName,
          action: 'REOPENED',
          previousValue: JSON.stringify({ status: existing.status }),
          newValue: JSON.stringify({ status: 'IN_PROGRESS' }),
          description: `Customer reopened ticket. Reason: ${reason || 'Customer indicated issue was not resolved satisfactorily.'}`
        }
      });

      return ticket;
    });

    return res.json({
      message: 'Your ticket has been reopened. A support agent will review it shortly.',
      ticket: {
        ticketNumber: updated.ticketNumber,
        status: updated.status
      }
    });
  } catch (error) {
    console.error('Customer reopen error:', error);
    return res.status(500).json({ error: 'Failed to reopen ticket.' });
  }
});

module.exports = router;
