'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/lib/hooks';
import { getUnreadCount } from '@/lib/notification-api';
import { OrgSwitcher } from './org-switcher';
import { ThemeToggle } from '@/components/theme-toggle';

// ─── Icons ────────────────────────────────────

type IconProps = { className?: string };

const Icon = {
  Dashboard: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  Users: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  Calendar: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  Clock: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Banknote: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 12a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V12zm-12 0h.008v.008H6V12z" />
    </svg>
  ),
  Receipt: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 3h6m-6 3h6M5.25 4.5a2.25 2.25 0 012.25-2.25h9a2.25 2.25 0 012.25 2.25V21l-4.5-1.5L9 21l-3-1.5L5.25 21V4.5z" />
    </svg>
  ),
  Chart: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
  Briefcase: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.073a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-4.072m16.5 0a24.301 24.301 0 01-4.5.892m4.5-.892l-.834-3.32a4.5 4.5 0 00-4.282-3.405h-2.268a4.5 4.5 0 00-4.282 3.405l-.834 3.32m16.5 0a24.301 24.301 0 01-4.5.892m0 0v-4.572m0 4.572a23.999 23.999 0 01-7.5 0m7.5 0v-4.572m-7.5 4.572V14.15m0 4.572a23.999 23.999 0 01-7.5 0m0 0V14.15m7.5 4.572V14.15M14.25 9h-4.5m4.5 0v-1.5a2.25 2.25 0 00-2.25-2.25h0a2.25 2.25 0 00-2.25 2.25V9" />
    </svg>
  ),
  Rocket: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  ),
  Bell: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
};

interface NavChild {
  href: string;
  label: string;
  permissions?: string[];
}

interface NavItem {
  href: string;
  label: string;
  icon: (p: IconProps) => JSX.Element;
  permissions?: string[];
  children?: NavChild[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Icon.Dashboard },
  {
    href: '/employees',
    label: 'Employees',
    icon: Icon.Users,
    permissions: ['employee.read'],
    children: [
      { href: '/employees', label: 'All Employees', permissions: ['employee.read'] },
      { href: '/employees/departments', label: 'Departments', permissions: ['employee.read'] },
      { href: '/employees/designations', label: 'Designations', permissions: ['employee.read'] },
    ],
  },
  {
    href: '/leave',
    label: 'Leave',
    icon: Icon.Calendar,
    children: [
      { href: '/leave/requests', label: 'Requests', permissions: ['leave.read_own'] },
      { href: '/leave/balances', label: 'Balances', permissions: ['leave.read_own'] },
      { href: '/leave/policies', label: 'Policies', permissions: ['leave.manage', 'leave.read'] },
      { href: '/leave/holidays', label: 'Holidays', permissions: ['leave.read_own'] },
    ],
  },
  {
    href: '/attendance',
    label: 'Attendance',
    icon: Icon.Clock,
    children: [
      { href: '/attendance', label: 'Check In / Out', permissions: ['attendance.checkin', 'attendance.read_own'] },
      { href: '/attendance/daily', label: 'Daily Summary', permissions: ['attendance.read'] },
      { href: '/attendance/corrections', label: 'Corrections', permissions: ['attendance.correct', 'attendance.read_own'] },
      { href: '/attendance/policies', label: 'Policies', permissions: ['attendance.manage'] },
      { href: '/attendance/reports', label: 'Reports', permissions: ['attendance.read'] },
    ],
  },
  {
    href: '/payroll',
    label: 'Payroll',
    icon: Icon.Banknote,
    children: [
      { href: '/payroll/components', label: 'Components', permissions: ['payroll.read'] },
      { href: '/payroll/structures', label: 'Structures', permissions: ['payroll.read'] },
      { href: '/payroll/cycles', label: 'Cycles', permissions: ['payroll.read'] },
      { href: '/payroll/payslips/my', label: 'My Payslips', permissions: ['payroll.read_own'] },
    ],
  },
  {
    href: '/expenses',
    label: 'Expenses',
    icon: Icon.Receipt,
    children: [
      { href: '/expenses/claims', label: 'Claims', permissions: ['expense.read_own'] },
      { href: '/expenses/categories', label: 'Categories', permissions: ['expense.manage'] },
      { href: '/expenses/policies', label: 'Policies', permissions: ['expense.manage'] },
    ],
  },
  {
    href: '/performance',
    label: 'Performance',
    icon: Icon.Chart,
    children: [
      { href: '/performance/cycles', label: 'Cycles', permissions: ['performance.read', 'performance.manage'] },
      { href: '/performance/goals', label: 'Goals', permissions: ['performance.read_own'] },
      { href: '/performance/reviews', label: 'Reviews', permissions: ['performance.read_own'] },
    ],
  },
  {
    href: '/recruitment',
    label: 'Recruitment',
    icon: Icon.Briefcase,
    permissions: ['recruitment.read', 'recruitment.read_own'],
    children: [
      { href: '/recruitment/requisitions', label: 'Requisitions', permissions: ['recruitment.read', 'recruitment.read_own'] },
      { href: '/recruitment/candidates', label: 'Candidates', permissions: ['recruitment.read', 'recruitment.read_own'] },
      { href: '/recruitment/applications', label: 'Applications', permissions: ['recruitment.read', 'recruitment.read_own'] },
      { href: '/recruitment/interviews', label: 'Interviews', permissions: ['recruitment.read', 'recruitment.read_own'] },
      { href: '/recruitment/offers', label: 'Offers', permissions: ['recruitment.read', 'recruitment.read_own'] },
    ],
  },
  {
    href: '/onboarding',
    label: 'Onboarding',
    icon: Icon.Rocket,
    children: [
      { href: '/onboarding', label: 'Instances', permissions: ['onboarding.read'] },
      { href: '/onboarding/my', label: 'My Onboarding', permissions: ['onboarding.read_own'] },
      { href: '/onboarding/tasks/my', label: 'My Tasks', permissions: ['onboarding.read_own', 'onboarding.task.update'] },
      { href: '/onboarding/templates', label: 'Templates', permissions: ['onboarding.template.manage'] },
    ],
  },
  { href: '/notifications', label: 'Notifications', icon: Icon.Bell, permissions: ['notification.read_own'] },
];

function initials(first?: string, last?: string) {
  return ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || '?';
}

function allowedByPerms(permissions: string[] | undefined, perms: Set<string>): boolean {
  if (!permissions || permissions.length === 0) return true;
  return permissions.some((p) => perms.has(p));
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { data: unreadData } = useAsync(() => getUnreadCount(), []);
  const unreadCount = unreadData?.count ?? 0;
  const perms = new Set(user?.user?.permissions ?? []);

  const visibleNavItems = NAV_ITEMS.flatMap((item) => {
    if (!allowedByPerms(item.permissions, perms)) return [];
    if (!item.children) return [item];
    const visibleChildren = item.children.filter((c) => allowedByPerms(c.permissions, perms));
    if (item.children.length > 0 && visibleChildren.length === 0) return [];
    return [{ ...item, children: visibleChildren }];
  });

  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on Escape key and on resize to desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth >= 1024) setDrawerOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Body scroll-lock when drawer is open on mobile
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Ambient aurora behind everything — drifts very slowly */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[40rem] w-[40rem] rounded-full bg-primary/15 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[36rem] w-[36rem] rounded-full bg-violet/10 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[30rem] w-[30rem] rounded-full bg-pink/8 blur-[140px]" />
      </div>

      {/* Backdrop — mobile only, fades in when drawer is open */}
      <div
        aria-hidden
        onClick={closeDrawer}
        className={`fixed inset-0 z-20 bg-foreground/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sidebar */}
      <aside
        className={`surface-glass fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-hairline transition-transform duration-300 ease-out lg:relative lg:z-auto lg:translate-x-0 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-hairline px-5 py-4">
          <div className="gradient-brand flex h-9 w-9 items-center justify-center rounded-xl shadow-glow-primary">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.4} stroke="white" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 11a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-foreground">
              <span className="text-gradient-brand">PbHub</span>
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              HRMS
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const IconComp = item.icon;
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeDrawer}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  }`}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  <IconComp className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.href === '/notifications' && unreadCount > 0 && (
                    <span className="gradient-brand inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white shadow-sm">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
                {item.children && isActive && (
                  <div className="mt-1 ml-7 space-y-0.5 motion-fade-in">
                    {item.children.map((child) => {
                      const childActive =
                        pathname === child.href || pathname.startsWith(child.href + '/');
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={closeDrawer}
                          className={`block rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
                            childActive
                              ? 'text-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar footer — user pill */}
        <div className="border-t border-hairline px-3 py-3">
          <div className="flex items-center gap-3 rounded-xl bg-secondary/40 px-2.5 py-2">
            <div className="gradient-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white shadow-sm">
              {initials(user?.account?.firstName, user?.account?.lastName)}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-semibold text-foreground">
                {user?.account?.firstName} {user?.account?.lastName}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">{user?.account?.email}</p>
            </div>
            <button
              onClick={logout}
              aria-label="Logout"
              title="Logout"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground motion-press"
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="surface-glass sticky top-0 z-10 flex items-center justify-between border-b border-hairline px-6 py-3 lg:justify-end">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setDrawerOpen((prev) => !prev)}
            aria-label={drawerOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={drawerOpen}
            className="relative rounded-xl border border-hairline bg-card/40 p-2 text-muted-foreground transition-all hover:border-border hover:bg-secondary hover:text-foreground motion-press lg:hidden"
          >
            <span className="flex h-4 w-4 flex-col items-center justify-center gap-[3px]">
              <span
                className={`block h-0.5 w-4 rounded-full bg-current transition-all duration-300 ${
                  drawerOpen ? 'translate-y-[5.5px] rotate-45' : ''
                }`}
              />
              <span
                className={`block h-0.5 w-4 rounded-full bg-current transition-all duration-300 ${
                  drawerOpen ? 'opacity-0 scale-x-0' : ''
                }`}
              />
              <span
                className={`block h-0.5 w-4 rounded-full bg-current transition-all duration-300 ${
                  drawerOpen ? '-translate-y-[5.5px] -rotate-45' : ''
                }`}
              />
            </span>
          </button>

          <div className="flex items-center gap-3">
            <OrgSwitcher />
            <ThemeToggle />
            <Link
              href="/notifications"
              className="relative rounded-xl border border-hairline bg-card/40 p-2 text-muted-foreground transition-all hover:border-border hover:bg-secondary hover:text-foreground motion-press"
              aria-label="Notifications"
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6} stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="gradient-brand absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
