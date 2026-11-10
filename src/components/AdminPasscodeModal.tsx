import React, { useState } from 'react';
import { Customer } from '../types';
import { CustomerService } from '../services/api';
import { ShieldAlert, Lock, Delete, CheckCircle2, DollarSign, X, AlertTriangle, KeyRound } from 'lucide-react';

interface AdminPasscodeModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onAuthorize: (passcode: string, authorizedBy: string) => void;
  onSwitchToCash?: () => void;
  onSwitchToCheque?: () => void;
  currency?: string;
}

export const AdminPasscodeModal: React.FC<AdminPasscodeModalProps> = ({
  isOpen,
  customer,
  onClose,
  onAuthorize,
  onSwitchToCash,
  onSwitchToCheque,
  currency = 'Rs.'
}) => {
  const [passcode, setPasscode] = useState('');
  const [isPasswordMode, setIsPasswordMode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !customer) return null;

  const creditRisk = customer.creditRisk;
  const aging = creditRisk?.aging;
  const blockReason = creditRisk?.blockReason || 'Customer has overdue balances or exceeded credit limits.';

  const handleKeypadPress = (val: string) => {
    setErrorMessage(null);
    if (passcode.length < 12) {
      setPasscode(prev => prev + val);
    }
  };

  const handleBackspace = () => {
    setErrorMessage(null);
    setPasscode(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setErrorMessage(null);
    setPasscode('');
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passcode.trim()) {
      setErrorMessage('Please enter the Admin PIN or password');
      return;
    }

    try {
      setVerifying(true);
      setErrorMessage(null);

      const res = await CustomerService.verifyCreditOverride(customer.id, passcode.trim());
      if (res.authorized) {
        onAuthorize(passcode.trim(), res.name || 'Admin');
        setPasscode('');
      } else {
        setErrorMessage('Incorrect PIN or password. Authorization failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'Incorrect PIN or password');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Hard Credit Stop</h3>
              <p className="text-xs text-rose-100">Credit Invoicing Blocked</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Customer & Reason Summary */}
          <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-rose-500 font-mono uppercase tracking-wider block">
                  Customer
                </span>
                <h4 className="font-bold text-sm text-slate-900">{customer.name}</h4>
                {customer.code && (
                  <span className="text-[11px] text-slate-500 font-mono">{customer.code}</span>
                )}
              </div>
              {aging && aging.oldestUnpaidDays > 0 && (
                <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-xl font-mono">
                  {aging.oldestUnpaidDays} Days Overdue
                </span>
              )}
            </div>

            <p className="text-xs text-rose-700 font-medium mt-2 flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{blockReason}</span>
            </p>

            {aging && aging.totalOverdue > 0 && (
              <div className="mt-2.5 pt-2 border-t border-rose-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-600">Overdue Balance:</span>
                <strong className="text-rose-700 font-mono font-bold">
                  {currency} {aging.totalOverdue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </strong>
              </div>
            )}
          </div>

          {/* Quick Alternative: Switch to Cash / Cheque */}
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-2">
              Recommended: Collect Cash Instead (No PIN Required)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {onSwitchToCash && (
                <button
                  type="button"
                  onClick={() => {
                    onSwitchToCash();
                    onClose();
                  }}
                  className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <DollarSign className="w-4 h-4" />
                  Switch to Cash
                </button>
              )}
              {onSwitchToCheque && (
                <button
                  type="button"
                  onClick={() => {
                    onSwitchToCheque();
                    onClose();
                  }}
                  className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Switch to Cheque
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              Or Enter Admin Passcode
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Passcode Display / Input */}
          <form onSubmit={handleVerify} className="space-y-3">
            <div className="relative">
              <input
                type={isPasswordMode ? 'password' : 'password'}
                inputMode={isPasswordMode ? 'text' : 'numeric'}
                readOnly={!isPasswordMode}
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                placeholder={isPasswordMode ? 'Enter Admin Password' : '• • • •'}
                className="w-full text-center text-xl sm:text-2xl font-mono tracking-widest font-bold py-3 px-4 rounded-2xl bg-slate-50 border-2 border-slate-300 focus:border-rose-500 focus:bg-white focus:outline-none transition shadow-inner"
              />
              <button
                type="button"
                onClick={() => setIsPasswordMode(!isPasswordMode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-200 transition"
                title="Toggle between numeric PIN and text password"
              >
                <KeyRound className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 text-center animate-shake">
                {errorMessage}
              </div>
            )}

            {/* Mobile Keypad (Visible only if not in text password mode) */}
            {!isPasswordMode && (
              <div className="grid grid-cols-3 gap-2 pt-1 select-none">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeypadPress(num.toString())}
                    className="h-11 sm:h-12 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-lg rounded-2xl transition shadow-2xs cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-11 sm:h-12 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider rounded-2xl transition cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="h-11 sm:h-12 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-lg rounded-2xl transition shadow-2xs cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-11 sm:h-12 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold rounded-2xl flex items-center justify-center transition cursor-pointer"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Authorize Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={verifying || !passcode}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-2xl shadow-sm transition flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Passcode...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Authorize Credit Invoice</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="text-[11px] text-slate-400 text-center">
            Default Master PIN is <code className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded">8888</code> (configurable in Settings). Admin passwords are also accepted.
          </p>
        </div>
      </div>
    </div>
  );
};

