'use client';

import type { Holiday } from '@/types/leave';

export interface OffDayInfo {
  /** True if today's day-of-week is in the policy's workingDays. */
  isWorkingDay: boolean;
  /** Today's holiday row, if today matches one. Holiday takes precedence in copy. */
  holiday: Holiday | null;
}

/**
 * Compute whether today is a non-working day for the user, given the policy
 * `workingDays` (0=Sun..6=Sat) and a list of holidays. Falls back to Mon-Fri
 * if `workingDays` is undefined.
 */
export function getOffDayInfo(
  workingDays: number[] | undefined,
  holidays: Holiday[],
  now: Date = new Date(),
): OffDayInfo {
  const dow = now.getDay();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const days = workingDays && workingDays.length > 0 ? workingDays : [1, 2, 3, 4, 5];
  const isWorkingDay = days.includes(dow);
  const holiday = holidays.find((h) => h.date.startsWith(todayIso)) ?? null;
  return { isWorkingDay, holiday };
}

interface OffDayCardProps {
  holiday: Holiday | null;
  isWorkingDay: boolean;
  /** True if user has already checked in today (rare weekend/holiday OT). */
  isCheckedIn: boolean;
  /** Optional "Check in anyway" override (only shown if provided and not checked in). */
  onOverride?: () => void;
}

export function OffDayCard({
  holiday,
  isWorkingDay,
  isCheckedIn,
  onOverride,
}: OffDayCardProps) {
  // Holiday wins over weekend in the copy.
  const isHoliday = !!holiday;
  const title = isHoliday ? holiday!.name : isWorkingDay ? 'Day off' : 'Weekend';
  const tone = isHoliday
    ? 'bg-violet/10 text-violet'
    : 'bg-muted text-muted-foreground';

  return (
    <div className={`rounded-xl px-4 py-3 text-left ${tone}`}>
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-base leading-none">📅</span>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-1.5 text-xs">
        Enjoy your day off — no need to check in.
      </p>
      {isCheckedIn && (
        <p className="mt-1.5 text-[11px] opacity-80">
          (Currently working — voluntary)
        </p>
      )}
      {onOverride && !isCheckedIn && (
        <button
          type="button"
          onClick={onOverride}
          className="mt-2 text-[11px] font-medium underline decoration-dotted underline-offset-2 hover:opacity-80"
        >
          Check in anyway
        </button>
      )}
    </div>
  );
}
