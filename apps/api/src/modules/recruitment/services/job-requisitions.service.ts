import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, JobRequisitionStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateJobRequisitionDto } from '../dto/create-job-requisition.dto';
import { UpdateJobRequisitionDto } from '../dto/update-job-requisition.dto';
import {
  ReviewRequisitionDto,
  RequisitionDecision,
} from '../dto/review-requisition.dto';
import { CloseRequisitionDto } from '../dto/close-requisition.dto';
import { NotificationEvents } from '../../notification/events/event-types';

const APPROVER_ROLE_SLUGS = ['hr_admin', 'super_admin'];

@Injectable()
export class JobRequisitionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Create (DRAFT) ─────────────────────

  async create(
    userId: string,
    organizationId: string,
    dto: CreateJobRequisitionDto,
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    // Validate hiring manager belongs to the org
    const manager = await this.prisma.employee.findFirst({
      where: { id: dto.hiringManagerId, organizationId, isActive: true },
      select: { id: true },
    });
    if (!manager) throw new NotFoundException('Hiring manager not found');

    // Validate department / designation if provided
    if (dto.departmentId) {
      const dept = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, organizationId },
        select: { id: true },
      });
      if (!dept) throw new NotFoundException('Department not found');
    }
    if (dto.designationId) {
      const des = await this.prisma.designation.findFirst({
        where: { id: dto.designationId, organizationId },
        select: { id: true },
      });
      if (!des) throw new NotFoundException('Designation not found');
    }

    if (
      dto.minSalary !== undefined &&
      dto.maxSalary !== undefined &&
      Number(dto.minSalary) > Number(dto.maxSalary)
    ) {
      throw new BadRequestException('minSalary cannot exceed maxSalary');
    }

    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const requisitionNumber = await this.generateRequisitionNumber(
            organizationId,
            tx,
          );

          return tx.jobRequisition.create({
            data: {
              organizationId,
              requisitionNumber,
              title: dto.title,
              departmentId: dto.departmentId ?? null,
              designationId: dto.designationId ?? null,
              hiringManagerId: dto.hiringManagerId,
              employmentType: dto.employmentType,
              numberOfOpenings: dto.numberOfOpenings ?? 1,
              location: dto.location ?? null,
              minSalary:
                dto.minSalary !== undefined
                  ? new Prisma.Decimal(dto.minSalary)
                  : null,
              maxSalary:
                dto.maxSalary !== undefined
                  ? new Prisma.Decimal(dto.maxSalary)
                  : null,
              description: dto.description ?? null,
              requirements: dto.requirements ?? null,
              targetStartDate: dto.targetStartDate
                ? new Date(dto.targetStartDate)
                : null,
              status: 'DRAFT',
              createdByEmployeeId: employee.id,
            },
          });
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < MAX_RETRIES - 1
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new BadRequestException('Failed to generate unique requisition number');
  }

  // ─── Update (DRAFT only) ────────────────

  async update(
    userId: string,
    organizationId: string,
    id: string,
    dto: UpdateJobRequisitionDto,
  ) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const existing = await this.prisma.jobRequisition.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Requisition not found');

    if (existing.createdByEmployeeId !== employee.id) {
      throw new ForbiddenException('Only the creator can edit this requisition');
    }
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT requisitions can be edited');
    }

    if (
      dto.minSalary !== undefined &&
      dto.maxSalary !== undefined &&
      Number(dto.minSalary) > Number(dto.maxSalary)
    ) {
      throw new BadRequestException('minSalary cannot exceed maxSalary');
    }

    return this.prisma.jobRequisition.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }),
        ...(dto.designationId !== undefined && { designationId: dto.designationId }),
        ...(dto.hiringManagerId !== undefined && {
          hiringManagerId: dto.hiringManagerId,
        }),
        ...(dto.employmentType !== undefined && {
          employmentType: dto.employmentType,
        }),
        ...(dto.numberOfOpenings !== undefined && {
          numberOfOpenings: dto.numberOfOpenings,
        }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.minSalary !== undefined && {
          minSalary: new Prisma.Decimal(dto.minSalary),
        }),
        ...(dto.maxSalary !== undefined && {
          maxSalary: new Prisma.Decimal(dto.maxSalary),
        }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.requirements !== undefined && { requirements: dto.requirements }),
        ...(dto.targetStartDate !== undefined && {
          targetStartDate: new Date(dto.targetStartDate),
        }),
      },
    });
  }

  // ─── Submit for approval ────────────────

  async submit(userId: string, organizationId: string, id: string) {
    const employee = await this.findEmployeeByUserId(userId, organizationId);

    const req = await this.prisma.jobRequisition.findFirst({
      where: { id, organizationId },
    });
    if (!req) throw new NotFoundException('Requisition not found');

    if (req.createdByEmployeeId !== employee.id) {
      throw new ForbiddenException('Only the creator can submit this requisition');
    }
    if (req.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT requisitions can be submitted');
    }

    // Concurrency-safe transition
    const updateResult = await this.prisma.jobRequisition.updateMany({
      where: { id, organizationId, status: 'DRAFT' },
      data: { status: 'PENDING_APPROVAL', submittedAt: new Date() },
    });
    if (updateResult.count === 0) {
      throw new BadRequestException('Requisition status changed, please retry');
    }

    const updated = await this.prisma.jobRequisition.findUniqueOrThrow({
      where: { id },
    });

    this.eventEmitter.emit(NotificationEvents.REQUISITION_SUBMITTED, {
      organizationId,
      actorUserId: userId,
      referenceId: id,
      referenceType: 'JobRequisition',
      variables: {
        requisitionNumber: updated.requisitionNumber,
        title: updated.title,
        numberOfOpenings: updated.numberOfOpenings,
        submitterName: `${employee.firstName} ${employee.lastName}`,
      },
    });

    return updated;
  }

  // ─── Approve / Reject ───────────────────

  async review(
    userId: string,
    organizationId: string,
    id: string,
    dto: ReviewRequisitionDto,
    userRoles: string[],
  ) {
    const isApprover = userRoles.some((r) => APPROVER_ROLE_SLUGS.includes(r));
    if (!isApprover) {
      throw new ForbiddenException('Only HR/admin can review requisitions');
    }

    const approver = await this.findEmployeeByUserId(userId, organizationId);

    const req = await this.prisma.jobRequisition.findFirst({
      where: { id, organizationId },
    });
    if (!req) throw new NotFoundException('Requisition not found');

    if (req.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(
        'Only PENDING_APPROVAL requisitions can be reviewed',
      );
    }

    if (req.createdByEmployeeId === approver.id) {
      throw new ForbiddenException('You cannot approve your own requisition');
    }

    const newStatus: JobRequisitionStatus =
      dto.decision === RequisitionDecision.APPROVED ? 'APPROVED' : 'REJECTED';

    const updateResult = await this.prisma.jobRequisition.updateMany({
      where: { id, organizationId, status: 'PENDING_APPROVAL' },
      data: {
        status: newStatus,
        approvedByEmployeeId: approver.id,
        approvedAt: new Date(),
        rejectionReason:
          dto.decision === RequisitionDecision.REJECTED ? dto.reason ?? null : null,
      },
    });
    if (updateResult.count === 0) {
      throw new BadRequestException('Requisition status changed, please retry');
    }

    const updated = await this.prisma.jobRequisition.findUniqueOrThrow({
      where: { id },
    });

    // If approved, move to OPEN (ready for posting)
    if (newStatus === 'APPROVED') {
      await this.prisma.jobRequisition.update({
        where: { id },
        data: { status: 'OPEN' },
      });
    }

    const eventName =
      newStatus === 'APPROVED'
        ? NotificationEvents.REQUISITION_APPROVED
        : NotificationEvents.REQUISITION_REJECTED;

    this.eventEmitter.emit(eventName, {
      organizationId,
      actorUserId: userId,
      referenceId: id,
      referenceType: 'JobRequisition',
      recipientEmployeeIds: [req.createdByEmployeeId],
      variables: {
        requisitionNumber: updated.requisitionNumber,
        title: updated.title,
        approverName: `${approver.firstName} ${approver.lastName}`,
        reason: dto.reason ?? '',
      },
    });

    return updated;
  }

  // ─── Close / Hold / Cancel ──────────────

  async close(
    userId: string,
    organizationId: string,
    id: string,
    dto: CloseRequisitionDto,
  ) {
    const req = await this.prisma.jobRequisition.findFirst({
      where: { id, organizationId },
    });
    if (!req) throw new NotFoundException('Requisition not found');

    if (['FILLED', 'CLOSED', 'CANCELLED'].includes(req.status)) {
      throw new BadRequestException(
        `Cannot close a requisition that is already ${req.status}`,
      );
    }

    return this.prisma.jobRequisition.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        rejectionReason: dto.reason ?? req.rejectionReason,
      },
    });
  }

  // ─── Queries ────────────────────────────

  async findAll(organizationId: string, status?: JobRequisitionStatus) {
    return this.prisma.jobRequisition.findMany({
      where: { organizationId, ...(status && { status }) },
      include: {
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } },
        hiringManager: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const req = await this.prisma.jobRequisition.findFirst({
      where: { id, organizationId },
      include: {
        department: { select: { id: true, name: true } },
        designation: { select: { id: true, name: true } },
        hiringManager: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        postings: {
          select: {
            id: true,
            title: true,
            slug: true,
            channel: true,
            status: true,
            publishedAt: true,
          },
        },
        applications: {
          select: { id: true, status: true, createdAt: true },
        },
      },
    });
    if (!req) throw new NotFoundException('Requisition not found');
    return req;
  }

  // ─── Internal helpers ────────────────────

  private async generateRequisitionNumber(
    organizationId: string,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REQ-${year}-`;

    const latest = await tx.jobRequisition.findFirst({
      where: { organizationId, requisitionNumber: { startsWith: prefix } },
      orderBy: { requisitionNumber: 'desc' },
      select: { requisitionNumber: true },
    });

    let nextSeq = 1;
    if (latest) {
      const lastSeq = parseInt(latest.requisitionNumber.replace(prefix, ''), 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

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
