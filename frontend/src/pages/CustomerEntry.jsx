import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  User, 
  Phone, 
  Scissors, 
  UserCheck, 
  Receipt, 
  Tag, 
  FileText, 
  Wallet, 
  Smartphone, 
  CreditCard,
  Layers,
  Search,
  CheckSquare,
  Square,
  Clock
} from 'lucide-react';
import apiCall from '../api';

export default function CustomerEntry() {
  const navigate = useNavigate();

  // Data states
  const [staffList, setStaffList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedServices, setSelectedServices] = useState([]); // Array of service objects
  const discount = 0;
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentBreakdown, setPaymentBreakdown] = useState({ cash: 0, upi: 0, card: 0 });
  const [partialPaidAmount, setPartialPaidAmount] = useState(0);
  const [partialPaymentMethod, setPartialPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');

  // Service UI states
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServicePrice, setCustomServicePrice] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Autocomplete customer search
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [nameSearchResults, setNameSearchResults] = useState([]);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [isSelectingCustomer, setIsSelectingCustomer] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [staffRes, servicesRes] = await Promise.all([
          apiCall('/staff'),
          apiCall('/services')
        ]);
        
        // Filter only active staff and services
        setStaffList(staffRes.filter(s => s.status === 'active'));
        setServicesList(servicesRes.filter(s => s.status === 'active'));
      } catch (err) {
        toast.error('Failed to load services or staff lists');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Customer search autocomplete by Phone
  useEffect(() => {
    if (isSelectingCustomer) return;
    if (customerPhone.length >= 3) {
      const searchCustomers = async () => {
        try {
          const res = await apiCall(`/customers/search?q=${customerPhone}`);
          setCustomerSearchResults(res);
          setShowCustomerDropdown(res.length > 0);
        } catch (err) {
          console.error(err);
        }
      };
      searchCustomers();
    } else {
      setCustomerSearchResults([]);
      setShowCustomerDropdown(false);
    }
  }, [customerPhone, isSelectingCustomer]);

  // Customer search autocomplete by Name
  useEffect(() => {
    if (isSelectingCustomer) return;
    if (customerName.trim().length >= 2) {
      const searchByName = async () => {
        try {
          const res = await apiCall(`/customers/search?q=${encodeURIComponent(customerName.trim())}`);
          setNameSearchResults(res);
          setShowNameDropdown(res.length > 0);
        } catch (err) {
          console.error(err);
        }
      };
      const delayDebounceFn = setTimeout(() => {
        searchByName();
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setNameSearchResults([]);
      setShowNameDropdown(false);
    }
  }, [customerName, isSelectingCustomer]);

  const selectExistingCustomer = (cust) => {
    setIsSelectingCustomer(true);
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone);
    setShowCustomerDropdown(false);
    setShowNameDropdown(false);
    toast.success(`Selected customer: ${cust.name}`);
    setTimeout(() => {
      setIsSelectingCustomer(false);
    }, 500);
  };

  // Service quantity management
  const toggleService = (svc) => {
    const existing = selectedServices.find(item => item.serviceId === svc._id);
    if (existing) {
      // Already added — increment qty
      setSelectedServices(selectedServices.map(item =>
        item.serviceId === svc._id ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      setSelectedServices([...selectedServices, { serviceId: svc._id, name: svc.name, price: svc.price, qty: 1 }]);
    }
  };

  const changeQty = (serviceId, delta) => {
    setSelectedServices(prev =>
      prev.map(item => item.serviceId === serviceId ? { ...item, qty: item.qty + delta } : item)
          .filter(item => item.qty > 0)
    );
  };

  const handleAddCustomService = () => {
    if (!customServiceName.trim()) {
      toast.error('Please enter a custom service name');
      return;
    }
    if (Number(customServicePrice) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    const hexObjectId = (() => {
      const timestamp = Math.floor(new Date().getTime() / 1000).toString(16).padStart(8, '0');
      const random = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      return timestamp + random;
    })();

    setSelectedServices([
      ...selectedServices,
      {
        serviceId: hexObjectId,
        name: customServiceName.trim() + ' (Custom)',
        price: Number(customServicePrice),
        qty: 1,
        isCustom: true
      }
    ]);

    setCustomServiceName('');
    setCustomServicePrice('');
    setShowCustomForm(false);
    toast.success('Custom service added!');
  };

  // Subtotal: sum of (price × qty)
  const subtotal = selectedServices.reduce((sum, item) => sum + item.price * item.qty, 0);
  const finalAmount = Math.max(0, subtotal - discount);

  // Categories list
  const categories = ['All', ...new Set(servicesList.map(s => s.category))];

  // Filter services
  const filteredServices = servicesList.filter(svc => {
    const matchesSearch = svc.name.toLowerCase().includes(serviceSearch.toLowerCase()) || 
                          svc.category.toLowerCase().includes(serviceSearch.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || svc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle saving entry
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!customerName || customerName.trim().length < 2) {
      toast.error('Customer Name must be at least 2 characters');
      return;
    }
    if (!/^\d{10}$/.test(customerPhone)) {
      toast.error('Mobile Number must be exactly 10 digits');
      return;
    }
    if (!selectedStaff) {
      toast.error('Please assign a staff member');
      return;
    }
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    // Mixed mode sum validation
    if (paymentMode === 'Mixed') {
      const sum = Number(paymentBreakdown.cash || 0) + 
                  Number(paymentBreakdown.upi || 0) + 
                  Number(paymentBreakdown.card || 0);
      if (Math.round(sum) !== Math.round(finalAmount)) {
        toast.error(`Mixed payments sum (${sum}) must equal Final Amount (${finalAmount})`);
        return;
      }
    }

    if (paymentMode === 'Partial') {
      if (Number(partialPaidAmount) <= 0) {
        toast.error('Paid amount must be greater than 0 for partial payment');
        return;
      }
      if (Number(partialPaidAmount) >= finalAmount) {
        toast.error('Paid amount cannot be equal to or greater than Final Amount (use standard payment modes)');
        return;
      }
    }

    const payload = {
      customerName,
      customerPhone,
      staffId: selectedStaff,
      // Expand services by qty: Haircut x2 = two {serviceId, name, price} entries
      services: selectedServices.flatMap(item =>
        Array.from({ length: item.qty }, () => ({ serviceId: item.serviceId, name: item.name, price: item.price }))
      ),
      discount: Number(discount),
      paymentMode,
      paymentBreakdown: paymentMode === 'Mixed' ? paymentBreakdown : 
                        paymentMode === 'Partial' ? {
                          cash: partialPaymentMethod === 'Cash' ? Number(partialPaidAmount) : 0,
                          upi: partialPaymentMethod === 'UPI' ? Number(partialPaidAmount) : 0,
                          card: partialPaymentMethod === 'Card' ? Number(partialPaidAmount) : 0
                        } : { cash: 0, upi: 0, card: 0 },
      dueAmount: paymentMode === 'Partial' ? (finalAmount - Number(partialPaidAmount)) : 0,
      dueStatus: paymentMode === 'Partial' ? 'pending' : 'paid',
      notes
    };

    try {
      const loadingToast = toast.loading('Registering salon entry...');
      await apiCall('/entries', {
        method: 'POST',
        body: payload
      });
      toast.dismiss(loadingToast);
      toast.success('Salon entry registered successfully!');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Failed to save entry');
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Preparing registers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 lg:pb-8">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Customer Registration</h2>
        <p className="text-sm text-slate-500 font-medium">Record customer details, assign services, and finalize billing.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Columns - Form Entry details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Customer Details */}
          <div className="bg-white p-6 rounded-[28px] shadow-soft border border-slate-100/60 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-3">
              <User className="w-4 h-4 text-accent-dark" /> Customer Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Name */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Customer Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Enter customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="form-input !pl-11"
                  />
                </div>

                {/* Name Autocomplete Dropdown */}
                {showNameDropdown && (
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200/90 rounded-2xl shadow-2xl shadow-slate-200/80 z-30 max-h-48 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
                    {nameSearchResults.map(c => (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => selectExistingCustomer(c)}
                        className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-all text-xs font-semibold text-slate-700 flex justify-between items-center"
                      >
                        <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">+91 {c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phone Input with dropdown search */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mobile Number (Search)</label>
                <div className="flex items-center gap-2">
                  <div className="bg-slate-50 px-3.5 py-3 border border-slate-200 rounded-2xl text-xs font-bold text-slate-500 shrink-0">
                    +91
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type="tel"
                      placeholder="Enter 10 digit mobile"
                      value={customerPhone}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '');
                        setCustomerPhone(clean);
                      }}
                      className="form-input"
                      maxLength={10}
                    />

                    {/* Autocomplete Dropdown */}
                    {showCustomerDropdown && (
                      <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200/90 rounded-2xl shadow-2xl shadow-slate-200/80 z-30 max-h-48 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
                        {customerSearchResults.map(c => (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() => selectExistingCustomer(c)}
                            className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-all text-xs font-semibold text-slate-700 flex justify-between items-center"
                          >
                            <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">+91 {c.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Staff Selection */}
          <div className="bg-white p-6 rounded-[28px] shadow-soft border border-slate-100/60 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-3">
              <UserCheck className="w-4 h-4 text-accent-dark" /> Assigned Service Staff
            </h3>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Staff Stylist</label>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="form-input bg-white appearance-none pr-8 cursor-pointer"
              >
                <option value="">-- Choose Staff Stylist --</option>
                {staffList.map(st => (
                  <option key={st._id} value={st._id}>{st.name} ({st.role})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 3: Service Selection */}
          <div className="bg-white p-6 rounded-[28px] shadow-soft border border-slate-100/60 space-y-5">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-3">
              <Scissors className="w-4 h-4 text-accent-dark" /> Select Salon Services
            </h3>

            {/* Quick Add Popular Services Pills */}
            <div className="space-y-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Add popular services</span>
              <div className="flex flex-wrap gap-2">
                {servicesList.slice(0, 5).map(svc => {
                  const existing = selectedServices.find(item => item.serviceId === svc._id);
                  return (
                    <button
                      key={svc._id}
                      type="button"
                      onClick={() => toggleService(svc)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        existing 
                          ? 'bg-accent/15 border-accent text-accent-dark shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      + {svc.name.replace(/\(.*?\)/, '').trim()} (₹{svc.price})
                      {existing && (
                        <span className="bg-accent-dark text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ml-0.5">
                          ×{existing.qty}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Searchable Service Autocomplete Selector */}
            <div className="relative pt-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Search & Add Services</label>
              <div className="relative z-20">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Type to search and add services..."
                  value={serviceSearch}
                  onChange={(e) => {
                    setServiceSearch(e.target.value);
                    setShowServiceDropdown(true);
                  }}
                  onFocus={() => setShowServiceDropdown(true)}
                  className="form-input !pl-11 text-xs"
                />
              </div>

              {/* Suggestions Dropdown */}
              {showServiceDropdown && serviceSearch.trim().length > 0 && (
                <>
                  {/* Backdrop overlay to close dropdown */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowServiceDropdown(false)} 
                  />
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-150 rounded-2xl shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-slate-50">
                    {filteredServices.map(svc => {
                      const isAdded = selectedServices.some(item => item.serviceId === svc._id);
                      return (
                        <button
                          key={svc._id}
                          type="button"
                          onClick={() => {
                            toggleService(svc);
                            setServiceSearch('');
                            setShowServiceDropdown(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 text-xs font-semibold text-slate-750 flex justify-between items-center"
                        >
                          <div>
                            <span className="block font-bold text-slate-800">{svc.name}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{svc.category}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-extrabold text-slate-850">₹{svc.price}</span>
                            {isAdded && (
                              <span className="text-[9px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-bold">
                                Added
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Custom Service Toggle */}
            <div className="pt-2 border-t border-slate-100">
              {!showCustomForm ? (
                <button
                  type="button"
                  onClick={() => setShowCustomForm(true)}
                  className="text-xs font-bold text-primary hover:text-primary-light flex items-center gap-1"
                >
                  + Add Custom Service (Note & Amount)
                </button>
              ) : (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3 animate-fadeIn">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Custom Service Details</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="Service name / Note"
                        value={customServiceName}
                        onChange={(e) => setCustomServiceName(e.target.value)}
                        className="form-input text-xs bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Amount (₹)"
                        value={customServicePrice}
                        onChange={(e) => setCustomServicePrice(e.target.value)}
                        className="form-input text-xs bg-white text-right"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomForm(false);
                        setCustomServiceName('');
                        setCustomServicePrice('');
                      }}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-650 rounded-lg text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomService}
                      className="px-3.5 py-1.5 bg-primary hover:bg-primary-light text-white rounded-lg text-xs font-semibold"
                    >
                      Add Service
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Added Services inline-tag roster */}
            {selectedServices.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Currently Added</span>
                <div className="flex flex-wrap gap-2">
                  {selectedServices.map((item) => (
                    <div 
                      key={item.serviceId} 
                      className="flex items-center gap-2 px-3 py-2 bg-accent/10 border border-accent/30 rounded-xl text-xs font-semibold text-accent-dark"
                    >
                      <span className="font-bold">{item.name}</span>
                      <span className="text-slate-500 font-bold">₹{item.price}</span>
                      {/* Qty Controls */}
                      <div className="flex items-center gap-1 ml-1 bg-white rounded-lg px-1.5 py-0.5 border border-accent/20">
                        <button
                          type="button"
                          onClick={() => changeQty(item.serviceId, -1)}
                          className="w-4 h-4 flex items-center justify-center text-red-400 hover:text-red-600 font-extrabold text-sm leading-none"
                        >−</button>
                        <span className="text-xs font-extrabold text-slate-800 min-w-[16px] text-center">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => changeQty(item.serviceId, 1)}
                          className="w-4 h-4 flex items-center justify-center text-emerald-500 hover:text-emerald-700 font-extrabold text-sm leading-none"
                        >+</button>
                      </div>
                      <span className="font-extrabold text-accent-dark ml-1">= ₹{item.price * item.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white p-6 rounded-[28px] shadow-soft border border-slate-100/60 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-3">
              <FileText className="w-4 h-4 text-accent-dark" /> Service Notes
            </h3>
            <textarea
              placeholder="Add details, customization instructions, or special requests..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input min-h-[80px] resize-none"
            />
          </div>

        </div>

        {/* Right Column - Sticky checkout details */}
        <div className="space-y-6 lg:sticky lg:top-24">
          <div className="bg-white p-6 rounded-[28px] shadow-soft border border-slate-100/60 space-y-6">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-3">
              <Receipt className="w-4 h-4 text-accent-dark" /> Bill Summary
            </h3>

            {/* Selected Items List */}
            {selectedServices.length > 0 ? (
              <div className="space-y-2 border-b border-slate-50 pb-4 max-h-40 overflow-y-auto">
                {selectedServices.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs text-slate-600">
                    <span className="truncate max-w-[150px] font-medium">{item.name}</span>
                    <span className="font-semibold text-slate-800">₹{item.price}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-400">No services selected.</div>
            )}

            {/* Math row summaries */}
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center text-slate-500 font-semibold">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>



              {/* Final Amount */}
              <div className="flex justify-between items-center text-slate-800 font-extrabold text-sm border-t border-slate-50 pt-3">
                <span>Final Payable</span>
                <span className="text-lg text-accent-dark">₹{finalAmount}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payment Mode</label>
              
              <div className="grid grid-cols-5 gap-1.5">
                {['Cash', 'UPI', 'Card', 'Mixed', 'Partial'].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-2 rounded-xl text-[10px] font-bold border flex flex-col items-center justify-center gap-1 transition-all ${
                      paymentMode === mode 
                        ? 'bg-primary border-primary text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {mode === 'Cash' && <Wallet className="w-3.5 h-3.5" />}
                    {mode === 'UPI' && <Smartphone className="w-3.5 h-3.5" />}
                    {mode === 'Card' && <CreditCard className="w-3.5 h-3.5" />}
                    {mode === 'Mixed' && <Layers className="w-3.5 h-3.5" />}
                    {mode === 'Partial' && <Clock className="w-3.5 h-3.5" />}
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Partial Payment Details (Conditional) */}
            {paymentMode === 'Partial' && (
              <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-3">
                <span className="block text-[10px] font-bold text-rose-600 uppercase tracking-wider">Partial Payment Settings</span>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-650">
                    <span className="block">Paid Amount Now</span>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      max={finalAmount}
                      value={partialPaidAmount === 0 ? '' : partialPaidAmount}
                      onChange={(e) => {
                        const val = Math.min(finalAmount, Math.max(0, Number(e.target.value)));
                        setPartialPaidAmount(val);
                      }}
                      className="w-28 px-2 py-1 bg-white border border-slate-200 text-right rounded-lg focus:outline-none focus:border-accent text-xs font-bold text-slate-800"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-650">
                    <span className="block">Paid Via</span>
                    <div className="flex gap-1">
                      {['Cash', 'UPI', 'Card'].map(method => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPartialPaymentMethod(method)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                            partialPaymentMethod === method
                              ? 'bg-slate-700 border-slate-700 text-white shadow-sm'
                              : 'bg-white border-slate-200 text-slate-550 hover:bg-slate-50'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/50 flex justify-between text-[11px] font-bold text-slate-550">
                  <span>Due Amount:</span>
                  <span className="text-red-500 font-extrabold">
                    ₹{finalAmount - partialPaidAmount}
                  </span>
                </div>
              </div>
            )}

            {/* Mixed Payment Details (Conditional) */}
            {paymentMode === 'Mixed' && (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Breakdown Settings</span>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-650">
                    <span className="flex items-center gap-1.5"><Wallet className="w-3 h-3 text-emerald-500" /> Cash</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={paymentBreakdown.cash || ''}
                      onChange={(e) => setPaymentBreakdown({...paymentBreakdown, cash: Number(e.target.value)})}
                      className="w-24 px-2 py-1 bg-white border border-slate-200 text-right rounded-lg focus:outline-none focus:border-accent text-xs font-bold text-slate-800"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-650">
                    <span className="flex items-center gap-1.5"><Smartphone className="w-3 h-3 text-blue-500" /> UPI</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={paymentBreakdown.upi || ''}
                      onChange={(e) => setPaymentBreakdown({...paymentBreakdown, upi: Number(e.target.value)})}
                      className="w-24 px-2 py-1 bg-white border border-slate-200 text-right rounded-lg focus:outline-none focus:border-accent text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold text-slate-650">
                    <span className="flex items-center gap-1.5"><CreditCard className="w-3 h-3 text-amber-500" /> Card</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={paymentBreakdown.card || ''}
                      onChange={(e) => setPaymentBreakdown({...paymentBreakdown, card: Number(e.target.value)})}
                      className="w-24 px-2 py-1 bg-white border border-slate-200 text-right rounded-lg focus:outline-none focus:border-accent text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/50 flex justify-between text-[11px] font-bold text-slate-500">
                  <span>Sum Entered:</span>
                  <span className={
                    Math.round(Number(paymentBreakdown.cash || 0) + Number(paymentBreakdown.upi || 0) + Number(paymentBreakdown.card || 0)) === Math.round(finalAmount)
                      ? 'text-emerald-600'
                      : 'text-red-500'
                  }>
                    ₹{Number(paymentBreakdown.cash || 0) + Number(paymentBreakdown.upi || 0) + Number(paymentBreakdown.card || 0)} / ₹{finalAmount}
                  </span>
                </div>
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSubmit}
              className="w-full py-3.5 bg-primary hover:bg-primary-light text-white font-bold rounded-2xl transition-all duration-200 shadow-lg shadow-primary/10 flex items-center justify-center gap-2 text-sm"
            >
              <Receipt className="w-4.5 h-4.5" />
              Save & Print Invoice
            </button>
          </div>
        {/* Floating Mobile Checkout Footer Bar */}
        {selectedServices.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/50 p-4.5 shadow-[0_-8px_24px_rgba(251,191,36,0.12)] flex justify-between items-center lg:hidden">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Final Payable</span>
              <span className="text-base font-extrabold text-accent-dark">₹{finalAmount}</span>
              <span className="block text-[9px] font-bold text-slate-500 mt-0.5">Mode: {paymentMode}</span>
            </div>
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="px-6 py-2.5 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5" />
              Finalize & Print
            </button>
          </div>
        )}

      </div>
    </div>
  </div>
);
}
