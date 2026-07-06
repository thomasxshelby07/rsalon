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
  Wallet
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiCall from '../api';
import { toast } from 'react-hot-toast';

// Shimmer skeleton block
const Sk = ({ w = 'w-20', h = 'h-6', rounded = 'rounded-lg' }) => (
  <div className={`${w} ${h} ${rounded} bg-slate-200 animate-pulse`} />
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [days, setDays] = useState(7);
  const [selectedService, setSelectedService] = useState('All');
  const role = localStorage.getItem('role');

  const initDashboard = async () => {
    try {
      setLoading(true);
      const [statsRes, staffRes, serviceRes] = await Promise.all([
        apiCall('/dashboard/stats?days=7&serviceName=All'),
        apiCall('/staff'),
        apiCall('/services')
      ]);
      setStats(statsRes);
      setStaff(staffRes.filter(s => s.status === 'active').slice(0, 5));
      setServicesList(serviceRes || []);
    } catch (err) {
      toast.error('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (newDays, newService) => {
    try {
      const res = await apiCall(`/dashboard/stats?days=${newDays}&serviceName=${encodeURIComponent(newService)}`);
      setStats(res);
    } catch (err) {
      toast.error('Failed to update analytics');
    }
  };

  useEffect(() => {
    initDashboard();
  }, []);

  // Format currency helper
  const formatAmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  // Helper for Payment Percentages
  const cashVal = stats?.paymentSplit?.cash || 0;
  const upiVal = stats?.paymentSplit?.upi || 0;
  const cardVal = stats?.paymentSplit?.card || 0;
  const totalSplit = cashVal + upiVal + cardVal;
  const divisor = totalSplit || 1;
  const cashPct = Math.round((cashVal / divisor) * 100);
  const upiPct = Math.round((upiVal / divisor) * 100);
  const cardPct = Math.round((cardVal / divisor) * 100);

  // SVG Chart Calculations (7 Days Revenue)
  const chartData = stats?.revenueChart || [];
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1000);
  const chartHeight = 120;
  const chartWidth = Math.max(500, chartData.length * 52);

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

      {/* Statistics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {/* Today's Revenue */}
        <div className="bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-soft border border-slate-100/60 flex items-center gap-3 sm:gap-5">
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm shrink-0">
            <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">Today's Revenue</span>
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
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">Today's Visits</span>
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
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">Services Sold</span>
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
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">Average Ticket</span>
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
              <p className="text-xs text-slate-450 font-medium mt-0.5">Track daily sales growth and service demand dynamics</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Days Selector Dropdown */}
              <select
                value={days}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDays(val);
                  handleFilterChange(val, selectedService);
                }}
                className="form-input !py-1.5 !px-2.5 text-[11px] font-bold text-slate-650 bg-white cursor-pointer"
              >
                <option value="1">Today Only</option>
                <option value="2">Today & Yesterday</option>
                <option value="7">Last 7 Days</option>
                <option value="15">Last 15 Days</option>
                <option value="30">Last 30 Days</option>
              </select>

              {/* Service Selector Dropdown */}
              <select
                value={selectedService}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedService(val);
                  handleFilterChange(days, val);
                }}
                className="form-input !py-1.5 !px-2.5 text-[11px] font-bold text-slate-650 bg-white cursor-pointer max-w-[130px] sm:max-w-[160px]"
              >
                <option value="All">All Services</option>
                {servicesList.map(s => (
                  <option key={s._id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SVG Bar Chart or Skeleton */}
          {loading ? (
            <div className="w-full h-44 flex items-end gap-2 px-4 pb-2">
              {[60, 80, 45, 90, 55, 70, 40].map((h, i) => (
                <div key={i} className="flex-1 bg-slate-200 animate-pulse rounded-t-lg" style={{ height: `${h}%` }} />
              ))}
            </div>
          ) : chartData.length > 0 ? (
            <div className="w-full overflow-x-auto mt-4 pb-2">
              <div style={{ minWidth: chartData.length > 10 ? `${chartData.length * 36}px` : '100%' }}>
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44 overflow-visible">
                  <defs>
                    <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EC4899" />
                      <stop offset="100%" stopColor="#DB2777" />
                    </linearGradient>
                  </defs>

                  {/* Grid horizontal markers */}
                  <line x1="20" y1="15" x2={chartWidth - 20} y2="15" stroke="#FFF0F6" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="20" y1="60" x2={chartWidth - 20} y2="60" stroke="#FFF0F6" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="20" y1="105" x2={chartWidth - 20} y2="105" stroke="#FFF0F6" strokeWidth="1" strokeDasharray="4 4" />

                  {/* Bars */}
                  {chartData.map((d, idx) => {
                    const paddingX = 30;
                    const availableWidth = chartWidth - paddingX * 2;
                    const barWidth = Math.min(26, availableWidth / chartData.length - 12);
                    const colWidth = availableWidth / chartData.length;
                    const x = paddingX + idx * colWidth + (colWidth - barWidth) / 2;
                    const barHeight = (d.revenue / maxRevenue) * (chartHeight - 35);
                    const y = chartHeight - barHeight - 15;
                    
                    return (
                      <g key={idx} className="group">
                        {/* Bar track background */}
                        <rect x={x} y={15} width={barWidth} height={chartHeight - 30} rx={4} fill="#FFF0F6" opacity="0.8" />
                        {/* Bar rect */}
                        {d.revenue > 0 && (
                          <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 4)} rx={4} fill="url(#bar-grad)" />
                        )}
                        {/* Revenue label on top of bar */}
                        <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="text-[9px] font-extrabold text-pink-600">
                          {d.revenue > 0 ? `₹${d.revenue.toLocaleString('en-IN')}` : ''}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                {/* Bottom Labels */}
                <div className="flex justify-between px-4 mt-2">
                  {chartData.map((d, idx) => (
                    <span key={idx} className="text-[10px] font-semibold text-slate-400">{d.label.split(' ')[0]}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400">
              Not enough daily data to populate analytics
            </div>
          )}
        </div>

        {/* Payment Breakdown Card */}
        <div className="bg-white p-6 rounded-[28px] shadow-soft border border-slate-100/60 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Today's Payments Mode</h3>
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
