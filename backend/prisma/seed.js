const bcrypt = require('bcryptjs');
const prisma = require('../src/db');
const slaService = require('../src/services/slaService');
const { DateTime } = require('luxon');

const HOLIDAYS = [
  { name: 'Republic Day', date: '2026-01-26', description: 'National Holiday' },
  { name: 'Vishu', date: '2026-04-14', description: 'Kerala Traditional New Year' },
  { name: 'May Day', date: '2026-05-01', description: 'Labour Day' },
  { name: 'Independence Day', date: '2026-08-15', description: 'National Holiday' },
  { name: 'Thiruvonam', date: '2026-08-27', description: 'Festival of Kerala' },
  { name: 'Gandhi Jayanti', date: '2026-10-02', description: 'National Holiday' },
  { name: 'Vijayadashami', date: '2026-10-20', description: 'Dussehra' },
  { name: 'Deepavali', date: '2026-11-08', description: 'Festival of Lights' },
  { name: 'Christmas', date: '2026-12-25', description: 'Christmas Day' },
];

const AGENTS = [
  { name: 'Meera Nair', email: 'meera@arvo.com', role: 'LEAD', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
  { name: 'Rahul Sharma', email: 'rahul@arvo.com', role: 'AGENT', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { name: 'Priya Patel', email: 'priya@arvo.com', role: 'AGENT', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  { name: 'Amit Verma', email: 'amit@arvo.com', role: 'AGENT', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
  { name: 'Sneha Rao', email: 'sneha@arvo.com', role: 'AGENT', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150' },
  { name: 'Vikram Menon', email: 'vikram@arvo.com', role: 'AGENT', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150' },
  { name: 'Neha Gupta', email: 'neha@arvo.com', role: 'AGENT', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
  { name: 'Arjun Das', email: 'arjun@arvo.com', role: 'AGENT', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150' },
  { name: 'Pooja Iyer', email: 'pooja@arvo.com', role: 'AGENT', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150' },
];

async function seed() {
  console.log('--- Starting Arvo Systems Frontdesk Seeding ---');

  // 1. Clean existing records
  await prisma.auditLog.deleteMany();
  await prisma.sLAEvent.deleteMany();
  await prisma.internalNote.deleteMany();
  await prisma.message.deleteMany();
  await prisma.ticketAssignment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.agent.deleteMany();

  console.log('Cleaned existing records.');

  // 2. Seed Holidays
  for (const h of HOLIDAYS) {
    await prisma.holiday.create({ data: h });
  }
  const holidayDates = HOLIDAYS.map(h => h.date);
  console.log(`Seeded ${HOLIDAYS.length} festival holidays.`);

  // 3. Seed Agents
  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const createdAgents = [];
  for (const a of AGENTS) {
    const agent = await prisma.agent.create({
      data: {
        name: a.name,
        email: a.email,
        passwordHash: defaultPasswordHash,
        role: a.role,
        avatar: a.avatar,
      }
    });
    createdAgents.push(agent);
  }
  console.log(`Seeded ${createdAgents.length} support agents.`);

  // Helper map
  const agentMap = {};
  createdAgents.forEach(a => { agentMap[a.email] = a; });

  const now = DateTime.now().setZone('Asia/Kolkata');

  // 4. Seed realistic tickets representing Arvo Systems cases
  const sampleTickets = [
    {
      ticketNumber: 'ARVO-1001',
      customerName: 'Rohit Kulkarni',
      customerEmail: 'rohit@fintechindia.com',
      customerPhone: '+91 98201 12345',
      subject: 'Critical: Production Payment Gateway Down',
      description: 'Our customer checkout page is throwing 500 internal server errors on all Razorpay and Stripe transactions. Payments cannot be processed.',
      priority: 'URGENT',
      status: 'OPEN',
      assignedAgentId: null, // Unassigned! Perfect for testing INC-0291 concurrency
      createdOffsetHours: 1, // Created 1 hour ago
      messages: [],
      notes: []
    },
    {
      ticketNumber: 'ARVO-1002',
      customerName: 'Ananya Deshmukh',
      customerEmail: 'ananya@medtechplus.org',
      customerPhone: '+91 98450 67890',
      subject: 'Urgent: Doctor login authentication failing',
      description: 'Hospital staff in the emergency ward are unable to log into the telemedicine consultation module. Two-factor SMS is not delivering.',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      assignedAgentId: agentMap['meera@arvo.com'].id,
      createdOffsetHours: 2.5,
      messages: [
        { senderType: 'AGENT', senderId: agentMap['meera@arvo.com'].id, senderName: 'Meera Nair', content: 'Hello Ananya, I have alerted our telecom SMS aggregator. We are monitoring the queue and switching to WhatsApp OTP fallback.' }
      ],
      notes: [
        { authorId: agentMap['meera@arvo.com'].id, authorName: 'Meera Nair', content: 'Telephony gateway provider Karix has a major outage in South India. Private bridge ticket #KX-9941 opened.' }
      ]
    },
    {
      ticketNumber: 'ARVO-1003',
      customerName: 'Kavita Sundaram',
      customerEmail: 'kavita@edulearn.co',
      customerPhone: '+91 97110 54321',
      subject: 'Question regarding custom report export formatting',
      description: 'We need to export quarterly attendance reports in CSV format with student roll numbers, but currently only PDF format appears in the dropdown.',
      priority: 'MEDIUM',
      status: 'WAITING_CUSTOMER',
      assignedAgentId: agentMap['rahul@arvo.com'].id,
      createdOffsetHours: 6,
      slaPaused: true,
      messages: [
        { senderType: 'AGENT', senderId: agentMap['rahul@arvo.com'].id, senderName: 'Rahul Sharma', content: 'Hi Kavita, could you please confirm if you have the Admin or Reporter permission tier on your user role? Also please send a screenshot of your report options.' }
      ],
      notes: [
        { authorId: agentMap['rahul@arvo.com'].id, authorName: 'Rahul Sharma', content: 'Customer seems to have custom role with restricted export permissions. May need Meera to approve role elevation.' }
      ]
    },
    {
      ticketNumber: 'ARVO-1004',
      customerName: 'Sanjay Reddy',
      customerEmail: 'sanjay@logisticsfast.in',
      customerPhone: '+91 94480 11223',
      subject: 'Fleet tracking GPS latency issue',
      description: 'GPS pings from vehicle tracker devices are delayed by up to 15 minutes during peak hours between 4 PM and 7 PM.',
      priority: 'MEDIUM',
      status: 'IN_PROGRESS',
      assignedAgentId: agentMap['priya@arvo.com'].id,
      createdOffsetHours: 12,
      messages: [
        { senderType: 'AGENT', senderId: agentMap['priya@arvo.com'].id, senderName: 'Priya Patel', content: 'Hi Sanjay, our IoT ingestion team has deployed an additional worker node to clear the MQTT backlog.' },
        { senderType: 'CUSTOMER', senderId: null, senderName: 'Sanjay Reddy', content: 'Thanks Priya, latency has reduced to 4 minutes now. Still observing vehicle batch 3.' }
      ],
      notes: [
        { authorId: agentMap['priya@arvo.com'].id, authorName: 'Priya Patel', content: 'Customer is on Tier-1 SLA contract. Keep updated every 2 hours.' }
      ]
    },
    {
      ticketNumber: 'ARVO-1005',
      customerName: 'Manoj Pillai',
      customerEmail: 'manoj@keralatech.com',
      customerPhone: '+91 94471 99887',
      subject: 'Overdue: Database replication lag on slave node',
      description: 'Read replica in Mumbai region is lagging by 1800 seconds behind primary master node in Bengaluru.',
      priority: 'URGENT',
      status: 'OPEN',
      assignedAgentId: null, // Unassigned & Urgent
      createdOffsetHours: 8, // Overdue SLA
      messages: [],
      notes: []
    },
    {
      ticketNumber: 'ARVO-1006',
      customerName: 'Divya Nambiar',
      customerEmail: 'divya@retailhub.in',
      customerPhone: '+91 98840 22334',
      subject: 'Invoice PDF logo alignment request',
      description: 'Could you update our company header logo on tax invoices? We rebranded yesterday.',
      priority: 'LOW',
      status: 'OPEN',
      assignedAgentId: null,
      createdOffsetHours: 14,
      messages: [],
      notes: []
    },
    {
      ticketNumber: 'ARVO-1007',
      customerName: 'Girish Bhat',
      customerEmail: 'girish@cloudworks.io',
      customerPhone: '+91 99001 77665',
      subject: 'Resolved: SSL Certificate Renewal for custom domain',
      description: 'Our custom subdomain api.client.com had an expiring Let’s Encrypt cert. It has been reissued and verified.',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      assignedAgentId: agentMap['amit@arvo.com'].id,
      createdOffsetHours: 48,
      resolvedOffsetHours: 4, // Resolved 4 hours ago (Can be reopened within 7 days!)
      messages: [
        { senderType: 'AGENT', senderId: agentMap['amit@arvo.com'].id, senderName: 'Amit Verma', content: 'Hello Girish, the SSL certificate has been renewed and valid until next year. All checks pass.' },
        { senderType: 'CUSTOMER', senderId: null, senderName: 'Girish Bhat', content: 'Looks great on our side, thank you!' }
      ],
      notes: [
        { authorId: agentMap['amit@arvo.com'].id, authorName: 'Amit Verma', content: 'Auto-renew webhook was failing due to DNS CAA record. Advised customer on DNS records.' }
      ]
    },
    {
      ticketNumber: 'ARVO-1008',
      customerName: 'Harish Chandra',
      customerEmail: 'harish@steelmfg.com',
      customerPhone: '+91 93210 99000',
      subject: 'Closed: Legacy API documentation link broken',
      description: 'Documentation link in dashboard settings returns 404.',
      priority: 'LOW',
      status: 'CLOSED',
      assignedAgentId: agentMap['sneha@arvo.com'].id,
      createdOffsetHours: 300,
      resolvedOffsetHours: 250, // Resolved > 10 days ago (Cannot reopen! Reopen window expired)
      messages: [
        { senderType: 'AGENT', senderId: agentMap['sneha@arvo.com'].id, senderName: 'Sneha Rao', content: 'We updated the docs redirect URL. It is working properly now.' }
      ],
      notes: []
    },
    {
      ticketNumber: 'ARVO-1009',
      customerName: 'Deepa Krishnan',
      customerEmail: 'deepa@organicfoods.co',
      customerPhone: '+91 98410 33445',
      subject: 'Customer inactivity test: Pending warehouse location details',
      description: 'Customer asked to migrate warehouse stock but has not responded with target warehouse codes for 6 working days.',
      priority: 'LOW',
      status: 'WAITING_CUSTOMER',
      assignedAgentId: agentMap['vikram@arvo.com'].id,
      createdOffsetHours: 150,
      slaPaused: true,
      pausedWorkingMinutes: 540 * 6, // 6 working days waiting! (Eligible for auto-closure)
      messages: [
        { senderType: 'AGENT', senderId: agentMap['vikram@arvo.com'].id, senderName: 'Vikram Menon', content: 'Dear Deepa, please provide the warehouse ID numbers so we can complete your transfer.' }
      ],
      notes: [
        { authorId: agentMap['vikram@arvo.com'].id, authorName: 'Vikram Menon', content: 'Sent reminder twice. Inactivity threshold reached.' }
      ]
    },
    {
      ticketNumber: 'ARVO-1010',
      customerName: 'Tariq Mansoor',
      customerEmail: 'tariq@arabiancargo.com',
      customerPhone: '+971 50 123 4567',
      subject: 'Webhook callback signature verification failing',
      description: 'HMAC SHA256 signature mismatch when our webhook listener receives event order.completed.',
      priority: 'MEDIUM',
      status: 'OPEN',
      assignedAgentId: null,
      createdOffsetHours: 3,
      messages: [],
      notes: []
    }
  ];

  for (const t of sampleTickets) {
    const createdAt = now.minus({ hours: t.createdOffsetHours }).toJSDate();
    const sla = slaService.calculateInitialSLADeadlines(createdAt, t.priority, holidayDates);

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: t.ticketNumber,
        customerName: t.customerName,
        customerEmail: t.customerEmail,
        customerPhone: t.customerPhone,
        subject: t.subject,
        description: t.description,
        priority: t.priority,
        status: t.status,
        assignedAgentId: t.assignedAgentId,
        assignedAt: t.assignedAgentId ? createdAt : null,
        createdAt,
        firstResponseDeadline: sla.firstResponseDeadline,
        resolutionDeadline: sla.resolutionDeadline,
        firstResponseAt: t.messages.some(m => m.senderType === 'AGENT') ? now.minus({ hours: t.createdOffsetHours - 1 }).toJSDate() : null,
        resolvedAt: t.resolvedOffsetHours ? now.minus({ hours: t.resolvedOffsetHours }).toJSDate() : null,
        closedAt: t.status === 'CLOSED' ? now.minus({ hours: (t.resolvedOffsetHours || 10) - 2 }).toJSDate() : null,
        slaPausedAt: t.slaPaused ? now.minus({ hours: 4 }).toJSDate() : null,
        totalPausedWorkingMinutes: t.pausedWorkingMinutes || 0,
      }
    });

    // Seed messages
    for (const msg of t.messages) {
      await prisma.message.create({
        data: {
          ticketId: ticket.id,
          senderType: msg.senderType,
          senderId: msg.senderId,
          senderName: msg.senderName,
          content: msg.content,
          createdAt: now.minus({ hours: t.createdOffsetHours - 0.5 }).toJSDate()
        }
      });
    }

    // Seed internal notes
    for (const note of t.notes) {
      await prisma.internalNote.create({
        data: {
          ticketId: ticket.id,
          authorId: note.authorId,
          authorName: note.authorName,
          content: note.content,
          createdAt: now.minus({ hours: t.createdOffsetHours - 0.7 }).toJSDate()
        }
      });
    }

    // Seed initial Audit Log
    await prisma.auditLog.create({
      data: {
        ticketId: ticket.id,
        actorType: 'SYSTEM',
        actorName: 'Frontdesk System',
        action: 'CREATED',
        newValue: JSON.stringify({ priority: ticket.priority, status: ticket.status }),
        description: `Ticket ${ticket.ticketNumber} created via Support Portal`,
        createdAt
      }
    });

    if (t.assignedAgentId) {
      await prisma.auditLog.create({
        data: {
          ticketId: ticket.id,
          actorType: 'AGENT',
          actorId: t.assignedAgentId,
          actorName: createdAgents.find(a => a.id === t.assignedAgentId)?.name || 'Agent',
          action: 'ASSIGNED',
          previousValue: JSON.stringify({ assignedAgentId: null }),
          newValue: JSON.stringify({ assignedAgentId: t.assignedAgentId }),
          description: `Ticket assigned to ${createdAgents.find(a => a.id === t.assignedAgentId)?.name}`,
          createdAt: now.minus({ hours: t.createdOffsetHours - 0.2 }).toJSDate()
        }
      });
    }
  }

  console.log(`Successfully seeded ${sampleTickets.length} sample tickets with messages, notes, and audit trails.`);
  console.log('--- Seeding Completed Successfully ---');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
