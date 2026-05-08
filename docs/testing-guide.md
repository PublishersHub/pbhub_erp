# PbHub HRMS — Testing Guide

A walkthrough for testing every screen and flow in the system.
Written for non-technical reviewers — no coding required.

> **What you'll need:** a web browser (Chrome, Safari, Edge, or Firefox) and the URL the team gave you (likely `http://localhost:3000` if you're testing locally).

---

## How to use this guide

For each section:

1. **Log in** as the user listed at the top of the section.
2. **Follow the steps** in order.
3. **Tick the checkbox** when each step works as described.
4. **Note anything** that looks broken, slow, ugly, or confusing — there's a bug-report template at the bottom.

If something doesn't match the description, write down:
- Which user you were logged in as
- What page (URL) you were on
- What you clicked
- What you expected vs. what happened
- A screenshot if possible

---

## Test accounts

The system comes preloaded with these users. Passwords are simple on purpose — change them once we go live.

| Role | Name | Email | Password |
|---|---|---|---|
| Super Admin | Super Admin | `admin@pbhub.com` | `admin123` |
| HR Admin | Bilal Sheikh | `bilal.sheikh@pbhub.com` | `password123` |
| Finance Admin | Usman Tariq | `usman.tariq@pbhub.com` | `password123` |
| Manager (Engineering) | Sara Khan | `sara.khan@pbhub.com` | `password123` |
| Manager (Product) | Fatima Hussain | `fatima.hussain@pbhub.com` | `password123` |
| Employee | Ali Ahmed | `ali.ahmed@pbhub.com` | `password123` |
| Employee | Ayesha Malik | `ayesha.malik@pbhub.com` | `password123` |
| Employee (junior) | Hamza Iqbal | `hamza.iqbal@pbhub.com` | `password123` |
| Employee | Zainab Raza | `zainab.raza@pbhub.com` | `password123` |

> **Tip:** Use a different browser window (or a private/incognito window) for each role so you don't have to keep logging in and out.

---

## 1. Login & layout

**Logged in as:** anyone

- [ ] Open the URL. You should see a login page with the PbHub logo.
- [ ] Type the email and password, click **Log In**.
- [ ] If the user belongs to one organization, they go straight to the dashboard.
- [ ] If they belong to more than one (currently only Super Admin), a screen appears asking to pick an organization. Pick **PbHub** and continue.
- [ ] **Sidebar (left):** dashboard, employees, attendance, leave, expenses, payroll, performance, recruitment, onboarding, notifications, settings (visible items depend on role — that's expected).
- [ ] **Top bar (right):** organization switcher (if you belong to more than one), notification bell, theme toggle (sun/moon icon), user dropdown.
- [ ] **Theme toggle:** click the sun/moon icon. Cycles light → dark → system. Reload the page — the theme should stick.
- [ ] **Org switcher (Super Admin only):** the seeded super admin belongs to two organizations. Click the org name in the top bar — you see a dropdown with both. Pick the other one — sidebar / branding refresh to the new org. Switch back.
- [ ] **Floating button (bottom-right):** a small primary-coloured circle. Click it to open the **Quick Actions** panel.

### What to flag
- Login button does nothing or shows generic error → bug
- Sidebar shows links the role shouldn't have (e.g. an employee seeing **Settings**) → bug
- Tab title in the browser still says "PbHub HRMS" instead of the page name → bug

---

## 2. Dashboard

**Logged in as:** each role, one at a time.

The dashboard changes depending on who you are:

- **Super Admin / HR Admin:** company-wide stats (employees, leave today, attendance, recent activity).
- **Finance Admin:** finance-focused widgets (payroll cycles, pending reimbursements).
- **Recruiter:** recruitment metrics (open requisitions, pipeline).
- **Manager:** team focus (your team's attendance today, pending approvals).
- **Employee:** personal cards (today's attendance, leave balance, pending tasks).

Steps:

- [ ] Log in as **Super Admin**, confirm you see organization-wide numbers.
- [ ] Log in as **Bilal (HR Admin)** — should look similar to super admin.
- [ ] Log in as **Sara (Manager)** — should focus on her team.
- [ ] Log in as **Hamza (Employee)** — should show personal cards only.
- [ ] On any role with profile completeness < 80%, a banner appears at the top suggesting fields to fill. Click it — it should jump to **Profile**.

---

## 3. Profile

**Logged in as:** any user (try a few).

- [ ] Click your avatar in the top-right → **Profile** (or open the **Profile** link from the sidebar).
- [ ] **Profile completeness card** appears at the top with a percentage and "Missing: ..." hint.
- [ ] **Profile photo:** hover over the avatar → a camera icon appears → click → file picker opens.
- [ ] Pick any image (PNG/JPEG). The photo updates within a second; you see a "Profile photo updated" toast.
- [ ] Refresh the page — the photo should still be there.
- [ ] Try uploading a giant file (over 5 MB) — should show an error, not crash.
- [ ] **Inline edit (pencil icon):** hover over a field like first name. A pencil appears. Click it, type, hit Enter — the value saves.
- [ ] Press **Esc** while editing — should cancel without saving.
- [ ] **Change password** form: enter current + new + confirm. Should work and log you out / require re-login.
- [ ] **Download ID Card** button (NEW): click it → a branded PDF downloads. Open it. It should show:
  - Org logo + name in a coloured header band
  - Your photo (or initials in a coloured circle if you haven't uploaded one)
  - Full name, employee code, designation, department, joining date
  - Sized like a credit card (85.6 × 54 mm) — print on a small card if you want a physical copy.

### What to flag
- Photo upload spinner gets stuck → bug
- Old photo briefly flickers back after upload → cosmetic
- Inline edit doesn't show a pencil on hover → bug
- Saving a name shows the old value until you refresh → bug
- ID Card PDF won't open / shows "Damaged" → bug
- ID Card PDF shows white-on-white text or wrong colours → bug

---

## 4. Employees

### 4a. Employee list

**Logged in as:** Bilal (HR) or Super Admin.

- [ ] Sidebar → **Employees**.
- [ ] Table of all employees with code, name (with avatar to the left), department, designation, status pill.
- [ ] On a small screen / mobile, the table converts to cards.
- [ ] **Search:** type "sara" — table filters live.
- [ ] **Filters:** by department, by status, by designation. Try one, then **Clear filters**.
- [ ] **Bulk export:** tick checkboxes on a few rows → sticky bar appears with "Export CSV". Click it. CSV downloads with the selected employees.
- [ ] Sorting: click a column header (e.g. **Name**). Order should flip with each click.
- [ ] **Pagination:** if more than one page, navigate using the page controls at the bottom.

**Logged in as:** Sara (manager).

- [ ] Sidebar → **Employees**.
- [ ] You should ONLY see your team members (Ali, Ayesha, Hamza), not the full company.

### 4b. Add employee

**Logged in as:** Bilal.

- [ ] On the Employees list, click **Add Employee** (top-right).
- [ ] Fill in: code, first/last name, email, department, designation, joining date, etc.
- [ ] Click **Add Employee** at the bottom. Spinner shows during submit.
- [ ] You're redirected to the new employee's detail page. Toast confirms.

### 4c. Edit / view employee

- [ ] Open any employee's detail page. Identity card at top with avatar, name, designation.
- [ ] **Edit** button → opens edit page. Change phone or department. Save.
- [ ] On the edit page, the **avatar uploader** (camera icon overlay on hover) lets you upload/replace a photo.
- [ ] Back on the list, the new photo appears in that row.

### 4d. Deactivate employee

**Logged in as:** Bilal.

- [ ] On an employee's detail page, click **Deactivate**.
- [ ] A warning confirm dialog appears.
- [ ] Confirm. Employee status changes to **Inactive**.
- [ ] On the list, the inactive employee shows in muted style or hidden by the filter (depending on filter setting).

### 4e. Departments

**Logged in as:** Bilal.

- [ ] Sidebar → **Employees → Departments**.
- [ ] List of departments: ENG, HR, FIN, etc.
- [ ] Click **New Department**. Fill in code + name. Save.
- [ ] **Deactivate** an unused department → confirm dialog → confirm.
- [ ] Empty states show a friendly CTA when no departments match the search.

### 4f. Designations

**Logged in as:** Bilal.

- [ ] Sidebar → **Employees → Designations**.
- [ ] Same flow as departments: list, search, add, deactivate.

### 4g. Org chart

**Logged in as:** Bilal or Super Admin.

- [ ] Sidebar → **Employees → Org Chart**.
- [ ] You see a visual tree of the reporting hierarchy. Top: people without a manager. Below them, their reports. And so on.
- [ ] Each card shows avatar, name, designation.
- [ ] Click a card → jump to that employee's detail.

### 4h. Custom Schedule (per-employee time override) — NEW

**Logged in as:** Bilal (HR) or Super Admin.

Some employees don't follow the standard policy hours (e.g. Sara is on a 10-to-7 shift, Hamza works Tue–Sat). The Custom Schedule section lets you override per employee.

- [ ] Open any employee's detail page → **Edit**.
- [ ] Scroll to the **Custom Schedule** section (collapsible — click to expand).
- [ ] Enter a custom **Start time** and **End time** (e.g. 10:00 → 19:00).
- [ ] Pick **Working days** (chips for Mon–Sun; tap to toggle).
- [ ] Optionally adjust **Grace late** and **Grace early** in minutes.
- [ ] Click **Save**.
- [ ] Switch to that employee, click **Check in** — the off-day banner and late/early calculations should now follow the override, not the standard policy.
- [ ] Click **Reset to policy default** — wipes the override; back to standard policy.

### 4i. Performance notes per employee — NEW

**Logged in as:** Sara (manager) or Bilal (HR).

- [ ] Open Hamza's detail page (he reports to Ali → who reports to Sara, so Sara is in his chain).
- [ ] You see a **Performance notes** card.
- [ ] Type a note ("Great handling of the recent migration deadline."), tick **Private** (default on), click **Add note**.
- [ ] Note appears with your name + timestamp.
- [ ] Log in as **Hamza** himself, open his profile / detail page — he should NOT see the private note.
- [ ] Log in as Sara, post another note with **Private** unticked.
- [ ] Log in as Hamza — he NOW sees this public note.

### What to flag
- Avatars don't load (broken image icon) → bug
- Manager (Sara) sees employees outside her team → permission bug
- CSV export doesn't include the rows you selected → bug
- Org chart loops or shows a person twice → data bug
- Custom Schedule saved but check-in still uses standard policy → bug
- Private performance note visible to the subject employee → privacy bug

---

## 5. Attendance

The attendance system is **strict mode**: one check-in and one check-out per day. After check-out, the day is locked until tomorrow.

### 5a. Quick Actions widget (every role with check-in permission)

- [ ] Click the floating button at bottom-right. A panel opens showing today's date.
- [ ] **Status section** says "Not started" with a "Check in" button.
- [ ] Click **Check in.**
   - Browser may ask for location permission — it's optional. Click **Allow** to share location, or **Block** to skip.
   - After 1–4 seconds, the panel updates to **Working** with a live counter ("0m" growing every minute).
- [ ] Close the widget (X button at top-right of the panel) and reopen — status should still be **Working**.
- [ ] Try clicking check-in again somewhere else (e.g. via Cmd+K → "Check in") — should fail with **"Already checked in today"**.
- [ ] Click **Check out.** Panel changes to "Day complete" with a green tick, your start/end times, and total worked minutes.
- [ ] Now the panel hides the buttons and shows just the summary — try checking in again, the widget shouldn't let you.

### 5b. Attendance page (`/attendance`)

- [ ] In the sidebar, click **Attendance → Check In / Out** (or just **Attendance**).
- [ ] You see today's date, current time, the same status card, and **Today's Summary** with status (PRESENT / WEEKEND / HOLIDAY etc).
- [ ] Below: a list of your check-in/out logs. Each log shows time, IP, source (WEB), and small chips for **device** + **location** (if you allowed location).
- [ ] Click a location chip — opens Google Maps in a new tab at that point.

### 5c. Off-day banner (weekend / holiday)

Today (2026-05-04) is a Monday — a normal working day. To test the banner:

- [ ] Either wait for a weekend, OR temporarily change your computer's date forward to a Saturday (with everyone's permission first), OR ask the dev team to add a fake holiday for today.
- [ ] On a weekend or holiday, the Quick Actions panel and `/attendance` page show a friendly **"Weekend"** or **"Holiday — [name]"** card instead of the check-in button.
- [ ] There's a small **Check in anyway** link below for people who do work weekends.

### 5d. Daily summary (managers / HR)

**Logged in as:** Bilal (HR Admin) or Super Admin.

- [ ] Sidebar → **Attendance → Daily Summary**.
- [ ] You see a table with every employee, today's status (PRESENT / WEEKEND / etc), check-in time, check-out time, worked minutes.
- [ ] Use the **date range picker** at the top — try "Last 7 days", "This month", custom range. Table updates.
- [ ] Try **Search** — type "sara". Table filters live.

### 5e. Attendance corrections

**Logged in as:** Hamza (employee).

- [ ] Sidebar → **Attendance → Corrections**.
- [ ] Click **Submit correction** (or whatever button creates a new request).
- [ ] Pick a date in the past, enter requested time, write a reason. Submit.
- [ ] Toast: "Correction submitted".

**Switch to:** Bilal (HR Admin).

- [ ] Sidebar → **Attendance → Corrections**.
- [ ] You see Hamza's request. Click **Approve** — confirm dialog appears.
- [ ] Confirm. Status changes to APPROVED.

### 5f. Attendance policies

**Logged in as:** Bilal.

- [ ] Sidebar → **Attendance → Policies**.
- [ ] List of policies (e.g. "Standard 9-to-6"). Each shows type (FIXED / FLEXIBLE), working days, grace minutes.
- [ ] Click into one. You see assigned employees on the right.
- [ ] **Assign** an employee → toast → row appears.
- [ ] **Remove assignment** → red confirm dialog.
- [ ] **Create** a new policy with custom hours (e.g. 10-to-7) and a few working days.
- [ ] **Deactivate** a policy → confirm dialog (red).

### 5g. Attendance reports

**Logged in as:** Bilal or Super Admin.

- [ ] Sidebar → **Attendance → Reports**.
- [ ] Pick a month from the **month selector** at the top.
- [ ] Table per employee: present days, late days, absent, on-leave, weekend, holiday, total worked hours.
- [ ] Numbers should add up to total days in the month.

### What to flag
- After check-out, the page still shows a check-in button → bug
- Worked time on the panel goes backwards or stuck at 0 → bug
- Admin daily summary missing employees who didn't check in → expected on a working day (will show as ABSENT after the next overnight job runs); if dates are weeks old and still missing → bug
- Reports show negative numbers or numbers > total days in month → bug

---

## 6. Leave

### 6a. Apply for leave (employee)

**Logged in as:** Hamza.

- [ ] Sidebar → **Leave → Requests**.
- [ ] Click **New Request** (top-right).
- [ ] Pick a leave type (Annual, Sick, Casual…), start date, end date.
- [ ] Type a reason ("Family event").
- [ ] Click **Submit**. Should show a spinner during submit, then a success toast.
- [ ] You see the new request in the list with status **PENDING**.

- [ ] Click on the request — you should be taken to a detail page showing all info.
- [ ] Click **Cancel request** → confirm dialog appears asking to confirm.
- [ ] Confirm. Status changes to **CANCELLED**.

### 6b. Approve leave (manager)

**Logged in as:** Sara (Hamza's manager via EMP001 → EMP002 → EMP004 chain).

- [ ] Open the **Inbox** from the sidebar — you see pending leave requests for your team.
- [ ] Click on Hamza's request. Detail page opens.
- [ ] Click **Approve**. Confirm dialog. Confirm. Status → **APPROVED**.
- [ ] Try **Reject** on another pending request — confirm dialog should be red ("danger" tone) with a remarks field.

### 6c. Bulk approve

**Logged in as:** Sara or Bilal.

- [ ] Sidebar → **Leave → Requests** → switch view to **Pending Approvals**.
- [ ] Tick checkboxes on 2–3 pending rows.
- [ ] A sticky bar appears at the bottom: "X selected · Approve all · Reject all · Clear".
- [ ] Click **Approve all** — confirm dialog. Confirm.
- [ ] Toast at the end: "Approved X requests" (or "Approved X of Y — 1 failed" if any fail).

### 6d. Calendar view

**Logged in as:** Sara or Bilal.

- [ ] Sidebar → **Leave → Requests** → switch view to **All Requests**.
- [ ] At the top there's a toggle: **List | Calendar**. Click **Calendar**.
- [ ] You see a month grid. Each leave shows up as a coloured bar with employee name + leave type.
- [ ] Click on a date — list view filters to leaves covering that day.
- [ ] Click **Clear date filter** to undo.
- [ ] Use the **<** and **>** arrows to navigate months. Click **Today** to jump back.
- [ ] Holidays show as a thin coloured strip at the top of cells.

### 6e. Leave balances

**Logged in as:** any employee.

- [ ] Sidebar → **Leave → Balances**.
- [ ] Table of leave types with **Total**, **Used**, **Remaining** columns.
- [ ] After applying for leave (5a), the **Used** count should reflect pending + approved.

### 6f. Holidays

**Logged in as:** Bilal.

- [ ] Sidebar → **Leave → Holidays**.
- [ ] List of holidays with date, name, optional/mandatory flag.
- [ ] Click **Add Holiday**. Fill in date + name. Save. Should appear in the list.
- [ ] Click **Deactivate** on a holiday → confirm dialog → confirm. Holiday hides from the list.

### 6g. Leave policies

**Logged in as:** Bilal.

- [ ] Sidebar → **Leave → Policies**.
- [ ] List of policies (Annual, Sick, Casual, Maternity).
- [ ] Click into a policy → detail page with assignment list.
- [ ] **Assign** an employee to a policy → toast → assignment appears.

---

## 7. Expenses

### 7a. Submit a claim with receipt

**Logged in as:** Hamza.

- [ ] Sidebar → **Expenses → Claims** (or similar).
- [ ] Click **New Claim** / **Submit Claim**.
- [ ] Fill in title, total amount, category, etc.
- [ ] **Add Item** to add expense items. Each item has its own receipt upload.
- [ ] Drag a PDF or image into the **drop area** for the receipt. (Or click to browse.)
- [ ] You see "Uploading…" then a green checkmark "Uploaded receipt.png".
- [ ] Click **Remove** to test that path — receipt clears, dropzone reappears.
- [ ] Re-upload. Submit the claim.
- [ ] Toast: "Claim submitted".

### 7b. View a claim

- [ ] Click your new claim from the list.
- [ ] Detail page shows items, amounts, receipt thumbnails.
- [ ] Click a thumbnail → opens the receipt in a new tab.
- [ ] If the receipt is a PDF, you see a 📄 icon instead of a thumbnail.

### 7c. Approve a claim (manager / finance)

**Logged in as:** Sara (manager).

- [ ] Inbox shows the new claim.
- [ ] Click into it. Approve. Confirm dialog. Confirm.
- [ ] Status changes to **MANAGER_APPROVED** (or similar — passes to finance).

**Switch to:** Usman (finance).

- [ ] Inbox shows the manager-approved claim.
- [ ] Click into it. Approve again as finance.
- [ ] Now it's ready for **reimbursement**.
- [ ] Click **Mark Reimbursed**. Confirm dialog. Status → **REIMBURSED**.

### 7d. Bulk approve

**Logged in as:** Sara or Usman.

- [ ] Sidebar → **Expenses → Claims** → switch to pending view.
- [ ] Tick 2–3 claims. Sticky bar at bottom → **Approve all**. Confirm. Toast summary.

### 7e. Categories & policies

**Logged in as:** Bilal or Usman.

- [ ] Sidebar → **Expenses → Categories**: add a category, deactivate one (with confirm dialog).
- [ ] Sidebar → **Expenses → Policies**: similar.

---

## 8. Payroll

### 8a. View own payslip (employee)

**Logged in as:** Ali.

- [ ] Sidebar → **Payroll → My Payslips**.
- [ ] You see a list of your past payslips by month.
- [ ] Click the latest. Detail page shows breakdown (basic, allowances, deductions, net).
- [ ] Click **Download PDF**. A branded PDF should download with the org logo.

### 8b. Cycle management (HR / Finance)

**Logged in as:** Usman.

- [ ] Sidebar → **Payroll → Cycles**.
- [ ] List of cycles (one per month).
- [ ] Click **Create Cycle**. Pick a month. Save.
- [ ] Click into the new cycle. **Generate Payroll** button.
- [ ] Click → it computes payslips for everyone (might take a few seconds).
- [ ] Review individual payslips inline.
- [ ] **Finalize** the cycle. Confirm dialog (warning tone). Confirm.
- [ ] After finalize: payslips are visible to employees; cycle is locked.
- [ ] Try **Regenerate** on a finalized cycle — should warn.

### 8c. Salary components — with formulas (UPDATED)

**Logged in as:** Usman.

- [ ] Sidebar → **Payroll → Components**.
- [ ] Click **New Component**. Fill in code (e.g. `BASIC`), name, type (EARNING/DEDUCTION).
- [ ] **Formula** dropdown (NEW): pick **% of CTC**, **% of Basic**, **% of Gross**, or **Fixed**.
- [ ] If you picked a percentage type, enter the value (e.g. `60` for 60%).
- [ ] Save. The list now shows the formula in a "Formula" column (e.g. "60% of CTC").
- [ ] Edit an existing component to change its formula type → save → refresh — value persists.

Common setup:
- `BASIC` = 60% of CTC
- `HRA` = 30% of Basic
- `TRAVEL` = Fixed (5,000)
- `PF` = 12% of Basic (DEDUCTION)

### 8d. Salary structure — with live preview (UPDATED)

**Logged in as:** Usman.

- [ ] Sidebar → **Payroll → Structures** → **Assign / New** for an employee.
- [ ] Enter a **CTC** at the top (e.g. 200,000).
- [ ] Tick the components to include (BASIC, HRA, TRAVEL, PF).
- [ ] **Live preview** panel updates with each component's computed amount + a "60% of CTC = 120,000" derivation hint.
- [ ] Components with a non-Fixed formula are read-only (driven by CTC).
- [ ] Components with **Fixed** formula get a typed amount input.
- [ ] Save. The assigned structure persists with the resolved amounts + the CTC value.

### 8e. Auto-generate payroll from attendance (UPDATED)

**Logged in as:** Usman.

- [ ] Open a draft cycle. Click **Generate Payroll**.
- [ ] A confirm dialog explains: "This will compute payslips for all active employees from their salary structures and {Month} attendance. Loss-of-pay will be applied for unpaid absences."
- [ ] Confirm. The system:
  - Computes each employee's expected working days for the month (using their custom schedule override if set, else policy)
  - Counts present + paid-leave + holiday + weekend days
  - Subtracts a **Loss of Pay** deduction for unpaid absences
- [ ] Each generated payslip should show line items + an explicit **Loss of Pay** line if any days were absent.
- [ ] Try generating for a month with mixed attendance (some employees absent) — verify LOP is non-zero only for the absent ones.

### 8f. Auto-email PDF payslips on Finalize (NEW)

**Logged in as:** Usman.

- [ ] On a generated cycle, click **Finalize**.
- [ ] Confirm dialog. Confirm.
- [ ] Within seconds, every employee should receive an email titled **"Your payslip for {Month Year}"** with the PDF attached.
- [ ] Open the email. Subject + body should include the org brand name. PDF amounts should show "PKR ..." formatting.
- [ ] If an email fails (e.g. employee has no `Account.email` set), the finalize still succeeds — only that one is skipped. Use **Resend emails** (admin-only button) to re-fire.

### What to flag
- Live preview shows the wrong total for a known formula (e.g. 60% of 200,000 ≠ 120,000) → bug
- LOP deduction missing on a payslip when the employee had absences → bug
- Finalize succeeds but no emails went out → bug (check api logs for SMTP errors)
- PDF attachment is corrupted / 0 bytes → bug

---

## 9. Performance

### 9a. Set a goal (employee)

**Logged in as:** Ayesha.

- [ ] Sidebar → **Performance → Goals**.
- [ ] If empty: see a friendly empty state with a button **Set a goal**.
- [ ] Click → form opens.
- [ ] Title ("Improve code review velocity"), description, target date. Save.
- [ ] Goal appears in the list with status **DRAFT**.

### 9b. Submit goal for approval

- [ ] Click into the goal. Click **Submit for approval**.
- [ ] Status → **PENDING_APPROVAL**.

### 9c. Approve goal (manager)

**Logged in as:** Sara.

- [ ] Inbox shows pending goals.
- [ ] Approve. Status → **APPROVED**.

### 9d. Performance cycle & reviews

**Logged in as:** Bilal.

- [ ] Sidebar → **Performance → Cycles**.
- [ ] Create a cycle (e.g. Q2 2026). Open it. Transition through phases (Self-review → Manager review → Calibration → Closed) — each transition shows a confirm dialog.

---

## 10. Tasks (NEW)

A simple task tracker. Managers/HR assign work to employees; employees see what they're responsible for and mark items complete.

### 10a. Create a task

**Logged in as:** Sara (manager) or Bilal (HR).

- [ ] Sidebar → **Tasks**.
- [ ] Click **New Task**.
- [ ] Pick assignee (e.g. Hamza), title ("Update CV before Friday"), description, due date, priority (Low/Medium/High/Urgent).
- [ ] Save. You're redirected back to the list.

### 10b. Receive + complete a task

**Logged in as:** Hamza.

- [ ] Sidebar → **Tasks**.
- [ ] **My Tasks** view shows the task Sara just assigned.
- [ ] Click into it. See title, description, due date, priority.
- [ ] Click **Mark Complete** (or change status via the dropdown). Confirm dialog appears.
- [ ] Confirm. Status → **COMPLETED**.

### 10c. Filter + admin views

- [ ] As Sara: switch to **Assigned by me** view → see all tasks she's assigned.
- [ ] As Bilal: there's a third **All tasks** view (HR sees everyone's tasks).
- [ ] Filter by status (TODO / IN_PROGRESS / COMPLETED / CANCELLED).
- [ ] An overdue badge appears on past-due non-completed tasks.

### What to flag
- Assigning to an employee outside one's team works but shouldn't (depends on perms — HR/manager should be allowed; verify role)
- Mark Complete doesn't update status → bug
- Overdue badge missing on past-due tasks → cosmetic bug

---

## 11. Mail (NEW)

Admin tool for sending one-off emails to employees from inside the HRMS — announcements, policy changes, etc.

**Logged in as:** Bilal or Super Admin.

- [ ] Sidebar → **Mail**.
- [ ] **Compose** opens a form: **Recipient mode** (All employees / Department / Specific employees), Subject, Body.
- [ ] Pick **Specific** → search + tick employees you want.
- [ ] Type a subject and body.
- [ ] **Send** → confirm dialog showing recipient count.
- [ ] Confirm. Toast: "Sent to 3 of 3 recipients" (or X of Y if some failed).
- [ ] Each picked employee receives the email at their account email. Body wrapped in a branded HTML template (org name + brand colour).

### What to flag
- "Specific" picker doesn't include search → bug
- Send proceeds without a confirm dialog → bug (we want a sanity check before mass-emailing)
- Email arrives without org branding → cosmetic
- Sender email address looks wrong → check `MAIL_FROM` env var with the dev team

---

## 12. Suggestion box (NEW)

Two-sided: employees post suggestions; HR / super admin reviews and responds in an inbox.

### 12a. Submit a suggestion (employee)

**Logged in as:** Hamza.

- [ ] Sidebar → **Suggestions**.
- [ ] Click **New Suggestion**.
- [ ] Pick a **Category** (Workplace / Process / Tools / Culture / Compensation / Other).
- [ ] Title + body.
- [ ] **Anonymous** checkbox (default off): if ticked, your name + employee ID won't be visible to admins. Banner explains this.
- [ ] Submit. You see your own submitted suggestion in the list (named, not anonymous — anonymous ones aren't shown in "My suggestions" because they have no author link).

### 12b. Admin inbox + respond

**Logged in as:** Bilal or Super Admin.

- [ ] Sidebar → **Suggestions → Inbox**.
- [ ] List of every submission with status (OPEN / IN_REVIEW / IMPLEMENTED / DECLINED / ARCHIVED).
- [ ] Anonymous ones show **"Anonymous"** instead of name — admin literally cannot see who wrote them.
- [ ] Click into one. Add a response, change status to **IMPLEMENTED** or **DECLINED**, save.
- [ ] If the suggestion was non-anonymous, the author gets a notification (bell icon + email if mail is wired).

### What to flag
- Anonymous submission still shows the author's name → CRITICAL privacy bug
- Status doesn't update after response → bug
- Author of a non-anonymous suggestion doesn't get a notification → bug

---

## 13. Recruitment

### 13a. Create a requisition (manager)

**Logged in as:** Sara.

- [ ] Sidebar → **Recruitment → Requisitions**.
- [ ] Click **New Requisition**. Fill in title, department, target start date, headcount, justification. Save.
- [ ] Status → **PENDING_APPROVAL**.

### 13b. Approve requisition (HR)

**Logged in as:** Bilal.

- [ ] Sidebar → **Recruitment → Requisitions**.
- [ ] Approve Sara's requisition.

### 13c. Job posting + candidates

**Logged in as:** Bilal.

- [ ] **Recruitment → Job Postings** → publish a posting from the requisition.
- [ ] **Recruitment → Candidates** → add a candidate manually (name, email, current title).
- [ ] **Recruitment → Applications** → link the candidate to the posting.
- [ ] **Recruitment → Interviews** → schedule an interview. Add interviewer, time, mode.
- [ ] **Recruitment → Offers** → create an offer. Send.

---

## 14. Onboarding

### 14a. New hire (HR)

**Logged in as:** Bilal.

- [ ] Sidebar → **Onboarding → New Hire**.
- [ ] Pick an employee (or create one). Pick an onboarding template.
- [ ] An onboarding instance is created with a list of tasks (Sign offer, Set up email, Welcome call, etc.).

### 14b. My tasks (new hire)

**Logged in as:** Hamza.

- [ ] Sidebar → **Onboarding → My Tasks**.
- [ ] You see your assigned tasks. Tick one as **complete**. Some tasks may require a document upload — drag-drop it.

### 14c. Templates (HR)

**Logged in as:** Bilal.

- [ ] Sidebar → **Onboarding → Templates**.
- [ ] Edit / create templates with task lists.

---

## 15. Settings

### 15a. Roles & Permissions (Super Admin only)

**Logged in as:** Super Admin (`admin@pbhub.com`).

- [ ] Sidebar → **Settings → Roles**.
- [ ] List of roles (Super Admin, HR Admin, Manager, Finance Admin, Recruiter, Employee).
- [ ] Click into one. You see toggle switches for every permission — try toggling one off, then back on. Save.
- [ ] Click **New Role** → create a custom role with a few permissions. Verify it shows in the list.
- [ ] Deactivate a custom role → confirm dialog.

### 15b. Users (Super Admin / HR)

- [ ] Sidebar → **Settings → Users**.
- [ ] List of all users in the org with their roles.
- [ ] Click on a user. Add or remove roles. Save.

### 15c. Invitations

- [ ] Sidebar → **Settings → Invitations**.
- [ ] Click **Invite User**. Enter email, pick a role. Send.
- [ ] You see the new invitation in the list with status **PENDING**.
- [ ] **Revoke** an invitation → red confirm dialog → confirm.
- [ ] Open the invitation email (check the team's inbox or the dev server logs). The link should let the invitee set up their password.

### 15d. Branding (your favourite for testing)

**Logged in as:** Super Admin.

- [ ] Sidebar → **Settings → Branding**.
- [ ] Three file upload areas: **Logo**, **Favicon**, **Login background**.
- [ ] Drag-drop a PNG into the **Logo** area. You see "Uploading…" → success.
- [ ] Same for favicon (small icon) and login background (large image).
- [ ] Pick a primary colour from the theme picker.
- [ ] Type a brand name and tagline.
- [ ] Click **Save**.
- [ ] **Refresh the page** — the sidebar logo updates. Open `/login` in a private window — you see the new login background.
- [ ] **Replace** an asset by dropping a new file. Old one is replaced.
- [ ] **Remove** an asset → its slot empties → save → the old logo is gone.

### 15e. Notification preferences

**Logged in as:** any user.

- [ ] Sidebar → **Notifications → Preferences** (or **Settings → Notifications**).
- [ ] Toggle off "Email me when my leave is approved".
- [ ] Save. Toast confirms.

---

## 16. Inbox

**Logged in as:** any approver (Sara, Bilal, Usman).

- [ ] Sidebar → **Inbox**.
- [ ] Page header shows total pending count.
- [ ] Sections: **Leave Requests**, **Expense Claims**, **Onboarding Tasks**, **Attendance Corrections**.
- [ ] Each section shows a count badge and is collapsible.
- [ ] Quick **Approve** / **Reject** buttons on each row — Reject opens a red confirm dialog.
- [ ] After approving, the item disappears from the list.
- [ ] If you have nothing pending, you see a friendly "You're all caught up" empty state.

---

## 17. Notifications (the bell icon)

**Logged in as:** any user.

- [ ] Click the **bell icon** in the top bar. A panel opens with recent notifications (leave approved, expense claim submitted, etc.).
- [ ] Unread items have a small dot or are highlighted.
- [ ] Click on a notification — it marks it as read and may navigate you to the related page (e.g. the leave request detail).
- [ ] **Mark all read** button clears unread badges.
- [ ] Open the full **Notifications** page (sidebar or "View all" link). Filter by read/unread, by event type (Leave / Expense / Payroll / etc.).
- [ ] On the Notifications page header, a link to **Preferences** (covered in §12e) opens the per-event toggle screen.

### What to flag
- Bell badge count doesn't decrease after marking read → bug
- Clicking a notification opens a 404 or wrong page → bug
- Unread count out of sync between bell and full page → bug

---

## 18. Search (Cmd+K / Ctrl+K)

**Logged in as:** any user.

- [ ] Press `Cmd+K` (Mac) or `Ctrl+K` (Windows). A search palette opens in the centre.
- [ ] Type **"sara"** — you see Sara Khan in the **Employees** group.
- [ ] Press the down arrow + Enter. Takes you to her profile.
- [ ] Reopen Cmd+K. Type **"leave"** — you see Leave Requests navigation, leave actions, and any leave records the user can see.
- [ ] Type **"check in"** — you see the **Check in** action.
- [ ] Press **Enter** — should call check-in.
- [ ] Type **"theme"** — see options to switch to light / dark / system theme.
- [ ] Esc to close.

---

## 19. Mobile / responsive

Switch your browser into mobile view (in Chrome: Right-click → Inspect → toggle device toolbar → pick iPhone 14 or similar).

- [ ] Sidebar collapses to a hamburger menu (top-left).
- [ ] Click the hamburger — sidebar slides in from the left.
- [ ] Tap a link, sidebar closes automatically.
- [ ] Tables don't overflow horizontally. They convert to **cards** on small screens (one card per row).
- [ ] Forms (apply leave, new claim, etc.) are usable — buttons not cut off.
- [ ] The **Quick Actions** floating button sits at bottom-right, doesn't cover important controls.

---

## 20. Edge cases worth a try

- [ ] **Permission denied:** log in as Hamza, try opening `/settings/roles` directly via URL. Should show a friendly "you don't have permission" message, not a generic error.
- [ ] **Logout:** click avatar → **Log out**. You land on the login screen. Now click your browser's **Back** button — you should go back to the login screen, NOT to the protected page.
- [ ] **Password reset:** on the login screen, click **Forgot password**. Enter Hamza's email. Open the reset email. Click the link. Set a new password. Log in with the new password.
- [ ] **Session expiry:** log in, leave the tab open for 20+ minutes, then click around. The app should silently re-authenticate (using the refresh token) — you should NOT be kicked back to login.
- [ ] **Double-clicks:** on any submit button (apply leave, save profile, etc.), double-click rapidly. Should not create duplicate records.

---

## 21. Bug report template

When you find something off, copy this template into a Slack message or email:

```
🐞 Bug report

User: <which test account you were logged in as>
Page / URL: <e.g. /leave/requests/new>
Browser: <Chrome / Safari / etc.>

What I did:
1. ...
2. ...
3. ...

What I expected:
<short description>

What actually happened:
<short description; include any error message verbatim>

Screenshot / video: <attach if possible>
```

---

## Final checklist

Once you've gone through every section above, also confirm:

- [ ] No screen has the browser tab title stuck on "PbHub HRMS" (each page should have its own title like "Leave Requests · PbHub").
- [ ] No console errors when you open the browser **DevTools** (F12 → Console tab) and click around for 5 minutes.
- [ ] Every destructive button (delete, reject, deactivate) has a confirm dialog.
- [ ] Every empty list shows a friendly empty state with a CTA, not just "No data".
- [ ] Every long-running button shows a spinner so the user knows the click registered.

---

## Need help?

If something doesn't make sense, message the team — don't try to debug technical errors yourself. Just describe what you saw.

Thanks for testing! 🙏
