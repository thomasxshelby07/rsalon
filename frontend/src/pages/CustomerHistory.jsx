import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Calendar, 
  User, 
  Scissors, 
  Clock, 
  Tag, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle,
  HelpCircle,
  Download,
  Users,
  Award,
  History,
  Trash2,
  Smartphone,
  Wallet
} from 'lucide-react';
import apiCall from '../api';
import { toast } from 'react-hot-toast';

export default function CustomerHistory() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Search query from URL param
  const urlSearch = searchParams.get('search') || '';
  const urlTab = searchParams.get('tab') || 'all';

  // Local state
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [dateFilter, setDateFilter] = useState('today'); // today, week, month, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

  // CRM Tab States
  const [activeTab, setActiveTab] = useState(urlTab); // all, repeat, dues
  const [repeatCustomers, setRepeatCustomers] = useState([]);
  const [repeatLoading, setRepeatLoading] = useState(false);

  const [selectedDueEntry, setSelectedDueEntry] = useState(null);
  const [showDueModal, setShowDueModal] = useState(false);

  const [staffFilter, setStaffFilter] = useState('All');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [staffList, setStaffList] = useState([]);
  const [serviceList, setServiceList] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const role = localStorage.getItem('role');

  useEffect(() => {
    if (urlTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleDelete = async (entryId) => {
    if (!window.confirm('Kya aap is entry ko permanently delete karna chahte hain?')) return;
    try {
      await apiCall(`/entries/${entryId}`, { method: 'DELETE' });
      setEntries(prev => prev.filter(e => e._id !== entryId));
      toast.success('Entry deleted successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to delete entry');
    }
  };

  const openClearDueDialog = (entry) => {
    setSelectedDueEntry(entry);
    setShowDueModal(true);
  };

  const handleClearDueSubmit = async (method) => {
    try {
      const loadingToast = toast.loading(`Clearing due of ₹${selectedDueEntry.dueAmount} via ${method}...`);
      await apiCall(`/entries/${selectedDueEntry._id}/clear-due`, {
        method: 'PUT',
        body: { paymentMode: method }
      });
      toast.dismiss(loadingToast);
      toast.success('Due payment received and registry updated!');
      setShowDueModal(false);
      setSelectedDueEntry(null);
      fetchEntries(); // Refresh lists
    } catch (err) {
      toast.error(err.message || 'Failed to clear due');
    }
  };

  // Load filter option data lists
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const staffRes = await apiCall('/staff');
        setStaffList(staffRes || []);
        const serviceRes = await apiCall('/services');
        setServiceList(serviceRes || []);
      } catch (err) {
        console.error('Failed to load filter lists', err);
      }
    };
    loadMetadata();
  }, []);

  // Sync url search param with local search input
  useEffect(() => {
    setSearchQuery(urlSearch);
  }, [urlSearch]);

  const fetchRepeatCustomers = async () => {
    try {
      setRepeatLoading(true);
      const res = await apiCall('/customers/repeat');
      setRepeatCustomers(res);
    } catch (err) {
      toast.error('Failed to load repeat customer roster');
    } finally {
      setRepeatLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'repeat') {
      fetchRepeatCustomers();
    }
  }, [activeTab]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: urlSearch,
        filter: activeTab === 'dues' ? 'all' : dateFilter,
        page: page.toString(),
        limit: '15'
      });

      if (activeTab === 'dues') {
        params.append('dueStatus', 'pending');
      }

      if (dateFilter === 'custom' && activeTab !== 'dues') {
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
      }

      if (staffFilter && staffFilter !== 'All') {
        params.append('staffId', staffFilter);
      }

      if (serviceFilter && serviceFilter !== 'All') {
        params.append('serviceName', serviceFilter);
      }

      const res = await apiCall(`/entries?${params.toString()}`);
      setEntries(res.entries);
      setTotalPages(res.totalPages);
      setTotalEntries(res.totalEntries);
    } catch (err) {
      toast.error('Failed to load visit history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [urlSearch, dateFilter, page, staffFilter, serviceFilter, activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ search: searchQuery });
    setPage(1);
  };

  const handleCustomDateSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEntries();
  };

  // Helper to format currency
  const formatAmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  // Excel CSV Export Handler
  const handleExportExcel = () => {
    if (entries.length === 0) {
      toast.error('No registry data to export');
      return;
    }

    const headers = [
      'Date & Time',
      'Customer Name',
      'Mobile Number',
      'Assigned Staff',
      'Services Billed',
      'Subtotal Amount (INR)',
      'Discount Applied (INR)',
      'Final Bill Paid (INR)',
      'Payment Mode',
      'Notes'
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      let str = val.toString();
      str = str.replace(/"/g, '""');
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        str = `"${str}"`;
      }
      return str;
    };

    const formatCsvDate = (dateStr) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN') + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const rows = entries.map(entry => [
      formatCsvDate(entry.createdAt),
      entry.customer?.name || 'Walk-in',
      entry.customer?.phone || '',
      entry.staff?.name || 'N/A',
      entry.services.map(s => s.name).join(' | '),
      entry.subtotal,
      entry.discount,
      entry.finalAmount,
      entry.paymentMode,
      entry.notes || ''
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `rsalon_visits_${dateFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Spreadsheet generated! Open in Microsoft Excel.');
  };

  // Export Repeat Customers CSV
  const handleExportRepeatExcel = () => {
    if (repeatCustomers.length === 0) {
      toast.error('No loyal customer data to export');
      return;
    }

    const headers = [
      'Customer Name',
      'Mobile Number',
      'Visits Counter',
      'Total Value Billed (INR)',
      'Last Visit Date & Time'
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      let str = val.toString();
      str = str.replace(/"/g, '""');
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        str = `"${str}"`;
      }
      return str;
    };

    const formatDateCsv = (dateStr) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN') + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const rows = repeatCustomers.map(c => [
      c.name,
      c.phone,
      c.visitCount,
      c.totalSpent,
      formatDateCsv(c.lastVisit)
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `rsalon_repeat_customers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Loyal customer marketing sheet downloaded!');
  };

  // Helper to format date
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Visit Registry</h2>
        <p className="text-sm text-slate-500 font-medium">Browse historical entries, view billed services, and filter by dates.</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-700/60 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-6 py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'all'
              ? 'border-accent text-accent-dark'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          All Visits Log
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dues')}
          className={`px-6 py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'dues'
              ? 'border-accent text-accent-dark'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Pending Dues
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('repeat')}
          className={`px-6 py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'repeat'
              ? 'border-accent text-accent-dark'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Loyal / Repeat Customers
        </button>
      </div>

      {activeTab === 'all' || activeTab === 'dues' ? (
        <>
          {/* Filter and Search Bar */}
          <div className="bg-white p-6 rounded-[28px] shadow-soft border border-slate-100/60 space-y-4">
            <div className="flex items-center gap-3">
              {/* Search Input */}
              <form onSubmit={handleSearchSubmit} className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                <input
                  type="text"
                  placeholder="Search by customer name, phone, service, or payment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input !pl-11"
                />
              </form>

              {/* Filter Toggle Button */}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`p-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-xs font-bold shrink-0 ${
                  showFilters || staffFilter !== 'All' || serviceFilter !== 'All' || dateFilter !== 'today'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {(staffFilter !== 'All' || serviceFilter !== 'All' || dateFilter !== 'today') && (
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </button>

              {/* Export Excel Button */}
              <button
                onClick={handleExportExcel}
                disabled={entries.length === 0}
                className="btn-secondary !py-3 !px-4 text-xs font-bold flex items-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>

            {/* Dropdown Filters Grid - Toggleable */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-150 animate-fadeIn">
                {/* Date Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date Period</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value);
                      setPage(1);
                    }}
                    className="form-input text-xs bg-white cursor-pointer font-semibold"
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Date Range...</option>
                  </select>
                </div>

                {/* Stylist Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Filter Stylist</label>
                  <select
                    value={staffFilter}
                    onChange={(e) => {
                      setStaffFilter(e.target.value);
                      setPage(1);
                    }}
                    className="form-input text-xs bg-white cursor-pointer font-semibold"
                  >
                    <option value="All">All Stylists</option>
                    {staffList.map(st => (
                      <option key={st._id} value={st._id}>{st.name}</option>
                    ))}
                  </select>
                </div>

                {/* Service Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Filter Service</label>
                  <select
                    value={serviceFilter}
                    onChange={(e) => {
                      setServiceFilter(e.target.value);
                      setPage(1);
                    }}
                    className="form-input text-xs bg-white cursor-pointer font-semibold"
                  >
                    <option value="All">All Services</option>
                    {serviceList.map(svc => (
                      <option key={svc._id} value={svc.name}>{svc.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

        {/* Custom date range inputs */}
        {dateFilter === 'custom' && (
          <form onSubmit={handleCustomDateSubmit} className="flex flex-wrap items-end gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 text-xs rounded-xl focus:outline-none focus:border-accent text-slate-800 font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 text-xs rounded-xl focus:outline-none focus:border-accent text-slate-800 font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-primary-light text-white text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" /> Apply
            </button>
          </form>
        )}
      </div>

      {/* History List */}
      {loading ? (
        <div className="h-48 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading visit history...</p>
        </div>
      ) : entries.length > 0 ? (
        <div className="space-y-4">
          {/* List grid - Converts to stacked cards on mobile */}
          <div className="hidden md:block bg-white rounded-[28px] shadow-soft border border-slate-100/60 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Visit Date & Time</th>
                  <th className="px-6 py-4 font-semibold">Customer Details</th>
                  <th className="px-6 py-4 font-semibold">Assigned Staff</th>
                  <th className="px-6 py-4 font-semibold">Purchased Services</th>
                  <th className="px-6 py-4 font-semibold">Payment Info</th>
                  <th className="px-6 py-4 font-semibold text-right">Bill Total</th>
                  {role === 'super_admin' && <th className="px-6 py-4"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs text-slate-650">
                {entries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">{formatDate(entry.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center font-bold text-[11px] text-accent-dark">
                          {entry.customer?.name ? entry.customer.name.substring(0, 2).toUpperCase() : 'CU'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{entry.customer?.name || 'Walk-in'}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{entry.customer?.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 font-semibold">
                        {entry.staff?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[280px]">
                        {entry.services.map((s, idx) => (
                          <span 
                            key={idx} 
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-slate-100 text-slate-650 rounded-lg text-[9px] font-bold border border-slate-150/40"
                          >
                            <Scissors className="w-2.5 h-2.5 text-slate-400" />
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold w-max ${
                            entry.paymentMode === 'Cash' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            entry.paymentMode === 'UPI' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                            entry.paymentMode === 'Card' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            entry.paymentMode === 'Partial' ? 'bg-amber-55 text-amber-700 border border-amber-200' :
                            'bg-purple-50 text-purple-600 border border-purple-100'
                          }`}>
                            {entry.paymentMode}
                          </span>
                          {entry.dueStatus === 'pending' && entry.dueAmount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-red-600 border border-red-100 animate-pulse">
                              Due Pending
                            </span>
                          )}
                        </div>
                        {entry.discount > 0 && (
                          <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                            <Tag className="w-2.5 h-2.5 text-amber-500" /> Save {formatAmt(entry.discount)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {entry.dueStatus === 'pending' && entry.dueAmount > 0 ? (
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-500 text-[10px]">Total: {formatAmt(entry.finalAmount)}</p>
                          <p className="text-[10px] text-emerald-600 font-bold">Paid: {formatAmt(entry.finalAmount - entry.dueAmount)}</p>
                          <p className="text-[11px] text-red-600 font-extrabold">Due: {formatAmt(entry.dueAmount)}</p>
                          <button
                            onClick={() => openClearDueDialog(entry)}
                            className="text-[10px] font-bold text-primary hover:text-primary-light hover:underline mt-1 block ml-auto"
                          >
                            Clear Due
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="font-extrabold text-slate-900 text-sm">{formatAmt(entry.finalAmount)}</p>
                          {entry.dueStatus === 'paid' && entry.dueClearMethod && (
                            <p className="text-[9px] text-slate-400 font-semibold">
                              (Due Cleared via {entry.dueClearMethod})
                            </p>
                          )}
                          {entry.discount > 0 && (
                            <p className="text-[10px] text-slate-400 line-through font-medium">{formatAmt(entry.subtotal)}</p>
                          )}
                        </>
                      )}
                    </td>
                    {role === 'super_admin' && (
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleDelete(entry._id)}
                          className="p-2 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all duration-200"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards Layout for Mobile */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {entries.map((entry) => (
              <div 
                key={entry._id} 
                className="bg-white p-5 rounded-3xl shadow-soft border border-slate-100/60 space-y-4 text-xs"
              >
                <div className="flex justify-between items-center border-b border-slate-55 pb-3">
                  <div>
                    <p className="font-bold text-slate-800">{entry.customer?.name || 'Walk-in'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{entry.customer?.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-400">{formatDate(entry.createdAt).split(',')[0]}</span>
                    {role === 'super_admin' && (
                      <button
                        onClick={() => handleDelete(entry._id)}
                        className="p-1.5 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold text-[10px] uppercase">Staff Assigned</span>
                    <span className="font-semibold text-slate-700">{entry.staff?.name || 'N/A'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold text-[10px] uppercase block mb-1">Services</span>
                    <div className="flex flex-wrap gap-1">
                      {entry.services.map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md font-bold text-[9px] text-slate-650">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between pt-2 border-t border-slate-50 items-center">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        entry.paymentMode === 'Cash' ? 'bg-emerald-50 text-emerald-600' :
                        entry.paymentMode === 'UPI' ? 'bg-blue-50 text-blue-600' :
                        entry.paymentMode === 'Card' ? 'bg-amber-50 text-amber-600' :
                        entry.paymentMode === 'Partial' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-purple-50 text-purple-650'
                      }`}>
                        {entry.paymentMode}
                      </span>
                      {entry.dueStatus === 'pending' && entry.dueAmount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-red-655 animate-pulse">
                          Due
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      {entry.dueStatus === 'pending' && entry.dueAmount > 0 ? (
                        <div className="space-y-0.5 text-right">
                          <p className="font-bold text-slate-500 text-[10px]">Total: {formatAmt(entry.finalAmount)}</p>
                          <p className="text-[10px] text-emerald-600 font-bold">Paid: {formatAmt(entry.finalAmount - entry.dueAmount)}</p>
                          <p className="text-[10.5px] text-red-600 font-extrabold">Due: {formatAmt(entry.dueAmount)}</p>
                          <button
                            onClick={() => openClearDueDialog(entry)}
                            className="text-[10px] font-bold text-primary hover:text-primary-light hover:underline mt-1 block ml-auto"
                          >
                            Clear Due
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-extrabold text-slate-900">{formatAmt(entry.finalAmount)}</span>
                          {entry.dueStatus === 'paid' && entry.dueClearMethod && (
                            <p className="text-[9px] text-slate-400 font-semibold">
                              (Due Cleared via {entry.dueClearMethod})
                            </p>
                          )}
                          {entry.discount > 0 && <span className="block text-[9px] text-slate-400 line-through">Sub: {formatAmt(entry.subtotal)}</span>}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {entry.notes && (
                  <div className="p-3 bg-slate-50 rounded-2xl text-[10px] font-medium text-slate-500 flex gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{entry.notes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-slate-500 font-medium">
                Showing Page <b>{page}</b> of <b>{totalPages}</b> (Total {totalEntries} entries)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-[28px] border border-slate-100 shadow-soft text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <HelpCircle className="w-10 h-10 text-slate-350" />
          <p className="text-sm font-semibold">No visits match your filter query.</p>
          <span className="text-xs text-slate-400">Try adjusting the search spelling or selecting a wider date range.</span>
        </div>
      )}
    </>
  ) : (
    /* Repeat Customers CRM Panel */
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[28px] border border-slate-100/60 shadow-soft">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Loyalty / Repeated Customer Registry</h3>
              <p className="text-xs text-slate-400">Clients who have visited 2 or more times sorted by return frequency</p>
            </div>
            
            <button
              onClick={handleExportRepeatExcel}
              disabled={repeatCustomers.length === 0}
              className="btn-accent !py-2.5 text-xs font-bold flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Export Repeat Customers
            </button>
          </div>

          {repeatLoading ? (
            <div className="h-40 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-500">Compiling customer retention indexes...</p>
            </div>
          ) : repeatCustomers.length > 0 ? (
            <div className="bg-white rounded-[28px] border border-slate-100/60 shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 uppercase text-[9px] tracking-wider">
                      <th className="py-4 px-6">Customer Profile</th>
                      <th className="py-4 px-4 text-center">Total Visits</th>
                      <th className="py-4 px-4">Total Revenue Generated</th>
                      <th className="py-4 px-4">Last Visit Date</th>
                      <th className="py-4 px-6 text-right">Loyalty Insights</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {repeatCustomers.map(c => (
                      <tr key={c._id || c.phone} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4.5 px-6">
                          <div>
                            <span className="block font-bold text-slate-800 text-sm">{c.name}</span>
                            <span className="block text-[10px] text-slate-400 font-semibold">{c.phone}</span>
                          </div>
                        </td>
                        <td className="py-4.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-100/40 text-amber-700 font-bold rounded-full text-[10px]">
                            <Award className="w-3.5 h-3.5" /> {c.visitCount} visits
                          </span>
                        </td>
                        <td className="py-4.5 px-4 font-black text-slate-900 text-sm">
                          ₹{c.totalSpent.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4.5 px-4 font-semibold text-slate-650">
                          {new Date(c.lastVisit).toLocaleDateString('en-IN')} {new Date(c.lastVisit).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-4.5 px-6 text-right">
                          <button
                            onClick={() => {
                              setSearchQuery(c.phone);
                              setSearchParams({ search: c.phone });
                              setDateFilter('all');
                              setActiveTab('all');
                              setPage(1);
                            }}
                            className="btn-secondary !py-1.5 !px-3.5 text-[10px] font-bold inline-flex items-center gap-1 hover:border-accent hover:text-accent-dark transition-all"
                          >
                            <History className="w-3.5 h-3.5" /> View Visit Logs
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-[28px] border border-slate-100 shadow-soft text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Users className="w-10 h-10 text-slate-350" />
              <p className="text-sm font-semibold">No repeated customers registered yet.</p>
              <span className="text-xs text-slate-400">Once clients visit the salon 2 or more times, they will automatically compile here.</span>
            </div>
          )}
        </div>
      )}

      {/* Clear Due Modal */}
      {showDueModal && selectedDueEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-800">Clear Pending Due</h3>
              <p className="text-xs text-slate-500 font-medium">
                Customer: <b>{selectedDueEntry.customer?.name || 'Walk-in'}</b>
              </p>
              <div className="py-3 bg-rose-50 rounded-2xl border border-rose-100 inline-block px-6">
                <span className="text-xs font-bold text-slate-500 uppercase block tracking-wider">Due Amount</span>
                <span className="text-xl font-extrabold text-rose-700">₹{selectedDueEntry.dueAmount}</span>
              </div>
            </div>

            <div className="space-y-3">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Select Payment Mode</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleClearDueSubmit('Cash')}
                  className="py-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-2xl font-bold transition-all text-xs flex flex-col items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <Wallet className="w-5 h-5 text-emerald-650" />
                  Cash Received
                </button>
                <button
                  onClick={() => handleClearDueSubmit('UPI')}
                  className="py-3.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-2xl font-bold transition-all text-xs flex flex-col items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <Smartphone className="w-5 h-5 text-blue-650" />
                  UPI Received
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setShowDueModal(false);
                setSelectedDueEntry(null);
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-bold rounded-2xl transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
