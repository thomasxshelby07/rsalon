import React, { useState, useEffect } from 'react';
import { 
  Users, 
  IndianRupee, 
  Percent, 
  TrendingUp, 
  Award, 
  Save, 
  Wallet,
  Coins,
  ShieldAlert,
  Loader2,
  Trash2,
  Calendar,
  X,
  CreditCard,
  FileText,
  Clock,
  Check
} from 'lucide-react';
import apiCall from '../api';
import { toast } from 'react-hot-toast';

export default function Salaries() {
  const [staff, setStaff] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [salaryEdits, setSalaryEdits] = useState({}); // { staffId: { salary, commission } }

  // Payout tabs states
  const [activeTab, setActiveTab] = useState('payroll'); // 'payroll', 'history'
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyMonthFilter, setHistoryMonthFilter] = useState('');

  // Record payout modal states
  const [showPayModal, setShowPayModal] = useState(false);
  const [payTargetStaff, setPayTargetStaff] = useState(null);
  const [payMonth, setPayMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [payBase, setPayBase] = useState(0);
  const [payCommission, setPayCommission] = useState(0);
  const [payMethod, setPayMethod] = useState('UPI'); // 'UPI', 'Cash'
  const [payNotes, setPayNotes] = useState('');
  const [payingPayout, setPayingPayout] = useState(false);

  const role = localStorage.getItem('role');
  const isSuperAdmin = role === 'super_admin';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffRes, reportRes, payoutsRes] = await Promise.all([
        apiCall('/staff'),
        apiCall('/reports'),
        apiCall('/salaries/payout')
      ]);
      setStaff(staffRes.filter(s => s.status === 'active'));
      setReport(reportRes);
      setPayoutHistory(payoutsRes);
      
      // Initialize inline inputs
      const initialEdits = {};
      staffRes.forEach(s => {
        initialEdits[s._id] = {
          salary: s.salary || 0,
          commission: s.commission || 0
        };
      });
      setSalaryEdits(initialEdits);
    } catch (err) {
      toast.error('Failed to load payroll configuration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayoutHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await apiCall('/salaries/payout');
      setPayoutHistory(res);
    } catch (err) {
      toast.error('Failed to load payout history records');
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchPayoutHistory();
    }
  }, [activeTab]);

  const handleInputChange = (staffId, field, value) => {
    setSalaryEdits(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [field]: Number(value || 0)
      }
    }));
  };

  const handleSaveStaffSettings = async (st) => {
    try {
      setSaving(true);
      const edits = salaryEdits[st._id];
      await apiCall(`/staff/${st._id}`, {
        method: 'PUT',
        body: {
          name: st.name,
          phone: st.phone,
          role: st.role,
          status: st.status,
          salary: edits.salary,
          commission: edits.commission
        }
      });
      toast.success(`Compensation settings updated for ${st.name}!`);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayout = async (e) => {
    e.preventDefault();
    if (!payTargetStaff) return;
    try {
      setPayingPayout(true);
      const totalPaid = Number(payBase) + Number(payCommission);
      await apiCall('/salaries/payout', {
        method: 'POST',
        body: {
          staffId: payTargetStaff._id,
          month: payMonth,
          baseSalary: Number(payBase),
          commission: Number(payCommission),
          totalPaid,
          paymentMethod: payMethod,
          notes: payNotes
        }
      });
      toast.success(`Salary payment recorded for ${payTargetStaff.name}!`);
      setShowPayModal(false);
      fetchData(); // Refresh logs to sync Paid badges
      
      // If user is currently on the history tab, refresh history
      if (activeTab === 'history') {
        fetchPayoutHistory();
      } else {
        // Switch to history tab to see check record
        setActiveTab('history');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save payout record');
    } finally {
      setPayingPayout(false);
    }
  };

  const handleDeletePayout = async (payoutId) => {
    if (!window.confirm('Are you sure you want to reverse/delete this payout record?')) return;
    try {
      await apiCall(`/salaries/payout/${payoutId}`, { method: 'DELETE' });
      toast.success('Payout record reversed successfully');
      fetchPayoutHistory();
      fetchData(); // Sync Paid badges back to unpaid status
    } catch (err) {
      toast.error(err.message || 'Failed to reverse payout record');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-3xl flex items-center justify-center text-red-500 shadow-soft">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">Access Restricted</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">Staff payroll, salary configurations, and stylist commission metrics are reserved for Super Admin views only.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Compiling staff logs and payroll parameters...</p>
      </div>
    );
  }

  // Calculate monthly stats based on reports
  const performanceMap = {};
  if (report && report.staffPerformance) {
    report.staffPerformance.forEach(st => {
      performanceMap[st.name] = st;
    });
  }

  let totalBaseSalary = 0;
  let totalCommissions = 0;

  const staffPayouts = staff.map(st => {
    const perf = performanceMap[st.name] || { revenue: 0, count: 0, totalBilled: 0 };
    const edits = salaryEdits[st._id] || { salary: st.salary || 0, commission: st.commission || 0 };
    
    const att = (report && report.attendanceSummary && report.attendanceSummary[st._id]) || { Present: 0, Absent: 0, Leave: 0 };
    const presentCount = att.Present || 0;
    const leaveCount = att.Leave || 0;
    const absentCount = att.Absent || 0;
    const totalWorkingDays = presentCount + leaveCount + absentCount;
    
    const suggestedFixedBase = totalWorkingDays > 0 
      ? Math.round(((st.salary || 0) * presentCount) / totalWorkingDays)
      : (st.salary || 0);

    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const matchedPayout = (payoutHistory || []).find(p => {
      const pStaffId = p.staff?._id || p.staff;
      return pStaffId === st._id && p.month === currentMonthStr;
    });
    const isPaid = !!matchedPayout;

    const commissionVal = Math.round((perf.revenue * edits.commission) / 100);
    const totalPayout = edits.salary + commissionVal;
    
    totalBaseSalary += edits.salary;
    totalCommissions += commissionVal;

    return {
      ...st,
      revenue: perf.revenue,
      totalBilled: perf.totalBilled !== undefined ? perf.totalBilled : perf.revenue,
      visits: perf.count,
      commissionEarned: commissionVal,
      totalPayout,
      presentCount,
      leaveCount,
      absentCount,
      suggestedFixedBase,
      isPaid
    };
  });

  const formatAmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const filteredHistory = payoutHistory.filter(p => !historyMonthFilter || p.month === historyMonthFilter);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Staff Salaries & Commissions</h2>
          <p className="text-sm text-slate-500 font-medium">Manage stylist compensation parameters, log payroll payouts, and track commission expenses.</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'payroll' 
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Active Payroll
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'history' 
                ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Payout History
          </button>
        </div>
      </div>

      {activeTab === 'payroll' ? (
        /* TAB 1: ACTIVE PAYROLL CONFIG & PENDING PAYOUTS */
        <div className="space-y-8">
          {/* KPI Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[28px] border border-slate-100/60 shadow-soft flex items-center justify-between">
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Base Salaries</span>
                <span className="block text-2xl font-black text-slate-800">{formatAmt(totalBaseSalary)}</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shadow-soft">
                <Wallet className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-[28px] border border-slate-100/60 shadow-soft flex items-center justify-between">
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Commissions Billed</span>
                <span className="block text-2xl font-black text-slate-800">{formatAmt(totalCommissions)}</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-soft">
                <Coins className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-[28px] border border-slate-100/60 shadow-soft flex items-center justify-between">
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Est. Monthly Payroll</span>
                <span className="block text-2xl font-black text-slate-800">{formatAmt(totalBaseSalary + totalCommissions)}</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-soft">
                <IndianRupee className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Active Payroll: Desktop View Table */}
          <div className="hidden md:block bg-white rounded-[28px] border border-slate-100/60 shadow-soft overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Staff Compensation Ledger</h3>
              <p className="text-xs text-slate-400">Configure parameters and record payroll payouts per stylist</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 uppercase text-[9px] tracking-wider">
                    <th className="py-4 px-6">Stylist / Role</th>
                    <th className="py-4 px-4">Sales Billed</th>
                    <th className="py-4 px-4">Attendance</th>
                    <th className="py-4 px-4">Base Fixed Salary</th>
                    <th className="py-4 px-4">Commission Rate</th>
                    <th className="py-4 px-4">Gross Billed Sales</th>
                    <th className="py-4 px-4">Commissionable Base (Service)</th>
                    <th className="py-4 px-4">Commission Due</th>
                    <th className="py-4 px-4">Total Payout</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {staffPayouts.map(st => {
                    const edits = salaryEdits[st._id] || { salary: 0, commission: 0 };
                    return (
                      <tr key={st._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4.5 px-6">
                          <div>
                            <span className="block font-bold text-slate-800 text-sm">{st.name}</span>
                            <span className="block text-[10px] text-slate-400 font-semibold">{st.role}</span>
                          </div>
                        </td>
                        <td className="py-4.5 px-4 font-semibold text-slate-650">
                          {st.visits} customer visits
                        </td>
                        <td className="py-4.5 px-4">
                          {st.presentCount + st.leaveCount + st.absentCount > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              <span className="inline-block bg-emerald-50 text-emerald-600 border border-emerald-100/50 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                P: {st.presentCount}d
                              </span>
                              {st.leaveCount > 0 && (
                                <span className="inline-block bg-amber-50 text-amber-600 border border-amber-100/50 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                  L: {st.leaveCount}d
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-medium text-[11px]">No logs</span>
                          )}
                        </td>
                        <td className="py-4.5 px-4 w-40">
                          <div className="relative w-32">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-[10px]">
                              ₹
                            </span>
                            <input
                              type="number"
                              value={edits.salary}
                              onChange={(e) => handleInputChange(st._id, 'salary', e.target.value)}
                              className="form-input !py-1.5 !pl-7 text-xs font-bold w-full"
                              min={0}
                            />
                          </div>
                          {st.presentCount + st.leaveCount + st.absentCount > 0 && (
                            <span className="block text-[9px] font-bold text-slate-400 mt-1">
                              Pro-rata: {formatAmt(st.suggestedFixedBase)}
                            </span>
                          )}
                        </td>
                        <td className="py-4.5 px-4 w-32">
                          <div className="flex items-center gap-1.5 w-24">
                            <input
                              type="number"
                              value={edits.commission}
                              onChange={(e) => handleInputChange(st._id, 'commission', e.target.value)}
                              className="form-input !py-1.5 text-center text-xs font-bold w-14 shrink-0"
                              min={0}
                              max={100}
                            />
                            <span className="font-bold text-slate-400 text-xs shrink-0">%</span>
                          </div>
                        </td>
                        <td className="py-4.5 px-4 font-bold text-slate-650">
                          {formatAmt(st.totalBilled)}
                        </td>
                        <td className="py-4.5 px-4 font-bold text-slate-850">
                          {formatAmt(st.revenue)}
                        </td>
                        <td className="py-4.5 px-4 font-extrabold text-emerald-600">
                          {formatAmt(st.commissionEarned)}
                        </td>
                        <td className="py-4.5 px-4 font-black text-slate-900 text-sm">
                          {formatAmt(st.totalPayout)}
                        </td>
                        <td className="py-4.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSaveStaffSettings(st)}
                              disabled={saving}
                              className="btn-accent !py-1.5 !px-3 text-[10px] font-bold flex items-center gap-1 hover:shadow-sm"
                            >
                              <Save className="w-3.5 h-3.5" /> Save
                            </button>
                            {st.isPaid ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider">
                                <Check className="w-3.5 h-3.5 text-emerald-650" /> Paid
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setPayTargetStaff(st);
                                  setPayBase(st.suggestedFixedBase || st.salary || 0);
                                  setPayCommission(st.commissionEarned || 0);
                                  setPayNotes(`Salary and commission payment for month`);
                                  setShowPayModal(true);
                                }}
                                className="btn-primary !py-1.5 !px-3 text-[10px] font-bold flex items-center gap-1 hover:shadow-sm"
                              >
                                <Coins className="w-3.5 h-3.5" /> Pay
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Payroll: Mobile Responsive Cards List */}
          <div className="md:hidden space-y-4">
            {staffPayouts.map(st => {
              const edits = salaryEdits[st._id] || { salary: 0, commission: 0 };
              return (
                <div key={st._id} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-soft space-y-4 flex flex-col justify-between">
                  {/* Stylist name / role header */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-50">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm block">{st.name}</h4>
                      <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wide mt-0.5 block">{st.role}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSaveStaffSettings(st)}
                        disabled={saving}
                        className="btn-accent !py-1.5 !px-3 text-[10px] font-bold flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" /> Save
                      </button>
                      {st.isPaid ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider">
                          <Check className="w-3.5 h-3.5 text-emerald-650" /> Paid
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setPayTargetStaff(st);
                            setPayBase(st.suggestedFixedBase || st.salary || 0);
                            setPayCommission(st.commissionEarned || 0);
                            setPayNotes(`Salary and commission payment for month`);
                            setShowPayModal(true);
                          }}
                          className="btn-primary !py-1.5 !px-3 text-[10px] font-bold flex items-center gap-1"
                        >
                          <Coins className="w-3 h-3" /> Pay
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Visit and attendance info row */}
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-550">
                    <span>{st.visits} client visits</span>
                    <div>
                      {st.presentCount + st.leaveCount + st.absentCount > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100/50 text-[10px] font-bold">
                            Presents: {st.presentCount}d
                          </span>
                          {st.leaveCount > 0 && (
                            <span className="bg-amber-50 text-amber-605 px-2 py-0.5 rounded border border-amber-100/50 text-[10px] font-bold">
                              Leaves: {st.leaveCount}d
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium text-[10px]">No attendance logged</span>
                      )}
                    </div>
                  </div>

                  {/* Parameter Configurations */}
                  <div className="grid grid-cols-2 gap-3.5 bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fixed Salary (₹)</label>
                      <input
                        type="number"
                        value={edits.salary}
                        onChange={(e) => handleInputChange(st._id, 'salary', e.target.value)}
                        className="form-input !py-1 px-2.5 text-xs font-bold text-slate-800 bg-white"
                        min={0}
                      />
                      {st.presentCount + st.leaveCount + st.absentCount > 0 && (
                        <span className="block text-[9px] font-bold text-slate-400 mt-1">
                          Pro-rata: {formatAmt(st.suggestedFixedBase)}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Commission %</label>
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                        <input
                          type="number"
                          value={edits.commission}
                          onChange={(e) => handleInputChange(st._id, 'commission', e.target.value)}
                          className="w-10 text-center text-xs font-bold text-slate-800 border-none outline-none p-0"
                          min={0}
                          max={100}
                        />
                        <span className="font-bold text-slate-400 text-xs">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Operational and Incentive metrics */}
                  <div className="grid grid-cols-2 gap-y-2 text-xs pt-1">
                    <div className="flex justify-between items-center text-slate-500 font-semibold border-r border-slate-100 pr-3">
                      <span>Gross Sales:</span>
                      <span className="font-bold text-slate-800">{formatAmt(st.totalBilled)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500 font-semibold pl-3">
                      <span>Service Base:</span>
                      <span className="font-bold text-slate-800">{formatAmt(st.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500 font-semibold border-r border-slate-100 pr-3">
                      <span>Commission:</span>
                      <span className="font-bold text-emerald-600">{formatAmt(st.commissionEarned)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-800 font-extrabold pl-3">
                      <span>Total Payout:</span>
                      <span className="text-sm font-black text-rose-600">{formatAmt(st.totalPayout)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* TAB 2: PAYOUT HISTORY LEDGER */
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white p-6 rounded-[28px] shadow-soft border border-slate-100/60 flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Filter Month</label>
              <input
                type="month"
                value={historyMonthFilter}
                onChange={(e) => setHistoryMonthFilter(e.target.value)}
                className="px-4 py-2.5 bg-slate-50 border border-slate-150 text-xs rounded-xl focus:outline-none focus:border-accent text-slate-800 font-bold"
              />
            </div>
            {historyMonthFilter && (
              <button
                onClick={() => setHistoryMonthFilter('')}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 text-xs font-bold rounded-xl mt-6 self-end transition"
              >
                Clear Filter
              </button>
            )}
          </div>

          {loadingHistory ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-semibold">Loading payout records...</p>
            </div>
          ) : (
            <>
              {/* Payout History: Desktop View Table */}
              <div className="hidden md:block bg-white rounded-[28px] border border-slate-100/60 shadow-soft overflow-hidden">
                <div className="p-6 border-b border-slate-50">
                  <h3 className="font-bold text-slate-800 text-sm">Salary Payout History</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Logs of confirmed base salary and commission disbursements</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 uppercase text-[9px] tracking-wider">
                        <th className="py-4 px-6">Payment Date</th>
                        <th className="py-4 px-4">Stylist / Role</th>
                        <th className="py-4 px-4">Target Period</th>
                        <th className="py-4 px-4 text-right">Base Salary</th>
                        <th className="py-4 px-4 text-right">Commission</th>
                        <th className="py-4 px-4 text-right">Total Paid</th>
                        <th className="py-4 px-4 text-center">Method</th>
                        <th className="py-4 px-4">Notes</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-700">
                      {filteredHistory.length > 0 ? (
                        filteredHistory.map(record => (
                          <tr key={record._id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6 font-semibold text-slate-500">
                              {new Date(record.paidAt).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                              <span className="block text-[10px] text-slate-400 font-normal">
                                {new Date(record.paidAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="font-bold text-slate-800 block">{record.staff?.name || 'Unknown'}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">{record.staff?.role}</span>
                            </td>
                            <td className="py-4 px-4 font-bold text-slate-650">
                              <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200/50 text-[10px]">
                                {record.month}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-slate-650">
                              {formatAmt(record.baseSalary)}
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-slate-650">
                              {formatAmt(record.commission)}
                            </td>
                            <td className="py-4 px-4 text-right font-black text-rose-600 text-sm">
                              {formatAmt(record.totalPaid)}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider border ${
                                record.paymentMethod === 'UPI' 
                                  ? 'bg-blue-50 border-blue-100 text-blue-600'
                                  : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                              }`}>
                                {record.paymentMethod}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-slate-500 font-medium max-w-xs truncate" title={record.notes}>
                              {record.notes || '-'}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button
                                onClick={() => handleDeletePayout(record._id)}
                                className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl border border-rose-100/50 transition-all inline-flex items-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="9" className="py-12 text-center text-slate-400 font-medium">
                            No salary payouts logged for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payout History: Mobile Responsive Cards List */}
              <div className="md:hidden space-y-4">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map(record => (
                    <div key={record._id} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-soft space-y-3.5 flex flex-col justify-between">
                      {/* Card title paid details */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-sm">{record.staff?.name || 'Unknown'}</h4>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5 block">{record.staff?.role}</span>
                        </div>
                        <button
                          onClick={() => handleDeletePayout(record._id)}
                          className="p-1.5 bg-rose-50 text-rose-550 hover:bg-rose-100 rounded-lg border border-rose-100/50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Disbursed information details */}
                      <div className="grid grid-cols-2 gap-y-2 text-xs">
                        <div className="flex justify-between items-center text-slate-500 font-semibold border-r border-slate-100 pr-3">
                          <span>Pay Date:</span>
                          <span className="font-bold text-slate-800">
                            {new Date(record.paidAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500 font-semibold pl-3">
                          <span>Month Period:</span>
                          <span className="font-extrabold text-slate-800">{record.month}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500 font-semibold border-r border-slate-100 pr-3">
                          <span>Base Salary:</span>
                          <span className="font-bold text-slate-800">{formatAmt(record.baseSalary)}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500 font-semibold pl-3">
                          <span>Commission:</span>
                          <span className="font-bold text-slate-800">{formatAmt(record.commission)}</span>
                        </div>
                      </div>

                      {/* Payment method and total amount paid */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-xs">
                        <span className={`inline-block px-2.5 py-0.5 rounded-xl text-[10px] font-black border ${
                          record.paymentMethod === 'UPI' 
                            ? 'bg-blue-50 border-blue-100 text-blue-600'
                            : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                        }`}>
                          {record.paymentMethod}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-450 font-bold">Total Paid:</span>
                          <span className="font-black text-rose-600 text-sm">{formatAmt(record.totalPaid)}</span>
                        </div>
                      </div>

                      {/* Memo notes */}
                      {record.notes && (
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[10px] font-semibold text-slate-500 flex items-start gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{record.notes}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-450 bg-white border border-slate-100 rounded-3xl text-xs font-semibold shadow-soft">
                    No salary payouts logged for this period.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* RECORD PAYOUT MODAL */}
      {showPayModal && payTargetStaff && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-scaleUp">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Record Salary Payment</h3>
                <p className="text-xs text-slate-400 mt-0.5">Disburse salary base and commissions</p>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-650 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRecordPayout} className="p-6 space-y-5">
              {/* Stylist Card Details */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="block font-black text-slate-800 text-sm">{payTargetStaff.name}</span>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{payTargetStaff.role}</span>
                </div>
                <span className="text-[10px] font-black text-accent-dark bg-accent/15 px-2.5 py-1 rounded-xl border border-accent/25 uppercase tracking-wider">
                  Disbursing
                </span>
              </div>

              {/* Month Period */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Target Month Period
                </label>
                <input
                  type="month"
                  value={payMonth}
                  onChange={(e) => setPayMonth(e.target.value)}
                  className="form-input text-xs bg-white font-bold"
                  required
                />
              </div>

              {/* Salary Components */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5" /> Base Fixed Salary (₹)
                  </label>
                  <input
                    type="number"
                    value={payBase}
                    onChange={(e) => setPayBase(Number(e.target.value || 0))}
                    className="form-input text-xs font-bold text-right"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Commission (₹)
                  </label>
                  <input
                    type="number"
                    value={payCommission}
                    onChange={(e) => setPayCommission(Number(e.target.value || 0))}
                    className="form-input text-xs font-bold text-right"
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" /> Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/50">
                  {['UPI', 'Cash'].map(method => {
                    const isSel = payMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPayMethod(method)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          isSel 
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                        }`}
                      >
                        {method}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Payment Notes / Memo
                </label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Month check payment..."
                  className="form-input text-xs min-h-[60px] resize-none"
                />
              </div>

              {/* Total payout preview */}
              <div className="bg-rose-50/65 border border-rose-100 p-4 rounded-2xl flex justify-between items-center text-xs">
                <span className="font-bold text-slate-650">Total Disbursed Payout:</span>
                <span className="text-xl font-black text-rose-600">
                  {formatAmt(Number(payBase) + Number(payCommission))}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payingPayout}
                  className="flex-1 btn-accent py-2.5 text-xs font-bold shadow-md shadow-accent/10 flex items-center justify-center gap-1.5"
                >
                  {payingPayout ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Recording...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Record Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
