import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { PrismaService } from '../../../prisma/prisma.service';
import { STORAGE_SERVICE } from '../../storage/storage.module';
import type { StorageService } from '../../storage/storage.types';

// ID-1 / credit-card sized ID badge in points (1 mm ≈ 2.83465 pt).
// 85.6 mm × 54 mm landscape ≈ 242 × 153.
const CARD_W = 242;
const CARD_H = 153;

/** Header band (org bar) at the top — keeps the layout consistent across orgs. */
const HEADER_H = 36;

/** Avatar circle diameter on the card. */
const AVATAR_D = 56;

/** Palette used for fallback "initials" circles when no photo is available. */
const FALLBACK_GRADIENT_COLORS = [
  '#7c3aed', '#2563eb', '#0d9488', '#d97706',
  '#e11d48', '#4f46e5', '#0891b2', '#c026d3',
];

function normalizeHex(input: string | null | undefined, fallback: string): string {
  if (!input) return fallback;
  const hex = input.trim();
  if (/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    return '#' + hex.slice(1).split('').map((c) => c + c).join('');
  }
  return fallback;
}

function pickFallbackColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return FALLBACK_GRADIENT_COLORS[hash % FALLBACK_GRADIENT_COLORS.length];
}

function initials(firstName: string | null, lastName: string | null): string {
  const f = (firstName ?? '').trim().charAt(0);
  const l = (lastName ?? '').trim().charAt(0);
  return (f + l).toUpperCase() || '?';
}

/**
 * Pick a readable text color (white or near-black) for a background hex.
 * Uses the standard relative luminance heuristic.
 */
function readableOnHex(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#ffffff';
  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;
  // Perceived luminance — light backgrounds get dark text.
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 0.6 ? '#0f172a' : '#ffffff';
}

@Injectable()
export class EmployeeIdCardService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  /**
   * Fetch an image from a URL and return its bytes if it's a JPEG or PNG
   * (the only formats pdfkit can embed). Returns null on any failure.
   */
  private async fetchImageBytes(url: string): Promise<Buffer | null> {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.startsWith('image/jpeg') && !ct.startsWith('image/png')) return null;
      const arr = await res.arrayBuffer();
      return Buffer.from(arr);
    } catch {
      return null;
    }
  }

  /**
   * Resolve a stored profileImageUrl to bytes pdfkit can embed. Storage keys
   * are signed first; legacy absolute URLs are fetched as-is. Failures
   * (key missing, signed URL expired, non-image content-type) bubble up
   * as null — caller draws an initials circle instead.
   */
  private async loadEmployeePhoto(value: string | null): Promise<Buffer | null> {
    if (!value) return null;
    let url = value;
    if (!/^https?:\/\//i.test(url)) {
      try {
        url = await this.storage.getDownloadUrl(value);
      } catch {
        return null;
      }
    }
    return this.fetchImageBytes(url);
  }

  async generateIdCardPdf(organizationId: string, employeeId: string): Promise<Buffer> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true } },
        employmentDetail: { select: { joiningDate: true } },
        organization: {
          select: {
            name: true,
            brandName: true,
            brandLogoUrl: true,
            brandPrimary: true,
          },
        },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const primary = normalizeHex(employee.organization.brandPrimary, '#3b82f6');
    const onPrimary = readableOnHex(primary);
    const orgDisplayName =
      (employee.organization.brandName ?? '').trim() || employee.organization.name;

    const [logoBytes, photoBytes] = await Promise.all([
      employee.organization.brandLogoUrl
        ? this.fetchImageBytes(employee.organization.brandLogoUrl)
        : Promise.resolve<Buffer | null>(null),
      this.loadEmployeePhoto(employee.profileImageUrl),
    ]);

    const doc = new PDFDocument({ size: [CARD_W, CARD_H], margin: 0 });
    const buffers: Buffer[] = [];
    doc.on('data', (b: Buffer) => buffers.push(b));

    // ── Header band (brand color) ────────────────────────────
    doc.save();
    doc.rect(0, 0, CARD_W, HEADER_H).fill(primary);
    doc.restore();

    // Logo on the left of the header (if available, JPEG/PNG only)
    let textStartX = 12;
    if (logoBytes) {
      try {
        doc.image(logoBytes, 8, 6, { fit: [24, 24] });
        textStartX = 38;
      } catch {
        // Format unsupported by pdfkit — fall through, text will fill the bar.
      }
    }

    doc
      .fillColor(onPrimary)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(orgDisplayName, textStartX, 11, {
        width: CARD_W - textStartX - 10,
        align: 'left',
        ellipsis: true,
      });

    doc
      .fillColor(onPrimary)
      .font('Helvetica')
      .fontSize(7)
      .opacity(0.85)
      .text('EMPLOYEE ID', textStartX, 24, {
        width: CARD_W - textStartX - 10,
        align: 'left',
        characterSpacing: 1,
      })
      .opacity(1);

    // ── Avatar (left) ────────────────────────────────────────
    const avatarX = 14;
    const avatarY = HEADER_H + 10;
    const cx = avatarX + AVATAR_D / 2;
    const cy = avatarY + AVATAR_D / 2;

    if (photoBytes) {
      // Clip a circle, then draw the photo inside it. pdfkit applies the
      // current path as a clip when save()/clip() is paired.
      doc.save();
      doc.circle(cx, cy, AVATAR_D / 2).clip();
      try {
        doc.image(photoBytes, avatarX, avatarY, {
          width: AVATAR_D,
          height: AVATAR_D,
        });
      } catch {
        // pdfkit threw on the bytes (unsupported format slipped through).
        // Fill in a fallback color so the circle isn't blank.
        doc.rect(avatarX, avatarY, AVATAR_D, AVATAR_D)
          .fill(pickFallbackColor(employee.id));
      }
      doc.restore();
      // Soft ring around the photo for a finished look.
      doc.lineWidth(1).strokeColor('#e2e8f0')
        .circle(cx, cy, AVATAR_D / 2).stroke();
    } else {
      // No photo — initials in a colored circle.
      const fillHex = pickFallbackColor(employee.id);
      doc.save();
      doc.circle(cx, cy, AVATAR_D / 2).fill(fillHex);
      doc.restore();
      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(20)
        .text(
          initials(employee.firstName, employee.lastName),
          avatarX,
          cy - 11,
          { width: AVATAR_D, align: 'center' },
        );
    }

    // ── Identity block (right of avatar) ─────────────────────
    const infoX = avatarX + AVATAR_D + 12;
    const infoW = CARD_W - infoX - 10;
    let y = HEADER_H + 8;

    // Name — primary line.
    doc
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(`${employee.firstName} ${employee.lastName}`.trim(), infoX, y, {
        width: infoW,
        ellipsis: true,
      });
    y += 16;

    // Designation.
    if (employee.designation?.name) {
      doc
        .fillColor(primary)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(employee.designation.name, infoX, y, {
          width: infoW,
          ellipsis: true,
        });
      y += 11;
    }

    // Tiny labelled rows: code, dept, joined.
    const drawRow = (label: string, value: string) => {
      doc
        .fillColor('#94a3b8')
        .font('Helvetica')
        .fontSize(6)
        .text(label, infoX, y, { width: infoW, characterSpacing: 1 });
      doc
        .fillColor('#0f172a')
        .font('Helvetica')
        .fontSize(8)
        .text(value, infoX, y + 7, { width: infoW, ellipsis: true });
      y += 18;
    };

    drawRow('EMPLOYEE ID', employee.employeeCode);

    if (employee.department?.name) {
      drawRow('DEPARTMENT', employee.department.name);
    }

    if (employee.employmentDetail?.joiningDate) {
      drawRow(
        'JOINED',
        new Date(employee.employmentDetail.joiningDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      );
    }

    // ── Footer ribbon ────────────────────────────────────────
    doc.save();
    doc.rect(0, CARD_H - 4, CARD_W, 4).fill(primary);
    doc.restore();

    doc.end();

    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
  }

  /**
   * Returns the bare ownership info needed for the controller's permission
   * check (caller is the employee themselves OR has `employee.read`).
   */
  async findOwnership(organizationId: string, employeeId: string) {
    return this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      select: { id: true, userId: true, employeeCode: true },
    });
  }
}
