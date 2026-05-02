import { Injectable, NotFoundException } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { PrismaService } from '../../../prisma/prisma.service';

function normalizeHex(input: string | null | undefined, fallback: string): string {
  if (!input) return fallback;
  const hex = input.trim();
  if (/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    return '#' + hex.slice(1).split('').map((c) => c + c).join('');
  }
  return fallback;
}

@Injectable()
export class PayslipPdfService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetches logo image bytes from a URL. Returns null if the fetch fails or
   * the content-type is not JPEG or PNG (pdfkit only supports those two).
   */
  private async fetchLogoBytes(url: string): Promise<Buffer | null> {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      const ct = res.headers.get('content-type') ?? '';
      // pdfkit only supports JPEG and PNG embedded images
      if (!ct.startsWith('image/jpeg') && !ct.startsWith('image/png')) return null;
      const arr = await res.arrayBuffer();
      return Buffer.from(arr);
    } catch {
      return null;
    }
  }

  /**
   * Generates a PDF payslip for the given payroll row, scoped to the
   * caller's organization. Returns a Buffer; the controller streams it
   * with the right headers.
   */
  async generate(organizationId: string, payrollId: string): Promise<Buffer> {
    const payroll = await this.prisma.payroll.findFirst({
      where: { id: payrollId, organizationId },
      include: {
        employee: {
          include: {
            department: { select: { name: true } },
            designation: { select: { name: true } },
          },
        },
        payrollCycle: { select: { year: true, month: true, periodStart: true, periodEnd: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
        adjustments: true,
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
    if (!payroll) throw new NotFoundException('Payslip not found');

    const primary = normalizeHex(payroll.organization.brandPrimary, '#3b82f6');
    const orgDisplayName =
      (payroll.organization.brandName ?? '').trim() || payroll.organization.name;

    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const buffers: Buffer[] = [];
    doc.on('data', (b: Buffer) => buffers.push(b));

    const monthLabel = new Date(
      payroll.payrollCycle.periodStart,
    ).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Logo top-right (if available)
    const logoBytes = payroll.organization.brandLogoUrl
      ? await this.fetchLogoBytes(payroll.organization.brandLogoUrl)
      : null;

    if (logoBytes) {
      try {
        // pdfkit: image(buffer, x, y, options)
        doc.image(logoBytes, doc.page.width - 48 - 48, 48, { fit: [48, 48], align: 'right' });
      } catch {
        // Ignore — image format may be unsupported by pdfkit
      }
    }

    // Header text
    doc
      .fillColor('#0f172a')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(orgDisplayName, 48, 48, { width: doc.page.width - 144 });

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('Payslip — ' + monthLabel, 48, 72, { width: doc.page.width - 144 })
      .moveDown(2);

    // Employee block
    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Employee');
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#475569')
      .text(`${payroll.employee.firstName} ${payroll.employee.lastName}`)
      .text(`Code: ${payroll.employee.employeeCode}`)
      .text(`Department: ${payroll.employee.department?.name ?? '—'}`)
      .text(`Designation: ${payroll.employee.designation?.name ?? '—'}`)
      .moveDown(0.5);

    // Period block
    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Pay period');
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#475569')
      .text(
        `From ${new Date(payroll.payrollCycle.periodStart)
          .toISOString()
          .slice(0, 10)} to ${new Date(payroll.payrollCycle.periodEnd)
          .toISOString()
          .slice(0, 10)}`,
      )
      .text(`Working days: ${payroll.totalWorkingDays}`)
      .text(`Effective working days: ${payroll.effectiveWorkingDays}`)
      .moveDown(1);

    // Earnings + Deductions + Adjustments
    const earnings = payroll.lineItems.filter((li) => li.type === 'EARNING');
    const deductions = payroll.lineItems.filter((li) => li.type === 'DEDUCTION');
    const adjustments = payroll.adjustments ?? [];

    // Section helper
    const drawTable = (title: string, items: Array<{ label: string; amount: string }>) => {
      doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text(title);
      doc.moveDown(0.3);
      items.forEach((it) => {
        doc.font('Helvetica').fontSize(10).fillColor('#475569');
        doc.text(it.label, { continued: true, width: 260 });
        doc.text(it.amount, { align: 'right' });
      });
      doc.moveDown(0.5);
    };

    drawTable(
      'Earnings',
      earnings.map((li) => ({ label: li.componentName, amount: this.fmt(Number(li.amount)) })),
    );

    drawTable(
      'Deductions',
      deductions.map((li) => ({ label: li.componentName, amount: this.fmt(Number(li.amount)) })),
    );

    if (adjustments.length > 0) {
      drawTable(
        'Adjustments',
        adjustments.map((a) => ({
          label: `${a.description} (${a.category})`,
          amount: (a.type === 'EARNING' ? '+ ' : '- ') + this.fmt(Number(a.amount)),
        })),
      );
    }

    doc.moveDown(0.5);
    // Totals box — use brand primary for the ruled separator lines
    doc.lineWidth(1.5).strokeColor(primary).moveTo(48, doc.y).lineTo(548, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a');
    const drawTotal = (label: string, value: string, big = false, color?: string) => {
      doc.font(big ? 'Helvetica-Bold' : 'Helvetica');
      doc.fontSize(big ? 13 : 11);
      doc.fillColor(color ?? '#0f172a');
      doc.text(label, { continued: true, width: 360 });
      doc.text(value, { align: 'right' });
    };
    drawTotal('Gross earnings', this.fmt(Number(payroll.grossEarnings)));
    drawTotal('Total deductions', this.fmt(Number(payroll.totalDeductions)));
    if (Number(payroll.totalAdjustments) !== 0) {
      drawTotal('Total adjustments', this.fmt(Number(payroll.totalAdjustments)));
    }
    if (Number(payroll.lossOfPayDeduction) !== 0) {
      drawTotal('Loss of pay', this.fmt(Number(payroll.lossOfPayDeduction)));
    }
    doc.moveDown(0.3);
    doc.lineWidth(1.5).strokeColor(primary).moveTo(48, doc.y).lineTo(548, doc.y).stroke();
    doc.moveDown(0.3);
    // "Net payable" rendered in brand primary color
    drawTotal('Net payable', this.fmt(Number(payroll.netPayable)), true, primary);
    doc.moveDown(2);

    // Footer — use orgDisplayName for branding
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#94a3b8')
      .text(`This payslip was generated automatically by ${orgDisplayName}. `, {
        align: 'center',
      });

    doc.end();

    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
  }

  private fmt(n: number): string {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }
}
