import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  FileText,
  CheckCircle2,
  Calendar,
  Building2,
  CreditCard
} from 'lucide-react';
import { Payroll, SystemSettings } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { SettingsService } from '../services/api';

interface PayslipModalProps {
  payroll: Payroll | null;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const PayslipModal: React.FC<PayslipModalProps> = ({ payroll, onClose }) => {
  const { formatMoney } = useCurrency();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [format, setFormat] = useState<'a4' | '80mm'>('a4');

  useEffect(() => {
    if (payroll) {
      SettingsService.get()
        .then(setSettings)
        .catch(() => {});
    }
  }, [payroll]);

  if (!payroll) return null;

  const handlePrint = () => {
    window.print();
  };

  const monthLabel = `${MONTH_NAMES[payroll.month - 1] || payroll.month} ${payroll.year}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:rounded-none">
        {/* Modal Top Bar (Hidden during print) */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Employee Payslip</h2>
              <p className="text-xs text-slate-500 font-mono">
                {payroll.payslipNumber} &bull; {payroll.employee?.fullName || 'Staff'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Switcher */}
            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setFormat('a4')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  format === 'a4' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setFormat('80mm')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  format === '80mm' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                80mm Slip
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0071E3] hover:bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Printable Body */}
        <div className="overflow-y-auto flex-1 p-6 print:p-4 print:overflow-visible bg-white">
          {format === '80mm' ? (
            /* 80MM THERMAL SLIP VIEW */
            <div className="max-w-[320px] mx-auto font-mono text-[11px] leading-relaxed text-slate-800 border border-dashed border-slate-300 p-4 rounded-xl print:border-none print:p-0">
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <h3 className="font-bold text-sm tracking-tight text-slate-900">
                  {settings?.companyName || 'DISTRIBUTOR PRO'}
                </h3>
                <p className="text-[10px] text-slate-500">{settings?.phone}</p>
                <div className="my-1.5 font-bold uppercase tracking-wider text-[11px]">
                  PAYSLIP - {monthLabel}
                </div>
                <p className="text-[10px] text-slate-400">{payroll.payslipNumber}</p>
              </div>

              <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee:</span>
                  <span className="font-bold">{payroll.employee?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Emp ID / Desig:</span>
                  <span>{payroll.employee?.employeeNumber} &bull; {payroll.employee?.designation}</span>
                </div>
                {payroll.employee?.epfNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">EPF No:</span>
                    <span>{payroll.employee.epfNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Worked / OT:</span>
                  <span>{payroll.workedDays} Days / {payroll.otHours}h</span>
                </div>
              </div>

              {/* Earnings */}
              <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Earnings</div>
                <div className="flex justify-between">
                  <span>Basic Salary</span>
                  <span>{formatMoney(payroll.basicSalary)}</span>
                </div>
                {payroll.otAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Overtime Pay ({payroll.otHours}h)</span>
                    <span>{formatMoney(payroll.otAmount)}</span>
                  </div>
                )}
                {payroll.allowances > 0 && (
                  <div className="flex justify-between">
                    <span>Allowances</span>
                    <span>{formatMoney(payroll.allowances)}</span>
                  </div>
                )}
                {payroll.salesCommission > 0 && (
                  <div className="flex justify-between">
                    <span>Route Commission</span>
                    <span>{formatMoney(payroll.salesCommission)}</span>
                  </div>
                )}
                {payroll.performanceBonus > 0 && (
                  <div className="flex justify-between">
                    <span>Performance Bonus</span>
                    <span>{formatMoney(payroll.performanceBonus)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                  <span>Gross Earnings</span>
                  <span>{formatMoney(payroll.grossEarnings)}</span>
                </div>
              </div>

              {/* Deductions */}
              <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deductions</div>
                {payroll.advancesDeducted > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Salary Advances</span>
                    <span>-{formatMoney(payroll.advancesDeducted)}</span>
                  </div>
                )}
                {payroll.epfDeduction > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>EPF (8%)</span>
                    <span>-{formatMoney(payroll.epfDeduction)}</span>
                  </div>
                )}
                {payroll.otherDeductions > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Other Deductions</span>
                    <span>-{formatMoney(payroll.otherDeductions)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                  <span>Total Deductions</span>
                  <span className="text-rose-600">-{formatMoney(payroll.totalDeductions)}</span>
                </div>
              </div>

              {/* Net Pay */}
              <div className="py-3 border-b border-dashed border-slate-300">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span>NET PAYABLE:</span>
                  <span className="text-blue-600 text-base">{formatMoney(payroll.netPayable)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Status: {payroll.paymentStatus}</span>
                  <span>Via: {payroll.paymentMethod}</span>
                </div>
              </div>

              {/* Statutory Footnote */}
              {(payroll.employerEpf > 0 || payroll.employerEtf > 0) && (
                <div className="py-2 text-[9.5px] text-slate-500 space-y-0.5 border-b border-dashed border-slate-200">
                  <div className="flex justify-between">
                    <span>Employer EPF (12%):</span>
                    <span>{formatMoney(payroll.employerEpf)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Employer ETF (3%):</span>
                    <span>{formatMoney(payroll.employerEtf)}</span>
                  </div>
                </div>
              )}

              <div className="pt-6 pb-2 text-center text-[10px] text-slate-400">
                <p>Signature: ______________________</p>
                <p className="mt-2">Thank you for your dedicated service!</p>
              </div>
            </div>
          ) : (
            /* STANDARD A4 / SLIP VIEW */
            <div className="max-w-2xl mx-auto space-y-5 text-slate-800">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    {settings?.companyName || 'DISTRIBUTOR PRO FLEET'}
                  </h1>
                  <p className="text-xs text-slate-500">{settings?.address || 'Distribution Center'}</p>
                  <p className="text-xs text-slate-500">Tel: {settings?.phone || '077 123 4567'}</p>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs uppercase tracking-wider mb-1">
                    Salary Payslip
                  </div>
                  <p className="text-xs text-slate-500 font-mono">No: {payroll.payslipNumber}</p>
                  <p className="text-xs font-semibold text-slate-700">{monthLabel}</p>
                </div>
              </div>

              {/* Staff & Employment Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Employee Name</span>
                  <span className="font-bold text-slate-900 text-sm">{payroll.employee?.fullName}</span>
                  {payroll.employee?.callingName && (
                    <span className="text-slate-500 text-[11px] block">({payroll.employee.callingName})</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Employee No & Post</span>
                  <span className="font-semibold text-slate-800">
                    {payroll.employee?.employeeNumber} &bull; {payroll.employee?.designation}
                  </span>
                  <span className="text-slate-500 text-[11px] block">{payroll.employee?.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">EPF / NIC</span>
                  <span className="font-semibold text-slate-800">
                    EPF: {payroll.employee?.epfNumber || 'N/A'}
                  </span>
                  <span className="text-slate-500 text-[11px] block">NIC: {payroll.employee?.nicNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Attendance & Leave</span>
                  <span className="font-semibold text-slate-800">
                    {payroll.workedDays} Days Worked &bull; {payroll.otHours} OT Hrs
                  </span>
                  <span className="text-slate-500 text-[11px] block">
                    {payroll.absentDays} Absent &bull; {payroll.leaveDays} Leaves
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Bank Account</span>
                  <span className="font-semibold text-slate-800">
                    {payroll.employee?.bankName || 'Direct Cash'}
                  </span>
                  <span className="text-slate-500 text-[11px] block">
                    {payroll.employee?.accountNumber || ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Status</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        payroll.paymentStatus === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : payroll.paymentStatus === 'APPROVED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {payroll.paymentStatus}
                    </span>
                    <span className="text-slate-500 text-[11px]">({payroll.paymentMethod})</span>
                  </div>
                </div>
              </div>

              {/* Two Column Earnings & Deductions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-white flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-500">Earnings</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Amount</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Basic Salary</span>
                      <span className="font-mono font-medium">{formatMoney(payroll.basicSalary)}</span>
                    </div>
                    {payroll.otAmount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Overtime Pay ({payroll.otHours}h)</span>
                        <span className="font-mono font-medium">{formatMoney(payroll.otAmount)}</span>
                      </div>
                    )}
                    {payroll.allowances > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Allowances</span>
                        <span className="font-mono font-medium">{formatMoney(payroll.allowances)}</span>
                      </div>
                    )}
                    {payroll.salesCommission > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Route Sales Commission</span>
                        <span className="font-mono font-medium text-blue-600">{formatMoney(payroll.salesCommission)}</span>
                      </div>
                    )}
                    {payroll.performanceBonus > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">Performance Bonus</span>
                        <span className="font-mono font-medium">{formatMoney(payroll.performanceBonus)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-4 text-xs font-bold text-slate-900">
                    <span>Gross Earnings</span>
                    <span className="font-mono text-sm text-slate-900">{formatMoney(payroll.grossEarnings)}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-white flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-bold text-xs uppercase tracking-wider text-rose-500">Deductions</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Amount</span>
                    </div>
                    {payroll.advancesDeducted > 0 && (
                      <div className="flex justify-between text-xs text-rose-700">
                        <span>Salary Advance Recovery</span>
                        <span className="font-mono font-medium">-{formatMoney(payroll.advancesDeducted)}</span>
                      </div>
                    )}
                    {payroll.epfDeduction > 0 && (
                      <div className="flex justify-between text-xs text-rose-700">
                        <span>Employee EPF (8%)</span>
                        <span className="font-mono font-medium">-{formatMoney(payroll.epfDeduction)}</span>
                      </div>
                    )}
                    {payroll.otherDeductions > 0 && (
                      <div className="flex justify-between text-xs text-rose-700">
                        <span>Other Deductions</span>
                        <span className="font-mono font-medium">-{formatMoney(payroll.otherDeductions)}</span>
                      </div>
                    )}
                    {payroll.totalDeductions === 0 && (
                      <div className="text-xs text-slate-400 italic py-2">No deductions recorded</div>
                    )}
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-4 text-xs font-bold text-rose-600">
                    <span>Total Deductions</span>
                    <span className="font-mono text-sm">-{formatMoney(payroll.totalDeductions)}</span>
                  </div>
                </div>
              </div>

              {/* Net Payable Highlight Banner */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    Take Home Pay
                  </span>
                  <div className="text-xs text-slate-600">
                    Gross Earnings ({formatMoney(payroll.grossEarnings)}) - Total Deductions ({formatMoney(payroll.totalDeductions)})
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-blue-700 font-mono tracking-tight">
                    {formatMoney(payroll.netPayable)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {payroll.paymentStatus === 'PAID' ? `Paid on ${payroll.paidAt ? new Date(payroll.paidAt).toLocaleDateString() : 'Today'}` : 'Pending Disbursement'}
                  </div>
                </div>
              </div>

              {/* Employer Statutory Contributions */}
              {(payroll.employerEpf > 0 || payroll.employerEtf > 0) && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium">Employer Statutory Contribution (Not deducted from salary):</span>
                  <div className="flex gap-4 font-mono font-semibold text-slate-700">
                    <span>EPF (12%): {formatMoney(payroll.employerEpf)}</span>
                    <span>ETF (3%): {formatMoney(payroll.employerEtf)}</span>
                    <span className="text-indigo-600">Total: {formatMoney(payroll.employerEpf + payroll.employerEtf)}</span>
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-slate-500 border-t border-slate-200">
                <div>
                  <div className="border-b border-dashed border-slate-300 w-48 mb-2"></div>
                  <p className="font-semibold text-slate-700">Employee Signature</p>
                  <p className="text-[10px] text-slate-400">Received salary & accepted calculation</p>
                </div>
                <div className="text-right">
                  <div className="border-b border-dashed border-slate-300 w-48 mb-2 ml-auto"></div>
                  <p className="font-semibold text-slate-700">Managing Director / Accountant</p>
                  <p className="text-[10px] text-slate-400">{settings?.companyName || 'Authorized Signatory'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
