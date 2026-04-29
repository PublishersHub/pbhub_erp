import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DashboardSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(organizationId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run all aggregations in parallel
    const [
      totalCandidates,
      applicationsByStatus,
      interviewsScheduled,
      offersExtended,
      hiresThisMonth,
      recentApplications,
      upcomingInterviews,
      recentOffers,
    ] = await Promise.all([
      // 1. Total candidates
      this.prisma.candidate.count({
        where: { organizationId },
      }),

      // 2. Applications grouped by status (for pipeline + active count)
      this.prisma.jobApplication.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { id: true },
      }),

      // 3. Scheduled interviews count
      this.prisma.interview.count({
        where: {
          organizationId,
          status: 'SCHEDULED',
          scheduledAt: { gt: now },
        },
      }),

      // 4. Extended offers count
      this.prisma.offer.count({
        where: { organizationId, status: 'EXTENDED' },
      }),

      // 5. Hires this month
      this.prisma.jobApplication.count({
        where: {
          organizationId,
          status: 'HIRED',
          hiredAt: { gte: monthStart },
        },
      }),

      // 6. Recent applications (5, with candidate + requisition)
      this.prisma.jobApplication.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          appliedAt: true,
          candidate: {
            select: { id: true, firstName: true, lastName: true },
          },
          jobRequisition: {
            select: { id: true, title: true },
          },
        },
      }),

      // 7. Upcoming interviews (5, with candidate name via application)
      this.prisma.interview.findMany({
        where: {
          organizationId,
          status: 'SCHEDULED',
          scheduledAt: { gt: now },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        select: {
          id: true,
          applicationId: true,
          scheduledAt: true,
          type: true,
          status: true,
          application: {
            select: {
              candidate: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      }),

      // 8. Recent offers (5, with candidate name via application)
      this.prisma.offer.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          applicationId: true,
          offerNumber: true,
          baseSalary: true,
          status: true,
          createdAt: true,
          application: {
            select: {
              candidate: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      }),
    ]);

    // Build pipeline map
    const STATUSES = [
      'APPLIED',
      'IN_PROGRESS',
      'OFFER_EXTENDED',
      'ON_HOLD',
      'HIRED',
      'REJECTED',
      'WITHDRAWN',
    ] as const;
    const TERMINAL = ['HIRED', 'REJECTED', 'WITHDRAWN'];

    const pipeline: Record<string, number> = {};
    let activeApplications = 0;
    for (const s of STATUSES) {
      const entry = applicationsByStatus.find((e) => e.status === s);
      const count = entry?._count?.id ?? 0;
      pipeline[s] = count;
      if (!TERMINAL.includes(s)) activeApplications += count;
    }

    return {
      totalCandidates,
      activeApplications,
      interviewsScheduled,
      offersExtended,
      hiresThisMonth,
      pipeline,
      recentApplications,
      upcomingInterviews,
      recentOffers,
    };
  }
}
