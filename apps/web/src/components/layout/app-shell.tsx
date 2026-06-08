'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useAsync } from '@/lib/hooks';
import { getUnreadCount } from '@/lib/notification-api';
import { type ReactNode } from 'react';

interface NavItem {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  {
    href: '/employees',
    label: 'Employees',
    children: [
      { href: '/employees', label: 'All Employees' },
      { href: '/employees/departments', label: 'Departments' },
      { href: '/employees/designations', label: 'Designations' },
    ],
  },
  {
    href: '/leave',
    label: 'Leave',
    children: [
      { href: '/leave/requests', label: 'Requests' },
      { href: '/leave/balances', label: 'Balances' },
      { href: '/leave/policies', label: 'Policies' },
      { href: '/leave/holidays', label: 'Holidays' },
    ],
  },
  {
    href: '/attendance',
    label: 'Attendance',
    children: [
      { href: '/attendance', label: 'Check In / Out' },
      { href: '/attendance/grid', label: 'Monthly Grid' },
      { href: '/attendance/daily', label: 'Daily Summary' },
      { href: '/attendance/corrections', label: 'Corrections' },
      { href: '/attendance/policies', label: 'Policies' },
      { href: '/attendance/reports', label: 'Reports' },
    ],
  },
  {
    href: '/payroll',
    label: 'Payroll',
    children: [
      { href: '/payroll/components', label: 'Components' },
      { href: '/payroll/structures', label: 'Structures' },
      { href: '/payroll/cycles', label: 'Cycles' },
      { href: '/payroll/payslips/my', label: 'My Payslips' },
    ],
  },
  {
    href: '/expenses/ledger',
    label: 'Expenses',
    children: [
      { href: '/expenses/ledger', label: 'Ledger' },
      { href: '/expenses/claims', label: 'Claims' },
      { href: '/expenses/categories', label: 'Categories' },
      { href: '/expenses/policies', label: 'Policies' },
    ],
  },
  {
    href: '/performance',
    label: 'Performance',
    children: [
      { href: '/performance/by-employee', label: 'By Employee' },
      { href: '/performance/cycles', label: 'Cycles' },
      { href: '/performance/goals', label: 'Goals' },
      { href: '/performance/reviews', label: 'Reviews' },
    ],
  },
  {
    href: '/recruitment',
    label: 'Recruitment',
    children: [
      { href: '/recruitment/requisitions', label: 'Requisitions' },
      { href: '/recruitment/candidates', label: 'Candidates' },
      { href: '/recruitment/applications', label: 'Applications' },
      { href: '/recruitment/interviews', label: 'Interviews' },
      { href: '/recruitment/offers', label: 'Offers' },
    ],
  },
  {
    href: '/onboarding',
    label: 'Onboarding',
    children: [
      { href: '/onboarding', label: 'Instances' },
      { href: '/onboarding/my', label: 'My Onboarding' },
      { href: '/onboarding/tasks/my', label: 'My Tasks' },
      { href: '/onboarding/templates', label: 'Templates' },
    ],
  },
  { href: '/onboarding/tasks/my', label: 'Tasks' },
  { href: '/notifications', label: 'Notifications' },
  {
    href: '/settings/roles',
    label: 'Settings',
    children: [{ href: '/settings/roles', label: 'Roles & Permissions' }],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { data: unreadData } = useAsync(() => getUnreadCount(), []);
  const unreadCount = unreadData?.count ?? 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r bg-white">
        <div className="border-b px-5 py-4">
          <h1 className="text-lg font-bold text-gray-900">PbHub HRMS</h1>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                  {item.href === '/notifications' && unreadCount > 0 && (
                    <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
                {item.children && isActive && (
                  <div className="ml-3 mt-1 space-y-0.5 border-l border-gray-200 pl-3">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href || pathname.startsWith(child.href + '/');
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                            childActive
                              ? 'text-blue-700'
                              : 'text-gray-500 hover:text-gray-700'
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

        {/* Sidebar footer: always-visible logout */}
        <div className="border-t bg-white p-3">
          <div className="mb-2 px-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs text-gray-500">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"
              />
            </svg>
            Log out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-end border-b bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <Link
              href="/notifications"
              className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label="Notifications"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
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
