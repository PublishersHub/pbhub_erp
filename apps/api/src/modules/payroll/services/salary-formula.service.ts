import { Injectable } from '@nestjs/common';
import { Prisma, SalaryComponent, SalaryFormulaBase } from '@prisma/client';

export interface ResolvedComponent {
  componentId: string;
  code: string;
  name: string;
  type: 'EARNING' | 'DEDUCTION';
  amount: number;
  derivedFrom: string;
}

/**
 * Computes per-component salary amounts from a CTC and a list of
 * SalaryComponent definitions whose formulaBase / formulaValue fields say
 * how each component is derived.
 *
 * Evaluation order (handles dependencies + the GROSS circular reference):
 *   1. CTC%, FIXED, CUSTOM (base layer; need only CTC or a literal)
 *   2. BASIC% (require basic resolved)
 *   3. GROSS% — special case. Naively, every earning sums into gross, so a
 *      GROSS% earning would feed into its own base. We break the cycle by
 *      defining `gross` as the sum of EARNINGs whose formula does NOT
 *      depend on GROSS (i.e. tier 1 + tier 2 earnings only). GROSS%
 *      components are resolved against that frozen base.
 *
 * Decimal-safe internally (uses Prisma.Decimal); returns numbers for the API.
 */
@Injectable()
export class SalaryFormulaService {
  computeStructure(
    ctc: number,
    components: SalaryComponent[],
  ): ResolvedComponent[] {
    const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);
    const ctcDec = D(ctc);

    // Output map keyed by component id, in input order.
    const result = new Map<string, ResolvedComponent>();

    // Tier 1: CTC%, FIXED, CUSTOM (treated as zero — manual entry)
    for (const c of components) {
      if (c.formulaBase === SalaryFormulaBase.CTC) {
        const pct = c.formulaValue ? D(c.formulaValue.toString()) : D(0);
        const amount = ctcDec.mul(pct).div(100);
        result.set(c.id, this.toResolved(c, amount, `${pct.toString()}% of CTC = ${amount.toFixed(2)}`));
      } else if (c.formulaBase === SalaryFormulaBase.FIXED) {
        // FIXED: the formula itself contributes nothing; the fixed amount is
        // injected separately via fixedAmounts (see computeWithFixed below).
        result.set(c.id, this.toResolved(c, D(0), 'Fixed amount'));
      } else if (c.formulaBase === SalaryFormulaBase.CUSTOM) {
        // v1: treated as FIXED (manual entry expected)
        result.set(c.id, this.toResolved(c, D(0), 'Custom (manual entry)'));
      }
    }

    // Tier 2: BASIC% — resolve once basic earnings are known.
    // "Basic" = earning with code === 'BASIC'. Sum its resolved amount.
    const basicAmount = this.sumByPredicate(components, result, (c) =>
      c.code === 'BASIC' && c.type === 'EARNING',
    );

    for (const c of components) {
      if (c.formulaBase === SalaryFormulaBase.BASIC) {
        const pct = c.formulaValue ? D(c.formulaValue.toString()) : D(0);
        const amount = basicAmount.mul(pct).div(100);
        result.set(c.id, this.toResolved(c, amount, `${pct.toString()}% of BASIC (${basicAmount.toFixed(2)}) = ${amount.toFixed(2)}`));
      }
    }

    // Tier 3: GROSS% — gross is the sum of EARNINGs that don't depend on GROSS.
    const grossBase = components.reduce((acc, c) => {
      if (
        c.type === 'EARNING' &&
        c.formulaBase !== SalaryFormulaBase.GROSS
      ) {
        const r = result.get(c.id);
        if (r) return acc.add(D(r.amount));
      }
      return acc;
    }, D(0));

    for (const c of components) {
      if (c.formulaBase === SalaryFormulaBase.GROSS) {
        const pct = c.formulaValue ? D(c.formulaValue.toString()) : D(0);
        const amount = grossBase.mul(pct).div(100);
        result.set(c.id, this.toResolved(c, amount, `${pct.toString()}% of GROSS (${grossBase.toFixed(2)}) = ${amount.toFixed(2)}`));
      }
    }

    // Preserve input order
    return components
      .map((c) => result.get(c.id))
      .filter((r): r is ResolvedComponent => !!r);
  }

  /**
   * Same as computeStructure but allows callers to supply explicit fixed
   * amounts for FIXED/CUSTOM components (e.g. "TRAVEL = 5000"). Useful when
   * persisting a structure where the user typed amounts for non-formula rows.
   */
  computeWithFixed(
    ctc: number,
    components: SalaryComponent[],
    fixedAmounts: Map<string, number>,
  ): ResolvedComponent[] {
    const resolved = this.computeStructure(ctc, components);
    const D = (v: number | string) => new Prisma.Decimal(v);

    // Inject manual amounts for FIXED/CUSTOM rows, then re-resolve any
    // BASIC% / GROSS% that depended on them.
    let mutated = false;
    const byId = new Map(resolved.map((r) => [r.componentId, { ...r }]));
    for (const c of components) {
      if (
        c.formulaBase === SalaryFormulaBase.FIXED ||
        c.formulaBase === SalaryFormulaBase.CUSTOM
      ) {
        const fixed = fixedAmounts.get(c.id);
        if (fixed !== undefined) {
          const r = byId.get(c.id);
          if (r) {
            r.amount = Number(D(fixed).toFixed(2));
            r.derivedFrom = `Fixed amount ${r.amount}`;
            mutated = true;
          }
        }
      }
    }

    if (!mutated) return resolved;

    // Re-resolve BASIC% and GROSS% with the injected fixed values.
    const basicAmount = components.reduce((acc, c) => {
      if (c.code === 'BASIC' && c.type === 'EARNING') {
        const r = byId.get(c.id);
        if (r) return acc.add(D(r.amount));
      }
      return acc;
    }, D(0));

    for (const c of components) {
      if (c.formulaBase === SalaryFormulaBase.BASIC) {
        const pct = c.formulaValue ? D(c.formulaValue.toString()) : D(0);
        const amount = basicAmount.mul(pct).div(100);
        const r = byId.get(c.id);
        if (r) {
          r.amount = Number(amount.toFixed(2));
          r.derivedFrom = `${pct.toString()}% of BASIC (${basicAmount.toFixed(2)}) = ${amount.toFixed(2)}`;
        }
      }
    }

    const grossBase = components.reduce((acc, c) => {
      if (c.type === 'EARNING' && c.formulaBase !== SalaryFormulaBase.GROSS) {
        const r = byId.get(c.id);
        if (r) return acc.add(D(r.amount));
      }
      return acc;
    }, D(0));

    for (const c of components) {
      if (c.formulaBase === SalaryFormulaBase.GROSS) {
        const pct = c.formulaValue ? D(c.formulaValue.toString()) : D(0);
        const amount = grossBase.mul(pct).div(100);
        const r = byId.get(c.id);
        if (r) {
          r.amount = Number(amount.toFixed(2));
          r.derivedFrom = `${pct.toString()}% of GROSS (${grossBase.toFixed(2)}) = ${amount.toFixed(2)}`;
        }
      }
    }

    return components
      .map((c) => byId.get(c.id))
      .filter((r): r is ResolvedComponent => !!r);
  }

  // ─── helpers ─────────────────────────────

  private toResolved(
    c: SalaryComponent,
    amount: Prisma.Decimal,
    derivedFrom: string,
  ): ResolvedComponent {
    return {
      componentId: c.id,
      code: c.code,
      name: c.name,
      type: c.type,
      amount: Number(amount.toFixed(2)),
      derivedFrom,
    };
  }

  private sumByPredicate(
    components: SalaryComponent[],
    resolved: Map<string, ResolvedComponent>,
    predicate: (c: SalaryComponent) => boolean,
  ): Prisma.Decimal {
    const D = (v: number | string) => new Prisma.Decimal(v);
    return components.reduce((acc, c) => {
      if (predicate(c)) {
        const r = resolved.get(c.id);
        if (r) return acc.add(D(r.amount));
      }
      return acc;
    }, D(0));
  }
}
