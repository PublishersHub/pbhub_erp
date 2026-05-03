'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/components/theme-provider';
import { useToast } from '@/components/toast';
import { listEmployees } from '@/lib/employee-api';
import { listCandidates } from '@/lib/recruitment-api';
import { checkIn, checkOut } from '@/lib/attendance-api';
import { gatherCheckInMetadata, metaHasLocation } from '@/lib/attendance-metadata';
import { getAllLeaveRequests, getPendingApprovals, getMyLeaveRequests } from '@/lib/leave-api';
import { getAllClaims, getMyClaims, getPendingClaims } from '@/lib/expense-api';
import type { Employee } from '@/types/employee';
import type { Candidate } from '@/types/recruitment';
import type { LeaveRequest } from '@/types/leave';
import type { ExpenseClaim } from '@/types/expense';

// ─── Types ────────────────────────────────────

interface CommandItem {
  id: string;
  group: 'navigation' | 'employees' | 'candidates' | 'actions' | 'leave' | 'expense';
  title: string;
  subtitle?: string;
  icon?: JSX.Element;
  keywords?: string[];
  href?: string;
  action?: () => void;
}

interface CommandPaletteContextValue {
  open: boolean;
  openPalette: () => void;
  closePalette: () => void;
}

// ─── Context ──────────────────────────────────

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <CommandPaletteContext.Provider
      value={{ open, openPalette: () => setOpen(true), closePalette: () => setOpen(false) }}
    >
      {children}
      {open && <Palette onClose={() => setOpen(false)} />}
    </CommandPaletteContext.Provider>
  );
}

// ─── Icons ────────────────────────────────────

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function IconDoor() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  );
}

function IconMonitor() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// section icons
function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function IconReceipt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 3h6m-6 3h6M5.25 4.5a2.25 2.25 0 012.25-2.25h9a2.25 2.25 0 012.25 2.25V21l-4.5-1.5L9 21l-3-1.5L5.25 21V4.5z" />
    </svg>
  );
}

// ─── Initials Avatar ──────────────────────────

function InitialsAvatar({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  return (
    <div className="gradient-brand flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white">
      {initials}
    </div>
  );
}

// ─── Navigation items (hardcoded) ─────────────

function buildNavItems(): CommandItem[] {
  const pages: Array<{ title: string; href: string; keywords?: string[] }> = [
    { title: 'Dashboard', href: '/dashboard', keywords: ['home', 'overview'] },
    { title: 'All Employees', href: '/employees', keywords: ['staff', 'people', 'team'] },
    { title: 'Departments', href: '/employees/departments' },
    { title: 'Designations', href: '/employees/designations', keywords: ['positions', 'roles'] },
    { title: 'Leave Requests', href: '/leave/requests' },
    { title: 'Leave Balances', href: '/leave/balances' },
    { title: 'Leave Policies', href: '/leave/policies' },
    { title: 'Holidays', href: '/leave/holidays' },
    { title: 'Attendance Today', href: '/attendance', keywords: ['check-in', 'check-out', 'time'] },
    { title: 'Daily Summary', href: '/attendance/daily' },
    { title: 'Attendance Corrections', href: '/attendance/corrections' },
    { title: 'Payroll Cycles', href: '/payroll/cycles', keywords: ['salary', 'pay run'] },
    { title: 'My Payslips', href: '/payroll/payslips/my' },
    { title: 'Pay Components', href: '/payroll/components' },
    { title: 'Pay Structures', href: '/payroll/structures' },
    { title: 'Expense Claims', href: '/expenses/claims', keywords: ['reimburse'] },
    { title: 'Expense Categories', href: '/expenses/categories' },
    { title: 'Expense Policies', href: '/expenses/policies' },
    { title: 'Performance Cycles', href: '/performance/cycles', keywords: ['review', 'appraisal'] },
    { title: 'Goals', href: '/performance/goals' },
    { title: 'Reviews', href: '/performance/cycles' },
    { title: 'Recruitment Dashboard', href: '/recruitment', keywords: ['hiring', 'jobs'] },
    { title: 'Requisitions', href: '/recruitment/requisitions', keywords: ['job openings'] },
    { title: 'Candidates', href: '/recruitment/candidates' },
    { title: 'Applications', href: '/recruitment/applications' },
    { title: 'Interviews', href: '/recruitment/interviews' },
    { title: 'Offers', href: '/recruitment/offers' },
    { title: 'Onboarding Instances', href: '/onboarding', keywords: ['new hire'] },
    { title: 'My Onboarding', href: '/onboarding/my' },
    { title: 'My Onboarding Tasks', href: '/onboarding/tasks/my' },
    { title: 'Onboarding Templates', href: '/onboarding/templates' },
    { title: 'Notifications', href: '/notifications' },
    { title: 'Notification Preferences', href: '/notifications/preferences', keywords: ['settings', 'alerts'] },
  ];

  return pages.map((p) => ({
    id: `nav-${p.href}`,
    group: 'navigation' as const,
    title: p.title,
    href: p.href,
    keywords: p.keywords,
    icon: <IconArrow />,
  }));
}

// ─── Filter / sort helpers ────────────────────

function scoreItem(item: CommandItem, query: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const title = item.title.toLowerCase();
  const subtitle = (item.subtitle ?? '').toLowerCase();
  const kw = (item.keywords ?? []).join(' ').toLowerCase();

  if (title.startsWith(q)) return 3;
  if (title.includes(q)) return 2;
  if (subtitle.includes(q) || kw.includes(q)) return 1;
  return 0;
}

function formatShortDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function filterAndSort(items: CommandItem[], query: string): CommandItem[] {
  return items
    .map((item) => ({ item, score: scoreItem(item, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

const GROUP_ORDER: CommandItem['group'][] = [
  'actions',
  'navigation',
  'employees',
  'candidates',
  'leave',
  'expense',
];

const GROUP_LABELS: Record<CommandItem['group'], string> = {
  actions: 'Actions',
  navigation: 'Navigation',
  employees: 'Employees',
  candidates: 'Candidates',
  leave: 'Leave Requests',
  expense: 'Expense Claims',
};

// ─── Palette component ────────────────────────

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { setTheme } = useTheme();
  const { success, error } = useToast();

  const perms = new Set(user?.user?.permissions ?? []);
  const canReadLeaveAll = perms.has('leave.read');
  const canApproveLeave = perms.has('leave.approve');
  const canReadLeaveOwn = perms.has('leave.read_own');
  const canReadExpenseAll = perms.has('expense.read');
  const canApproveExpense = perms.has('expense.approve');
  const canReadExpenseOwn = perms.has('expense.read_own');

  const [query, setQuery] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [expenseClaims, setExpenseClaims] = useState<ExpenseClaim[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load employees + candidates + leave + expense once
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    // Pick the broadest leave loader available; skip if no permission
    const leavePromise: Promise<LeaveRequest[]> | null = canReadLeaveAll
      ? getAllLeaveRequests()
      : canApproveLeave
      ? getPendingApprovals()
      : canReadLeaveOwn
      ? getMyLeaveRequests()
      : null;

    // Same for expense
    const expensePromise: Promise<ExpenseClaim[]> | null = canReadExpenseAll
      ? getAllClaims()
      : canApproveExpense
      ? getPendingClaims()
      : canReadExpenseOwn
      ? getMyClaims()
      : null;

    Promise.allSettled([
      listEmployees(),
      listCandidates(),
      leavePromise ?? Promise.resolve([] as LeaveRequest[]),
      expensePromise ?? Promise.resolve([] as ExpenseClaim[]),
    ]).then(([empRes, candRes, leaveRes, expenseRes]) => {
      if (empRes.status === 'fulfilled') setEmployees(empRes.value);
      if (candRes.status === 'fulfilled') setCandidates(candRes.value);
      if (leaveRes.status === 'fulfilled') setLeaveRequests(leaveRes.value);
      if (expenseRes.status === 'fulfilled') setExpenseClaims(expenseRes.value);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build action items (inside component to capture callbacks)
  const actionItems: CommandItem[] = [
    {
      id: 'action-logout',
      group: 'actions',
      title: 'Log out',
      subtitle: 'Sign out of your account',
      icon: <IconDoor />,
      keywords: ['sign out', 'exit'],
      action: () => { logout(); onClose(); },
    },
    {
      id: 'action-theme-light',
      group: 'actions',
      title: 'Switch to light theme',
      icon: <IconSun />,
      keywords: ['light mode', 'appearance', 'bright'],
      action: () => { setTheme('light'); onClose(); },
    },
    {
      id: 'action-theme-dark',
      group: 'actions',
      title: 'Switch to dark theme',
      icon: <IconMoon />,
      keywords: ['dark mode', 'appearance', 'night'],
      action: () => { setTheme('dark'); onClose(); },
    },
    {
      id: 'action-theme-system',
      group: 'actions',
      title: 'Use system theme',
      icon: <IconMonitor />,
      keywords: ['system mode', 'auto', 'appearance'],
      action: () => { setTheme('system'); onClose(); },
    },
    {
      id: 'action-checkin',
      group: 'actions',
      title: 'Check in',
      subtitle: 'Record your arrival for today',
      icon: <IconClock />,
      keywords: ['attendance', 'arrive', 'start work'],
      action: async () => {
        try {
          const meta = await gatherCheckInMetadata();
          await checkIn(meta);
          if (metaHasLocation(meta)) {
            success('Checked in', 'Your attendance has been recorded.');
          } else {
            success('Checked in', 'Location not shared');
          }
          onClose();
        } catch (e) {
          error('Check-in failed', e instanceof Error ? e.message : 'Please try again.');
        }
      },
    },
    {
      id: 'action-checkout',
      group: 'actions',
      title: 'Check out',
      subtitle: 'Record your departure for today',
      icon: <IconClock />,
      keywords: ['attendance', 'leave', 'end work'],
      action: async () => {
        try {
          const meta = await gatherCheckInMetadata();
          await checkOut(meta);
          if (metaHasLocation(meta)) {
            success('Checked out', 'Your departure has been recorded.');
          } else {
            success('Checked out', 'Location not shared');
          }
          onClose();
        } catch (e) {
          error('Check-out failed', e instanceof Error ? e.message : 'Please try again.');
        }
      },
    },
  ];

  const navItems = buildNavItems();

  const employeeItems: CommandItem[] = employees.map((emp) => ({
    id: `emp-${emp.id}`,
    group: 'employees',
    title: `${emp.firstName} ${emp.lastName}`,
    subtitle: [emp.designation?.name, emp.employeeCode].filter(Boolean).join(' · '),
    href: `/employees/${emp.id}`,
  }));

  const candidateItems: CommandItem[] = candidates.map((c) => ({
    id: `cand-${c.id}`,
    group: 'candidates',
    title: `${c.firstName} ${c.lastName}`,
    subtitle: c.currentTitle ?? c.email,
    href: `/recruitment/candidates/${c.id}`,
  }));

  const leaveItems: CommandItem[] = leaveRequests.map((req) => {
    const empName = req.employee
      ? `${req.employee.firstName} ${req.employee.lastName}`
      : 'Unknown';
    const policyName = req.leavePolicy?.name ?? 'Leave';
    return {
      id: `leave-${req.id}`,
      group: 'leave',
      title: `${empName} · ${policyName}`,
      subtitle: `${formatShortDate(req.startDate)} → ${formatShortDate(req.endDate)} · ${req.status.toLowerCase()}`,
      href: `/leave/requests/${req.id}`,
      icon: <IconCalendar />,
      keywords: [
        empName,
        policyName,
        req.status.toLowerCase(),
        req.employee?.employeeCode ?? '',
        'leave',
        'request',
      ],
    };
  });

  const expenseItems: CommandItem[] = expenseClaims.map((claim) => {
    const amount = (() => {
      const n = parseFloat(claim.totalAmount);
      if (isNaN(n)) return claim.totalAmount;
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
    })();
    const empName = claim.employee
      ? `${claim.employee.firstName} ${claim.employee.lastName}`
      : '';
    return {
      id: `expense-${claim.id}`,
      group: 'expense',
      title: `${claim.claimNumber} · ${claim.title}`,
      subtitle: `${amount} · ${claim.status.toLowerCase().replace(/_/g, ' ')}${empName ? ` · ${empName}` : ''}`,
      href: `/expenses/claims/${claim.id}`,
      icon: <IconReceipt />,
      keywords: [
        claim.claimNumber,
        claim.title,
        empName,
        claim.status.toLowerCase(),
        'expense',
        'claim',
        'reimburse',
      ],
    };
  });

  // Build visible grouped list
  const isEmpty = query.trim() === '';
  const CAP_EMPTY = 6;
  const CAP_QUERY = 8;

  const allByGroup: Record<CommandItem['group'], CommandItem[]> = {
    actions: actionItems,
    navigation: navItems,
    employees: employeeItems,
    candidates: candidateItems,
    leave: leaveItems,
    expense: expenseItems,
  };

  const visibleGroups: Array<{ group: CommandItem['group']; items: CommandItem[] }> = [];

  for (const group of GROUP_ORDER) {
    const source = allByGroup[group];
    let matched: CommandItem[];
    if (isEmpty) {
      matched = source.slice(0, CAP_EMPTY);
    } else {
      matched = filterAndSort(source, query.trim()).slice(0, CAP_QUERY);
    }
    if (matched.length > 0) {
      visibleGroups.push({ group, items: matched });
    }
  }

  // Flat list for keyboard nav
  const flatList = visibleGroups.flatMap(({ items }) => items);
  const totalItems = flatList.length;

  // Clamp selectedIndex when list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard handler
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % Math.max(totalItems, 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + Math.max(totalItems, 1)) % Math.max(totalItems, 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = flatList[selectedIndex];
        if (item) activateItem(item);
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, totalItems, flatList]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const activateItem = useCallback(
    (item: CommandItem) => {
      if (item.href) {
        router.push(item.href);
        onClose();
      } else if (item.action) {
        item.action();
      }
    },
    [router, onClose],
  );

  // Build flat index map for easy lookup
  let flatIdx = 0;
  const groupedWithIndex: Array<{
    group: CommandItem['group'];
    items: Array<{ item: CommandItem; idx: number }>;
  }> = visibleGroups.map(({ group, items }) => ({
    group,
    items: items.map((item) => ({ item, idx: flatIdx++ })),
  }));

  return (
    <div
      className="fixed inset-0 z-[200] bg-foreground/40 backdrop-blur-sm motion-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Command palette"
    >
      {/* Card */}
      <div
        className="surface-glass relative mx-auto mt-[12vh] w-full max-w-xl rounded-2xl border-hairline shadow-floating motion-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search row */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="shrink-0 text-muted-foreground">
            <IconSearch />
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, employees, leave, expenses…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-lg text-foreground outline-none placeholder:text-muted-foreground/60"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="flex shrink-0 items-center gap-2">
            <kbd className="hidden rounded-md border border-border/60 bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">
              ⌘K
            </kbd>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close command palette"
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground motion-press"
            >
              <IconClose />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/40" />

        {/* Results body */}
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto overscroll-contain px-2 py-2"
        >
          {flatList.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              {query ? (
                <span>
                  No results for &ldquo;
                  <span className="text-foreground">{query}</span>
                  &rdquo;
                </span>
              ) : (
                <span>Start typing to search…</span>
              )}
            </div>
          ) : (
            groupedWithIndex.map(({ group, items }) => (
              <div key={group} role="group" aria-label={GROUP_LABELS[group]}>
                <div className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {GROUP_LABELS[group]}
                </div>
                {items.map(({ item, idx }) => {
                  const isSelected = idx === selectedIndex;
                  const isEmployee = item.group === 'employees';
                  const isCandidate = item.group === 'candidates';
                  const showAvatar = isEmployee || isCandidate;
                  const showIcon = !showAvatar && item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-selected={isSelected}
                      onClick={() => activateItem(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={[
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                        isSelected
                          ? 'bg-primary/10 ring-1 ring-primary/20'
                          : 'hover:bg-secondary/60',
                      ].join(' ')}
                    >
                      {/* Icon / avatar */}
                      {showAvatar ? (
                        <InitialsAvatar name={item.title} />
                      ) : showIcon ? (
                        <span
                          className={[
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                            item.group === 'actions'
                              ? 'bg-secondary text-muted-foreground'
                              : 'bg-secondary text-muted-foreground',
                          ].join(' ')}
                        >
                          {item.icon}
                        </span>
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                          <IconGrid />
                        </span>
                      )}

                      {/* Text */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                        {item.subtitle && (
                          <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                        )}
                      </div>

                      {/* Right hint */}
                      {item.href && isSelected && (
                        <kbd className="hidden shrink-0 rounded border border-border/60 bg-secondary/80 px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
                          ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/40 px-4 py-2">
          <p className="text-center text-[10px] text-muted-foreground/70">
            <kbd className="rounded border border-border/50 bg-secondary/60 px-1 py-0.5 font-mono text-[9px]">↑↓</kbd>
            {' navigate · '}
            <kbd className="rounded border border-border/50 bg-secondary/60 px-1 py-0.5 font-mono text-[9px]">↵</kbd>
            {' select · '}
            <kbd className="rounded border border-border/50 bg-secondary/60 px-1 py-0.5 font-mono text-[9px]">esc</kbd>
            {' close'}
          </p>
        </div>
      </div>
    </div>
  );
}
