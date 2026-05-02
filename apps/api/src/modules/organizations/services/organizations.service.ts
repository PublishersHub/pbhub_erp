import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateBrandingDto } from '../dto/update-branding.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.organization.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.organization.findUnique({
      where: { slug },
    });
  }

  async findBrandingBySlug(slug: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        brandName: true,
        brandLogoUrl: true,
        brandPrimary: true,
        brandTagline: true,
      },
    });
    if (!org || !org.isActive) {
      throw new NotFoundException('Organization not found');
    }
    // Don't include id or isActive in the public response
    const { id: _id, isActive: _isActive, ...publicSafe } = org;
    return publicSafe;
  }

  async updateBranding(organizationId: string, dto: UpdateBrandingDto) {
    // Allow null to clear, undefined to leave unchanged
    const data: Record<string, string | null> = {};
    if (dto.brandName !== undefined) data.brandName = dto.brandName;
    if (dto.brandLogoUrl !== undefined) data.brandLogoUrl = dto.brandLogoUrl;
    if (dto.brandPrimary !== undefined) data.brandPrimary = dto.brandPrimary;
    if (dto.brandTagline !== undefined) data.brandTagline = dto.brandTagline;

    return this.prisma.organization.update({
      where: { id: organizationId },
      data,
    });
  }
}
