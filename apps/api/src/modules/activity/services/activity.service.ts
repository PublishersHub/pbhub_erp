import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export type ActivityVariant = 'leave' | 'expense' | 'onboarding' | 'recruitment' | 'payroll' | 'attendance';

export interface ActivityEvent {
  id: string;          // unique per row across sources, e.g. "leave:abc123"
  timestamp: string;   // ISO
  type: string;        // "leave.submitted", "leave.approved", "expense.submitted", "expense.reimbursed", "onboarding.started", "recruitment.candidate_hired"
  title: string;
  subtitle?: string;
  href?: string;
  variant: ActivityVariant;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, limit: number, before?: Date) {
    // Pull from each source; we use the per-source timestamp that best
    // represents the event. Fetch slightly more than `limit` from each
    // source so we can merge + slice deterministically.
    const fetchPerSource = limit;

    const dateFilter = before ? { lt: before } : undefined;

    const [leaveSubmitted, leaveDecided, expenseSubmitted, expenseDecided, expenseReimbursed, onboardingStarted, onboardingCompleted, hires] = await Promise.all([
      // Leave: submitted
      this.prisma.leaveRequest.findMany({
        where: { organizationId, ...(dateFilter ? { submittedAt: dateFilter } : {}) },
        orderBy: { submittedAt: 'desc' },
        take: fetchPerSource,
        include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } }, leavePolicy: { select: { name: true } } },
      }),
      // Leave: approved/rejected (use finalDecisionAt)
      this.prisma.leaveRequest.findMany({
        where: {
          organizationId,
          finalDecisionAt: before ? { lt: before } : { not: null },
          status: { in: ['APPROVED', 'REJECTED'] },
        },
        orderBy: { finalDecisionAt: 'desc' },
        take: fetchPerSource,
        include: { employee: { select: { firstName: true, lastName: true } }, leavePolicy: { select: { name: true } } },
      }),
      // Expense: submitted
      this.prisma.expenseClaim.findMany({
        where: { organizationId, submittedAt: before ? { lt: before } : { not: null } },
        orderBy: { submittedAt: 'desc' },
        take: fetchPerSource,
        include: { employee: { select: { firstName: true, lastName: true } } },
      }),
      // Expense: rejected
      this.prisma.expenseClaim.findMany({
        where: { organizationId, status: 'REJECTED', finalDecisionAt: before ? { lt: before } : { not: null } },
        orderBy: { finalDecisionAt: 'desc' },
        take: fetchPerSource,
        include: { employee: { select: { firstName: true, lastName: true } } },
      }),
      // Expense: reimbursed
      this.prisma.expenseClaim.findMany({
        where: { organizationId, reimbursedAt: before ? { lt: before } : { not: null } },
        orderBy: { reimbursedAt: 'desc' },
        take: fetchPerSource,
        include: { employee: { select: { firstName: true, lastName: true } } },
      }),
      // Onboarding: started (use startedAt or createdAt fallback)
      this.prisma.onboardingInstance.findMany({
        where: { organizationId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        orderBy: { createdAt: 'desc' },
        take: fetchPerSource,
        include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      }),
      // Onboarding: completed
      this.prisma.onboardingInstance.findMany({
        where: { organizationId, status: 'COMPLETED', completedAt: before ? { lt: before } : { not: null } },
        orderBy: { completedAt: 'desc' },
        take: fetchPerSource,
        include: { employee: { select: { firstName: true, lastName: true } } },
      }),
      // Recruitment: hires (job applications with status HIRED)
      this.prisma.jobApplication.findMany({
        where: { organizationId, status: 'HIRED', hiredAt: before ? { lt: before } : { not: null } },
        orderBy: { hiredAt: 'desc' },
        take: fetchPerSource,
        include: { candidate: { select: { firstName: true, lastName: true } }, jobRequisition: { select: { title: true } } },
      }),
    ]);

    const events: ActivityEvent[] = [];

    for (const lr of leaveSubmitted) {
      if (!lr.submittedAt) continue;
      const name = `${lr.employee.firstName} ${lr.employee.lastName}`;
      events.push({
        id: `leave-submit:${lr.id}`,
        timestamp: lr.submittedAt.toISOString(),
        type: 'leave.submitted',
        title: `${name} submitted a leave request`,
        subtitle: `${lr.totalDays}d · ${lr.leavePolicy?.name ?? 'Leave'}`,
        href: `/leave/requests/${lr.id}`,
        variant: 'leave',
      });
    }
    for (const lr of leaveDecided) {
      if (!lr.finalDecisionAt) continue;
      const name = `${lr.employee.firstName} ${lr.employee.lastName}`;
      const verb = lr.status === 'APPROVED' ? 'approved' : 'rejected';
      events.push({
        id: `leave-decide:${lr.id}`,
        timestamp: lr.finalDecisionAt.toISOString(),
        type: `leave.${verb}`,
        title: `Leave for ${name} ${verb}`,
        subtitle: `${lr.totalDays}d · ${lr.leavePolicy?.name ?? 'Leave'}`,
        href: `/leave/requests/${lr.id}`,
        variant: 'leave',
      });
    }
    for (const c of expenseSubmitted) {
      if (!c.submittedAt) continue;
      const name = `${c.employee.firstName} ${c.employee.lastName}`;
      events.push({
        id: `expense-submit:${c.id}`,
        timestamp: c.submittedAt.toISOString(),
        type: 'expense.submitted',
        title: `${name} submitted an expense claim`,
        subtitle: `${c.claimNumber} · ${c.totalAmount}`,
        href: `/expenses/claims/${c.id}`,
        variant: 'expense',
      });
    }
    for (const c of expenseDecided) {
      if (!c.finalDecisionAt) continue;
      const name = `${c.employee.firstName} ${c.employee.lastName}`;
      events.push({
        id: `expense-reject:${c.id}`,
        timestamp: c.finalDecisionAt.toISOString(),
        type: 'expense.rejected',
        title: `Expense claim ${c.claimNumber} rejected`,
        subtitle: name,
        href: `/expenses/claims/${c.id}`,
        variant: 'expense',
      });
    }
    for (const c of expenseReimbursed) {
      if (!c.reimbursedAt) continue;
      const name = `${c.employee.firstName} ${c.employee.lastName}`;
      events.push({
        id: `expense-reimburse:${c.id}`,
        timestamp: c.reimbursedAt.toISOString(),
        type: 'expense.reimbursed',
        title: `Reimbursed ${name}`,
        subtitle: `${c.claimNumber} · ${c.totalAmount}`,
        href: `/expenses/claims/${c.id}`,
        variant: 'expense',
      });
    }
    for (const inst of onboardingStarted) {
      events.push({
        id: `onboarding-start:${inst.id}`,
        timestamp: inst.createdAt.toISOString(),
        type: 'onboarding.started',
        title: `Onboarding started for ${inst.employee.firstName} ${inst.employee.lastName}`,
        subtitle: `Code ${inst.employee.employeeCode}`,
        href: `/onboarding/${inst.id}`,
        variant: 'onboarding',
      });
    }
    for (const inst of onboardingCompleted) {
      if (!inst.completedAt) continue;
      events.push({
        id: `onboarding-complete:${inst.id}`,
        timestamp: inst.completedAt.toISOString(),
        type: 'onboarding.completed',
        title: `Onboarding complete for ${inst.employee.firstName} ${inst.employee.lastName}`,
        href: `/onboarding/${inst.id}`,
        variant: 'onboarding',
      });
    }
    for (const app of hires) {
      if (!app.hiredAt) continue;
      events.push({
        id: `hire:${app.id}`,
        timestamp: app.hiredAt.toISOString(),
        type: 'recruitment.candidate_hired',
        title: `Hired ${app.candidate.firstName} ${app.candidate.lastName}`,
        subtitle: app.jobRequisition.title,
        href: `/recruitment/applications/${app.id}`,
        variant: 'recruitment',
      });
    }

    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const sliced = events.slice(0, limit);
    const nextCursor = sliced.length === limit ? sliced[sliced.length - 1].timestamp : null;
    return { items: sliced, nextCursor };
  }
}
