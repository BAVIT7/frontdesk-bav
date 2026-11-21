require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'frontdesk-arvo-systems-jwt-secret-2026-key',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  
  // Arvo Systems Working Schedule Configuration
  SLA_CONFIG: {
    TIMEZONE: 'Asia/Kolkata', // Kochi, Kerala, India (Arvo Systems HQ)
    WORK_START_HOUR: 9,
    WORK_START_MINUTE: 30, // 09:30 AM
    WORK_END_HOUR: 18,
    WORK_END_MINUTE: 30, // 06:30 PM
    WORKING_MINUTES_PER_DAY: 540, // 9 hours * 60 = 540 mins

    // Priorities
    // URGENT: 2 working hours first response, Same working day resolution
    // MEDIUM: 4.5 working hours first response, 3 working days resolution (27 working hours)
    // LOW: 9 working hours first response, 5 working days resolution (45 working hours)
    PRIORITIES: {
      URGENT: {
        label: 'Urgent',
        firstResponseWorkingHours: 2,
        firstResponseWorkingMinutes: 120,
        resolutionType: 'SAME_WORKING_DAY',
        resolutionWorkingHours: 9, // up to end of working day
      },
      MEDIUM: {
        label: 'Medium',
        firstResponseWorkingHours: 4.5,
        firstResponseWorkingMinutes: 270,
        resolutionType: 'WORKING_DAYS',
        resolutionWorkingDays: 3,
        resolutionWorkingHours: 27,
        resolutionWorkingMinutes: 27 * 60,
      },
      LOW: {
        label: 'Low / Small',
        firstResponseWorkingHours: 9,
        firstResponseWorkingMinutes: 540,
        resolutionType: 'WORKING_DAYS',
        resolutionWorkingDays: 5,
        resolutionWorkingHours: 45,
        resolutionWorkingMinutes: 45 * 60,
      }
    },

    // Inactivity Auto-Close Window: 5 working days (approx 1 working week)
    AUTO_CLOSE_WAITING_DAYS: 5,
    AUTO_CLOSE_WAITING_WORKING_MINUTES: 5 * 540,

    // Reopen Window: 7 calendar days after resolution
    REOPEN_WINDOW_DAYS: 7,
  }
};
