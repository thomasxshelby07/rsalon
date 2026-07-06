import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  IndianRupee, 
  Scissors, 
  Tag, 
  TrendingUp, 
  Download,
  AlertCircle,
  Clock,
  Check
} from 'lucide-react';
import apiCall from '../api';
import { toast } from 'react-hot-toast';

export default function StaffReport() {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await apiCall('/staff');
        const activeStaff = res.filter(s => s.status === 'active');
        setStaffList(activeStaff);
        if (activeStaff.length > 0) {
          setSelectedStaffId(activeStaff[0]._id);
        }
      } catch (err) {
        toast.error('Failed to load stylist roster');
        console.error(err);
      }
    };
    fetchStaff();
  }, []);

  const fetchStaffReport = async () => {
    if (!selectedStaffId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await apiCall(`/reports/staff/${selectedStaffId}?${params.toString()}`);
      setReportData(res);
    } catch (err) {
      toast.error('Failed to load stylist performance ledger');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffReport();
  }, [selectedStaffId, startDate, endDate]);

  const handleExportCSV = () => {
    if (!reportData || reportData.logs.length === 0) {
      toast.error('No work logs available to export');
      return;
    }

    const { staff, summary, logs } = reportData;
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      let str = val.toString();
      str = str.replace(/"/g, '""');
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        str = `"${str}"`;
      }
      return str;
    };

    const lines = [];
    lines.push(escapeCSV(`STAFF WORK LEDGER REPORT - ${staff.name.toUpperCase()}`));
    lines.push(`${escapeCSV('Stylist Role:')},${escapeCSV(staff.role)}`);
    lines.push(`${escapeCSV('Commission Rate:')},${staff.commissionRate}%`);
    lines.push(`${escapeCSV('Report Period:')},${escapeCSV(startDate || 'All Time')} to ${escapeCSV(endDate || 'Today')}`);
    lines.push(`${escapeCSV('Exported On:')},${escapeCSV(new Date().toLocaleString('en-IN'))}`);
    lines.push('');

    // Summary block
    lines.push(escapeCSV('--- INCENTIVE SUMMARY ---'));
    lines.push(`${escapeCSV('Metric')},${escapeCSV('Value')}`);
    lines.push(`${escapeCSV('Total Client Visits')},${summary.totalVisits}`);
    lines.push(`${escapeCSV('Gross Sales Contribution')},${summary.grossBilledSales}`);
    lines.push(`${escapeCSV('Used Product Cost Deductions')},${summary.totalProductCost}`);
    lines.push(`${escapeCSV('Net Service Revenue')},${summary.totalServiceRevenue}`);
    lines.push(`${escapeCSV('Net Commission Earned')},${summary.totalCommissionEarned}`);
    lines.push('');

    // Work logs
    lines.push(escapeCSV('--- CLIENT VISITS LEDGER ---'));
    lines.push(`${escapeCSV('Date & Time')},${escapeCSV('Client Name')},${escapeCSV('Services Rendered')},${escapeCSV('Gross Price (INR)')},${escapeCSV('Product Cost (INR)')},${escapeCSV('Service Portion (INR)')},${escapeCSV('Commission Earned (INR)')}`);

    logs.forEach(log => {
      const serviceStr = log.services.map(s => `${s.name} (₹${s.price})`).join(' | ');
      lines.push(`${escapeCSV(new Date(log.date).toLocaleString('en-IN'))},${escapeCSV(log.customerName)},${escapeCSV(serviceStr)},${log.finalAmount},${log.productCost},${log.serviceRevenue},${log.commissionEarned}`);
    });

    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `stylist_report_${staff.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Stylist ledger exported successfully!');
  };

  const formatAmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Stylist Operational Reports</h2>
          <p className="text-sm text-slate-500 font-medium font-outfit">Detailed analysis of client entries handled, service breakdowns, and commission metrics per stylist.</p>
        </div>
        {reportData && (
          <button
            onClick={handleExportCSV}
            className="btn-primary flex items-center gap-1.5 shadow-sm text-xs py-2 px-4 self-start sm:self-auto"
          >
            <Download className="w-4 h-4" /> Export Ledger
          </button>
        )}
      </div>

      {/* Filter and Selection Dashboard */}
      <div className="bg-white p-6 rounded-[28px] shadow-soft border border-slate-100/60 flex flex-wrap items-end gap-5">
        <div className="w-full md:w-64">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Stylist</label>
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="form-input text-xs bg-white font-bold cursor-pointer"
          >
            <option value="" disabled>-- Choose Active Stylist --</option>
            {staffList.map(st => (
              <option key={st._id} value={st._id}>{st.name} ({st.role})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-150 text-xs rounded-xl focus:outline-none focus:border-accent text-slate-800 font-bold"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-150 text-xs rounded-xl focus:outline-none focus:border-accent text-slate-800 font-bold"
          />
        </div>

        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 text-xs font-bold rounded-xl transition"
          >
            Clear Date Range
          </button>
        )}
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-semibold">Compiling stylist log ledger data...</p>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Payout Status Alert Banner */}
          {reportData.payouts && reportData.payouts.length > 0 ? (
            <div className="bg-emerald-50 border border-emerald-100/60 p-4.5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-bold text-slate-800 text-xs sm:text-sm">
                    Disbursement Recorded: Paid {"₹" + reportData.payouts.reduce((sum, p) => sum + p.totalPaid, 0).toLocaleString("en-IN")} for this period
                  </span>
                  <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">
                    {reportData.payouts.map(p => `${p.paymentMethod} on ${new Date(p.paidAt).toLocaleDateString('en-IN')}${p.notes ? ` (${p.notes})` : ''}`).join(' | ')}
                  </span>
                </div>
              </div>
              <span className="self-start sm:self-auto inline-block bg-emerald-500 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
                Paid
              </span>
            </div>
          ) : (
            <div className="bg-amber-50/70 border border-amber-100/60 p-4.5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="block font-bold text-slate-800 text-xs sm:text-sm">
                    Payroll Status: Pending Payout
                  </span>
                  <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">
                    No salary disbursement logs recorded for this stylist in the selected timeframe.
                  </span>
                </div>
              </div>
              <span className="self-start sm:self-auto inline-block bg-amber-500 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
                Unpaid
              </span>
            </div>
          )}

          {/* KPI Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6">
            <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-soft border border-slate-100/60 flex items-center gap-3 sm:gap-4">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shadow-sm shrink-0">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Visits Handled</span>
                <span className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight block mt-0.5">{reportData.summary.totalVisits} clients</span>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-soft border border-slate-100/60 flex items-center gap-3 sm:gap-4">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm shrink-0">
                <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Gross Sales</span>
                <span className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight block mt-0.5">{formatAmt(reportData.summary.grossBilledSales)}</span>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-soft border border-slate-100/60 flex items-center gap-3 sm:gap-4">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-sm shrink-0">
                <Scissors className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Product Costs</span>
                <span className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight block mt-0.5">{formatAmt(reportData.summary.totalProductCost)}</span>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-soft border border-slate-100/60 flex items-center gap-3 sm:gap-4">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-sm shrink-0">
                <Tag className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Service Rev</span>
                <span className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight block mt-0.5">{formatAmt(reportData.summary.totalServiceRevenue)}</span>
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-soft border border-slate-100/60 flex items-center gap-3 sm:gap-4 col-span-2 md:col-span-1">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-pink-50 text-pink-650 flex items-center justify-center shadow-sm shrink-0">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-tight">Commission ({reportData.staff.commissionRate}%)</span>
                <span className="text-base sm:text-lg font-extrabold text-rose-600 tracking-tight block mt-0.5">{formatAmt(reportData.summary.totalCommissionEarned)}</span>
              </div>
            </div>
          </div>

          {/* Visits Table */}
          <div className="bg-white rounded-[28px] border border-slate-100/60 shadow-soft overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Services Log Ledger</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Chronological record of client entries and calculated commission splits</p>
            </div>

            {reportData.logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 uppercase text-[9px] tracking-wider">
                      <th className="py-4 px-6">Date / Time</th>
                      <th className="py-4 px-4">Client</th>
                      <th className="py-4 px-4">Services Rendered</th>
                      <th className="py-4 px-4 text-right">Gross Billing</th>
                      <th className="py-4 px-4 text-right">Used Product Cost</th>
                      <th className="py-4 px-4 text-right">Service Base</th>
                      <th className="py-4 px-6 text-right text-pink-600 font-extrabold">Commission Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700">
                    {reportData.logs.map(log => (
                      <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 text-slate-500 font-semibold">
                          {new Date(log.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {new Date(log.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-800">
                          {log.customerName}
                          <span className="block text-[10px] text-slate-400 font-normal">{log.customerPhone}</span>
                        </td>
                        <td className="py-4 px-4 max-w-xs">
                          <div className="flex flex-wrap gap-1.5">
                            {log.services.map((s, sidx) => (
                              <span 
                                key={sidx} 
                                className="inline-block bg-slate-50 text-slate-650 px-2 py-0.5 rounded-lg border border-slate-100 text-[10px] font-bold"
                              >
                                {s.name} (₹{s.price})
                                {s.isSplit && (
                                  <span className="text-[9px] font-normal text-rose-500 ml-1">
                                    (Prod: ₹{s.productPrice})
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-extrabold text-slate-850">
                          {formatAmt(log.finalAmount)}
                          {log.discount > 0 && (
                            <span className="block text-[9px] text-rose-500 font-normal">
                              Disc: -₹{log.discount}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-rose-600">
                          {formatAmt(log.productCost)}
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-slate-850">
                          {formatAmt(log.serviceRevenue)}
                        </td>
                        <td className="py-4 px-6 text-right font-black text-rose-600 text-sm">
                          {formatAmt(log.commissionEarned)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 font-medium">
                No client entries logged for this stylist in the selected timeframe.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-slate-400 text-sm font-semibold">
          Select a stylist from the dropdown list to compile their performance ledger report.
        </div>
      )}
    </div>
  );
}
