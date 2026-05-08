import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, SuggestionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationEvents } from '../notification/events/event-types';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import {
  RespondSuggestionDto,
  UpdateSuggestionStatusDto,
} from './dto/respond-suggestion.dto';

const EMPLOYEE_REF_SELECT = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  userId: true,
} satisfies Prisma.EmployeeSelect;

const SUGGESTION_INCLUDE = {
  author: { select: EMPLOYEE_REF_SELECT },
  respondedBy: { select: EMPLOYEE_REF_SELECT },
} satisfies Prisma.SuggestionInclude;

type RawSuggestion = Prisma.SuggestionGetPayload<{
  include: typeof SUGGESTION_INCLUDE;
}>;

/**
 * Strips the `author` relation when the suggestion is anonymous so that the
 * employee identity is never sent to clients (including admins).
 */
function redactAnonymous(suggestion: RawSuggestion) {
  if (suggestion.isAnonymous) {
    return { ...suggestion, author: null, authorId: null };
  }
  return suggestion;
}

@Injectable()
export class SuggestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Create ───────────────────────────────

  async create(
    userId: string,
    organizationId: string,
    dto: CreateSuggestionDto,
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);
    const isAnonymous = dto.isAnonymous === true;

    const created = await this.prisma.suggestion.create({
      data: {
        organizationId,
        // Anonymous suggestions store no author identity at all.
        authorId: isAnonymous ? null : employee.id,
        isAnonymous,
        category: dto.category ?? 'OTHER',
        title: dto.title.trim(),
        body: dto.body.trim(),
        status: 'OPEN',
      },
      include: SUGGESTION_INCLUDE,
    });

    return redactAnonymous(created);
  }

  // ─── Read: my suggestions ────────────────

  async findMine(userId: string, organizationId: string) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const rows = await this.prisma.suggestion.findMany({
      where: {
        organizationId,
        // Only rows that explicitly link to me (anonymous rows have authorId=null
        // and intentionally cannot be claimed back from the my-list).
        authorId: employee.id,
      },
      include: SUGGESTION_INCLUDE,
      orderBy: [{ createdAt: 'desc' }],
    });

    return rows.map(redactAnonymous);
  }

  // ─── Read: org-wide (admin / HR) ─────────

  async findAll(
    organizationId: string,
    filters: { status?: string },
  ) {
    const rows = await this.prisma.suggestion.findMany({
      where: {
        organizationId,
        ...(filters.status && this.isValidStatus(filters.status)
          ? { status: filters.status as SuggestionStatus }
          : {}),
      },
      include: SUGGESTION_INCLUDE,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return rows.map(redactAnonymous);
  }

  // ─── Read: single ────────────────────────

  async findById(
    callerUserId: string,
    organizationId: string,
    suggestionId: string,
    callerPermissions: string[],
  ) {
    const suggestion = await this.prisma.suggestion.findFirst({
      where: { id: suggestionId, organizationId },
      include: SUGGESTION_INCLUDE,
    });
    if (!suggestion) throw new NotFoundException('Suggestion not found');

    const canManage = callerPermissions.includes('suggestion.manage');

    if (!canManage) {
      // Non-admin: must be the (named) author. Anonymous suggestions have
      // authorId=null and therefore cannot be read by anyone other than admins.
      const employee = await this.findEmployeeByUserId(callerUserId, organizationId);
      if (suggestion.authorId !== employee.id) {
        throw new ForbiddenException('You cannot view this suggestion');
      }
    }

    return redactAnonymous(suggestion);
  }

  // ─── Respond (admin) ─────────────────────

  async respond(
    callerUserId: string,
    organizationId: string,
    suggestionId: string,
    dto: RespondSuggestionDto,
  ) {
    const responder = await this.findEmployeeByUserId(callerUserId, organizationId);
    const suggestion = await this.prisma.suggestion.findFirst({
      where: { id: suggestionId, organizationId },
    });
    if (!suggestion) throw new NotFoundException('Suggestion not found');

    const nextStatus: SuggestionStatus =
      dto.status ??
      (suggestion.status === 'OPEN' ? 'IN_REVIEW' : suggestion.status);

    const updated = await this.prisma.suggestion.update({
      where: { id: suggestionId },
      data: {
        responseBody: dto.responseBody.trim(),
        status: nextStatus,
        respondedById: responder.id,
        respondedAt: new Date(),
      },
      include: SUGGESTION_INCLUDE,
    });

    // Only notify when there is a real, non-anonymous author. Notifications
    // for anonymous suggestions are intentionally skipped (we have no one to
    // notify, and forwarding via author would leak identity downstream).
    if (!updated.isAnonymous && updated.authorId) {
      try {
        this.eventEmitter.emit(NotificationEvents.SUGGESTION_RESPONDED, {
          organizationId,
          actorUserId: callerUserId,
          referenceId: updated.id,
          referenceType: 'Suggestion',
          recipientEmployeeIds: [updated.authorId],
          variables: {
            title: updated.title,
            status: updated.status,
            responderName: `${responder.firstName} ${responder.lastName}`,
          },
        });
      } catch {
        // Never break the response if notifications misbehave.
      }
    }

    return redactAnonymous(updated);
  }

  // ─── Update status only (admin) ──────────

  async updateStatus(
    organizationId: string,
    suggestionId: string,
    dto: UpdateSuggestionStatusDto,
  ) {
    const suggestion = await this.prisma.suggestion.findFirst({
      where: { id: suggestionId, organizationId },
      select: { id: true },
    });
    if (!suggestion) throw new NotFoundException('Suggestion not found');

    const updated = await this.prisma.suggestion.update({
      where: { id: suggestionId },
      data: { status: dto.status },
      include: SUGGESTION_INCLUDE,
    });

    return redactAnonymous(updated);
  }

  // ─── Helpers ─────────────────────────────

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

  private isValidStatus(value: string): boolean {
    return ['OPEN', 'IN_REVIEW', 'IMPLEMENTED', 'DECLINED', 'ARCHIVED'].includes(
      value,
    );
  }
}
