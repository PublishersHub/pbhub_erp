# HR System — Testing Plan for 2026-05-08 Update

This is a focused checklist for the changes pushed in today's update — bug fixes + new features. Spend ~45 minutes running through it; tick each box as you confirm. Anything that doesn't match the expected behaviour goes in the bug list at the end.

> **URL:** https://hr.cloudxbloom.com
> **Admin login:** `admin@pbhub.com` / `admin123`
> Other accounts: `bilal.sheikh@pbhub.com` (HR), `usman.tariq@pbhub.com` (Finance), `sara.khan@pbhub.com` (Manager), `hamza.iqbal@pbhub.com` (Employee). Password for all non-admin: `password123`.

---

## Part A — Bug fixes (regression tests)

These were broken in your previous round of feedback. Confirm they're fixed.

### A1. Attendance from admin shows in records

**Logged in as:** Bilal (HR).

- [ ] Sidebar → **Attendance → Corrections**.
- [ ] Approve a pending correction request (or get an employee to submit one first as `hamza.iqbal@pbhub.com`, then approve).
- [ ] Sidebar → **Attendance → Daily Summary**, set the date range to include that day.
- [ ] **Expected:** the corrected attendance shows up for that employee on that date.
- [ ] **Was:** missing entirely (off-by-one date).

### A2. Location permission on check-in

**Logged in as:** Hamza.

- [ ] Click the floating button (bottom-right) → **Check in**.
- [ ] Browser asks for location. Click **Allow**.
- [ ] **Expected:** toast says "Recorded at HH:MM with location."
- [ ] Refresh + try once more, this time clicking **Block** on the location prompt.
- [ ] **Expected:** toast says "Location blocked — click the lock icon in the address bar to enable" instead of just "not shared".

### A3. Floating widget refreshes /attendance page

**Logged in as:** Hamza.

- [ ] Open https://hr.cloudxbloom.com/attendance in **one tab** — note the status pill (probably "Not started").
- [ ] In a **second tab**, open the dashboard. Click the floating button → **Check in**.
- [ ] Switch back to the first tab (don't refresh).
- [ ] **Expected:** within a second the status flips to "Working" with start time, no manual reload needed.

### A4. Attendance heatmap updates

**Logged in as:** Bilal or Super Admin.

- [ ] Sidebar → **Dashboard**. Scroll to the **Attendance heatmap** card.
- [ ] **Expected:** today's cell (and other days where employees checked in) is coloured. Empty days are grey.
- [ ] **Was:** entire heatmap was grey because of a date-key bug.

### A5. Currency shows PKR everywhere

- [ ] Open `/payroll/payslips/my` (any employee with payslips). **Expected:** "PKR 150,000" formatting.
- [ ] Open `/expenses/claims`. **Expected:** PKR everywhere.
- [ ] Download a payslip PDF (`/payroll/payslips/my/[cycleId]` → Download PDF). **Expected:** all amounts prefixed with "PKR".
- [ ] Was: dollar signs.

### A6. Logout button is visible

**Logged in as:** anyone.

- [ ] Look at the bottom of the sidebar (left).
- [ ] **Expected:** a clear pill button labelled **"Log out"** with a door icon — NOT just an icon.
- [ ] Click it → you land on /login.

### A7. Browser tab title shows the org's brand name

- [ ] Open any protected page (e.g. /employees).
- [ ] Look at your browser tab.
- [ ] **Expected:** "Employees · HR System" (or whatever the active org's brand name is set to in Branding settings).
- [ ] **Was:** hardcoded "Employees · PbHub" everywhere.

### A8. Excel export buttons

- [ ] **`/attendance/daily`** (as Bilal): pick a date range, click **Export to Excel**. A `.xlsx` file downloads. Open it — columns should be Date, Employee, Status, First In, Last Out, Worked, Late, Overtime.
- [ ] **`/expenses/claims`**: **Export to Excel** in the page header. Confirm a workable spreadsheet downloads.
- [ ] **`/employees`** (as Bilal): tick a few rows → sticky bar appears with **Export to Excel** + **CSV** + **Clear**. Both exports should produce a file containing the selected rows.
- [ ] **`/payroll/payslips/my`** (as any employee): click **Export to Excel** in the header.

---

## Part B — New features

### B1. ID Card PDF download

**Logged in as:** any employee.

- [ ] Sidebar → **Profile**.
- [ ] Click **Download ID Card**.
- [ ] **Expected:** a PDF downloads. Open it.
  - [ ] Sized like a credit card (small)
  - [ ] Org logo + name in a colored header band (using the org's brand colour)
  - [ ] Your photo, OR your initials in a coloured circle if you haven't uploaded one
  - [ ] Full name, employee code, designation, department, joining date
- [ ] As Bilal: open `/employees/[someone-else]` → **Download ID Card** also works there for admins.

### B2. Custom Schedule per employee

**Logged in as:** Bilal.

- [ ] Open Sara's detail → **Edit**.
- [ ] Scroll to **Custom Schedule** (collapsible — click to expand).
- [ ] Set start time `10:00`, end time `19:00`. Pick working days Mon–Fri.
- [ ] Save. Toast confirms.
- [ ] **Expected:** when Sara logs in and checks in, late/early calculations and the off-day banner respect 10–19 instead of 09–18.
- [ ] Click **Reset to policy default** → override clears.

### B3. Performance notes per employee

**Logged in as:** Sara (manager) or Bilal (HR).

- [ ] Open Hamza's detail page.
- [ ] **Expected:** a **Performance notes** card on the page.
- [ ] Type a note, tick **Private** (default on), click **Add note**. Note appears with author + timestamp.
- [ ] Log in as Hamza. Open his own profile / employee detail.
- [ ] **Expected:** the *private* note from Sara is **NOT** visible to him.
- [ ] Sara posts another note with **Private** *unticked*.
- [ ] Hamza refreshes — **NOW** he sees that public note.

### B4. Tasks tab

**Logged in as:** Sara (manager).

- [ ] Sidebar → **Tasks** (between Performance and Recruitment).
- [ ] Click **New Task**.
- [ ] Assignee: Hamza. Title: "Update CV". Description: "Send the latest by Friday." Due date: pick one. Priority: **High**.
- [ ] Save. Redirected to Tasks list.
- [ ] Switch to Hamza. Sidebar → **Tasks**.
- [ ] **Expected:** Hamza sees the task in **My tasks**. Click into it.
- [ ] Click **Mark Complete**. Confirm dialog. Confirm.
- [ ] Status becomes **COMPLETED**.
- [ ] As Sara, switch to **Assigned by me** view → Hamza's task is now COMPLETED.
- [ ] As Bilal: there's a third **All tasks** view where HR sees everyone's tasks.

### B5. Mail tab — admin compose

**Logged in as:** Bilal or Super Admin.

- [ ] Sidebar → **Mail**.
- [ ] **Recipient mode** → pick **Specific employees**. Search "hamza" → tick him. Search "ali" → tick him.
- [ ] Subject: "Friday update". Body: "Office closes early at 4pm."
- [ ] Click **Send to 2 recipients**. Confirm dialog.
- [ ] **Expected:** toast says "Sent to 2 of 2 recipients".
- [ ] Hamza and Ali receive the email at their account email (real Gmail send via SMTP). Body wrapped in branded HTML with org name + colour.
- [ ] Try again with **All employees** mode → confirm dialog should warn the larger count (~9).

### B6. Suggestion box — employee submission

**Logged in as:** Hamza.

- [ ] Sidebar → **Suggestions**.
- [ ] Click **New Suggestion**.
- [ ] Category: **Tools**. Title: "Slack notifications". Body: "Could we get HRMS to send key notifications to Slack as well?"
- [ ] Leave **Anonymous** unticked. Submit.
- [ ] **Expected:** suggestion appears in your "My Suggestions" list.

Then submit a second one **with Anonymous ticked**:

- [ ] Title: "Quieter break room". Body anything. Tick **Anonymous**.
- [ ] Submit.
- [ ] **Expected:** the anonymous one does NOT appear in "My Suggestions" (because anonymous submissions have no author link).

### B7. Suggestion box — admin inbox

**Logged in as:** Bilal.

- [ ] Sidebar → **Suggestions → Inbox**.
- [ ] **Expected:**
  - You see both of Hamza's suggestions.
  - The non-anonymous one shows "Hamza Iqbal" as author.
  - The anonymous one shows "Anonymous" — Bilal must NOT see who submitted it. **(critical privacy check)**
- [ ] Click into Hamza's named suggestion. Type a response. Click **Implement**.
- [ ] **Expected:** status → IMPLEMENTED, response saved.
- [ ] Hamza should get a notification (bell icon).

### B8. Salary formula editor

**Logged in as:** Usman.

- [ ] Sidebar → **Payroll → Components**.
- [ ] Edit the existing **Basic** component (or create one if none exists).
- [ ] **Formula** dropdown → **% of CTC**. Value: **60**.
- [ ] Save. The list shows **"60% of CTC"** in the Formula column.
- [ ] Repeat for **HRA** = 30% of Basic, **PF** = 12% of Basic (deduction).
- [ ] Add a **Travel** component as **Fixed** with no percentage.

### B9. Salary structure with live preview

- [ ] Sidebar → **Payroll → Structures** → assign a structure to Hamza.
- [ ] Enter **CTC** = 200,000.
- [ ] Tick BASIC, HRA, PF, TRAVEL.
- [ ] **Expected — live preview panel:**
  - BASIC: PKR 120,000 (60% of CTC)
  - HRA: PKR 36,000 (30% of basic)
  - PF: PKR 14,400 (12% of basic, deduction)
  - TRAVEL: PKR 5,000 (Fixed — typed by you)
  - Net = 120,000 + 36,000 + 5,000 - 14,400 = **PKR 146,600**
- [ ] Save.

### B10. Auto-generate payroll from attendance

**Logged in as:** Usman.

- [ ] Sidebar → **Payroll → Cycles**.
- [ ] Pick a draft cycle (or create a new one for this month).
- [ ] Click **Generate Payroll**.
- [ ] Confirm dialog: "This will compute payslips for all active employees from their salary structures and {month} attendance. Loss-of-pay will be applied for unpaid absences."
- [ ] Confirm.
- [ ] **Expected:** payslips are generated. Each one shows component-by-component breakdown matching the formulas. If an employee was absent any unpaid days, you see a **"Loss of Pay"** deduction line.

### B11. Auto-email PDF payslips on Finalize

**Logged in as:** Usman.

- [ ] On a cycle that already has payslips, click **Finalize**. Confirm.
- [ ] **Within 30 seconds:** every employee receives an email titled **"Your payslip for {Month Year}"** with the PDF attached.
- [ ] Open one of the emails (use Hamza's account if you have access, or just check the api logs with the dev team).
- [ ] **Expected in the email:**
  - Subject: "Your payslip for {Month} {Year}"
  - Body: "Hi {firstName}, your {Month Year} payslip is attached. Net payable: PKR ..."
  - PDF attachment named `payslip-{YYYY}-{MM}-{employeeCode}.pdf`
- [ ] PDF when opened has all amounts prefixed with **"PKR"** (no leftover dollar signs).
- [ ] If an email fails for one employee (e.g. they have no email set), the others still go out — finalize doesn't roll back.

---

## Part C — Bug report template

For anything that didn't behave as described, copy this:

```
🐞 Bug report

User: <which test account you were logged in as>
Page / URL: <e.g. /payroll/cycles/abc>
Browser: <Chrome / Safari / etc.>

What I did:
1. ...
2. ...
3. ...

What I expected:
<short description from this guide>

What actually happened:
<short description; include any error message verbatim>

Screenshot / video: <attach if possible>
```

---

## Final checklist (overall sanity)

Once you've gone through the rest:

- [ ] Browser tab title on every page shows the org's brand name (not "PbHub").
- [ ] Every amount on every page reads as PKR.
- [ ] Logout button (with text) is visible at the bottom of the sidebar.
- [ ] Floating quick-actions widget works on every protected page.
- [ ] Mobile: sidebar collapses, tables turn into cards, no horizontal scroll.
- [ ] No console errors when you open DevTools (F12 → Console) and click around for a couple of minutes.

Thanks for testing. 🙏
