import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreatePerformanceNoteDto,
  UpdatePerformanceNoteDto,
} from '../dto/create-performance-note.dto';

const HR_ROLE_SLUGS = ['hr_admin', 'super_admin'];

@Injectable()
export class PerformanceNotesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ────────────────────────────

  async create(
    userId: string,
    organizationId: string,
    employeeId: string,
    dto: CreatePerformanceNoteDto,
  ) {
    const author = await this.findEmployeeByUserId(userId, organizationId);
    const subject = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });
    if (!subject) throw new NotFoundException('Employee not found');

    return this.prisma.employeePerformanceNote.create({
      data: {
        organizationId,
        employeeId,
        authorId: author.id,
        body: dto.body,
        isPrivate: dto.isPrivate ?? true,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ─── List for an employee ─────────────

  async listForEmployee(
    userId: string,
    organizationId: string,
    employeeId: string,
    callerPermissions: string[],
    callerRoles: string[],
  ) {
    const caller = await this.findEmployeeByUserId(userId, organizationId);
    const subject = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      select: { id: true, reportingManagerId: true },
    });
    if (!subject) throw new NotFoundException('Employee not found');

    const canReview = callerPermissions.includes('performance.review') ||
      callerPermissions.includes('performance.manage') ||
      callerRoles.some((r) => HR_ROLE_SLUGS.includes(r));
    const isSelf = caller.id === subject.id;
    const isManager = subject.reportingManagerId === caller.id;

    // Reviewers/managers/HR see everything; the subject themselves only sees public notes.
    const includePrivate = canReview || isManager;
    if (!canReview && !isManager && !isSelf) {
      throw new ForbiddenException('You do not have access to these notes');
    }

    return this.prisma.employeePerformanceNote.findMany({
      where: {
        organizationId,
        employeeId,
        ...(includePrivate ? {} : { isPrivate: false }),
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Update (author only) ──────────────

  async update(
    userId: string,
    organizationId: string,
    noteId: string,
    dto: UpdatePerformanceNoteDto,
  ) {
    const caller = await this.findEmployeeByUserId(userId, organizationId);
    const note = await this.prisma.employeePerformanceNote.findFirst({
      where: { id: noteId, organizationId },
    });
    if (!note) throw new NotFoundException('Note not found');

    if (note.authorId !== caller.id) {
      throw new ForbiddenException('You can only edit notes you authored');
    }

    return this.prisma.employeePerformanceNote.update({
      where: { id: noteId },
      data: {
        ...(dto.body !== undefined && { body: dto.body }),
        ...(dto.isPrivate !== undefined && { isPrivate: dto.isPrivate }),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ─── Delete (author or HR/admin) ───────

  async remove(
    userId: string,
    organizationId: string,
    noteId: string,
    callerRoles: string[],
    callerPermissions: string[],
  ) {
    const caller = await this.findEmployeeByUserId(userId, organizationId);
    const note = await this.prisma.employeePerformanceNote.findFirst({
      where: { id: noteId, organizationId },
    });
    if (!note) throw new NotFoundException('Note not found');

    const isAuthor = note.authorId === caller.id;
    const isAdmin = callerRoles.some((r) => HR_ROLE_SLUGS.includes(r)) ||
      callerPermissions.includes('performance.manage');
    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('Only the author or an admin can delete this note');
    }

    await this.prisma.employeePerformanceNote.delete({ where: { id: noteId } });
    return { success: true };
  }

  // ─── Helpers ──────────────────────────

  private async findEmployeeByUserId(userId: string, organizationId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId, organizationId, isActive: true },
    });
    if (!employee) {
      throw new NotFoundException(
        'No active employee profile linked to your user account',
      );
    }
    return employee;
  }
}
