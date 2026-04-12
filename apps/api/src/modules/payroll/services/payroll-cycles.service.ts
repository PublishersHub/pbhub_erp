import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePayrollCycleDto } from '../dto/create-payroll-cycle.dto';
import { NotificationEvents } from '../../notification/events/event-types';

@Injectable()
export class PayrollCyclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(organizationId: string, dto: CreatePayrollCycleDto) {
    const periodStart = new Date(Date.UTC(dto.year, dto.month - 1, 1));
    const periodEnd = new Date(Date.UTC(dto.year, dto.month, 0)); // last day of month

    try {
      return await this.prisma.payrollCycle.create({
        data: {
          organizationId,
          year: dto.year,
          month: dto.month,
          periodStart,
          periodEnd,
          status: 'DRAFT',
          notes: dto.notes ?? null,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          `A payroll cycle for ${dto.year}-${String(dto.month).padStart(2, '0')} already exists`,
        );
      }
      throw error;
    }
  }

  async findAll(organizationId: string, year?: number) {
    return this.prisma.payrollCycle.findMany({
      where: {
        organizationId,
        ...(year !== undefined && { year }),
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async findById(organizationId: string, id: string) {
    const cycle = await this.prisma.payrollCycle.findFirst({
      where: { id, organizationId },
      include: {
        finalizedBy: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true },
        },
      },
    });
    if (!cycle) throw new NotFoundException('Payroll cycle not found');
    return cycle;
  }

  async finalize(organizationId: string, cycleId: string, userId: string) {
    const cycle = await this.findById(organizationId, cycleId);

    if (cycle.status !== 'PROCESSED') {
      throw new BadRequestException(
        'Only PROCESSED payroll cycles can be finalized',
      );
    }

    // Resolve the employee performing finalization
    const employee = await this.prisma.employee.findFirst({
      where: { userId, organizationId },
    });
    if (!employee) {
      throw new NotFoundException('Finalizer employee record not found');
    }

    const updated = await this.prisma.payrollCycle.update({
      where: { id: cycleId },
      data: {
        status: 'FINALIZED',
        finalizedAt: new Date(),
        finalizedById: employee.id,
      },
    });

    // Notify all employees with a payroll in this cycle
    const payrolls = await this.prisma.payroll.findMany({
      where: { payrollCycleId: cycleId, organizationId },
      select: { employeeId: true },
    });
    const recipientEmployeeIds = payrolls.map((p) => p.employeeId);

    this.eventEmitter.emit(NotificationEvents.PAYROLL_CYCLE_FINALIZED, {
      organizationId,
      actorUserId: userId,
      referenceId: cycleId,
      referenceType: 'PayrollCycle',
      recipientEmployeeIds,
      variables: {
        year: cycle.year,
        month: cycle.month,
        period: `${cycle.year}-${String(cycle.month).padStart(2, '0')}`,
      },
    });

    return updated;
  }
}
