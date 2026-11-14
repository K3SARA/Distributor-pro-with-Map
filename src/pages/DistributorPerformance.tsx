import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Truck,
  Download,
  Printer,
  Search,
  RefreshCw,
  CreditCard,
  PackageCheck,
  ShieldAlert,
  Layers,
  Store,
  ChevronRight,
  Target,
  Sparkles,
  Phone,
  FileText
} from 'lucide-react';
import { DistributorPerformanceService, DistributorPerformanceData } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

type ActiveViewTab = 'OVERVIEW' | 'ROUTES' | 'REPS' | 'CREDIT' | 'PRODUCTS';

export const DistributorPerformance: React.FC = () => {
  const { formatMoney } = useCurrency();
  const [data, setData] = useState<DistributorPerformanceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [timeframe, setTimeframe] = useState<string>('month');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<ActiveViewTab>('OVERVIEW');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadPerformanceData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await DistributorPerformanceService.getPerformance({
        timeframe,
        routeId: selectedRouteId !== 'ALL' ? selectedRouteId : undefined
      });
      setData(res);
    } catch (err) {
      console.error('[DistributorPerformance] Error loading analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPerformanceData();
  }, [timeframe, selectedRouteId]);

  const handlePrint = () => {
    window.print();
  };

  // Helper for performance badge
  const renderStatusBadge = (status: 'TOP_PERFORMER' | 'ON_TRACK' | 'NEEDS_ATTENTION') => {
    if (status === 'TOP_PERFORMER') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Sparkles className="w-3 h-3 text-emerald-600" /> Top Performer
        </span>
      );
    }
    if (status === 'ON_TRACK') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <CheckCircle2 className="w-3 h-3 text-blue-600" /> On Track
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <AlertTriangle className="w-3 h-3 text-amber-600" /> Needs Attention
      </span>
    );
  };

  if (loading && !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-semibold tracking-wide text-slate-700">Loading Distributor Performance Analytics...</p>
        <p className="text-xs text-slate-400 mt-1">Calculating sales velocity, targets, and territory metrics</p>
      </div>
    );
  }

  const summary = data?.summary;
  const maxDaySales = Math.max(...(data?.timeSeries?.map(t => t.sales) || [100]));

  return (
    <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 pb-20 print:p-0 print:space-y-4">
      {/* 1. Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 shadow-xs print:border-none print:shadow-none print:p-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Distributor Performance Analytics
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                  Enterprise
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium">
                Comprehensive operational KPIs, territory velocity, and credit health scorecard
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          {/* Timeframe Selector Pill */}
          <div className="bg-slate-100/90 p-1 rounded-2xl flex items-center text-xs font-semibold border border-slate-200/60">
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: '7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'year', label: 'This Year' }
            ].map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  timeframe === tf.id
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Route Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-2xl px-3.5 py-2 pr-8 hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition shadow-2xs"
            >
              <option value="ALL">All Routes (National Fleet)</option>
              {data?.routes.map(r => (
                <option key={r.id} value={r.id}>
                  {r.code} - {r.name}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadPerformanceData(true)}
            disabled={refreshing}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition shadow-2xs disabled:opacity-50"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Print Report Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* 2. Executive Spotlight Scorecard (Clean, Spacious 4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sales & Target Achievement */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Net Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {formatMoney(summary?.totalRevenue || 0)}
            </div>
            <div className="flex items-center justify-between mt-3 text-xs">
              <span className="text-slate-500 font-medium">Target: {formatMoney(summary?.monthlyTarget || 0)}</span>
              <span className={`font-bold ${
                (summary?.achievementPercentage || 0) >= 80 ? 'text-emerald-600' : 'text-blue-600'
              }`}>
                {summary?.achievementPercentage || 0}% Achieved
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full mt-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (summary?.achievementPercentage || 0) >= 100
                    ? 'bg-emerald-500'
                    : (summary?.achievementPercentage || 0) >= 70
                    ? 'bg-blue-600'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, summary?.achievementPercentage || 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Cash vs Credit Collection */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cash Collection Ratio</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {summary?.cashCollectionRate || 0}%
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Cash: <strong className="text-slate-800">{formatMoney(summary?.cashSales || 0)}</strong>
            </div>
            {/* Segmented bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full"
                style={{ width: `${summary?.cashCollectionRate || 0}%` }}
                title="Cash Sales"
              />
              <div
                className="bg-amber-400 h-full"
                style={{ width: `${100 - (summary?.cashCollectionRate || 0)}%` }}
                title="Credit & Cheque"
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-400 font-medium">
              <span>Cash ({summary?.cashCollectionRate || 0}%)</span>
              <span>Credit ({Math.max(0, 100 - (summary?.cashCollectionRate || 0)).toFixed(0)}%)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Outlet Reach & Strike Rate */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Market Coverage & Bills</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {summary?.activeCustomers || 0} <span className="text-sm font-semibold text-slate-400">/ {summary?.totalCustomers || 0}</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="text-slate-500 font-medium">{summary?.coverageRate || 0}% Active Outlets</span>
              <span className="font-bold text-purple-700">{summary?.totalOrders || 0} Bills</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Avg Drop Size (AOV):</span>
              <strong className="text-slate-900 font-bold">{formatMoney(summary?.averageOrderValue || 0)}</strong>
            </div>
          </div>
        </div>

        {/* Card 4: Outstanding Credit & Returns */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Market Credit & Returns</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {formatMoney(summary?.totalOutstandingCredit || 0)}
            </div>
            <div className="flex items-center justify-between mt-1 text-xs">
              <span className="text-slate-500 font-medium">Market Credit Owed</span>
              <span className={`font-bold px-2 py-0.5 rounded-md ${
                (summary?.returnRate || 0) <= 2
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                Return: {summary?.returnRate || 0}%
              </span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Returns Value:</span>
              <strong className="text-slate-900 font-bold">{formatMoney(summary?.returnsValue || 0)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation View Switcher (Clean tabs: Overview, Routes, Reps, Credit, Products) */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 print:hidden overflow-x-auto">
        <div className="flex items-center gap-2">
          {[
            { id: 'OVERVIEW', label: 'Executive Overview', icon: BarChart3 },
            { id: 'ROUTES', label: 'Territory & Routes', icon: Truck, count: data?.routes.length },
            { id: 'REPS', label: 'Sales Rep Leaderboard', icon: Award, count: data?.reps.length },
            { id: 'CREDIT', label: 'Credit Aging & Debtors', icon: CreditCard },
            { id: 'PRODUCTS', label: 'Brand & SKU Velocity', icon: PackageCheck, count: data?.products.topProducts.length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveViewTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon className="w-4 h-4 stroke-[2]" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.2 rounded-full text-[11px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Tab Views Content */}

      {/* ----------------- TAB 1: EXECUTIVE OVERVIEW ----------------- */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Revenue Velocity & Daily Pacing Chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Daily Sales Velocity & Pacing
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Trend of daily distribution revenue across all active lorries and routes
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-3 h-3 rounded-md bg-blue-600 inline-block" /> Cash Sales
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-3 h-3 rounded-md bg-amber-400 inline-block" /> Credit Sales
                </span>
              </div>
            </div>

            {/* Visual Bar Chart */}
            {data?.timeSeries && data.timeSeries.length > 0 ? (
              <div className="pt-4">
                <div className="h-48 flex items-end gap-2 md:gap-4 border-b border-slate-100 pb-2">
                  {data.timeSeries.map((day, idx) => {
                    const heightPercent = maxDaySales > 0 ? (day.sales / maxDaySales) * 100 : 0;
                    const cashHeight = day.sales > 0 ? (day.cash / day.sales) * 100 : 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                        {/* Tooltip on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition pointer-events-none absolute -top-12 bg-slate-900 text-white text-[11px] font-mono rounded-lg px-2.5 py-1 z-20 whitespace-nowrap shadow-lg">
                          {day.date}: {formatMoney(day.sales)} ({day.ordersCount} bills)
                        </div>
                        {/* Stacked bar */}
                        <div
                          className="w-full max-w-[36px] bg-slate-100 rounded-t-lg overflow-hidden flex flex-col-reverse transition-all group-hover:brightness-95"
                          style={{ height: `${Math.max(6, heightPercent)}%` }}
                        >
                          <div
                            className="w-full bg-blue-600 transition-all"
                            style={{ height: `${cashHeight}%` }}
                          />
                          <div
                            className="w-full bg-amber-400 transition-all"
                            style={{ height: `${100 - cashHeight}%` }}
                          />
                        </div>
                        <span className="text-[10px] md:text-xs font-medium text-slate-400 truncate max-w-[42px]">
                          {day.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-36 flex items-center justify-center text-slate-400 text-xs font-medium">
                No orders recorded for this timeframe.
              </div>
            )}
          </div>

          {/* Quick Split: Territory Snapshot & Top Brand Movement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Territory Performance Snapshot */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  Top Performing Routes
                </h3>
                <button
                  onClick={() => setActiveTab('ROUTES')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View All ({data?.routes.length}) <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3.5">
                {data?.routes.slice(0, 4).map(r => (
                  <div key={r.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800">
                          {r.code}
                        </span>
                        <span className="text-xs md:text-sm font-bold text-slate-900">{r.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                        <span>Rep: <strong>{r.repName}</strong></span>
                        <span>•</span>
                        <span>Outlets: <strong>{r.activeOutlets} / {r.totalOutlets}</strong></span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900">{formatMoney(r.sales)}</div>
                      <div className="mt-0.5">{renderStatusBadge(r.status)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Sales Distribution */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-indigo-600" />
                  Product Category Velocity
                </h3>
                <button
                  onClick={() => setActiveTab('PRODUCTS')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View Products <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {data?.products.categoryBreakdown.map((cat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700">{cat.category}</span>
                      <span className="text-slate-900 font-bold font-mono">
                        {formatMoney(cat.revenue)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${Math.min(100, cat.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: TERRITORY & ROUTES ----------------- */}
      {activeTab === 'ROUTES' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Route & Territory Operational Scorecard
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Detailed sales targets, active outlet penetration, outstanding market balances per route
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 pl-2">Route</th>
                  <th className="pb-3">Rep & Lorry</th>
                  <th className="pb-3 text-right">Target</th>
                  <th className="pb-3 text-right">Actual Sales</th>
                  <th className="pb-3 text-right">Achievement</th>
                  <th className="pb-3 text-center">Outlet Penetration</th>
                  <th className="pb-3 text-right">Market Credit</th>
                  <th className="pb-3 text-right">Return Rate</th>
                  <th className="pb-3 pr-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {data?.routes.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 pl-2">
                      <div className="font-bold text-slate-900 text-sm">{r.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.code}</div>
                    </td>
                    <td className="py-3.5">
                      <div className="font-semibold text-slate-800">{r.repName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Truck className="w-3 h-3" /> {r.lorryNumber}
                      </div>
                    </td>
                    <td className="py-3.5 text-right font-mono text-slate-500">
                      {formatMoney(r.target)}
                    </td>
                    <td className="py-3.5 text-right font-bold font-mono text-slate-900">
                      {formatMoney(r.sales)}
                      <div className="text-[10px] text-slate-400">{r.ordersCount} bills</div>
                    </td>
                    <td className="py-3.5 text-right font-bold">
                      <span className={`px-2 py-0.5 rounded-md ${
                        r.achievementPct >= 85
                          ? 'bg-emerald-50 text-emerald-700 font-bold'
                          : r.achievementPct >= 60
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {r.achievementPct}%
                      </span>
                    </td>
                    <td className="py-3.5 text-center">
                      <div className="font-bold text-slate-800">{r.activeOutlets} / {r.totalOutlets}</div>
                      <div className="text-[10px] text-slate-400">{r.coveragePct}% Covered</div>
                    </td>
                    <td className="py-3.5 text-right font-mono text-amber-600 font-semibold">
                      {formatMoney(r.outstandingCredit)}
                    </td>
                    <td className="py-3.5 text-right font-mono">
                      <span className={r.returnRate > 3 ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                        {r.returnRate}%
                      </span>
                    </td>
                    <td className="py-3.5 pr-2 text-right">
                      {renderStatusBadge(r.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: SALES REPS LEADERBOARD ----------------- */}
      {activeTab === 'REPS' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Sales Reps & Route Officers Leaderboard
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Individual performance targets, cash collected, drop sizes, and productive call strike rates
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {data?.reps.map((rep) => {
              const isFirst = rep.rank === 1;
              const isSecond = rep.rank === 2;
              const isThird = rep.rank === 3;
              return (
                <div
                  key={rep.id}
                  className={`p-5 rounded-3xl border transition-all ${
                    isFirst
                      ? 'bg-gradient-to-b from-amber-50/60 to-white border-amber-200 shadow-sm'
                      : 'bg-white border-slate-200/80 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${
                        isFirst
                          ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                          : isSecond
                          ? 'bg-slate-300 text-slate-800'
                          : isThird
                          ? 'bg-amber-700/80 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        #{rep.rank}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{rep.fullName}</h4>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Truck className="w-3 h-3 text-slate-400" /> {rep.lorryNumber} • {rep.routeName}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Revenue & Target */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-400 font-semibold uppercase">Achieved</span>
                      <span className="text-lg font-black text-slate-900 font-mono">
                        {formatMoney(rep.achievedSales)}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          rep.achievementPct >= 85 ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(100, rep.achievementPct)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs mt-1.5 text-slate-500 font-medium">
                      <span>Target: {formatMoney(rep.monthlyTarget)}</span>
                      <strong className="text-slate-900 font-bold">{rep.achievementPct}%</strong>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50">
                      <span className="text-[11px] text-slate-400 block font-medium">Bills Cut</span>
                      <strong className="text-slate-800 font-bold">{rep.ordersCount} Bills</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50">
                      <span className="text-[11px] text-slate-400 block font-medium">Avg Drop Size</span>
                      <strong className="text-slate-800 font-bold">{formatMoney(rep.averageBillValue)}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50">
                      <span className="text-[11px] text-slate-400 block font-medium">Cash Collected</span>
                      <strong className="text-emerald-700 font-bold font-mono">{formatMoney(rep.cashCollected)}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50">
                      <span className="text-[11px] text-slate-400 block font-medium">Credit Issued</span>
                      <strong className="text-amber-700 font-bold font-mono">{formatMoney(rep.creditIssued)}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------- TAB 4: CREDIT AGING & DEBTORS ----------------- */}
      {activeTab === 'CREDIT' && (
        <div className="space-y-6">
          {/* Aging Buckets Banner */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-black text-slate-900 tracking-tight mb-1">
              Outstanding Market Credit Aging Breakdown
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-5">
              Risk analysis of credit balances distributed across duration windows
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Bucket 1: 0-15 Days */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">0 - 15 Days</span>
                <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
                  {formatMoney(data?.creditAging.current.amount || 0)}
                </span>
                <span className="text-xs text-emerald-700 font-medium mt-1 block">
                  {data?.creditAging.current.count || 0} Outlets • Current / Healthy
                </span>
              </div>

              {/* Bucket 2: 16-30 Days */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">16 - 30 Days</span>
                <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
                  {formatMoney(data?.creditAging.days16to30.amount || 0)}
                </span>
                <span className="text-xs text-blue-700 font-medium mt-1 block">
                  {data?.creditAging.days16to30.count || 0} Outlets • Standard Credit
                </span>
              </div>

              {/* Bucket 3: 31-60 Days */}
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">31 - 60 Days</span>
                <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
                  {formatMoney(data?.creditAging.days31to60.amount || 0)}
                </span>
                <span className="text-xs text-amber-700 font-medium mt-1 block">
                  {data?.creditAging.days31to60.count || 0} Outlets • Follow-up Required
                </span>
              </div>

              {/* Bucket 4: 60+ Days (Overdue Alert) */}
              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">60+ Days (Overdue)</span>
                <span className="text-xl font-black text-rose-700 font-mono mt-1 block">
                  {formatMoney(data?.creditAging.over60.amount || 0)}
                </span>
                <span className="text-xs text-rose-700 font-medium mt-1 block">
                  {data?.creditAging.over60.count || 0} Outlets • Critical Risk
                </span>
              </div>
            </div>
          </div>

          {/* Top Debtor Outlets */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-black text-slate-900 tracking-tight mb-1">
              Top 8 Debtor Outlets & Credit Exposure
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-4">
              Client accounts with the largest credit balances and their assigned credit limit utilization
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="pb-3 pl-2">Customer / Shop</th>
                    <th className="pb-3">Route</th>
                    <th className="pb-3">Phone</th>
                    <th className="pb-3 text-right">Credit Limit</th>
                    <th className="pb-3 text-right">Outstanding Balance</th>
                    <th className="pb-3 pr-2 text-right">Limit Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {data?.creditAging.topDebtors.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 pl-2">
                        <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{c.code}</div>
                      </td>
                      <td className="py-3.5 text-slate-600">{c.routeName}</td>
                      <td className="py-3.5 text-slate-600 font-mono">{c.phone}</td>
                      <td className="py-3.5 text-right font-mono text-slate-500">{formatMoney(c.creditLimit)}</td>
                      <td className="py-3.5 text-right font-mono font-bold text-amber-700 text-sm">
                        {formatMoney(c.balance)}
                      </td>
                      <td className="py-3.5 pr-2 text-right font-bold">
                        <span className={`px-2 py-0.5 rounded-md ${
                          c.ratio > 90 ? 'bg-rose-50 text-rose-700 font-bold' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {c.ratio}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 5: BRAND & SKU VELOCITY ----------------- */}
      {activeTab === 'PRODUCTS' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Top Selling SKUs & Product Revenue Velocity
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Fast moving items ranked by total revenue contribution during this timeframe
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 pl-2">SKU & Item Name</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3 text-right">Units Sold</th>
                  <th className="pb-3 text-right">Gross Revenue</th>
                  <th className="pb-3 pr-2 text-right">Revenue Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {data?.products.topProducts.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 pl-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{p.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5 text-right font-bold text-slate-800 font-mono">
                      {p.unitsSold.toLocaleString()} units
                    </td>
                    <td className="py-3.5 text-right font-black text-slate-900 font-mono text-sm">
                      {formatMoney(p.revenue)}
                    </td>
                    <td className="py-3.5 pr-2 text-right">
                      <span className="font-bold text-blue-700 font-mono">
                        {p.percentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
