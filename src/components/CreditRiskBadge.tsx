import React from 'react';
import { CustomerCreditRisk, CreditReliability } from '../types';
import { ShieldCheck, ShieldAlert, AlertTriangle, Clock, Ban } from 'lucide-react';

interface CreditRiskBadgeProps {
  creditRisk?: CustomerCreditRisk | null;
  compact?: boolean;
  showDays?: boolean;
  className?: string;
}

export const CreditRiskBadge: React.FC<CreditRiskBadgeProps> = ({
  creditRisk,
  compact = false,
  showDays = true,
  className = ''
}) => {
  if (!creditRisk) return null;

  const { reliability, averageDaysToPay, aging, isCreditBlocked, blockReason } = creditRisk;

  // Format avg days
  const avgDaysStr = averageDaysToPay !== null ? `${Math.round(averageDaysToPay)}d` : null;

  if (isCreditBlocked) {
    return (
      <span
        title={blockReason || 'Hard Credit Stop Enforced: Overdue bills or exceeded limit'}
        className={`inline-flex items-center gap-1 font-bold rounded-lg border text-rose-700 bg-rose-50 border-rose-300 shadow-2xs ${
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
        } ${className}`}
      >
        <Ban className="w-3 h-3 text-rose-600 shrink-0" />
        <span>Credit Blocked</span>
        {aging.oldestUnpaidDays > 0 && (
          <span className="font-mono text-[10px] bg-rose-200/60 text-rose-800 px-1 rounded">
            {aging.oldestUnpaidDays}d
          </span>
        )}
      </span>
    );
  }

  switch (reliability) {
    case 'EXCELLENT':
      return (
        <span
          title={`Prompt Payer: Average turnaround ${avgDaysStr || 'immediate'}`}
          className={`inline-flex items-center gap-1 font-bold rounded-lg border text-emerald-700 bg-emerald-50 border-emerald-200 shadow-2xs ${
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
          } ${className}`}
        >
          <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>Prompt</span>
          {showDays && avgDaysStr && (
            <span className="font-mono text-[10px] text-emerald-600 font-normal">
              ~{avgDaysStr}
            </span>
          )}
        </span>
      );

    case 'GOOD':
      return (
        <span
          title={`Good Standing: Average turnaround ${avgDaysStr || 'under 30d'}`}
          className={`inline-flex items-center gap-1 font-bold rounded-lg border text-blue-700 bg-blue-50 border-blue-200 shadow-2xs ${
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
          } ${className}`}
        >
          <ShieldCheck className="w-3 h-3 text-blue-600 shrink-0" />
          <span>Good</span>
          {showDays && avgDaysStr && (
            <span className="font-mono text-[10px] text-blue-600 font-normal">
              ~{avgDaysStr}
            </span>
          )}
        </span>
      );

    case 'MODERATE':
      return (
        <span
          title={`Moderate Risk: Average turnaround ${avgDaysStr || '30-45d'}`}
          className={`inline-flex items-center gap-1 font-bold rounded-lg border text-amber-700 bg-amber-50 border-amber-300 shadow-2xs ${
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
          } ${className}`}
        >
          <Clock className="w-3 h-3 text-amber-600 shrink-0" />
          <span>Moderate</span>
          {showDays && avgDaysStr && (
            <span className="font-mono text-[10px] text-amber-700 font-normal">
              ~{avgDaysStr}
            </span>
          )}
        </span>
      );

    case 'HIGH_RISK':
    default:
      return (
        <span
          title={`High Risk: Overdue balance or slow payment turnaround (${avgDaysStr || '45d+'})`}
          className={`inline-flex items-center gap-1 font-bold rounded-lg border text-rose-700 bg-rose-50 border-rose-300 shadow-2xs ${
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
          } ${className}`}
        >
          <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
          <span>High Risk</span>
          {aging.oldestUnpaidDays > 0 ? (
            <span className="font-mono text-[10px] text-rose-700 font-normal">
              {aging.oldestUnpaidDays}d
            </span>
          ) : avgDaysStr ? (
            <span className="font-mono text-[10px] text-rose-700 font-normal">
              ~{avgDaysStr}
            </span>
          ) : null}
        </span>
      );
  }
};

interface CustomerAgingCardProps {
  creditRisk?: CustomerCreditRisk | null;
  currency?: string;
  className?: string;
}

export const CustomerAgingCard: React.FC<CustomerAgingCardProps> = ({
  creditRisk,
  currency = 'Rs.',
  className = ''
}) => {
  if (!creditRisk) return null;

  const { aging, averageDaysToPay, reliability, isCreditBlocked, blockReason, maxCreditDays } = creditRisk;

  const format = (n: number) =>
    `${currency} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className={`p-4 rounded-2xl border ${isCreditBlocked ? 'bg-rose-50/40 border-rose-200' : 'bg-slate-50 border-slate-200'} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <CreditRiskBadge creditRisk={creditRisk} />
          {averageDaysToPay !== null && (
            <span className="text-xs text-slate-500 font-medium">
              Avg Pay Turnaround: <strong className="text-slate-800 font-mono">{averageDaysToPay} days</strong>
            </span>
          )}
        </div>
        {isCreditBlocked && (
          <span className="text-[11px] font-bold text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
            <Ban className="w-3 h-3 text-rose-600" />
            Hard Stop Active
          </span>
        )}
      </div>

      {blockReason && (
        <div className="mb-3 px-3 py-2 bg-rose-100/70 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{blockReason}</span>
        </div>
      )}

      {/* 4-Bucket Aging Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        {/* Current 0-15d */}
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Current (0-15d)
          </div>
          <div className="text-xs sm:text-sm font-bold font-mono text-slate-800 mt-1">
            {format(aging.current)}
          </div>
        </div>

        {/* 16-30d */}
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            16 - 30 Days
          </div>
          <div className="text-xs sm:text-sm font-bold font-mono text-slate-800 mt-1">
            {format(aging.days16to30)}
          </div>
        </div>

        {/* 31-60d Overdue */}
        <div className={`p-2.5 rounded-xl border shadow-2xs ${aging.days31to60 > 0 ? 'bg-amber-50/80 border-amber-300' : 'bg-white border-slate-200/80'}`}>
          <div className={`text-[10px] uppercase font-bold tracking-wider ${aging.days31to60 > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
            31 - 60 Days {aging.days31to60 > 0 && '⚠️'}
          </div>
          <div className={`text-xs sm:text-sm font-bold font-mono mt-1 ${aging.days31to60 > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
            {format(aging.days31to60)}
          </div>
        </div>

        {/* >60d Critical */}
        <div className={`p-2.5 rounded-xl border shadow-2xs ${aging.over60 > 0 ? 'bg-rose-50/80 border-rose-300' : 'bg-white border-slate-200/80'}`}>
          <div className={`text-[10px] uppercase font-bold tracking-wider ${aging.over60 > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
            &gt; 60 Days {aging.over60 > 0 && '⛔'}
          </div>
          <div className={`text-xs sm:text-sm font-bold font-mono mt-1 ${aging.over60 > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
            {format(aging.over60)}
          </div>
        </div>
      </div>

      {aging.totalOverdue > 0 && (
        <div className="mt-2.5 flex items-center justify-between text-xs px-2 py-1 bg-white/70 rounded-lg text-slate-600 font-medium">
          <span>Total Overdue (&gt;{maxCreditDays}d):</span>
          <strong className="text-rose-600 font-mono font-bold">{format(aging.totalOverdue)}</strong>
        </div>
      )}
    </div>
  );
};
