import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateCandidateDto,
  UpdateCandidateBlacklistDto,
} from '../dto/create-candidate.dto';
import { UpdateCandidateDto } from '../dto/update-candidate.dto';

@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateCandidateDto) {
    // Dedupe by email within org
    const existing = await this.prisma.candidate.findFirst({
      where: { organizationId, email: dto.email },
    });
    if (existing) {
      throw new BadRequestException(
        `Candidate with email ${dto.email} already exists`,
      );
    }

    if (dto.referrerEmployeeId) {
      const referrer = await this.prisma.employee.findFirst({
        where: { id: dto.referrerEmployeeId, organizationId, isActive: true },
        select: { id: true },
      });
      if (!referrer) throw new NotFoundException('Referrer not found');
    }

    return this.prisma.candidate.create({
      data: {
        organizationId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone ?? null,
        currentCompany: dto.currentCompany ?? null,
        currentTitle: dto.currentTitle ?? null,
        totalExperience:
          dto.totalExperience !== undefined
            ? new Prisma.Decimal(dto.totalExperience)
            : null,
        linkedinUrl: dto.linkedinUrl ?? null,
        portfolioUrl: dto.portfolioUrl ?? null,
        resumeUrl: dto.resumeUrl ?? null,
        resumeFileName: dto.resumeFileName ?? null,
        location: dto.location ?? null,
        noticePeriodDays: dto.noticePeriodDays ?? null,
        source: dto.source ?? 'OTHER',
        referrerEmployeeId: dto.referrerEmployeeId ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateCandidateDto) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id, organizationId },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');

    // Email change must keep uniqueness per org
    if (dto.email && dto.email !== candidate.email) {
      const conflict = await this.prisma.candidate.findFirst({
        where: { organizationId, email: dto.email, id: { not: id } },
      });
      if (conflict) {
        throw new BadRequestException(
          `Another candidate already uses email ${dto.email}`,
        );
      }
    }

    if (dto.referrerEmployeeId) {
      const referrer = await this.prisma.employee.findFirst({
        where: { id: dto.referrerEmployeeId, organizationId, isActive: true },
        select: { id: true },
      });
      if (!referrer) throw new NotFoundException('Referrer not found');
    }

    return this.prisma.candidate.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.currentCompany !== undefined && { currentCompany: dto.currentCompany }),
        ...(dto.currentTitle !== undefined && { currentTitle: dto.currentTitle }),
        ...(dto.totalExperience !== undefined && {
          totalExperience: new Prisma.Decimal(dto.totalExperience),
        }),
        ...(dto.linkedinUrl !== undefined && { linkedinUrl: dto.linkedinUrl }),
        ...(dto.portfolioUrl !== undefined && { portfolioUrl: dto.portfolioUrl }),
        ...(dto.resumeUrl !== undefined && { resumeUrl: dto.resumeUrl }),
        ...(dto.resumeFileName !== undefined && {
          resumeFileName: dto.resumeFileName,
        }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.noticePeriodDays !== undefined && {
          noticePeriodDays: dto.noticePeriodDays,
        }),
        ...(dto.source !== undefined && { source: dto.source }),
        ...(dto.referrerEmployeeId !== undefined && {
          referrerEmployeeId: dto.referrerEmployeeId,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async setBlacklist(
    organizationId: string,
    id: string,
    dto: UpdateCandidateBlacklistDto,
  ) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id, organizationId },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');

    return this.prisma.candidate.update({
      where: { id },
      data: {
        isBlacklisted: dto.isBlacklisted,
        blacklistReason: dto.isBlacklisted ? dto.blacklistReason ?? null : null,
      },
    });
  }

  async findAll(organizationId: string, search?: string) {
    return this.prisma.candidate.findMany({
      where: {
        organizationId,
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findById(organizationId: string, id: string) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id, organizationId },
      include: {
        referrerEmployee: {
          select: { id: true, firstName: true, lastName: true },
        },
        convertedEmployee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true },
        },
        applications: {
          select: {
            id: true,
            status: true,
            appliedAt: true,
            jobRequisition: {
              select: { id: true, requisitionNumber: true, title: true },
            },
          },
          orderBy: { appliedAt: 'desc' },
        },
      },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    return candidate;
  }
}
