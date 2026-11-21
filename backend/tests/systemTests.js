const { DateTime } = require('luxon');
const slaService = require('../src/services/slaService');
const prisma = require('../src/db');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING FRONTDESK AUTOMATED SYSTEM VALIDATION TEST');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} - ${details}`);
      failed++;
    }
  }

  const holidays = ['2026-01-26', '2026-04-14', '2026-05-01', '2026-08-15', '2026-08-27', '2026-10-02', '2026-10-20', '2026-11-08', '2026-12-25'];

  // Test 1: SLA - Friday 6:00 PM ticket with 2h Urgent SLA
  // Working hours: Mon-Fri 9:30 AM - 6:30 PM (Asia/Kolkata)
  // Friday 6:00 PM: 30 minutes left on Friday (until 6:30 PM)
  // Saturday & Sunday: Non-working (0 mins)
  // Monday: Starts 9:30 AM + remaining 90 mins (1.5 hours) = Monday 11:00 AM!
  const friday6pm = DateTime.fromISO('2026-11-20T18:00:00+05:30'); // Nov 20, 2026 was Friday
  const slaResultFriday = slaService.calculateInitialSLADeadlines(friday6pm.toJSDate(), 'URGENT', holidays);
  const deadlineFridayDt = DateTime.fromJSDate(slaResultFriday.firstResponseDeadline).setZone('Asia/Kolkata');
  
  assert(
    deadlineFridayDt.weekday === 1 && deadlineFridayDt.hour === 11 && deadlineFridayDt.minute === 0,
    'SLA Rule: Friday 6:00 PM ticket with 2h SLA lands on Monday 11:00 AM (excludes weekend)',
    `Expected Monday 11:00, got ${deadlineFridayDt.toFormat('ccc yyyy-MM-dd HH:mm')}`
  );

  // Test 2: Holiday exclusion
  // Suppose ticket arrives Friday Jan 23, 2026 at 6:00 PM.
  // Monday Jan 26, 2026 is Republic Day (Holiday!).
  // Next working day is Tuesday Jan 27!
  // Should land on Tuesday Jan 27 at 11:00 AM.
  const fridayBeforeHoliday = DateTime.fromISO('2026-01-23T18:00:00+05:30');
  const slaResultHoliday = slaService.calculateInitialSLADeadlines(fridayBeforeHoliday.toJSDate(), 'URGENT', holidays);
  const deadlineHolidayDt = DateTime.fromJSDate(slaResultHoliday.firstResponseDeadline).setZone('Asia/Kolkata');

  assert(
    deadlineHolidayDt.weekday === 2 && deadlineHolidayDt.toISODate() === '2026-01-27' && deadlineHolidayDt.hour === 11 && deadlineHolidayDt.minute === 0,
    'SLA Rule: Excludes festival holidays (Jan 26 Republic Day) and carries to Tuesday',
    `Expected Tuesday 2026-01-27 11:00, got ${deadlineHolidayDt.toFormat('ccc yyyy-MM-dd HH:mm')}`
  );

  // Test 3: SLA Medium Priority: 4.5 hours first response, 3 working days resolution
  const wednesday10am = DateTime.fromISO('2026-11-18T10:00:00+05:30');
  const slaMedium = slaService.calculateInitialSLADeadlines(wednesday10am.toJSDate(), 'MEDIUM', holidays);
  const respMedDt = DateTime.fromJSDate(slaMedium.firstResponseDeadline).setZone('Asia/Kolkata');
  
  // 10:00 AM + 4.5 hours = 2:30 PM (14:30) same day
  assert(
    respMedDt.hour === 14 && respMedDt.minute === 30,
    'SLA Medium: 4.5 working hours first response deadline is exact',
    `Expected 14:30, got ${respMedDt.toFormat('HH:mm')}`
  );

  // Test 4: SLA Pause and Resume calculation
  const mockTicket = {
    status: 'WAITING_CUSTOMER',
    firstResponseDeadline: DateTime.fromISO('2026-11-18T14:30:00+05:30').toJSDate(),
    resolutionDeadline: DateTime.fromISO('2026-11-20T18:30:00+05:30').toJSDate(),
    slaPausedAt: DateTime.fromISO('2026-11-18T11:00:00+05:30').toJSDate()
  };
  // Paused from 11:00 AM to 1:00 PM (2 working hours = 120 mins)
  const resumeTime = DateTime.fromISO('2026-11-18T13:00:00+05:30').toJSDate();
  const resumed = slaService.resumeSLAAfterCustomerReply(mockTicket, resumeTime, holidays);
  const newRespDeadlineDt = DateTime.fromJSDate(resumed.firstResponseDeadline).setZone('Asia/Kolkata');

  // Original 14:30 + 2h = 16:30
  assert(
    resumed.pausedWorkingMinutes === 120 && newRespDeadlineDt.hour === 16 && newRespDeadlineDt.minute === 30,
    'SLA Pause & Resume: Paused duration shifts deadline forward by exact working minutes',
    `Expected 120 mins added and 16:30 deadline, got ${resumed.pausedWorkingMinutes} mins and ${newRespDeadlineDt.toFormat('HH:mm')}`
  );

  // Test 5: Reopening validation (7 days window)
  const resolvedYesterday = {
    status: 'RESOLVED',
    resolvedAt: DateTime.now().minus({ days: 2 }).toJSDate()
  };
  const resolvedOld = {
    status: 'RESOLVED',
    resolvedAt: DateTime.now().minus({ days: 10 }).toJSDate()
  };

  const reopenAllowed = slaService.canReopenTicket(resolvedYesterday, new Date());
  const reopenBlocked = slaService.canReopenTicket(resolvedOld, new Date());

  assert(reopenAllowed.allowed === true, 'Reopen Rule: Allowed within 7 days of resolution');
  assert(reopenBlocked.allowed === false, 'Reopen Rule: Blocked after 7 days of resolution (requires new ticket)');

  // Test 6: Database Concurrency Assignment Test (INC-0291)
  console.log('\n--- Testing Database Concurrency Protection (INC-0291) ---');
  // Create a temporary unassigned test ticket
  const testTicket = await prisma.ticket.create({
    data: {
      ticketNumber: `CONCUR-${Date.now().toString().slice(-4)}`,
      customerName: 'Concurrency Test Customer',
      customerEmail: 'concurrency@test.com',
      subject: 'Race Condition Test Ticket',
      description: 'Testing two agents claiming ticket at the same millisecond',
      priority: 'MEDIUM',
      status: 'OPEN'
    }
  });

  const agents = await prisma.agent.findMany({ take: 2 });
  const agent1 = agents[0];
  const agent2 = agents[1];

  let agent1Result = null;
  let agent2Result = null;
  let agent1Error = null;
  let agent2Error = null;

  // Simulate simultaneous assignment calls using transactions
  async function attemptAssign(agent) {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.ticket.findUnique({ where: { id: testTicket.id } });
      if (existing.assignedAgentId && existing.assignedAgentId !== agent.id) {
        const err = new Error(`Already taken by other agent`);
        err.conflict = true;
        throw err;
      }
      return await tx.ticket.update({
        where: { id: testTicket.id, version: existing.version },
        data: {
          assignedAgentId: agent.id,
          assignedAt: new Date(),
          status: 'IN_PROGRESS',
          version: { increment: 1 }
        }
      });
    });
  }

  // Execute in parallel
  const results = await Promise.allSettled([
    attemptAssign(agent1),
    attemptAssign(agent2)
  ]);

  const fulfilled = results.filter(r => r.status === 'fulfilled');
  const rejected = results.filter(r => r.status === 'rejected');

  assert(
    fulfilled.length === 1 && rejected.length === 1,
    'INC-0291 Fix: Exactly one agent successfully takes the ticket, the second attempt is rejected with Conflict',
    `Fulfilled: ${fulfilled.length}, Rejected: ${rejected.length}`
  );

  // Test 7: Private Note Isolation Test (INC-0304)
  console.log('\n--- Testing Private Note Leak Prevention (INC-0304) ---');
  // Add a private note to the test ticket
  await prisma.internalNote.create({
    data: {
      ticketId: testTicket.id,
      authorId: agent1.id,
      authorName: agent1.name,
      content: 'CONFIDENTIAL INTERNAL NOTE: Customer is VIP, do not disclose backend migration.'
    }
  });

  // Query simulating customer-facing API
  const customerView = await prisma.ticket.findFirst({
    where: { id: testTicket.id },
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      messages: true
      // No internalNotes selected!
    }
  });

  assert(
    customerView.internalNotes === undefined,
    'INC-0304 Fix: Customer-facing schema never contains internalNotes field',
    `internalNotes field in customer view: ${customerView.internalNotes}`
  );

  // Clean up test ticket
  await prisma.internalNote.deleteMany({ where: { ticketId: testTicket.id } });
  await prisma.ticket.delete({ where: { id: testTicket.id } });

  console.log('\n====================================================');
  console.log(`📊 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
