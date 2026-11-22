# Frontdesk — Customer Support Ticket Management System
### Built for Arvo Systems (iNav Technologies Full Stack Developer Assessment)

> A production-grade web application replacing the shared spreadsheet and WhatsApp group for Arvo Systems' 9 support agents. Features working-hours SLA tracking, concurrency-safe ticket claiming (INC-0291), private note isolation (INC-0304), and immutable audit history (INC-0318).

* 🌐 **Live Application URL:** [https://frontdesk-bav.onrender.com](https://frontdesk-bav.onrender.com)
* 📦 **GitHub Repository:** [https://github.com/BAVIT7/frontdesk-bav](https://github.com/BAVIT7/frontdesk-bav)
* 👤 **Candidate:** Bavit Bin O (`bavitbin6@gmail.com` | `+91 98119 70310`)

---

## 1. Project Overview & Business Context

**Arvo Systems** is a software company with **9 support agents** handling approximately **40 customer problems daily**. Previously, support was coordinated via a shared spreadsheet and WhatsApp group, leading to severe operational failures:
- **Duplicate Assignments (INC-0291):** Two agents opening the same ticket and giving conflicting answers to the customer.
- **Data Leaks (INC-0304):** Confidential internal team notes being inadvertently exposed to customers.
- **Disputed Timelines (INC-0318):** Inability to prove when a response was sent or why a ticket was late.
- **SLA Calculation Failures:** Spreadsheets flagging tickets as overdue on Sunday mornings for tickets received at 6:00 PM on Friday.

**Frontdesk** eliminates these problems with a centralized, mathematically verified support management platform.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 + Vite | Modern reactive user interface |
| **Styling** | Tailwind CSS | Clean, responsive blue & white SaaS theme |
| **Icons** | Lucide React | Professional icon system |
| **HTTP Client** | Axios | REST API communication with JWT interceptors |
| **Backend** | Node.js + Express.js | REST API, SLA engine, and business logic |
| **Database** | MySQL / SQLite (Prisma ORM) | Relational persistence with migrations & transactions |
| **Date / Time Engine** | Luxon | Working-hours and timezone math (Asia/Kolkata) |
| **Security & Auth** | JWT + bcryptjs | Secure agent authentication & password hashing |
| **Validation** | Zod | Incoming request validation |
| **Deployment** | Render (Production Container) | Live hosting with persistent zero-downtime container |

---

## 3. Demo Agent Accounts (Arvo Systems Support Team)

All 9 accounts are seeded and ready for testing. Password for all accounts: **`password123`**.

| Agent Name | Email | Role | Specialization |
|---|---|---|---|
| **Meera Nair** | `meera@arvo.com` | **Support Lead** | Tier-3 Escapes & Approvals |
| **Rahul Sharma** | `rahul@arvo.com` | Support Agent | Billing & Report Queries |
| **Priya Patel** | `priya@arvo.com` | Support Agent | Fleet & IoT Integrations |
| **Amit Verma** | `amit@arvo.com` | Support Agent | Cloud & Infrastructure |
| **Sneha Rao** | `sneha@arvo.com` | Support Agent | Documentation & APIs |
| **Vikram Menon** | `vikram@arvo.com` | Support Agent | Warehouse & Operations |
| **Neha Gupta** | `neha@arvo.com` | Support Agent | Enterprise Accounts |
| **Arjun Das** | `arjun@arvo.com` | Support Agent | Mobile & Frontend Support |
| **Pooja Iyer** | `pooja@arvo.com` | Support Agent | Customer Success |

*Tip: The UI features a 1-click Demo Agent Switcher in the sidebar and login screen to test multi-agent handoffs seamlessly.*

---

## 4. Key Business Rules & Mathematical SLA Engine

### A. Working Schedule
- **Working Days:** Monday to Friday.
- **Working Hours:** `09:30 AM to 06:30 PM` (9.0 working hours = 540 working minutes/day).
- **Timezone:** `Asia/Kolkata` (Arvo Systems HQ, Kochi, Kerala).
- **Weekends:** Saturday & Sunday are non-working days (0 minutes consumed).
- **Festival Holidays:** Configured calendar holidays (Republic Day, Vishu, Onam, Deepavali, etc.) are non-working days.

### B. Priority Matrix & SLA Deadlines
| Priority | First Response Deadline | Resolution Deadline |
|---|---|---|
| **URGENT** | **2 working hours** (120 mins) | **Same working day** (by 18:30) |
| **MEDIUM** | **Half working day** (4.5 hours / 270 mins) | **3 working days** (27 working hours) |
| **LOW / SMALL** | **1 working day** (9.0 hours / 540 mins) | **1 working week** (5 working days / 45 hours) |

### C. Weekend & Friday SLA Rule (Verified in System Tests)
- **Scenario:** A ticket arrives on **Friday at 6:00 PM** with an **URGENT** priority (2 working hours response SLA).
- **Calculation:**
  1. Friday has 30 minutes left before close (6:00 PM to 6:30 PM). 30 minutes are consumed.
  2. Saturday & Sunday do not count against Arvo Systems (0 minutes consumed).
  3. Work resumes Monday at 9:30 AM with the remaining 90 minutes.
  4. First response deadline is **Monday at 11:00 AM**.
  5. The system will **never** mark this ticket overdue on Sunday morning.

### D. SLA Pause & Resume
- When an agent asks a customer for clarification, the ticket is moved to `WAITING_CUSTOMER`.
- **SLA timer pauses immediately:** The timestamp is recorded (`slaPausedAt`).
- When the customer replies (via the Customer Portal or Agent logging customer input), the SLA timer resumes automatically.
- Both `firstResponseDeadline` and `resolutionDeadline` are pushed forward by the exact working minutes elapsed during the pause.

### E. Priority Change Recalculation Rule
- **Documented Rule:** When an agent changes ticket priority from `P_old` to `P_new` at `T_change`:
  - If first response has not yet occurred, a new response deadline is calculated forward from `T_change` using `P_new`'s working minutes.
  - The resolution deadline is recalculated forward from `T_change` using `P_new`'s resolution duration.
  - The previous SLA state is snapshotted into `sla_events` and recorded in the immutable audit log for full auditability.

### F. Inactivity Auto-Closure
- If a ticket remains in `WAITING_CUSTOMER` for **5 working days** (~1 working week = 2,700 working minutes) without customer response, the system automatically transitions the ticket to `CLOSED` and logs a system audit entry.

### G. 7-Day Reopening Window
- If a customer is dissatisfied after a ticket is marked `RESOLVED`, it may be reopened within **7 calendar days**.
- If more than 7 days have elapsed, reopening is blocked with the error: *"Reopening window (7 days) has expired under Arvo Systems policy. A new ticket must be created."*

---

## 5. Critical Problem Reports & Architectural Fixes

### 1. INC-0291 (14 October) — Duplicate Ticket Assignment
- **The Problem:** Two agents opened the same unassigned ticket, clicked "take this ticket", and replied with contradictory information.
- **The Fix:** Implemented **database-level transactions with optimistic locking**:
  ```javascript
  // backend/src/routes/ticketRoutes.js
  await prisma.$transaction(async (tx) => {
    const existing = await tx.ticket.findUnique({ where: { id } });
    if (existing.assignedAgentId && existing.assignedAgentId !== req.agent.id) {
      throw { statusCode: 409, message: `Conflict: Ticket already taken by ${existing.assignedAgent.name}` };
    }
    return await tx.ticket.update({
      where: { id, version: existing.version },
      data: { assignedAgentId: req.agent.id, version: { increment: 1 } }
    });
  });
  ```
- **Live Demo in UI:** Click the **"Simulate INC-0291 Concurrency"** button in the top navigation bar to watch two parallel take requests fire simultaneously. One succeeds (200), and the second is safely rejected (409 Conflict).

### 2. INC-0304 (22 October) — Private Notes Leak Prevention
- **The Problem:** An agent wrote an internal note explaining how to handle a difficult customer; it was accidentally sent to the customer.
- **The Fix:**
  1. **Strict Table Isolation:** Internal notes are stored in `internal_notes`, completely separate from `messages`.
  2. **Schema-Level Exclusion:** The customer-facing API route (`/api/customer/tickets/:ticketNumber`) has zero access to `internalNotes`.
  3. **Visual Distinction:** In the agent UI, private notes are styled with amber backgrounds, lock icons, and confidentiality warnings.
- **Verification:** The automated test suite (`systemTests.js`) queries the customer view and verifies `internalNotes === undefined`.

### 3. INC-0318 (04 November) — Legally Defensible Immutable Audit History
- **The Problem:** A customer claimed Arvo took until the next morning to reply; Arvo believed it took 40 minutes. Nobody could prove the facts.
- **The Fix:**
  - Dedicated `audit_logs` table recording: Actor, Action, ISO Timestamp, Previous Value, New Value, and Description.
  - Zero `UPDATE` or `DELETE` endpoints exist for audit logs.
  - Dedicated **Activity History** screen in the sidebar lets managers verify the exact timeline of every ticket.

---

## 6. Installation & Local Setup

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Quick Start (Under 2 Minutes)
1. Clone the repository and navigate to the project directory:
   ```bash
   git clone https://github.com/BAVIT7/frontdesk-bav.git
   cd frontdesk-bav
   ```

2. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. Setup Database (SQLite is preconfigured for instant zero-dependency local run):
   ```bash
   cd backend
   npx prisma db push
   node prisma/seed.js
   ```

4. Run the Automated System Tests:
   ```bash
   node tests/systemTests.js
   node tests/apiIntegrationTest.js
   ```

5. Build Frontend & Start Server:
   ```bash
   cd ../frontend && npm run build
   cd ../backend && npm start
   ```
6. Open your browser at: **`http://localhost:5000`**

---

## 7. Using Production MySQL

To switch from local SQLite to hosted MySQL (e.g. Railway, PlanetScale, Aiven, or Render):
1. Set your MySQL connection string in `backend/.env`:
   ```env
   DATABASE_URL="mysql://user:password@host:3306/frontdesk"
   ```
2. Run the automated switch script:
   ```bash
   cd backend
   npm run use:mysql
   npx prisma db push
   npm run seed
   ```

---

## 8. Automated Test Suite Results

Run `npm test` inside `backend/` or the root to verify all core test suites:
```
====================================================
🧪 RUNNING FRONTDESK AUTOMATED SYSTEM VALIDATION TEST
====================================================

✅ PASS: SLA Rule: Friday 6:00 PM ticket with 2h SLA lands on Monday 11:00 AM (excludes weekend)
✅ PASS: SLA Rule: Excludes festival holidays (Jan 26 Republic Day) and carries to Tuesday
✅ PASS: SLA Medium: 4.5 working hours first response deadline is exact
✅ PASS: SLA Pause & Resume: Paused duration shifts deadline forward by exact working minutes
✅ PASS: Reopen Rule: Allowed within 7 days of resolution
✅ PASS: Reopen Rule: Blocked after 7 days of resolution (requires new ticket)
✅ PASS: INC-0291 Fix: Exactly one agent successfully takes the ticket, duplicate attempt rejected with 409 Conflict
✅ PASS: INC-0304 Fix: Customer-facing schema never contains internalNotes field

====================================================
📊 TEST SUMMARY: 8 Passed, 0 Failed
====================================================
```

---

## 9. Section 5 Note: Project Completeness & Retrospective

**Question: What did you not finish, and why?**

> **Assessment Answer:**  
> All 15 core business requirements and story constraints from the iNav Technologies assessment were completed in full. We implemented:
> 1. Authentication for all 9 support agents with 1-click demo switcher.
> 2. Full ticket CRUD with SLA calculation using working hours (9:30–18:30 Mon–Fri).
> 3. Weekend and festival holiday exclusion.
> 4. SLA pause in `WAITING_CUSTOMER` and automatic resume upon customer reply.
> 5. Documented priority change SLA recalculation.
> 6. 1-week inactivity auto-closure.
> 7. 7-day reopening window enforcement and expiration handling.
> 8. Atomic transaction locking preventing duplicate ticket claims (INC-0291).
> 9. Complete isolation of internal private notes from customer view (INC-0304).
> 10. Immutable audit logging for every action (INC-0318).
> 11. Customer portal simulator to test both public replies and leak verification.
> 12. Full dual-database support (SQLite zero-dependency local + production MySQL Prisma schema).
>
> If additional time permitted beyond the 8-hour target, potential enhancements would include:
> - Real-time WebSocket notifications (Socket.io) to push ticket status changes to agent screens instantly without polling.
> - Direct email ingestion via SendGrid/Mailgun inbound webhooks so incoming customer emails create tickets automatically.
