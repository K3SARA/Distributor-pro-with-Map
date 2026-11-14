import React, { useState, useEffect } from 'react';
import {
  Building2,
  Package,
  Truck,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Send,
  Plus,
  Compass,
  DollarSign,
  Layers,
  MapPin,
  Clock,
  Phone,
  Mail,
  CheckCircle2,
  Calendar,
  ChevronRight,
  Award,
  X
} from 'lucide-react';
import { EnterpriseSupplierService, SupplierPortalDashboardData, ProductService } from '../services/api';
import { User, Supplier } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { DistributorPerformance } from './DistributorPerformance';

interface SupplierPortalProps {
  user: User;
  onLogout: () => void;
}

export const SupplierPortal: React.FC<SupplierPortalProps> = ({ user, onLogout }) => {
  const { formatMoney } = useCurrency();
  const [data, setData] = useState<SupplierPortalDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FLEET' | 'PRODUCTS' | 'DISPATCHES' | 'PERFORMANCE'>('OVERVIEW');
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(user.supplierId || '');

  // Dispatch Stock Modal State
  const [showDispatchModal, setShowDispatchModal] = useState<boolean>(false);
  const [dispatchItems, setDispatchItems] = useState<Array<{ productId: string; quantity: number; freeQuantity: number; costPrice: number }>>([]);
  const [dispatchInvoiceNumber, setDispatchInvoiceNumber] = useState<string>('');
  const [dispatchNotes, setDispatchNotes] = useState<string>('');
  const [submittingDispatch, setSubmittingDispatch] = useState<boolean>(false);
  const [dispatchSuccessToast, setDispatchSuccessToast] = useState<string | null>(null);

  // Add Product to Supplier Catalog Modal State
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [newProdSku, setNewProdSku] = useState<string>('');
  const [newProdBarcode, setNewProdBarcode] = useState<string>('');
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdCategory, setNewProdCategory] = useState<string>('General');
  const [newProdUnit, setNewProdUnit] = useState<string>('Case');
  const [newProdWholesale, setNewProdWholesale] = useState<string>('');
  const [newProdRetail, setNewProdRetail] = useState<string>('');
  const [newProdMinStock, setNewProdMinStock] = useState<string>('10');
  const [submittingProduct, setSubmittingProduct] = useState<boolean>(false);

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.supplier?.id) return;
    if (!newProdName.trim() || !newProdSku.trim() || !newProdRetail) {
      alert('SKU, Name and Retail Selling Price are required.');
      return;
    }
    try {
      setSubmittingProduct(true);
      await ProductService.create({
        sku: newProdSku.trim().toUpperCase(),
        barcode: newProdBarcode.trim() || undefined,
        name: newProdName.trim(),
        category: newProdCategory.trim() || 'General',
        unit: newProdUnit.trim() || 'Unit',
        unitPrice: parseFloat(newProdRetail),
        costPrice: parseFloat(newProdWholesale || '0'),
        minStockAlert: parseInt(newProdMinStock || '10', 10),
        supplierId: data.supplier.id
      });
      setShowAddProductModal(false);
      const createdName = newProdName;
      setNewProdSku('');
      setNewProdBarcode('');
      setNewProdName('');
      setNewProdWholesale('');
      setNewProdRetail('');
      setDispatchSuccessToast(`✅ Product "${createdName}" successfully added to ${data.supplier.name}!`);
      setTimeout(() => setDispatchSuccessToast(null), 5000);
      loadData(data.supplier.id);
    } catch (err: any) {
      alert(`Failed to add product: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmittingProduct(false);
    }
  };

  const loadData = async (supId?: string) => {
    try {
      setLoading(true);
      const [dashData, supList] = await Promise.all([
        EnterpriseSupplierService.getDashboard(supId || selectedSupplierId || undefined),
        EnterpriseSupplierService.getSuppliers()
      ]);
      setData(dashData);
      setSuppliersList(supList);
      if (!selectedSupplierId && dashData.supplier) {
        setSelectedSupplierId(dashData.supplier.id);
      }
    } catch (err) {
      console.error('[Supplier Portal] Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(selectedSupplierId || undefined), 30000);
    return () => clearInterval(interval);
  }, [selectedSupplierId]);

  const handleOpenDispatchModal = () => {
    if (data?.products && data.products.length > 0) {
      setDispatchItems([
        {
          productId: data.products[0].id,
          quantity: 50,
          freeQuantity: 0,
          costPrice: data.products[0].costPrice || data.products[0].unitPrice * 0.8
        }
      ]);
    }
    setDispatchInvoiceNumber(`INV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`);
    setDispatchNotes('');
    setShowDispatchModal(true);
  };

  const handleAddDispatchLine = () => {
    if (!data?.products || data.products.length === 0) return;
    setDispatchItems(prev => [
      ...prev,
      {
        productId: data.products[0].id,
        quantity: 20,
        freeQuantity: 0,
        costPrice: data.products[0].costPrice || 0
      }
    ]);
  };

  const handleRemoveDispatchLine = (idx: number) => {
    setDispatchItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.supplier?.id) return;
    if (dispatchItems.length === 0) {
      alert('Please add at least one product to dispatch.');
      return;
    }

    try {
      setSubmittingDispatch(true);
      await EnterpriseSupplierService.dispatchStock({
        supplierId: data.supplier.id,
        items: dispatchItems,
        supplierInvoiceNumber: dispatchInvoiceNumber,
        notes: dispatchNotes
      });
      setShowDispatchModal(false);
      setDispatchSuccessToast('✅ Stock shipment successfully dispatched to Distributor Warehouse!');
      setTimeout(() => setDispatchSuccessToast(null), 5000);
      loadData(data.supplier.id);
    } catch (err: any) {
      alert(`Dispatch failed: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmittingDispatch(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans select-none overflow-x-hidden">
      {/* 1. TOP EXECUTIVE HEADER */}
      <header className="sticky top-0 z-30 bg-slate-950 text-white border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {data?.supplier?.name || 'FMCG Supplier Portal'}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-900/60 text-blue-300 border border-blue-500/40">
                Tier 1 Principal
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Supplying to Samantha Distributor Agency &bull; {data?.supplier?.city || 'Sri Lanka'}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {suppliersList.length > 1 && (
            <select
              value={selectedSupplierId}
              onChange={e => setSelectedSupplierId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              {suppliersList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleOpenDispatchModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dispatch Stock</span>
          </button>

          <button
            type="button"
            onClick={() => loadData(selectedSupplierId || undefined)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-200">{user.fullName}</span>
            <span className="text-[10px] text-slate-400 font-mono">SUPPLIER ADMIN</span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* SUCCESS TOAST */}
      {dispatchSuccessToast && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{dispatchSuccessToast}</span>
        </div>
      )}

      {/* 2. TAB NAVIGATION BAR */}
      <div className="bg-white border-b border-slate-200/90 px-4 sm:px-8 py-2 flex items-center justify-between overflow-x-auto gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Executive Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FLEET')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'FLEET'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Live Fleet Radar ({data?.lorries?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PRODUCTS')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'PRODUCTS'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Product Catalog & Stock ({data?.products?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DISPATCHES')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'DISPATCHES'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Supply Dispatches (GRN)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PERFORMANCE')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'PERFORMANCE'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Distributor Performance</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time Sync with Distributor ERP</span>
        </div>
      </div>

      {/* 3. MAIN PORTAL BODY */}
      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* ======================================================== */}
        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {/* ======================================================== */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            {/* Top 4 Key Performance Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Today's Sales */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Sales</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                    {formatMoney(data?.stats?.todaySales || 0)}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">Generated by agency lorries today</p>
                </div>
              </div>

              {/* Month to Date Sales */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Month-to-Date</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                    {formatMoney(data?.stats?.monthSales || 0)}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">Total revenue this month</p>
                </div>
              </div>

              {/* Warehouse + Floating Stock */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Stock on Ground</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                      {(data?.stats?.totalWarehouseStock || 0) + (data?.stats?.totalFloatingStock || 0)}
                    </span>
                    <span className="text-xs font-bold text-slate-500">Units</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {data?.stats?.totalWarehouseStock || 0} in Warehouse &bull; {data?.stats?.totalFloatingStock || 0} in Lorries
                  </p>
                </div>
              </div>

              {/* Outstanding Balance Owed */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Distributor Dues</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-xl sm:text-2xl font-black text-amber-600 font-mono">
                    {formatMoney(data?.stats?.outstandingBalance || 0)}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Terms: {data?.supplier?.paymentTerms || 'NET 30'}
                  </p>
                </div>
              </div>
            </div>

            {/* Split Grid: Connected Agency Status & Top Selling Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Connected Distributor Agency Card */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-slate-900">Assigned Distributor Agency</h2>
                      <p className="text-[10px] text-slate-500">Tier 2 Authorized Distribution Partner</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active ERP
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block text-[10px] uppercase">Agency Name</span>
                    <span className="font-bold text-slate-900 text-sm">Samantha Distributor (Pvt) Ltd</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 font-medium block text-[10px] uppercase">Territory</span>
                      <span className="font-semibold text-slate-800">Colombo & Western Province</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block text-[10px] uppercase">Active Fleet</span>
                      <span className="font-semibold text-slate-800">{data?.lorries?.length || 0} Delivery Lorries</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block text-[10px] uppercase">Supplier SKUs Stocked</span>
                    <span className="font-semibold text-slate-800">{data?.products?.length || 0} Products Managed</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleOpenDispatchModal}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Stock Dispatch (GRN)</span>
                  </button>
                </div>
              </div>

              {/* Top Selling Supplier Products */}
              <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-xs font-bold text-slate-900">Top Selling Products in Market</h2>
                    <p className="text-[10px] text-slate-500">Fastest selling items based on completed lorry delivery invoices</p>
                  </div>
                  <span className="text-[11px] font-bold text-blue-600 cursor-pointer" onClick={() => setActiveTab('PRODUCTS')}>
                    View All &rarr;
                  </span>
                </div>

                {data?.topSelling && data.topSelling.length > 0 ? (
                  <div className="space-y-3">
                    {data.topSelling.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">{item.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">SKU: {item.sku} &bull; {item.unitsSold} units delivered</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900 font-mono block">{formatMoney(item.totalRevenue)}</span>
                          <span className="text-[10px] text-emerald-600 font-bold">Revenue</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No sales recorded for this supplier's products yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: LIVE FLEET RADAR */}
        {/* ======================================================== */}
        {activeTab === 'FLEET' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Distributor Lorries Live GPS Radar</h2>
                <p className="text-xs text-slate-500">Real-time GPS positions of lorries carrying your brand's stock</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{data?.lorries?.length || 0} Lorries Active</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.lorries && data.lorries.length > 0 ? (
                data.lorries.map(lorry => (
                  <div key={lorry.id} className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-blue-400 transition space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{lorry.vehicleNumber}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{lorry.routeName}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        lorry.currentLatitude ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {lorry.currentLatitude ? 'LIVE GPS' : 'STATIONARY'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Driver / Rep</span>
                        <span className="font-semibold text-slate-800">{lorry.driverName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Your Stock Loaded</span>
                        <span className="font-bold text-blue-700">{lorry.supplierUnitsOnBoard} units</span>
                      </div>
                    </div>

                    {lorry.currentLatitude && lorry.currentLongitude ? (
                      <div className="text-[11px] text-slate-600 flex items-center justify-between">
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span>{lorry.currentLatitude.toFixed(4)}, {lorry.currentLongitude.toFixed(4)}</span>
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${lorry.currentLatitude},${lorry.currentLongitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline font-bold text-[11px]"
                        >
                          View Map &rarr;
                        </a>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No GPS coordinates broadcasted yet</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-3 py-12 text-center text-slate-400 text-xs">
                  No delivery lorries found.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PRODUCT CATALOG & STOCK */}
        {/* ======================================================== */}
        {activeTab === 'PRODUCTS' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Supplier Master Catalog & Stock Levels</h2>
                <p className="text-xs text-slate-500">Products supplied to Samantha Distributor Agency</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-slate-800 transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product to Brand</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenDispatchModal}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-blue-500 transition cursor-pointer shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Stock</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">SKU / Product</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Wholesale Cost</th>
                      <th className="py-3 px-4 text-right">Retail Price</th>
                      <th className="py-3 px-4 text-center">Warehouse Stock</th>
                      <th className="py-3 px-4 text-center">Lorry Stock</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.products && data.products.length > 0 ? (
                      data.products.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{p.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{p.category}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">{formatMoney(p.costPrice)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatMoney(p.unitPrice)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-mono font-black ${p.currentStock <= p.minStockAlert ? 'text-rose-600' : 'text-slate-800'}`}>
                              {p.currentStock}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-blue-700">
                            {data?.lorries?.reduce((acc, l) => acc + (l.supplierUnitsOnBoard || 0), 0) || 0}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {p.currentStock <= p.minStockAlert ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Low Stock ({p.currentStock})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Healthy
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                          No products found for this supplier.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: SUPPLY DISPATCHES */}
        {/* ======================================================== */}
        {activeTab === 'DISPATCHES' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Supply Shipments & Dispatches (GRN)</h2>
                <p className="text-xs text-slate-500">History of goods delivered to Samantha Distributor Warehouse</p>
              </div>
              <button
                type="button"
                onClick={handleOpenDispatchModal}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-blue-500 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Stock Dispatch</span>
              </button>
            </div>

            <div className="space-y-3">
              {data?.recentDispatches && data.recentDispatches.length > 0 ? (
                data.recentDispatches.map(po => (
                  <div key={po.id} className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 font-mono">{po.orderNumber}</span>
                        <p className="text-[10px] text-slate-500">
                          Invoice: {po.supplierInvoiceNumber || 'N/A'} &bull; {new Date(po.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900 font-mono block">{formatMoney(po.totalAmount)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          po.status === 'RECEIVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {po.status}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-2 text-xs space-y-1">
                      {po.items && po.items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-slate-600 text-[11px]">
                          <span>{item.product?.name || item.productId}</span>
                          <span className="font-mono">{item.quantity} units &bull; {formatMoney(item.lineTotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No dispatch records found.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: DISTRIBUTOR PERFORMANCE ANALYTICS */}
        {/* ======================================================== */}
        {activeTab === 'PERFORMANCE' && (
          <DistributorPerformance />
        )}
      </main>

      {/* 4. DISPATCH STOCK MODAL */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Dispatch Stock to Distributor</h3>
                  <p className="text-[11px] text-slate-500">Adds stock directly to Samantha Distributor Central Warehouse</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDispatchModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold hover:bg-slate-300 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDispatchSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Supplier Bill / Invoice #</label>
                  <input
                    type="text"
                    value={dispatchInvoiceNumber}
                    onChange={e => setDispatchInvoiceNumber(e.target.value)}
                    required
                    placeholder="e.g. INV-9821"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Distributor Agency</label>
                  <input
                    type="text"
                    value="Samantha Distributor Agency"
                    disabled
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Shipment Items</span>
                  <button
                    type="button"
                    onClick={handleAddDispatchLine}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    + Add Product Line
                  </button>
                </div>

                {dispatchItems.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-12 gap-2 items-center text-xs">
                    <div className="col-span-6">
                      <label className="text-[10px] text-slate-500 block">Product</label>
                      <select
                        value={item.productId}
                        onChange={e => {
                          const pId = e.target.value;
                          const selectedP = data?.products.find(p => p.id === pId);
                          setDispatchItems(prev => prev.map((it, i) => i === idx ? {
                            ...it,
                            productId: pId,
                            costPrice: selectedP?.costPrice || it.costPrice
                          } : it));
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-semibold"
                      >
                        {data?.products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <label className="text-[10px] text-slate-500 block">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => {
                          const val = Number(e.target.value) || 0;
                          setDispatchItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold font-mono"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-500 block">Cost</label>
                      <input
                        type="number"
                        min="0"
                        value={item.costPrice}
                        onChange={e => {
                          const val = Number(e.target.value) || 0;
                          setDispatchItems(prev => prev.map((it, i) => i === idx ? { ...it, costPrice: val } : it));
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold font-mono"
                      />
                    </div>

                    <div className="col-span-1 text-center pt-3">
                      {dispatchItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDispatchLine(idx)}
                          className="text-rose-500 hover:text-rose-700 font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Dispatch Notes / Shipping Info</label>
                <textarea
                  value={dispatchNotes}
                  onChange={e => setDispatchNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Sent via Lorry #42. Driver handed over to warehouse."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingDispatch}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {submittingDispatch ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Dispatching Stock to Distributor...</span>
                    </>
                  ) : (
                    <span>Confirm Dispatch & Stock In</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. ADD NEW PRODUCT TO BRAND MODAL */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Product to Brand</h3>
                  <p className="text-[11px] text-slate-500">{data?.supplier?.name || 'Supplier Master Catalog'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold hover:bg-slate-300 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProductSubmit} className="p-5 space-y-3.5 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">SKU / Code *</label>
                  <input
                    type="text"
                    required
                    value={newProdSku}
                    onChange={e => setNewProdSku(e.target.value.toUpperCase())}
                    placeholder="e.g. BEV-010"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Barcode (EAN-13)</label>
                  <input
                    type="text"
                    value={newProdBarcode}
                    onChange={e => setNewProdBarcode(e.target.value)}
                    placeholder="e.g. 4792019901"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  placeholder="e.g. Ceylon Earl Grey Tea 500g"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Category</label>
                  <input
                    type="text"
                    value={newProdCategory}
                    onChange={e => setNewProdCategory(e.target.value)}
                    placeholder="e.g. Tea / Beverages"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Unit Type</label>
                  <select
                    value={newProdUnit}
                    onChange={e => setNewProdUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                  >
                    <option value="Case">Case</option>
                    <option value="Box">Box</option>
                    <option value="Pack">Pack</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Unit">Unit / Piece</option>
                    <option value="Kg">Kg</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Wholesale Supply Cost (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newProdWholesale}
                    onChange={e => setNewProdWholesale(e.target.value)}
                    placeholder="Price charged to agency"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Retail Selling Price (Rs.) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={newProdRetail}
                    onChange={e => setNewProdRetail(e.target.value)}
                    placeholder="Price charged to shops"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-blue-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Low Stock Warning Alert Threshold</label>
                <input
                  type="number"
                  min="1"
                  value={newProdMinStock}
                  onChange={e => setNewProdMinStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingProduct}
                  className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {submittingProduct ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Product to Brand...</span>
                    </>
                  ) : (
                    <span>Add SKU to Brand Catalog</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

