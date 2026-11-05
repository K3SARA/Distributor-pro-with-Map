import React, { useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, Check } from 'lucide-react';
import { Product } from '../types';
import { ProductService } from '../services/api';

interface StockAdjustModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAdjusted: () => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  product,
  isOpen,
  onClose,
  onAdjusted
}) => {
  const [stockCategory, setStockCategory] = useState<'REGULAR' | 'FREE_ISSUE'>('REGULAR');
  const [type, setType] = useState<'INBOUND' | 'ADJUSTMENT'>('INBOUND');
  const [quantity, setQuantity] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty === 0) {
      setError('Please enter a valid quantity.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await ProductService.adjustStock(product.id, {
        quantity: type === 'INBOUND' ? Math.abs(qty) : qty, // Adjustment can be negative or positive
        type,
        isFreeIssue: stockCategory === 'FREE_ISSUE',
        referenceId,
        notes
      });
      onAdjusted();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">Receive Stock / Adjust</h3>
            <p className="text-xs text-slate-400 mt-0.5">{product.name} ({product.sku})</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-700 text-xs px-5 sm:px-7 py-2.5 font-medium border-b border-rose-100 shrink-0">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-3.5 sm:space-y-4 overflow-y-auto">
          {/* Current Stock Breakdown */}
          <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-sm border border-slate-200/60">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Regular Paid Stock:</span>
              <span className="font-bold text-slate-900 font-mono text-base">
                {product.currentStock} {product.unit}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-medium">Free Issue Stock:</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-mono">
                  Cost: Rs. 0.00
                </span>
              </div>
              <span className="font-bold text-emerald-800 font-mono text-base">
                {product.freeStock || 0} {product.unit}
              </span>
            </div>
          </div>

          {/* Stock Bucket Target Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Stock Target Bucket *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStockCategory('REGULAR')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center ${
                  stockCategory === 'REGULAR'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Regular Stock
                <span className="block text-[10px] font-normal text-slate-400 mt-0.5">Purchased paid stock</span>
              </button>
              <button
                type="button"
                onClick={() => setStockCategory('FREE_ISSUE')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center ${
                  stockCategory === 'FREE_ISSUE'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Free Issue Stock
                <span className="block text-[10px] font-normal text-emerald-600 mt-0.5">Promotional • Cost: Rs. 0.00</span>
              </button>
            </div>
          </div>

          {/* Movement Type */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('INBOUND')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
                type === 'INBOUND'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <ArrowDownRight className="w-4 h-4 text-emerald-600" /> Inbound Intake
            </button>
            <button
              type="button"
              onClick={() => setType('ADJUSTMENT')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
                type === 'ADJUSTMENT'
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-amber-600" /> Audit Adjustment
            </button>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Quantity to Add / Adjust *
            </label>
            <input
              type="number"
              required
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="e.g. 50"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
            />
            {type === 'ADJUSTMENT' && (
              <p className="text-[11px] text-slate-400 mt-1">
                Enter positive number to increase, negative (e.g. -5) to decrease for breakage or shrinkage.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Supplier Delivery / PO Number
            </label>
            <input
              type="text"
              value={referenceId}
              onChange={e => setReferenceId(e.target.value)}
              placeholder="e.g. PO-9814 or Supplier Inv #44"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Dock delivery received in perfect condition"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-sm font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> {loading ? 'Updating...' : 'Confirm Stock Intake'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
