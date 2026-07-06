import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Users, 
  CreditCard, 
  IndianRupee, 
  Plus, 
  ChevronRight, 
  ShoppingBag,
  Clock,
  Sparkles,
  Smartphone,
  Wallet,
  Calendar,
  Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiCall from '../api';
import { toast } from 'react-hot-toast';

// Shimmer skeleton block
const Sk = ({ w = 'w-20', h = 'h-6', rounded = 'rounded-lg' }) => (
  <div className={`${w} ${h} ${rounded} bg-slate-200 animate-pulse`} />
);

export default function Dashboard() {
  // Load from cache instantly so page shows real data on first render
  const cachedStats = (() => { try { return JSON.parse(localStorage.getItem('dash_stats') || 'null'); } catch { return null; } })();
  const cachedStaff = (() => { try { return JSON.parse(localStorage.getItem('dash_staff') || '[]'); } catch { return []; } })();
  const cachedServices = (() => { try { return JSON.parse(localStorage.getItem('dash_services') || '[]'); } catch { return []; } })();

  const [stats, setStats] = useState(cachedStats);
  const [loading, setLoading] = useState(!cachedStats); // no skeleton if cache exists
  const [staff, setStaff] = useState(cachedStaff);
  const [servicesList, setServicesList] = useState(cachedServices);
  const [filterType, setFilterType] = useState('today');
  const [selectedService, setSelectedService] = useState('All');
  const role = localStorage.getItem('role');

  const initDashboard = async () => {
    try {
      // Only show skeleton if no cached data
      if (!cachedStats) setLoading(true);

      const [statsRes, staffRes, serviceRes] = await Promise.all([
        apiCall('/dashboard/stats?filterType=today&serviceName=All'),
        apiCall('/staff'),
        apiCall('/services')
      ]);

      const activeStaff = staffRes.filter(s => s.status === 'active').slice(0, 5);

      setStats(statsRes);
      setStaff(activeStaff);
      setServicesList(serviceRes || []);

      // Save to cache for next visit — instant load
      localStorage.setItem('dash_stats', JSON.stringify(statsRes));
      localStorage.setItem('dash_staff', JSON.stringify(activeStaff));
      localStorage.setItem('dash_services', JSON.stringify(serviceRes || []));

    } catch (err) {
      if (!cachedStats) toast.error('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (newFilterType, newService) => {
    try {
      setLoading(true);
      const res = await apiCall(`/dashboard/stats?filterType=${newFilterType}&serviceName=${encodeURIComponent(newService)}`);
      setStats(res);
    } catch (err) {
      toast.error('Failed to update analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initDashboard();
  }, []);



  // Format currency helper
  const formatAmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  // Card labels mapping based on selected filter
  const getCardLabel = (base) => {
    const mapping = {
      revenue: {
        today: "Today's Revenue",
        yesterday: "Yesterday's Revenue",
        '7days': "7 Days Revenue",
        '15days': "15 Days Revenue",
        '30days': "30 Days Revenue",
        '90days': "3 Months Revenue",
        this_month: "This Month Revenue"
      },
      visits: {
        today: "Today's Visits",
        yesterday: "Yesterday's Visits",
        '7days': "7 Days Visits",
        '15days': "15 Days Visits",
        '30days': "30 Days Visits",
        '90days': "3 Months Visits",
        this_month: "This Month Visits"
      },
      services: {
        today: "Today's Services",
        yesterday: "Yesterday's Services",
        '7days': "7 Days Services",
        '15days': "15 Days Services",
        '30days': "30 Days Services",
        '90days': "3 Months Services",
        this_month: "This Month Services"
      },
      avgTicket: {
        today: "Today's Avg Ticket",
        yesterday: "Yesterday's Avg Ticket",
        '7days': "7 Days Avg Ticket",
        '15days': "15 Days Avg Ticket",
        '30days': "30 Days Avg Ticket",
        '90days': "3 Months Avg Ticket",
        this_month: "This Month Avg Ticket"
      }
    };
    return mapping[base]?.[filterType] || base;
  };

  const getFilterRangeDescription = () => {
    const now = new Date();
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    
    switch (filterType) {
      case 'today':
        return `Today (${now.toLocaleDateString('en-US', options)})`;
      case 'yesterday': {
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        return `Yesterday (${yest.toLocaleDateString('en-US', options)})`;
      }
      case '7days': {
        const start = new Date();
        start.setDate(start.getDate() - 6);
        return `Last 7 Days (${start.toLocaleDateString('en-US', options)} - ${now.toLocaleDateString('en-US', options)})`;
      }
      case '15days': {
        const start = new Date();
        start.setDate(start.getDate() - 14);
        return `Last 15 Days (${start.toLocaleDateString('en-US', options)} - ${now.toLocaleDateString('en-US', options)})`;
      }
      case '30days': {
        const start = new Date();
        start.setDate(start.getDate() - 29);
        return `Last 30 Days (${start.toLocaleDateString('en-US', options)} - ${now.toLocaleDateString('en-US', options)})`;
      }
      case '90days': {
        const start = new Date();
        start.setDate(start.getDate() - 89);
        return `Last 3 Months (${start.toLocaleDateString('en-US', options)} - ${now.toLocaleDateString('en-US', options)})`;
      }
      case 'this_month': {
        const start = new Date();
        start.setDate(1);
        return `This Month (${start.toLocaleDateString('en-US', options)} - ${now.toLocaleDateString('en-US', options)})`;
      }
      default:
        return '';
    }
  };

  const getPaymentModeTitle = () => {
    const mapping = {
      today: "Today's Payment Modes",
      yesterday: "Yesterday's Payment Modes",
      '7days': "7 Days Payment Modes",
      '15days': "15 Days Payment Modes",
      '30days': "30 Days Payment Modes",
      '90days': "3 Months Payment Modes",
      this_month: "This Month Payment Modes"
    };
    return mapping[filterType] || "Payment Modes";
  };

  // Helper for Payment Percentages
  const cashVal = stats?.paymentSplit?.cash || 0;
  const upiVal = stats?.paymentSplit?.upi || 0;
  const cardVal = stats?.paymentSplit?.card || 0;
  const totalSplit = cashVal + upiVal + cardVal;
  const divisor = totalSplit || 1;
  const cashPct = Math.round((cashVal / divisor) * 100);
  const upiPct = Math.round((upiVal / divisor) * 100);
  const cardPct = Math.round((cardVal / divisor) * 100);

  // SVG Chart Calculations
  const chartData = stats?.revenueChart || [];
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1000);
  const chartHeight = 280; // Increased height to make the chart look larger
  const chartWidth = chartData.length <= 7 ? 500 : Math.max(600, chartData.length * 55);



  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Salon Overview <Sparkles className="w-5 h-5 text-accent-dark animate-pulse" />
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            {role === 'super_admin' 
              ? 'Real-time performance metrics, service analytics, and staff tracking.' 
              : 'Add customer entries, check daily receipts, and view staff registers.'}
          </p>
        </div>
        <Link
          to="/customer-entry"
          className="btn-accent shadow-lg shadow-accent/10 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Customer Entry
        </Link>
      </div>
      {/* Global Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-soft border border-slate-100/60">
        {/* Desktop View (Pills + Select side-by-side) */}
        <div className="hidden md:flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl self-start">
              {[
                { label: 'Today', value: 'today' },
                { label: 'Yesterday', value: 'yesterday' },
                { label: 'Last 7 Days', value: '7days' },
                { label: 'Last 15 Days', value: '15days' },
                { label: 'Last 30 Days', value: '30days' },
                { label: 'Last 3 Months', value: '90days' },
                { label: 'This Month', value: 'this_month' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setFilterType(opt.value);
                    handleFilterChange(opt.value, selectedService);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterType === opt.value
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-455 font-semibold tracking-wide flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> {getFilterRangeDescription()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-400" /> Service:
            </span>
            <select
              value={selectedService}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedService(val);
                handleFilterChange(filterType, val);
              }}
              className="form-input !py-1.5 !px-3 text-xs font-bold text-slate-755 bg-white border border-slate-200 cursor-pointer min-w-[150px] max-w-[200px]"
            >
              <option value="All">All Services</option>
              {servicesList.map(s => (
                <option key={s._id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mobile View (2 Column Dropdowns Grid) */}
        <div className="flex flex-col gap-3 md:hidden">
          <div className="grid grid-cols-2 gap-3">
            {/* Time range select */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Date Range
              </label>
              <select
                value={filterType}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterType(val);
                  handleFilterChange(val, selectedService);
                }}
                className="form-input !py-1.5 !px-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 cursor-pointer w-full"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7days">Last 7 Days</option>
                <option value="15days">Last 15 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 3 Months</option>
                <option value="this_month">This Month</option>
              </select>
            </div>

            {/* Service select */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-400" /> Service Filter
              </label>
              <select
                value={selectedService}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedService(val);
                  handleFilterChange(filterType, val);
                }}
                className="form-input !py-1.5 !px-2.5 text-xs font-bold text-slate-755 bg-white border border-slate-200 cursor-pointer w-full"
              >
                <option value="All">All Services</option>
                {servicesList.map(s => (
                  <option key={s._id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <span className="text-[10px] text-slate-455 font-bold tracking-wide flex items-center gap-1 bg-slate-50 p-2 rounded-xl border border-slate-100/50">
            <Calendar className="w-3 h-3 text-slate-400" /> {getFilterRangeDescription()}
          </span>
        </div>
      </div>

      {/* Statistics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {/* Today's Revenue */}
        <div className="bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-soft border border-slate-100/60 flex items-center gap-3 sm:gap-5">
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm shrink-0">
            <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">{getCardLabel('revenue')}</span>
            {loading ? <Sk w="w-16" h="h-6" /> : (
              <span className="text-base sm:text-2xl font-extrabold text-slate-800 tracking-tight block mt-0.5">{formatAmt(stats?.todayRevenue)}</span>
            )}
          </div>
        </div>

        {/* Today's Customers */}
        <div className="bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-soft border border-slate-100/60 flex items-center gap-3 sm:gap-5">
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">{getCardLabel('visits')}</span>
            {loading ? <Sk w="w-10" h="h-6" /> : (
              <span className="text-base sm:text-2xl font-extrabold text-slate-800 tracking-tight block mt-0.5">{stats?.todayCustomers ?? 0}</span>
            )}
          </div>
        </div>

        {/* Monthly Revenue (Super Admin) or Total Services today */}
        {role === 'super_admin' ? (
          <div className="bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-soft border border-slate-100/60 flex items-center gap-3 sm:gap-5">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-650 flex items-center justify-center shadow-sm shrink-0">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">Month Revenue</span>
              {loading ? <Sk w="w-16" h="h-6" /> : (
                <span className="text-base sm:text-2xl font-extrabold text-slate-800 tracking-tight block mt-0.5">{formatAmt(stats?.monthlyRevenue)}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-soft border border-slate-100/60 flex items-center gap-3 sm:gap-5">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-650 flex items-center justify-center shadow-sm shrink-0">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">{getCardLabel('services')}</span>
              {loading ? <Sk w="w-14" h="h-6" /> : (
                <span className="text-base sm:text-2xl font-extrabold text-slate-800 tracking-tight block mt-0.5">{stats?.todayServicesCount ?? 0} Sold</span>
              )}
            </div>
          </div>
        )}

        {/* Average Bill */}
        <div className="bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-soft border border-slate-100/60 flex items-center gap-3 sm:gap-5">
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-sm shrink-0">
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">{getCardLabel('avgTicket')}</span>
            {loading ? <Sk w="w-14" h="h-6" /> : (
              <span className="text-base sm:text-2xl font-extrabold text-slate-800 tracking-tight block mt-0.5">{formatAmt(stats?.averageBill)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Charts & breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[28px] shadow-soft border border-slate-100/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-50">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Business Revenue Analytics</h3>
              <p className="text-xs text-slate-450 font-medium mt-0.5">Track daily sales growth and service demand dynamics (Hover over bars for details)</p>
            </div>
          </div>

          {/* Premium Bar Chart */}
          {loading ? (
            <div className="w-full h-80 flex items-end gap-2 px-4 pb-2 mt-4">
              {[60, 80, 45, 90, 55, 70, 40].map((h, i) => (
                <div key={i} className="flex-1 bg-slate-200 animate-pulse rounded-t-xl" style={{ height: `${h}%` }} />
              ))}
            </div>
          ) : chartData.length > 0 ? (() => {
            // Layout constants
            const padL = 54, padR = 16, padT = 36, padB = 32;
            const plotW = chartWidth - padL - padR;
            const plotH = chartHeight - padT - padB;

            // Y-axis ticks
            const yTicks = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
              pct,
              val: Math.round(maxRevenue * pct),
              y: padT + plotH * (1 - pct)
            }));

            // Bars data
            const bars = chartData.map((d, i) => {
              const colW = plotW / chartData.length;
              // Make bars wider if there are 2 or fewer elements so it doesn't look thin
              const barW = Math.min(chartData.length <= 2 ? 60 : 32, colW * 0.6);
              const x = padL + i * colW + (colW - barW) / 2;
              const barH = d.revenue > 0 ? Math.max((d.revenue / maxRevenue) * plotH, 6) : 6;
              const y = padT + plotH - barH;
              return { x, y, barW, barH, revenue: d.revenue, label: d.label };
            });

            return (
              <div className="w-full overflow-x-auto mt-2 pb-1">
                <div style={{ minWidth: chartData.length <= 7 ? '100%' : `${chartWidth}px` }}>
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-80 overflow-visible">
                    <defs>
                      <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EC4899" />
                        <stop offset="100%" stopColor="#BE185D" />
                      </linearGradient>
                      <linearGradient id="bar-gradient-empty" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FCE7F3" />
                        <stop offset="100%" stopColor="#FDF2F8" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal grid lines + Y-axis labels */}
                    {yTicks.map((t, i) => (
                      <g key={i}>
                        <line
                          x1={padL} y1={t.y} x2={chartWidth - padR} y2={t.y}
                          stroke={i === 0 ? '#FBCFE8' : '#FCE7F3'}
                          strokeWidth={i === 0 ? 1.5 : 1}
                          strokeDasharray={i === 0 ? '0' : '5 4'}
                        />
                        <text x={padL - 8} y={t.y + 4} textAnchor="end"
                          fill="#C084FC" fontSize="9.5" fontWeight="700"
                        >
                          {t.val >= 1000 ? `₹${(t.val / 1000).toFixed(1)}k` : `₹${t.val}`}
                        </text>
                      </g>
                    ))}

                    {/* Bars */}
                    {bars.map((b, idx) => (
                      <g key={idx} className="group cursor-pointer">
                        {/* Bar background track */}
                        <rect
                          x={b.x} y={padT}
                          width={b.barW} height={plotH}
                          rx={6} fill="#FFF0F6" opacity="0.4"
                        />
                        {/* Active Bar */}
                        <rect
                          x={b.x} y={b.y}
                          width={b.barW} height={b.barH}
                          rx={6}
                          fill={b.revenue > 0 ? 'url(#bar-gradient)' : 'url(#bar-gradient-empty)'}
                          style={{ filter: b.revenue > 0 ? 'drop-shadow(0 4px 6px rgba(219,39,119,0.25))' : 'none' }}
                        />
                        {/* Value badge on hover */}
                        {b.revenue > 0 && (
                          <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                            <rect
                              x={b.x + b.barW / 2 - 26} y={b.y - 26}
                              width="52" height="18"
                              rx="6" fill="#1E293B"
                            />
                            <text x={b.x + b.barW / 2} y={b.y - 14}
                              textAnchor="middle"
                              fill="#fff" fontSize="9" fontWeight="800"
                            >
                              {b.revenue >= 1000 ? `₹${(b.revenue / 1000).toFixed(1)}k` : `₹${b.revenue}`}
                            </text>
                          </g>
                        )}
                      </g>
                    ))}
                  </svg>

                  {/* X-axis date labels */}
                  <div className="flex" style={{ paddingLeft: `${padL}px`, paddingRight: `${padR}px` }}>
                    {chartData.map((d, idx) => {
                      const cw = 100 / chartData.length;
                      return (
                        <div key={idx} className="text-center" style={{ width: `${cw}%` }}>
                          <span className="text-[10px] font-bold text-slate-500">{d.label.split(' ')[0]}</span>
                          <span className="block text-[9px] text-slate-300 font-semibold">{d.label.split(' ')[1]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="h-72 flex items-center justify-center text-xs text-slate-450">
              No data available for the selected period
            </div>
          )}

        </div>



        {/* Payment Breakdown Card */}
        <div className="bg-white p-6 rounded-[28px] shadow-soft border border-slate-100/60 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">{getPaymentModeTitle()}</h3>
            <p className="text-xs text-slate-400">Breakdown of collections by modes</p>
          </div>

          <div className="my-6 space-y-4">
            {/* Cash */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1.5">
                <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5 text-emerald-500" /> Cash</span>
                {loading ? <Sk w="w-20" h="h-4" /> : <span>{formatAmt(cashVal)} ({cashPct}%)</span>}
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${loading ? 'bg-slate-200 animate-pulse w-1/2' : 'bg-emerald-500'}`} style={!loading ? { width: `${cashPct}%` } : {}} />
              </div>
            </div>

            {/* UPI */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1.5">
                <span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-blue-500" /> UPI</span>
                {loading ? <Sk w="w-20" h="h-4" /> : <span>{formatAmt(upiVal)} ({upiPct}%)</span>}
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${loading ? 'bg-slate-200 animate-pulse w-1/3' : 'bg-blue-500'}`} style={!loading ? { width: `${upiPct}%` } : {}} />
              </div>
            </div>

            {/* Card */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1.5">
                <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-amber-500" /> Card</span>
                {loading ? <Sk w="w-20" h="h-4" /> : <span>{formatAmt(cardVal)} ({cardPct}%)</span>}
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${loading ? 'bg-slate-200 animate-pulse w-1/4' : 'bg-amber-500'}`} style={!loading ? { width: `${cardPct}%` } : {}} />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-800">
            <span>Total Collected</span>
            {loading ? <Sk w="w-16" h="h-4" /> : <span>{formatAmt(totalSplit)}</span>}
          </div>
        </div>
      </div>

      {/* Bottom rows (Recent Customers, Top Performers) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Entries */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[28px] shadow-soft border border-slate-100/60">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Recent Salon Entries</h3>
              <p className="text-xs text-slate-400">List of latest visits registered</p>
            </div>
            <Link to="/customer-history" className="text-xs font-bold text-slate-400 hover:text-accent-dark flex items-center gap-0.5 transition-colors">
              View History <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            // Skeleton rows
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="space-y-2">
                    <Sk w="w-24" h="h-3" />
                    <Sk w="w-16" h="h-2.5" />
                  </div>
                  <Sk w="w-14" h="h-5" rounded="rounded-full" />
                </div>
              ))}
            </div>
          ) : stats?.recentEntries && stats.recentEntries.length > 0 ? (
            <>
              {/* Desktop View Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Customer</th>
                      <th className="pb-3 font-semibold">Assigned Staff</th>
                      <th className="pb-3 font-semibold">Services</th>
                      <th className="pb-3 font-semibold">Payment</th>
                      <th className="pb-3 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {stats.recentEntries.map((entry) => (
                      <tr key={entry._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3">
                          <p className="font-bold text-slate-800">{entry.customer?.name || 'Walk-in'}</p>
                          <p className="text-[10px] text-slate-400">{entry.customer?.phone}</p>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 font-medium">
                            {entry.staff?.name || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 max-w-[200px] truncate">
                          <span className="text-slate-600 font-medium">{entry.services.map(s => s.name).join(', ')}</span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            entry.paymentMode === 'Cash' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            entry.paymentMode === 'UPI' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                            entry.paymentMode === 'Card' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            'bg-purple-50 text-purple-600 border border-purple-100'
                          }`}>
                            {entry.paymentMode}
                          </span>
                        </td>
                        <td className="py-3 text-right font-extrabold text-slate-800">{formatAmt(entry.finalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View List */}
              <div className="block md:hidden space-y-3">
                {stats.recentEntries.map((entry) => (
                  <div key={entry._id} className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-extrabold text-slate-800 text-xs capitalize">{entry.customer?.name || 'Walk-in'}</p>
                        <p className="text-[10px] text-slate-400 font-bold tracking-wide mt-0.5">{entry.customer?.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900 text-xs">{formatAmt(entry.finalAmount)}</p>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold mt-1 ${
                          entry.paymentMode === 'Cash' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          entry.paymentMode === 'UPI' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                          entry.paymentMode === 'Card' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                          'bg-purple-50 text-purple-600 border border-purple-100'
                        }`}>
                          {entry.paymentMode}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 items-center justify-between text-[11px]">
                      <span className="text-slate-600 font-semibold truncate max-w-[170px]">{entry.services.map(s => s.name).join(', ')}</span>
                      <span className="px-2 py-0.5 bg-white border border-slate-150 rounded-lg text-slate-500 font-bold text-[9px]">
                        Stylist: {entry.staff?.name || 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
              <Clock className="w-8 h-8 text-slate-300" />
              No entries recorded for today yet.
            </div>
          )}
        </div>

        {/* Top Staff / Services List */}
        <div className="bg-white p-6 rounded-[28px] shadow-soft border border-slate-100/60">
          {role === 'super_admin' ? (
            loading ? (
              // Skeleton for top staff
              <div className="space-y-4">
                <div className="space-y-1">
                  <Sk w="w-24" h="h-4" />
                  <Sk w="w-32" h="h-3" />
                </div>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sk w="w-8" h="h-8" rounded="rounded-lg" />
                      <div className="space-y-1.5">
                        <Sk w="w-20" h="h-3" />
                        <Sk w="w-14" h="h-2.5" />
                      </div>
                    </div>
                    <div className="space-y-1.5 text-right">
                      <Sk w="w-14" h="h-3" />
                      <Sk w="w-10" h="h-2.5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Top Stylists</h3>
                  <p className="text-xs text-slate-400">Highest revenue drivers</p>
                </div>
                <div className="space-y-4">
                  {stats?.topStaff?.map((st, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-slate-600">{i + 1}</div>
                        <div>
                          <p className="font-bold text-slate-800">{st.name}</p>
                          <p className="text-[10px] text-slate-400">{st.role}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-slate-800">{formatAmt(st.revenue)}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{st.customers} visits</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-6 border-t border-slate-50">
                  <div className="mb-4">
                    <h3 className="font-bold text-slate-800 text-sm">Popular Services</h3>
                    <p className="text-xs text-slate-400">Most requested services</p>
                  </div>
                  <div className="space-y-3">
                    {stats?.topServices?.map((svc, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{svc.name}</p>
                          <p className="text-[10px] text-slate-400">{svc.category}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-600">{svc.count} sales</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          ) : (
            // Admin view — Staff Register
            <div className="h-full flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Staff Register</h3>
                <p className="text-xs text-slate-400">View active operational staff</p>
              </div>
              <div className="space-y-3 my-4">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse" />
                        <Sk w="w-20" h="h-3" />
                      </div>
                      <Sk w="w-14" h="h-4" rounded="rounded" />
                    </div>
                  ))
                ) : staff.length > 0 ? (
                  staff.map((st) => (
                    <div key={st._id} className="flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-semibold text-slate-700">{st.name}</span>
                      </div>
                      <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">{st.role}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">No active staff registered</p>
                )}
              </div>
              <div className="p-4 bg-accent/15 border border-accent/25 rounded-2xl text-xs flex flex-col gap-1 text-accent-dark">
                <span className="font-bold">Operational Note:</span>
                <span>Select active stylists inside the Customer Entry form to ensure performance reports calculate correctly.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
