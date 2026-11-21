const { DateTime, Interval } = require('luxon');
const config = require('../config');

class SLAService {
  constructor(slaConfig = config.SLA_CONFIG) {
    this.config = slaConfig;
  }

  /**
   * Check if a given Luxon DateTime is a non-working weekend (Saturday or Sunday)
   */
  isWeekend(dt) {
    return dt.weekday === 6 || dt.weekday === 7; // 6 = Saturday, 7 = Sunday
  }

  /**
   * Check if a given Luxon DateTime falls on a configured festival holiday
   * @param {DateTime} dt 
   * @param {Array<string|Date>} holidayDates List of holiday ISO date strings (YYYY-MM-DD)
   */
  isHoliday(dt, holidayDates = []) {
    const dateStr = dt.toISODate(); // 'YYYY-MM-DD'
    return holidayDates.some(h => {
      const hStr = typeof h === 'string' ? h.slice(0, 10) : DateTime.fromJSDate(h).setZone(this.config.TIMEZONE).toISODate();
      return hStr === dateStr;
    });
  }

  /**
   * Check if a given date is a working day (Mon-Fri and not a holiday)
   */
  isWorkingDay(dt, holidayDates = []) {
    return !this.isWeekend(dt) && !this.isHoliday(dt, holidayDates);
  }

  /**
   * Get the start of working hours on the given day
   */
  getWorkStart(dt) {
    return dt.set({
      hour: this.config.WORK_START_HOUR,
      minute: this.config.WORK_START_MINUTE,
      second: 0,
      millisecond: 0
    });
  }

  /**
   * Get the end of working hours on the given day
   */
  getWorkEnd(dt) {
    return dt.set({
      hour: this.config.WORK_END_HOUR,
      minute: this.config.WORK_END_MINUTE,
      second: 0,
      millisecond: 0
    });
  }

  /**
   * If dt is outside working hours, roll forward to the start of the next valid working time
   */
  normalizeToWorkingTime(dt, holidayDates = []) {
    let current = dt.setZone(this.config.TIMEZONE);

    while (true) {
      if (!this.isWorkingDay(current, holidayDates)) {
        // Jump to 09:30 of next day
        current = this.getWorkStart(current.plus({ days: 1 }));
        continue;
      }

      const workStart = this.getWorkStart(current);
      const workEnd = this.getWorkEnd(current);

      if (current < workStart) {
        // Before 9:30 AM today -> move to 9:30 AM today
        return workStart;
      }

      if (current >= workEnd) {
        // After 6:30 PM today -> move to 9:30 AM tomorrow
        current = this.getWorkStart(current.plus({ days: 1 }));
        continue;
      }

      // Inside working hours
      return current;
    }
  }

  /**
   * Add working minutes to a start DateTime, skipping outside hours, weekends, and holidays
   * @param {DateTime|Date|string} startDate 
   * @param {number} minutesToAdd 
   * @param {Array} holidayDates 
   * @returns {DateTime}
   */
  addWorkingMinutes(startDate, minutesToAdd, holidayDates = []) {
    let current = DateTime.fromJSDate(startDate instanceof Date ? startDate : new Date(startDate)).setZone(this.config.TIMEZONE);
    let remainingMinutes = minutesToAdd;

    // Normalize start time to working window
    current = this.normalizeToWorkingTime(current, holidayDates);

    while (remainingMinutes > 0) {
      const workEnd = this.getWorkEnd(current);
      const minutesAvailableToday = Math.max(0, Math.floor(workEnd.diff(current, 'minutes').minutes));

      if (remainingMinutes <= minutesAvailableToday) {
        return current.plus({ minutes: remainingMinutes });
      } else {
        remainingMinutes -= minutesAvailableToday;
        // Roll over to start of next working day
        current = this.getWorkStart(current.plus({ days: 1 }));
        current = this.normalizeToWorkingTime(current, holidayDates);
      }
    }

    return current;
  }

  /**
   * Calculate working minutes elapsed between two dates
   */
  calculateWorkingMinutesBetween(startDate, endDate, holidayDates = []) {
    let start = DateTime.fromJSDate(startDate instanceof Date ? startDate : new Date(startDate)).setZone(this.config.TIMEZONE);
    let end = DateTime.fromJSDate(endDate instanceof Date ? endDate : new Date(endDate)).setZone(this.config.TIMEZONE);

    if (end <= start) return 0;

    let totalWorkingMinutes = 0;
    let current = this.normalizeToWorkingTime(start, holidayDates);

    while (current < end) {
      if (!this.isWorkingDay(current, holidayDates)) {
        current = this.getWorkStart(current.plus({ days: 1 }));
        current = this.normalizeToWorkingTime(current, holidayDates);
        continue;
      }

      const workEnd = this.getWorkEnd(current);
      if (end <= workEnd) {
        // Finishes today
        const diff = Math.floor(end.diff(current, 'minutes').minutes);
        if (diff > 0) totalWorkingMinutes += diff;
        break;
      } else {
        // Consumes rest of today
        const diff = Math.floor(workEnd.diff(current, 'minutes').minutes);
        if (diff > 0) totalWorkingMinutes += diff;
        // Move to next working day
        current = this.getWorkStart(current.plus({ days: 1 }));
        current = this.normalizeToWorkingTime(current, holidayDates);
      }
    }

    return totalWorkingMinutes;
  }

  /**
   * Calculate Initial SLA deadlines for a ticket upon creation
   */
  calculateInitialSLADeadlines(createdAt, priority, holidayDates = []) {
    const priorityConfig = this.config.PRIORITIES[priority] || this.config.PRIORITIES.MEDIUM;
    const createdDt = DateTime.fromJSDate(createdAt instanceof Date ? createdAt : new Date(createdAt)).setZone(this.config.TIMEZONE);
    
    // Normalized start time
    const effectiveStart = this.normalizeToWorkingTime(createdDt, holidayDates);

    // 1. First Response Deadline
    const firstResponseDeadline = this.addWorkingMinutes(
      effectiveStart,
      priorityConfig.firstResponseWorkingMinutes,
      holidayDates
    );

    // 2. Resolution Deadline
    let resolutionDeadline;
    if (priorityConfig.resolutionType === 'SAME_WORKING_DAY') {
      // Urgent: "fix it the same working day"
      // Deadline is end of the effective start working day (6:30 PM)
      resolutionDeadline = this.getWorkEnd(effectiveStart);
    } else {
      // Medium (3 working days) or Low (5 working days / 1 working week)
      resolutionDeadline = this.addWorkingMinutes(
        effectiveStart,
        priorityConfig.resolutionWorkingMinutes,
        holidayDates
      );
    }

    return {
      firstResponseDeadline: firstResponseDeadline.toJSDate(),
      resolutionDeadline: resolutionDeadline.toJSDate(),
      effectiveStart: effectiveStart.toJSDate()
    };
  }

  /**
   * Recalculate SLA on Priority Change
   * Documented Rule:
   * When ticket priority changes at `changeTime`, recalculate remaining SLA deadlines
   * from `changeTime` forward using the new priority parameters.
   * If first response already happened, keep firstResponseDeadline as-is or nullify overdue,
   * and update resolution deadline to new priority allowance from `changeTime`.
   */
  recalculateOnPriorityChange(ticket, newPriority, changeTime = new Date(), holidayDates = []) {
    const changeDt = DateTime.fromJSDate(changeTime instanceof Date ? changeTime : new Date(changeTime)).setZone(this.config.TIMEZONE);
    const newPriorityConfig = this.config.PRIORITIES[newPriority] || this.config.PRIORITIES.MEDIUM;
    const effectiveChange = this.normalizeToWorkingTime(changeDt, holidayDates);

    let newFirstResponseDeadline = ticket.firstResponseDeadline;
    // Only recalculate first response deadline if not yet responded
    if (!ticket.firstResponseAt) {
      newFirstResponseDeadline = this.addWorkingMinutes(
        effectiveChange,
        newPriorityConfig.firstResponseWorkingMinutes,
        holidayDates
      ).toJSDate();
    }

    let newResolutionDeadline;
    if (newPriorityConfig.resolutionType === 'SAME_WORKING_DAY') {
      newResolutionDeadline = this.getWorkEnd(effectiveChange).toJSDate();
    } else {
      newResolutionDeadline = this.addWorkingMinutes(
        effectiveChange,
        newPriorityConfig.resolutionWorkingMinutes,
        holidayDates
      ).toJSDate();
    }

    return {
      firstResponseDeadline: newFirstResponseDeadline,
      resolutionDeadline: newResolutionDeadline,
      recalculatedAt: changeDt.toJSDate(),
      reason: `Priority updated from ${ticket.priority} to ${newPriority}`
    };
  }

  /**
   * Resume SLA after Customer Reply:
   * Shifts both deadlines forward by the working time spent paused in WAITING_CUSTOMER
   */
  resumeSLAAfterCustomerReply(ticket, resumeTime = new Date(), holidayDates = []) {
    if (!ticket.slaPausedAt) {
      return {
        firstResponseDeadline: ticket.firstResponseDeadline,
        resolutionDeadline: ticket.resolutionDeadline,
        pausedWorkingMinutes: 0
      };
    }

    const pausedWorkingMinutes = this.calculateWorkingMinutesBetween(
      ticket.slaPausedAt,
      resumeTime,
      holidayDates
    );

    // Shift deadlines forward by the paused working minutes
    const newFirstResponseDeadline = ticket.firstResponseDeadline
      ? this.addWorkingMinutes(ticket.firstResponseDeadline, pausedWorkingMinutes, holidayDates).toJSDate()
      : null;

    const newResolutionDeadline = ticket.resolutionDeadline
      ? this.addWorkingMinutes(ticket.resolutionDeadline, pausedWorkingMinutes, holidayDates).toJSDate()
      : null;

    return {
      firstResponseDeadline: newFirstResponseDeadline,
      resolutionDeadline: newResolutionDeadline,
      pausedWorkingMinutes,
      slaPausedAt: null
    };
  }

  /**
   * Check SLA status (Remaining working time, Overdue status)
   */
  getSLAStatus(ticket, currentTime = new Date(), holidayDates = []) {
    const now = DateTime.fromJSDate(currentTime instanceof Date ? currentTime : new Date(currentTime)).setZone(this.config.TIMEZONE);

    const isWaitingCustomer = ticket.status === 'WAITING_CUSTOMER';
    const isResolvedOrClosed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';

    // If ticket is paused, evaluate status at the pause point
    const evaluationTime = isWaitingCustomer && ticket.slaPausedAt
      ? DateTime.fromJSDate(new Date(ticket.slaPausedAt)).setZone(this.config.TIMEZONE)
      : now;

    // First response evaluation
    let isFirstResponseOverdue = false;
    let firstResponseRemainingWorkingMinutes = null;

    if (ticket.firstResponseDeadline) {
      const respDeadline = DateTime.fromJSDate(new Date(ticket.firstResponseDeadline)).setZone(this.config.TIMEZONE);
      if (ticket.firstResponseAt) {
        // Responded already
        const respTime = DateTime.fromJSDate(new Date(ticket.firstResponseAt)).setZone(this.config.TIMEZONE);
        isFirstResponseOverdue = respTime > respDeadline;
      } else {
        // Not yet responded
        if (evaluationTime > respDeadline) {
          isFirstResponseOverdue = true;
          firstResponseRemainingWorkingMinutes = -this.calculateWorkingMinutesBetween(respDeadline, evaluationTime, holidayDates);
        } else {
          firstResponseRemainingWorkingMinutes = this.calculateWorkingMinutesBetween(evaluationTime, respDeadline, holidayDates);
        }
      }
    }

    // Resolution evaluation
    let isResolutionOverdue = false;
    let resolutionRemainingWorkingMinutes = null;

    if (ticket.resolutionDeadline) {
      const resDeadline = DateTime.fromJSDate(new Date(ticket.resolutionDeadline)).setZone(this.config.TIMEZONE);
      if (ticket.resolvedAt) {
        const resolvedTime = DateTime.fromJSDate(new Date(ticket.resolvedAt)).setZone(this.config.TIMEZONE);
        isResolutionOverdue = resolvedTime > resDeadline;
      } else if (!isResolvedOrClosed) {
        if (evaluationTime > resDeadline) {
          isResolutionOverdue = true;
          resolutionRemainingWorkingMinutes = -this.calculateWorkingMinutesBetween(resDeadline, evaluationTime, holidayDates);
        } else {
          resolutionRemainingWorkingMinutes = this.calculateWorkingMinutesBetween(evaluationTime, resDeadline, holidayDates);
        }
      }
    }

    const isOverdue = (!ticket.firstResponseAt && isFirstResponseOverdue) || (!isResolvedOrClosed && isResolutionOverdue);

    return {
      isWaitingCustomer,
      isResolvedOrClosed,
      isFirstResponseOverdue,
      firstResponseRemainingWorkingMinutes,
      isResolutionOverdue,
      resolutionRemainingWorkingMinutes,
      isOverdue
    };
  }

  /**
   * Check if a ticket has exceeded the customer inactivity limit (5 working days in WAITING_CUSTOMER)
   */
  shouldAutoCloseInactiveTicket(ticket, currentTime = new Date(), holidayDates = []) {
    if (ticket.status !== 'WAITING_CUSTOMER' || !ticket.slaPausedAt) {
      return false;
    }

    const workingMinutesWaiting = this.calculateWorkingMinutesBetween(
      ticket.slaPausedAt,
      currentTime,
      holidayDates
    );

    return workingMinutesWaiting >= this.config.AUTO_CLOSE_WAITING_WORKING_MINUTES;
  }

  /**
   * Check if a resolved ticket can be reopened (within 7 calendar days)
   */
  canReopenTicket(ticket, currentTime = new Date()) {
    if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
      return { allowed: false, reason: 'Ticket is not in resolved or closed status' };
    }

    if (!ticket.resolvedAt) {
      return { allowed: true };
    }

    const resolvedDt = DateTime.fromJSDate(new Date(ticket.resolvedAt)).setZone(this.config.TIMEZONE);
    const currentDt = DateTime.fromJSDate(currentTime instanceof Date ? currentTime : new Date(currentTime)).setZone(this.config.TIMEZONE);

    const daysElapsed = currentDt.diff(resolvedDt, 'days').days;

    if (daysElapsed <= this.config.REOPEN_WINDOW_DAYS) {
      return {
        allowed: true,
        daysElapsed: Math.round(daysElapsed * 10) / 10,
        daysRemaining: Math.max(0, Math.round((this.config.REOPEN_WINDOW_DAYS - daysElapsed) * 10) / 10)
      };
    }

    return {
      allowed: false,
      reason: `Reopening window (${this.config.REOPEN_WINDOW_DAYS} days) has expired (${Math.round(daysElapsed)} days elapsed since resolution). Under Arvo Systems policy, a new ticket must be created.`
    };
  }
}

module.exports = new SLAService();
