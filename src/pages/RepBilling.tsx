import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Layers,
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Printer,
  Truck,
  CreditCard,
  LogOut,
  ChevronRight,
  Check,
  RotateCcw,
  Target,
  TrendingUp,
  Calendar,
  Award,
  X,
  Flame,
  Receipt,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { Customer, Product, Lorry, Order, User, RepTargetProgress } from '../types';
import { CustomerService, LorryService, ProductService, OrderService, AuthService } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { CustomerModal } from '../components/CustomerModal';

interface CartItem {
  productId: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
  originalUnitPrice: number;
  availableStock: number;
  quantity: number;
  freeQuantity: number;
  discountPercent: number;
}

interface RepBillingProps {
  onViewInvoice?: (order: Order) => void;
  onExitToMenu?: () => void;
  initialLorryId?: string;
  user?: User;
  onLogout?: () => void;
}

export const RepBilling: React.FC<RepBillingProps> = ({
  onViewInvoice,
  onExitToMenu,
  initialLorryId,
  user,
  onLogout
}) => {
  const { formatMoney } = useCurrency();

  // Current Step: 1 = Customer, 2 = Cart, 3 = Brand, 4 = Products, 5 = Checkout
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Global Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lorries, setLorries] = useState<Lorry[]>([]);
  const [selectedLorryId, setSelectedLorryId] = useState<string>(initialLorryId || '');
  const [loading, setLoading] = useState<boolean>(true);

  // Step 1: Customer
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [billingMethod, setBillingMethod] = useState<'NORMAL' | 'BILL_TO_BILL'>('NORMAL');
  const [customerUnpaidBills, setCustomerUnpaidBills] = useState<Order[]>([]);
  const [settlePrevAmount, setSettlePrevAmount] = useState<string>('');
  const [collectPrevBill, setCollectPrevBill] = useState<boolean>(false);

  // Step 2 & Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Step 3: Brand
  const [selectedBrand, setSelectedBrand] = useState<string>('');

  // Step 4: Product Search
  const [itemSearch, setItemSearch] = useState<string>('');

  // Step 5: Checkout
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CREDIT' | 'CHEQUE'>('CREDIT');
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [chequeDate, setChequeDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [checkoutSuccessOrder, setCheckoutSuccessOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add Customer Modal State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);

  // Finished Bills State
  const [finishedBills, setFinishedBills] = useState<Order[]>([]);
  const [loadingFinishedBills, setLoadingFinishedBills] = useState<boolean>(false);
  const [showFinishedBillsModal, setShowFinishedBillsModal] = useState<boolean>(false);
  const [billsSearch, setBillsSearch] = useState<string>('');
  const [billsFilter, setBillsFilter] = useState<'ALL' | 'CASH' | 'CREDIT' | 'CHEQUE'>('ALL');
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

  const loadFinishedBills = async (lorryIdToUse?: string) => {
    try {
      setLoadingFinishedBills(true);
      const targetLorry = lorryIdToUse || selectedLorryId || initialLorryId;
      const orders = await OrderService.getAll(
        undefined,
        targetLorry || undefined,
        undefined,
        150
      );
      setFinishedBills(orders);
    } catch (err) {
      console.error('Failed to load finished bills', err);
    } finally {
      setLoadingFinishedBills(false);
    }
  };

  // Targets Modal State
  const [showTargetModal, setShowTargetModal] = useState<boolean>(false);
  const [targetProgress, setTargetProgress] = useState<RepTargetProgress | null>(null);
  const [loadingTargets, setLoadingTargets] = useState<boolean>(false);

  const loadTargets = async (lorryIdToUse?: string) => {
    try {
      setLoadingTargets(true);
      const userFromStorage = (() => {
        try {
          const s = localStorage.getItem('distributor_auth_user');
          return s ? JSON.parse(s) : null;
        } catch {
          return null;
        }
      })();
      const activeUser = user || userFromStorage;
      const data = await AuthService.getMyTargets({
        userId: activeUser?.id,
        lorryId: lorryIdToUse || selectedLorryId || initialLorryId || activeUser?.lorryId
      });
      setTargetProgress(data);
    } catch (err) {
      console.error('Failed to load rep targets', err);
    } finally {
      setLoadingTargets(false);
    }
  };

  useEffect(() => {
    loadData();
    loadTargets();
    loadFinishedBills();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [custList, prodList, lorryList] = await Promise.all([
        CustomerService.getAll(),
        ProductService.getAll(),
        LorryService.getAll()
      ]);

      setCustomers(custList);
      setProducts(prodList.filter(p => !p.isRawMaterial));
      setLorries(lorryList);

      if (initialLorryId && lorryList.some(l => l.id === initialLorryId)) {
        setSelectedLorryId(initialLorryId);
        loadTargets(initialLorryId);
      } else if (lorryList.length > 0 && !selectedLorryId) {
        setSelectedLorryId(lorryList[0].id);
        loadTargets(lorryList[0].id);
      } else {
        loadTargets();
      }
    } catch (err) {
      console.error('Failed to load rep billing data', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedLorry = lorries.find(l => l.id === selectedLorryId);
  const lorryStockMap = useMemo(() => {
    const map = new Map<string, number>();
    if (selectedLorry && Array.isArray(selectedLorry.lorryStocks)) {
      selectedLorry.lorryStocks.forEach(s => map.set(s.productId, s.quantity));
    }
    return map;
  }, [selectedLorry]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // When customer changes, fetch unpaid bills
  useEffect(() => {
    if (selectedCustomerId) {
      CustomerService.getUnpaidBills(selectedCustomerId)
        .then(bills => {
          setCustomerUnpaidBills(bills);
          if (bills.length > 0 && bills[0]) {
            setBillingMethod('BILL_TO_BILL');
            const first = bills[0];
            const due = (first.balanceAmount ?? 0) > 0 ? (first.balanceAmount ?? 0) : Math.max(0, first.netTotal - (first.paidAmount || 0));
            setSettlePrevAmount(due.toString());
            setCollectPrevBill(true);
          } else {
            setBillingMethod('NORMAL');
            setSettlePrevAmount('');
            setCollectPrevBill(false);
          }
        })
        .catch(() => {
          setCustomerUnpaidBills([]);
          setBillingMethod('NORMAL');
          setSettlePrevAmount('');
          setCollectPrevBill(false);
        });

      const cust = customers.find(c => c.id === selectedCustomerId);
      if (cust && cust.creditLimit && cust.creditLimit > 0) {
        // Ready
      }
    }
  }, [selectedCustomerId]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const query = customerSearch.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(query) ||
      (c.phone && c.phone.toLowerCase().includes(query)) ||
      (c.code && c.code.toLowerCase().includes(query)) ||
      (c.deliveryAddress && c.deliveryAddress.toLowerCase().includes(query))
    );
  }, [customers, customerSearch]);

  // Distinct Brands
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) {
        brands.add(p.category.trim());
      }
    });
    return Array.from(brands).sort();
  }, [products]);

  // Brand products
  const brandProducts = useMemo(() => {
    if (!selectedBrand) return [];
    return products.filter(p => {
      const matchBrand = p.category.toLowerCase() === selectedBrand.toLowerCase();
      if (!matchBrand) return false;
      if (!itemSearch.trim()) return true;
      const q = itemSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
  }, [products, selectedBrand, itemSearch]);

  // Cart Management
  const addToCart = (product: Product, qty: number = 1) => {
    const lorryStock = lorryStockMap.get(product.id) ?? product.currentStock;
    const buyRatio = product.freeRatioBuy || 0;
    const getRatio = product.freeRatioGet || 0;
    const calcFree = (q: number) => (buyRatio > 0 && getRatio > 0 && q > 0 ? Math.floor(q / buyRatio) * getRatio : 0);

    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        const nextQty = existing.quantity + qty;
        if (nextQty <= 0) {
          return prev.filter(i => i.productId !== product.id);
        }
        return prev.map(i => i.productId === product.id ? { ...i, quantity: nextQty, freeQuantity: calcFree(nextQty) } : i);
      }
      const initialQty = Math.max(1, qty);
      return [
        ...prev,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          category: product.category,
          unit: product.unit,
          unitPrice: product.unitPrice,
          originalUnitPrice: product.unitPrice,
          availableStock: lorryStock,
          quantity: initialQty,
          freeQuantity: calcFree(initialQty),
          discountPercent: 0
        }
      ];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    const product = products.find(p => p.id === productId);
    const buyRatio = product?.freeRatioBuy || 0;
    const getRatio = product?.freeRatioGet || 0;
    const calcFree = (q: number) => (buyRatio > 0 && getRatio > 0 && q > 0 ? Math.floor(q / buyRatio) * getRatio : 0);

    setCart(prev =>
      prev
        .map(i => {
          if (i.productId === productId) {
            const next = i.quantity + delta;
            return next > 0 ? { ...i, quantity: next, freeQuantity: calcFree(next) } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const setCartItemQty = (productId: string, qty: number) => {
    const product = products.find(p => p.id === productId);
    const buyRatio = product?.freeRatioBuy || 0;
    const getRatio = product?.freeRatioGet || 0;
    const calcFree = (q: number) => (buyRatio > 0 && getRatio > 0 && q > 0 ? Math.floor(q / buyRatio) * getRatio : 0);

    setCart(prev =>
      prev.map(i => {
        if (i.productId === productId) {
          const safeQty = Math.max(0, qty);
          return {
            ...i,
            quantity: safeQty,
            freeQuantity: calcFree(safeQty)
          };
        }
        return i;
      })
    );
  };

  const removeCartItem = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  };

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const finalTotal = useMemo(() => {
    const discount = (cartSubtotal * (globalDiscountPercent || 0)) / 100;
    return Math.max(0, cartSubtotal - discount);
  }, [cartSubtotal, globalDiscountPercent]);

  // Finished Bills Filter & Summary
  const filteredFinishedBills = useMemo(() => {
    return finishedBills.filter(bill => {
      if (billsFilter !== 'ALL' && bill.paymentMethod !== billsFilter) {
        return false;
      }
      if (billsSearch.trim()) {
        const q = billsSearch.toLowerCase();
        const matchesSlip = (bill.paperBillNumber || '').toLowerCase().includes(q);
        const matchesOrder = bill.orderNumber.toLowerCase().includes(q);
        const matchesCust = (bill.customer?.name || '').toLowerCase().includes(q);
        const matchesShop = (bill.customer?.companyName || '').toLowerCase().includes(q);
        const matchesCode = (bill.customer?.code || '').toLowerCase().includes(q);
        const matchesPhone = (bill.customer?.phone || '').toLowerCase().includes(q);
        return matchesSlip || matchesOrder || matchesCust || matchesShop || matchesCode || matchesPhone;
      }
      return true;
    });
  }, [finishedBills, billsFilter, billsSearch]);

  const finishedBillsSummary = useMemo(() => {
    const totalBills = finishedBills.length;
    const totalValue = finishedBills.reduce((acc, b) => acc + (b.netTotal || 0), 0);
    const totalCash = finishedBills.reduce((acc, b) => acc + (b.cashReceived || 0), 0);
    const totalCredit = Math.max(0, totalValue - totalCash);
    const cashCount = finishedBills.filter(b => b.paymentMethod === 'CASH').length;
    const creditCount = finishedBills.filter(b => b.paymentMethod === 'CREDIT').length;
    return { totalBills, totalValue, totalCash, totalCredit, cashCount, creditCount };
  }, [finishedBills]);

  // Checkout submission
  const handleFinalCheckout = async () => {
    if (!selectedCustomerId) {
      setErrorMessage('Please select a customer first.');
      setCurrentStep(1);
      return;
    }
    if (cart.length === 0) {
      setErrorMessage('Please add at least one product to the cart.');
      setCurrentStep(3);
      return;
    }

    if (paymentMethod === 'CHEQUE') {
      if (!chequeNumber.trim()) {
        setErrorMessage('Please enter the Cheque Number.');
        return;
      }
      if (!bankName.trim()) {
        setErrorMessage('Please enter or select the Bank Name.');
        return;
      }
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const itemsPayload = cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        freeQuantity: item.freeQuantity || 0,
        unitPrice: item.unitPrice
      }));

      const previousBillsPayload =
        billingMethod === 'BILL_TO_BILL' && collectPrevBill && customerUnpaidBills.length > 0 && customerUnpaidBills[0]
          ? [
              {
                orderId: customerUnpaidBills[0].id,
                amount: parseFloat(settlePrevAmount) || 0,
                paymentMethod: paymentMethod === 'CREDIT' ? 'CASH' : paymentMethod
              }
            ]
          : [];

      const orderPayload: any = {
        customerId: selectedCustomerId,
        paymentMethod,
        items: itemsPayload,
        discountAmount: (cartSubtotal * (globalDiscountPercent || 0)) / 100,
        discountPercentage: globalDiscountPercent,
        notes: notes.trim() || undefined,
        settlePreviousBills: previousBillsPayload
      };

      if (paymentMethod === 'CHEQUE') {
        orderPayload.chequeNumber = chequeNumber.trim();
        orderPayload.bankName = bankName.trim();
        orderPayload.chequeDate = chequeDate || undefined;
      }

      let createdOrder: Order;
      if (selectedLorryId) {
        createdOrder = await LorryService.enterDriverBill(selectedLorryId, orderPayload);
      } else {
        createdOrder = await OrderService.create(orderPayload);
      }

      setCheckoutSuccessOrder(createdOrder);
      await Promise.all([
        loadTargets(selectedLorryId || undefined),
        loadFinishedBills(selectedLorryId || undefined)
      ]);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to complete bill.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartNewBill = () => {
    setCart([]);
    setSelectedCustomerId('');
    setBillingMethod('NORMAL');
    setCustomerUnpaidBills([]);
    setSettlePrevAmount('');
    setCollectPrevBill(false);
    setChequeNumber('');
    setBankName('');
    setChequeDate(new Date().toISOString().split('T')[0]);
    setCheckoutSuccessOrder(null);
    setCurrentStep(1);
    setCustomerSearch('');
    setItemSearch('');
    loadTargets(selectedLorryId || undefined);
    loadFinishedBills(selectedLorryId || undefined);
  };

  const stepLabels = ['Customer', 'Cart', 'Brand', 'Items', 'Checkout'];

  if (loading) {
    return (
      <div className="flex-1 min-h-[80vh] flex items-center justify-center text-slate-400 text-xs">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#F8FAFC] text-slate-900 select-none pb-20">
      {/* 1. SINGLE UNIFIED SLIM HEADER (50px) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            <Truck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-bold text-slate-900 truncate">
              {user?.fullName || 'Route Rep'}
            </h1>
            <p className="text-[10px] text-slate-500 font-medium truncate">
              {selectedLorry?.vehicleNumber || 'Route Lorry'} {selectedLorry?.route ? `• ${selectedLorry.route.code}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Rep Target & Goals Button */}
          <button
            type="button"
            onClick={() => {
              loadTargets();
              setShowTargetModal(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70 transition shadow-2xs active:scale-95 cursor-pointer shrink-0"
            title="View Daily & Monthly Sales Target Progress"
          >
            <Target className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] font-bold">Target</span>
            {targetProgress && (
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${
                targetProgress.dailyPercentage >= 100
                  ? 'bg-emerald-600 text-white'
                  : targetProgress.dailyPercentage > 0
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {targetProgress.dailyPercentage}%
              </span>
            )}
          </button>

          {/* Finished Bills History Button */}
          <button
            type="button"
            onClick={() => {
              loadFinishedBills();
              setShowFinishedBillsModal(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition shadow-2xs active:scale-95 cursor-pointer shrink-0"
            title="View Finished Sales Bills"
          >
            <Receipt className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px] font-bold">Bills</span>
            {finishedBills.length > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                {finishedBills.length}
              </span>
            )}
          </button>

          {/* Quick Cart Button */}
          <button
            onClick={() => setCurrentStep(2)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              cart.length > 0
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Cart ({totalItemsCount})</span>
          </button>

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. MINIMAL SLIM PROGRESS BAR (24px) */}
      <div className="bg-white border-b border-slate-200/60 px-4 py-2">
        <div className="max-w-2xl mx-auto flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
          <span className="text-blue-600 uppercase tracking-wider">
            {stepLabels[currentStep - 1]}
          </span>
          <span className="font-mono text-slate-400">Step {currentStep} / 5</span>
        </div>
        <div className="max-w-2xl mx-auto w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="max-w-2xl mx-auto w-full px-4 mt-3">
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-700 text-xs font-medium">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-500 font-bold ml-2">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 3. STEP VIEWS (Clean, Single Page, Minimal Text) */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-3">
        {/* ======================================================== */}
        {/* STEP 1: SELECT CUSTOMER */}
        {/* ======================================================== */}
        {currentStep === 1 && (
          <div className="space-y-3">
            {/* Rep Sales Target Goal Widget */}
            {user?.monthlyTarget && user.monthlyTarget > 0 ? (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-2.5 flex items-center justify-between text-xs shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-[11px]">Monthly Goal</span>
                    <span className="text-[10px] text-slate-500 font-medium">Daily: {formatMoney(user.dailyTarget || 0)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded-lg shadow-2xs border border-blue-100 text-xs inline-block">
                    {formatMoney(user.monthlyTarget)}
                  </span>
                  {user.targetNewClients ? (
                    <span className="block text-[9px] text-slate-400 font-medium mt-0.5">Target: {user.targetNewClients} new shops</span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Search Input & Quick (+) Add Customer Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Search customer name or phone..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold w-4 h-4 flex items-center justify-center cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition shrink-0 cursor-pointer"
                title="Add New Customer to Database"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span className="hidden sm:inline">Add Customer</span>
              </button>
            </div>

            {/* Empty State when no customer matches */}
            {filteredCustomers.length === 0 && (
              <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-2.5 my-2 shadow-2xs">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">No customer found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {customerSearch ? `No customer matches "${customerSearch}"` : 'Your customer list is empty'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Register New Customer</span>
                </button>
              </div>
            )}

            {/* Compact Customer List */}
            <div className="space-y-2 max-h-[58vh] overflow-y-auto pr-0.5">
              {filteredCustomers.map(customer => {
                const isSelected = customer.id === selectedCustomerId;
                const balance = customer.outstandingBalance || 0;
                const hasDue = balance > 0;

                return (
                  <div
                    key={customer.id}
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className={`cursor-pointer p-3 rounded-xl border transition flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {customer.name}
                        </span>
                        {customer.code && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {customer.code}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {customer.phone || customer.deliveryAddress || 'No phone'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {hasDue ? (
                        <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg font-mono">
                          Due: {formatMoney(balance)}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                          Clear
                        </span>
                      )}

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition ${
                          isSelected ? 'bg-blue-600 text-white' : 'border border-slate-300'
                        }`}
                      >
                        {isSelected && '✓'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Customer Inline Drawer (Only if selected) */}
            {selectedCustomer && (
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-xs animate-in fade-in">
                {/* Method Switcher */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingMethod('NORMAL')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition ${
                      billingMethod === 'NORMAL'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Normal Bill
                  </button>

                  <button
                    type="button"
                    onClick={() => setBillingMethod('BILL_TO_BILL')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                      billingMethod === 'BILL_TO_BILL'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>Bill-to-Bill</span>
                    {customerUnpaidBills.length > 0 && (
                      <span className="px-1.5 py-0.2 bg-white/20 text-[10px] rounded-full">
                        {customerUnpaidBills.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* If Bill-to-Bill: Simple Collection Row */}
                {billingMethod === 'BILL_TO_BILL' && customerUnpaidBills.length > 0 && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-2 text-xs">
                    <label className="flex items-center gap-1.5 font-bold text-amber-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={collectPrevBill}
                        onChange={e => setCollectPrevBill(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span>Collect Old Bill</span>
                    </label>

                    {collectPrevBill && (
                      <div className="flex items-center gap-1 font-mono">
                        <span className="text-slate-500 font-bold">Rs.</span>
                        <input
                          type="number"
                          value={settlePrevAmount}
                          onChange={e => setSettlePrevAmount(e.target.value)}
                          className="w-24 bg-white border border-slate-300 rounded px-2 py-1 text-right font-bold text-xs text-slate-900"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Next Step Button */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(cart.length > 0 ? 2 : 3)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
                >
                  <span>{cart.length > 0 ? 'Go to Cart' : 'Select Brand & Products'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: VIEW CART */}
        {/* ======================================================== */}
        {currentStep === 2 && (
          <div className="space-y-3">
            {cart.length === 0 ? (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">Cart is empty</p>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  + Add Products
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map(item => {
                  const lineTotal = item.unitPrice * item.quantity;
                  return (
                    <div
                      key={item.productId}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {formatMoney(item.unitPrice)} / {item.unit}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Stepper */}
                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.productId, -1)}
                            className="w-7 h-7 bg-white rounded flex items-center justify-center font-bold text-slate-700 shadow-2xs text-xs hover:bg-slate-50 active:scale-95 transition"
                            title="Decrease quantity"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                              setCartItemQty(item.productId, isNaN(val) ? 0 : Math.max(0, val));
                            }}
                            onBlur={() => {
                              if (!item.quantity || item.quantity <= 0) {
                                setCartItemQty(item.productId, 1);
                              }
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-11 h-7 bg-transparent text-center font-mono font-bold text-xs text-slate-900 focus:outline-none focus:bg-white focus:rounded focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.productId, 1)}
                            className="w-7 h-7 bg-white rounded flex items-center justify-center font-bold text-slate-700 shadow-2xs text-xs hover:bg-slate-50 active:scale-95 transition"
                            title="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        {/* Line Total */}
                        <span className="w-16 text-right font-mono font-bold text-xs text-slate-900">
                          {formatMoney(lineTotal)}
                        </span>

                        {/* Trash */}
                        <button
                          type="button"
                          onClick={() => removeCartItem(item.productId)}
                          className="p-1 text-slate-300 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Subtotal Bar */}
                <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between font-bold text-xs">
                  <span className="text-slate-600">Total ({totalItemsCount} items)</span>
                  <span className="font-mono text-sm text-blue-600">{formatMoney(cartSubtotal)}</span>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    + Add More
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(5)}
                    className="py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-xs flex items-center justify-center gap-1"
                  >
                    <span>Checkout</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 3: SELECT BRAND */}
        {/* ======================================================== */}
        {currentStep === 3 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              {availableBrands.map(brand => {
                const count = products.filter(p => p.category.toLowerCase() === brand.toLowerCase()).length;
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => {
                      setSelectedBrand(brand);
                      setItemSearch('');
                      setCurrentStep(4);
                    }}
                    className="p-3.5 bg-white border border-slate-200 hover:border-blue-500 rounded-xl text-left shadow-2xs flex flex-col justify-between h-24 active:scale-[0.98] transition"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-900 truncate">{brand}</h3>
                      <p className="text-[10px] text-slate-400 font-medium">{count} Items</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(cart.length > 0 ? 2 : 1)}
                className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600"
              >
                ← Back
              </button>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="py-2 px-3 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  View Cart ({totalItemsCount}) →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 4: SELECT ITEM FOR BRAND */}
        {/* ======================================================== */}
        {currentStep === 4 && (
          <div className="space-y-3">
            {/* Top Bar with Brand Badge & Search */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="text-xs font-bold text-blue-600 flex items-center gap-1 shrink-0"
              >
                ← Brands
              </button>
              <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg truncate">
                {selectedBrand}
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                placeholder={`Search ${selectedBrand}...`}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>

            {/* Products List */}
            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-0.5">
              {brandProducts.map(product => {
                const stock = lorryStockMap.get(product.id) ?? product.currentStock;
                const inCart = cart.find(i => i.productId === product.id);

                return (
                  <div
                    key={product.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{product.name}</h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        <span className="font-bold text-blue-600">{formatMoney(product.unitPrice)}</span>
                        <span className="ml-1 text-slate-400">• Stock: {stock}</span>
                      </p>
                    </div>

                    <div className="shrink-0">
                      {inCart ? (
                        <div className="flex items-center bg-blue-50 border border-blue-200 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => updateCartQty(product.id, -1)}
                            className="w-7 h-7 bg-white rounded flex items-center justify-center font-bold text-blue-700 text-xs shadow-2xs hover:bg-blue-100 active:scale-95 transition"
                            title="Decrease quantity"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={inCart.quantity === 0 ? '' : inCart.quantity}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                              setCartItemQty(product.id, isNaN(val) ? 0 : Math.max(0, val));
                            }}
                            onBlur={() => {
                              if (!inCart.quantity || inCart.quantity <= 0) {
                                setCartItemQty(product.id, 1);
                              }
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-11 h-7 bg-transparent text-center font-mono font-bold text-xs text-blue-900 focus:outline-none focus:bg-white focus:rounded focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => addToCart(product, 1)}
                            className="w-7 h-7 bg-blue-600 text-white rounded flex items-center justify-center font-bold text-xs shadow-2xs hover:bg-blue-700 active:scale-95 transition"
                            title="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(product, 1)}
                          className="py-1 px-3 bg-blue-600 text-white font-bold text-xs rounded-lg shadow-xs hover:bg-blue-700 active:scale-95 transition"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sticky Bottom Actions */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="py-2.5 px-3.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
              >
                ← Other Brands
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={cart.length === 0}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <span>View Cart ({totalItemsCount})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 5: FINAL CHECKOUT */}
        {/* ======================================================== */}
        {currentStep === 5 && (
          <div className="space-y-3">
            {/* Customer Pill */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Customer</p>
                <h3 className="text-xs font-bold text-slate-900">{selectedCustomer?.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-[11px] rounded-lg"
              >
                + Add Product
              </button>
            </div>

            {/* Items Summary Table */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase pb-1 border-b border-slate-100 flex justify-between">
                <span>Items ({cart.length})</span>
                <span>Price</span>
              </div>

              {cart.map(item => (
                <div key={item.productId} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-slate-800 font-medium truncate pr-2">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-mono font-bold text-slate-900 shrink-0">
                    {formatMoney(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Payment Method</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['CASH', 'CREDIT', 'CHEQUE'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 rounded-lg text-xs font-bold transition ${
                      paymentMethod === m
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Cheque Details Card */}
            {paymentMethod === 'CHEQUE' && (
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2.5 animate-fadeIn shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                    Customer Cheque Details
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold bg-white px-2 py-0.5 rounded-md border border-blue-200">
                    Wired to Admin
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">
                      Cheque Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      placeholder="e.g. 049182"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">
                      Cheque Maturity Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Enter or select bank..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-1.5"
                  />
                  {/* Quick Bank Chips */}
                  <div className="flex flex-wrap gap-1">
                    {['Commercial Bank', 'BOC', 'Sampath Bank', 'HNB', "People's Bank", 'Seylan Bank', 'NDB'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBankName(b)}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                          bankName === b
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Final Total Card */}
            <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Final Amount</span>
                <span className="font-mono text-xl font-bold text-white">{formatMoney(finalTotal)}</span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-800 rounded text-blue-400">
                {paymentMethod}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinalCheckout}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-[0.99] transition disabled:opacity-60"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing Bill...</span>
                </span>
              ) : (
                <>
                  <span>Confirm & Issue Bill</span>
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* SUCCESS MODAL POPUP */}
      {checkoutSuccessOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 text-center border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-0.5">Bill Issued Successfully!</h3>
            <p className="text-xs text-slate-500 font-mono mb-2">
              #{checkoutSuccessOrder.paperBillNumber || checkoutSuccessOrder.orderNumber} • {formatMoney(checkoutSuccessOrder.netTotal)}
            </p>
            {checkoutSuccessOrder.paymentMethod === 'CHEQUE' && (
              <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-xl text-left text-[11px] text-blue-900 font-mono flex items-center justify-between">
                <span>Cheque: #{checkoutSuccessOrder.chequeNumber || 'N/A'}</span>
                <span className="font-sans font-bold text-blue-700">{checkoutSuccessOrder.bankName || 'Cheque Payment'}</span>
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onViewInvoice?.(checkoutSuccessOrder)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print 80mm Receipt Slip</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  loadFinishedBills();
                  setShowFinishedBillsModal(true);
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5 text-blue-600" />
                <span>View All Finished Bills ({finishedBills.length})</span>
              </button>

              <button
                type="button"
                onClick={handleStartNewBill}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Next Customer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REP TARGETS & GOALS MODAL POPUP */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-2xs">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Sales Targets & Performance
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {targetProgress?.repName || user?.fullName || 'Sales Rep'} • {selectedLorry?.vehicleNumber || 'Route Van'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTargetModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingTargets && !targetProgress ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Calculating performance...
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* 1. TODAY'S DAILY TARGET CARD */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 to-orange-50/50 border border-amber-200/80 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amber-600" />
                      <span className="font-bold text-xs text-amber-950 uppercase tracking-wider">
                        Today's Target
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-900 bg-white px-2 py-0.5 rounded-lg border border-amber-200 shadow-2xs">
                      Goal: {formatMoney(targetProgress?.dailyTarget || 0)}
                    </span>
                  </div>

                  {/* Daily Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-amber-200/70 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (targetProgress?.dailyPercentage || 0) >= 100
                            ? 'bg-emerald-500'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500'
                        }`}
                        style={{ width: `${Math.min(100, targetProgress?.dailyPercentage || 0)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                      <span>
                        Achieved Today: <strong className="text-slate-900">{formatMoney(targetProgress?.achievedToday || 0)}</strong>
                      </span>
                      <span className={(targetProgress?.dailyPercentage || 0) >= 100 ? 'text-emerald-700 font-bold' : 'text-amber-800 font-bold'}>
                        {targetProgress?.dailyPercentage || 0}%
                      </span>
                    </div>
                  </div>

                  {/* Daily Sub-stats */}
                  <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Today's Bills: <strong className="text-slate-800">{targetProgress?.todayBillsCount || 0}</strong></span>
                    {(targetProgress?.dailyRemaining || 0) > 0 ? (
                      <span className="text-amber-700 font-medium">To Goal: <strong>{formatMoney(targetProgress?.dailyRemaining || 0)}</strong></span>
                    ) : (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Target Reached!
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. MONTHLY TARGET CARD */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-blue-50/50 border border-indigo-200/80 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-xs text-indigo-950 uppercase tracking-wider">
                        Monthly Target
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-900 bg-white px-2 py-0.5 rounded-lg border border-indigo-200 shadow-2xs">
                      Goal: {formatMoney(targetProgress?.monthlyTarget || 0)}
                    </span>
                  </div>

                  {/* Monthly Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-indigo-200/70 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (targetProgress?.monthlyPercentage || 0) >= 100
                            ? 'bg-emerald-500'
                            : (targetProgress?.monthlyPercentage || 0) >= 50
                            ? 'bg-indigo-600'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, targetProgress?.monthlyPercentage || 0)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                      <span>
                        Billed This Month: <strong className="text-slate-900">{formatMoney(targetProgress?.achievedMonth || 0)}</strong>
                      </span>
                      <span className={(targetProgress?.monthlyPercentage || 0) >= 100 ? 'text-emerald-700 font-bold' : 'text-indigo-800 font-bold'}>
                        {targetProgress?.monthlyPercentage || 0}%
                      </span>
                    </div>
                  </div>

                  {/* Monthly Sub-stats */}
                  <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Month Invoices: <strong className="text-slate-800">{targetProgress?.monthBillsCount || 0}</strong></span>
                    {(targetProgress?.monthlyRemaining || 0) > 0 ? (
                      <span className="text-indigo-700 font-medium">To Goal: <strong>{formatMoney(targetProgress?.monthlyRemaining || 0)}</strong></span>
                    ) : (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-emerald-600" /> Target Smashed!
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. NEW CLIENTS TARGET (IF CONFIGURED) */}
                {Boolean(targetProgress?.targetNewClients && targetProgress.targetNewClients > 0) && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-slate-700">New Retail Outlets Target</span>
                    </div>
                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 font-mono text-[11px]">
                      {targetProgress?.targetNewClients} shops / month
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowTargetModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
            >
              Close & Return to Billing
            </button>
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL FOR REP */}
      <CustomerModal
        customer={null}
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        defaultRouteId={selectedLorry?.routeId || user?.lorry?.routeId || undefined}
        onSaved={async (newCust) => {
          try {
            const updatedList = await CustomerService.getAll();
            setCustomers(updatedList);
            if (newCust?.id) {
              setSelectedCustomerId(newCust.id);
              setCustomerSearch('');
            }
            loadTargets();
          } catch (e) {
            console.error('Failed to reload customers', e);
          }
        }}
      />

      {/* FINISHED BILLS HISTORY MODAL (MINIMAL, NEAT, CLEAN) */}
      {showFinishedBillsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Finished Sales Bills
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedLorry?.vehicleNumber || 'Route Lorry'} • {finishedBills.length} Total Bills
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => loadFinishedBills()}
                  disabled={loadingFinishedBills}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                  title="Refresh bills"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingFinishedBills ? 'animate-spin text-blue-600' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowFinishedBillsModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Top KPI Metrics Strip (Minimal, clean, neat) */}
            <div className="grid grid-cols-3 gap-2 p-3 sm:px-5 bg-slate-50/80 border-b border-slate-100 text-center shrink-0">
              <div className="p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Sales</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-slate-900">{formatMoney(finishedBillsSummary.totalValue)}</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">Cash Collected</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-emerald-700">{formatMoney(finishedBillsSummary.totalCash)}</span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-amber-600 block tracking-wider">Credit Given</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-amber-700">{formatMoney(finishedBillsSummary.totalCredit)}</span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-3 sm:px-5 border-b border-slate-100 space-y-2 bg-white shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={billsSearch}
                  onChange={(e) => setBillsSearch(e.target.value)}
                  placeholder="Search by customer, shop, slip #, or amount..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {billsSearch && (
                  <button
                    onClick={() => setBillsSearch('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Payment Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {(['ALL', 'CASH', 'CREDIT', 'CHEQUE'] as const).map(tab => {
                  const count = tab === 'ALL'
                    ? finishedBills.length
                    : finishedBills.filter(b => b.paymentMethod === tab).length;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setBillsFilter(tab)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                        billsFilter === tab
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>{tab === 'ALL' ? 'All Bills' : tab}</span>
                      <span className={`text-[10px] font-mono px-1 rounded-full ${
                        billsFilter === tab ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Finished Bills Scrollable List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5 bg-slate-50/50">
              {loadingFinishedBills && finishedBills.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Loading finished bills...</span>
                </div>
              ) : filteredFinishedBills.length === 0 ? (
                <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 p-6 space-y-2">
                  <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No finished bills found</p>
                  <p className="text-[11px] text-slate-400">
                    {billsSearch || billsFilter !== 'ALL'
                      ? 'No bills match your active search or filter.'
                      : 'Completed sales bills will appear here with full line details and reprint options.'}
                  </p>
                </div>
              ) : (
                filteredFinishedBills.map(bill => {
                  const isExpanded = expandedBillId === bill.id;
                  const totalItemsQty = bill.items.reduce((acc, i) => acc + i.quantity, 0);
                  const totalFreeQty = bill.items.reduce((acc, i) => acc + (i.freeQuantity || 0), 0);
                  const creditDue = Math.max(0, bill.netTotal - (bill.cashReceived || 0));

                  return (
                    <div
                      key={bill.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs hover:border-slate-300 transition space-y-2.5"
                    >
                      {/* Top Row: Slip #, Time & Net Total */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/60">
                              #{bill.paperBillNumber || bill.orderNumber}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              bill.paymentMethod === 'CASH'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : bill.paymentMethod === 'CREDIT'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                                : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                            }`}>
                              {bill.paymentMethod}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-1">
                            {new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(bill.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-sm sm:text-base text-slate-900 block">
                            {formatMoney(bill.netTotal)}
                          </span>
                          {creditDue > 0 ? (
                            <span className="text-[10px] font-bold text-rose-600 font-mono">
                              Due: {formatMoney(creditDue)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-600">
                              Paid in full
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Customer Row */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 truncate">
                            {bill.customer.name}
                            {bill.customer.code ? (
                              <span className="text-[10px] text-slate-400 font-mono font-normal ml-1">
                                [{bill.customer.code}]
                              </span>
                            ) : null}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {bill.customer.companyName || bill.customer.deliveryAddress || bill.customer.city || 'Standard Outlet'}
                          </p>
                        </div>
                      </div>

                      {/* Items Summary & Expand Trigger */}
                      <div className="bg-slate-50/80 rounded-xl p-2 flex items-center justify-between text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-semibold text-slate-800">{bill.items.length} Products</span>
                          <span>•</span>
                          <span>{totalItemsQty} units</span>
                          {totalFreeQty > 0 && (
                            <span className="text-emerald-700 font-bold bg-emerald-100/70 px-1.5 py-0.2 rounded text-[10px]">
                              +{totalFreeQty} Free
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedBillId(isExpanded ? null : bill.id)}
                          className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5 shrink-0 ml-2 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide' : 'Items'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Expanded Items Breakdown */}
                      {isExpanded && (
                        <div className="border border-slate-200/60 rounded-xl p-2.5 bg-white space-y-1.5 text-xs animate-in fade-in">
                          <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
                            <span>Item Name</span>
                            <span>Line Total</span>
                          </div>
                          {bill.items.map(item => (
                            <div key={item.id} className="flex justify-between text-[11px] leading-tight">
                              <div className="min-w-0 pr-2">
                                <span className="font-medium text-slate-800 block truncate">{item.product.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {item.quantity} {item.product.unit || 'pcs'} x {formatMoney(item.unitPrice)}
                                  {item.freeQuantity > 0 && (
                                    <span className="text-emerald-600 font-bold ml-1">+{item.freeQuantity} Free</span>
                                  )}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-slate-800 shrink-0">
                                {formatMoney(item.lineTotal)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons: 1-Tap 80mm Print */}
                      <div className="pt-1 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onViewInvoice?.(bill);
                          }}
                          className="flex-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/70 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>View & Print 80mm Receipt</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setShowFinishedBillsModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
