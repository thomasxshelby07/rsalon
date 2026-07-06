const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const router = express.Router();
const { Staff, Service, Customer, Entry, Settings } = require('./models');
const { JWT_SECRET, requireSuperAdmin, requireAdminOrSuperAdmin } = require('./auth');

// Helper to get date ranges
const getDateRange = (filterType, startCustom, endCustom) => {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  switch (filterType) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'custom':
      if (startCustom) { start = new Date(startCustom); start.setHours(0, 0, 0, 0); }
      else { start.setHours(0, 0, 0, 0); }
      if (endCustom) { end = new Date(endCustom); end.setHours(23, 59, 59, 999); }
      else { end.setHours(23, 59, 59, 999); }
      break;
    default:
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
  }
  return { start, end };
};

// --- AUTHENTICATION ---
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;

  // Trim to handle accidental spaces from mobile keyboards
  const inputUser = (username || '').trim();
  const inputPass = (password || '').trim();

  const superAdminUser = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
  const superAdminPass = process.env.SUPER_ADMIN_PASSWORD || 'superpassword';
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'adminpassword';

  if (inputUser === superAdminUser && inputPass === superAdminPass) {
    const token = jwt.sign({ username: inputUser, role: 'super_admin' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, username: inputUser, role: 'super_admin' });
  } else if (inputUser === adminUser && inputPass === adminPass) {
    const token = jwt.sign({ username: inputUser, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, username: inputUser, role: 'admin' });
  }

  return res.status(401).json({ message: 'Invalid username or password' });
});

// --- SETTINGS ---
router.get('/settings', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({ salonName: 'R Unisex Salon', logo: '', currency: '₹', theme: 'light' });
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
});

router.put('/settings', requireSuperAdmin, async (req, res) => {
  try {
    const { salonName, logo, currency, theme } = req.body;
    let settings = await Settings.findOne();
    if (!settings) { settings = new Settings(); }
    settings.salonName = salonName || settings.salonName;
    settings.logo = logo !== undefined ? logo : settings.logo;
    settings.currency = currency || settings.currency;
    settings.theme = theme || settings.theme;
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
});

// --- SERVICES ---
router.get('/services', requireAdminOrSuperAdmin, async (req, res) => {
  try {
    const services = await Service.find().sort({ name: 1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch services', error: error.message });
  }
});

router.post('/services', requireSuperAdmin, async (req, res) => {
  try {
    const { name, price, category, status } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({ message: 'Name, price, and category are required' });
    }
    const service = new Service({ name, price, category, status });
    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create service', error: error.message });
  }
});

router.put('/services/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { name, price, category, status } = req.body;
    const service = await Service.findByIdAndUpdate(req.params.id, { name, price, category, status }, { new: true });
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update service', error: error.message });
  }
});

router.delete('/services/:id', requireSuperAdmin, async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete service', error: error.message });
  }
});

// --- STAFF ---
router.get('/staff', requireAdminOrSuperAdmin, async (req, res) => {
  try {
    const staff = await Staff.find().sort({ name: 1 });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch staff', error: error.message });
  }
});

router.post('/staff', requireSuperAdmin, async (req, res) => {
  try {
    const { name, phone, role, status, salary, commission } = req.body;
    if (!name || !phone || !role) {
      return res.status(400).json({ message: 'Name, phone, and role are required' });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
    }
    const staffMember = new Staff({ name, phone, role, status, salary: Number(salary || 0), commission: Number(commission || 0) });
    await staffMember.save();
    res.status(201).json(staffMember);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create staff member', error: error.message });
  }
});

router.put('/staff/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { name, phone, role, status, salary, commission } = req.body;
    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
    }
    const staffMember = await Staff.findByIdAndUpdate(
      req.params.id,
      { name, phone, role, status, ...(salary !== undefined ? { salary: Number(salary) } : {}), ...(commission !== undefined ? { commission: Number(commission) } : {}) },
      { new: true }
    );
    if (!staffMember) return res.status(404).json({ message: 'Staff member not found' });
    res.json(staffMember);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update staff member', error: error.message });
  }
});

router.delete('/staff/:id', requireSuperAdmin, async (req, res) => {
  try {
    const staffMember = await Staff.findByIdAndDelete(req.params.id);
    if (!staffMember) return res.status(404).json({ message: 'Staff member not found' });
    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete staff member', error: error.message });
  }
});

// --- CUSTOMERS ---
router.get('/customers/search', requireAdminOrSuperAdmin, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const customers = await Customer.find({
      $or: [{ name: { $regex: q, $options: 'i' } }, { phone: { $regex: q } }]
    }).limit(10);
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to search customers', error: error.message });
  }
});

// --- REPEAT CUSTOMERS ---
router.get('/customers/repeat', requireAdminOrSuperAdmin, async (req, res) => {
  try {
    const repeatCustomers = await Entry.aggregate([
      { $group: { _id: '$customer', visitCount: { $sum: 1 }, totalSpent: { $sum: '$finalAmount' }, lastVisit: { $max: '$createdAt' } } },
      { $match: { visitCount: { $gte: 2 }, _id: { $ne: null } } },
      { $sort: { visitCount: -1 } }
    ]);
    const populated = await Customer.populate(repeatCustomers, { path: '_id' });
    const results = populated.map(item => ({
      _id: item._id?._id,
      name: item._id?.name || 'Walk-in',
      phone: item._id?.phone || 'N/A',
      visitCount: item.visitCount,
      totalSpent: item.totalSpent,
      lastVisit: item.lastVisit
    }));
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch repeat customers', error: error.message });
  }
});

// --- ENTRIES (SALON VISITS) ---
router.post('/entries', requireAdminOrSuperAdmin, async (req, res) => {
  try {
    const { customerName, customerPhone, staffId, services, discount = 0, paymentMode, paymentBreakdown = { cash: 0, upi: 0, card: 0 }, notes } = req.body;

    if (!customerName || customerName.trim().length < 2) {
      return res.status(400).json({ message: 'Customer Name is required and must be at least 2 characters' });
    }
    if (!customerPhone || !/^\d{10}$/.test(customerPhone)) {
      return res.status(400).json({ message: 'Customer phone number must be exactly 10 digits' });
    }
    if (!staffId) return res.status(400).json({ message: 'Please select a staff member' });
    if (!services || services.length === 0) return res.status(400).json({ message: 'At least one service must be selected' });
    if (!paymentMode) return res.status(400).json({ message: 'Payment mode is required' });

    let customer = await Customer.findOne({ phone: customerPhone });
    if (!customer) {
      customer = new Customer({ name: customerName, phone: customerPhone });
      await customer.save();
    } else if (customer.name !== customerName) {
      customer.name = customerName;
      await customer.save();
    }

    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(400).json({ message: 'Selected staff member does not exist' });

    let subtotal = 0;
    for (const item of services) { subtotal += item.price; }
    const finalAmount = Math.max(0, subtotal - discount);

    if (paymentMode === 'Mixed') {
      const totalBreakdown = Number(paymentBreakdown.cash || 0) + Number(paymentBreakdown.upi || 0) + Number(paymentBreakdown.card || 0);
      if (Math.round(totalBreakdown) !== Math.round(finalAmount)) {
        return res.status(400).json({ message: `For Mixed payment, breakdown sum (${totalBreakdown}) must equal Final Amount (${finalAmount})` });
      }
    } else if (paymentMode === 'Partial') {
      const due = Number(req.body.dueAmount || 0);
      if (due <= 0) {
        return res.status(400).json({ message: 'Due Amount must be greater than 0 for Partial payment' });
      }
      if (due >= finalAmount) {
        return res.status(400).json({ message: 'Due Amount cannot be equal to or exceed Final Amount' });
      }
      const totalBreakdown = Number(paymentBreakdown.cash || 0) + Number(paymentBreakdown.upi || 0) + Number(paymentBreakdown.card || 0);
      if (Math.round(totalBreakdown + due) !== Math.round(finalAmount)) {
        return res.status(400).json({ message: `Breakdown sum (${totalBreakdown}) + Due Amount (${due}) must equal Final Amount (${finalAmount})` });
      }
    } else {
      paymentBreakdown.cash = paymentMode === 'Cash' ? finalAmount : 0;
      paymentBreakdown.upi = paymentMode === 'UPI' ? finalAmount : 0;
      paymentBreakdown.card = paymentMode === 'Card' ? finalAmount : 0;
    }

    const entry = new Entry({ 
      customer: customer._id, 
      staff: staffId, 
      services, 
      subtotal, 
      discount, 
      finalAmount, 
      paymentMode, 
      paymentBreakdown, 
      dueAmount: paymentMode === 'Partial' ? Number(req.body.dueAmount || 0) : 0,
      dueStatus: paymentMode === 'Partial' ? 'pending' : 'paid',
      notes 
    });
    await entry.save();

    const populated = await Entry.findById(entry._id).populate('customer').populate('staff');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error saving customer entry:', error);
    res.status(500).json({ message: 'Failed to save customer entry', error: error.message });
  }
});

// Get entries (Search & History)
router.get('/entries', requireAdminOrSuperAdmin, async (req, res) => {
  try {
    const { search, filter, startDate, endDate, page = 1, limit = 20, staffId, serviceName, dueStatus } = req.query;
    const query = {};

    if (dueStatus) {
      query.dueStatus = dueStatus;
    } else {
      const range = getDateRange(filter, startDate, endDate);
      query.createdAt = { $gte: range.start, $lte: range.end };
    }

    if (staffId && staffId !== 'All') { query.staff = staffId; }
    if (serviceName && serviceName !== 'All') { query['services.name'] = serviceName; }

    if (search) {
      const cleanSearch = search.trim();
      const matchingCustomers = await Customer.find({
        $or: [{ name: { $regex: cleanSearch, $options: 'i' } }, { phone: { $regex: cleanSearch } }]
      }).select('_id');
      const customerIds = matchingCustomers.map(c => c._id);
      const matchingStaff = await Staff.find({ name: { $regex: cleanSearch, $options: 'i' } }).select('_id');
      const staffIds = matchingStaff.map(s => s._id);
      query.$or = [
        { customer: { $in: customerIds } },
        { staff: { $in: staffIds } },
        { 'services.name': { $regex: cleanSearch, $options: 'i' } },
        { paymentMode: { $regex: cleanSearch, $options: 'i' } }
      ];
    }

    const skipIndex = (page - 1) * limit;
    const entries = await Entry.find(query).populate('customer').populate('staff').sort({ createdAt: -1 }).skip(skipIndex).limit(Number(limit));
    const total = await Entry.countDocuments(query);

    res.json({ entries, currentPage: Number(page), totalPages: Math.ceil(total / limit), totalEntries: total });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch entries history', error: error.message });
  }
});

// Delete entry — Super Admin only
router.delete('/entries/:id', requireSuperAdmin, async (req, res) => {
  try {
    const entry = await Entry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete entry', error: error.message });
  }
});

// Clear entry due
router.put('/entries/:id/clear-due', requireAdminOrSuperAdmin, async (req, res) => {
  try {
    const { paymentMode } = req.body; // 'Cash' or 'UPI'
    if (!paymentMode || !['Cash', 'UPI'].includes(paymentMode)) {
      return res.status(400).json({ message: 'Valid payment mode (Cash or UPI) is required' });
    }

    const entry = await Entry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    if (entry.dueStatus !== 'pending' || entry.dueAmount <= 0) {
      return res.status(400).json({ message: 'No pending dues for this entry' });
    }

    const clearAmt = entry.dueAmount;
    
    // Add to breakdown
    if (!entry.paymentBreakdown) {
      entry.paymentBreakdown = { cash: 0, upi: 0, card: 0 };
    }
    
    if (paymentMode === 'Cash') {
      entry.paymentBreakdown.cash = (entry.paymentBreakdown.cash || 0) + clearAmt;
    } else if (paymentMode === 'UPI') {
      entry.paymentBreakdown.upi = (entry.paymentBreakdown.upi || 0) + clearAmt;
    }

    entry.dueAmount = 0;
    entry.dueStatus = 'paid';
    entry.dueClearMethod = paymentMode;
    entry.dueClearedAt = new Date();

    await entry.save();
    
    const populated = await Entry.findById(entry._id).populate('customer').populate('staff');
    res.json(populated);
  } catch (error) {
    console.error('Failed to clear due:', error);
    res.status(550).json({ message: 'Failed to clear due', error: error.message });
  }
});

// --- DASHBOARD STATISTICS (Optimized: 6 parallel aggregations) ---
router.get('/dashboard/stats', requireAdminOrSuperAdmin, async (req, res) => {
  try {
    let filterType = req.query.filterType;
    const serviceName = req.query.serviceName || 'All';

    // Backward-compatibility: if days parameter is supplied instead of filterType
    if (!filterType && req.query.days) {
      const d = Number(req.query.days);
      if (d === 1) filterType = 'today';
      else if (d === 2) filterType = 'yesterday';
      else if (d === 7) filterType = '7days';
      else if (d === 15) filterType = '15days'; // fallback to last 30
      else if (d === 30) filterType = '30days';
      else filterType = '7days';
    }
    if (!filterType) filterType = 'today';

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (filterType) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '7days':
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '15days':
        startDate.setDate(startDate.getDate() - 14);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '90days':
      case '3months':
        startDate.setDate(startDate.getDate() - 89);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'this_month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Determine days to display in trend chart
    let chartDays = 7;
    if (filterType === '15days') {
      chartDays = 15;
    } else if (filterType === '30days') {
      chartDays = 30;
    } else if (filterType === '90days' || filterType === '3months') {
      chartDays = 90;
    } else if (filterType === 'this_month') {
      chartDays = now.getDate();
    }

    const chartStart = new Date();
    chartStart.setDate(chartStart.getDate() - (chartDays - 1));
    chartStart.setHours(0, 0, 0, 0);

    const svcMatch = serviceName !== 'All' ? { 'services.name': serviceName } : {};

    // ALL queries run in PARALLEL — no sequential waiting
    const [periodEntries, recentEntries, monthlyAgg, chartAgg, topStaffAgg, topServicesAgg, pendingDuesAgg] = await Promise.all([

      // 1. Period entries (lean = fast, no Mongoose overhead)
      Entry.find({ createdAt: { $gte: startDate, $lte: endDate }, ...svcMatch }).lean(),

      // 2. Recent 5 entries with partial populate (unfiltered, live feed)
      Entry.find().populate('customer', 'name phone').populate('staff', 'name role').sort({ createdAt: -1 }).limit(5).lean(),

      // 3. Monthly revenue — single aggregation
      Entry.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, ...svcMatch } },
        { $group: { _id: null, revenue: { $sum: '$finalAmount' }, count: { $sum: 1 } } }
      ]),

      // 4. Chart data — 1 aggregation instead of N separate queries!
      Entry.aggregate([
        { $match: { createdAt: { $gte: chartStart, $lte: now }, ...svcMatch } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:30' } },
          revenue: { $sum: '$finalAmount' },
          customers: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ]),

      // 5. Top staff aggregation with lookup (filtered by period)
      Entry.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$staff', revenue: { $sum: '$finalAmount' }, customers: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'staff', localField: '_id', foreignField: '_id', as: 'info' } },
        { $unwind: { path: '$info', preserveNullAndEmptyArrays: true } },
        { $project: { name: '$info.name', role: '$info.role', revenue: 1, customers: 1 } }
      ]),

      // 6. Top services aggregation (filtered by period)
      Entry.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $unwind: '$services' },
        { $group: { _id: '$services.name', count: { $sum: 1 }, revenue: { $sum: '$services.price' } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { name: '$_id', count: 1, revenue: 1, _id: 0 } }
      ]),

      // 7. Pending dues count & sum
      Entry.aggregate([
        { $match: { dueStatus: 'pending', dueAmount: { $gt: 0 } } },
        { $group: { _id: null, totalDue: { $sum: '$dueAmount' }, count: { $sum: 1 } } }
      ])
    ]);

    // Process period stats
    let periodRevenue = 0, periodCash = 0, periodUpi = 0, periodCard = 0, periodServicesCount = 0;
    periodEntries.forEach(e => {
      periodRevenue += e.finalAmount;
      periodServicesCount += e.services.length;
      periodCash += e.paymentBreakdown?.cash || 0;
      periodUpi += e.paymentBreakdown?.upi || 0;
      periodCard += e.paymentBreakdown?.card || 0;
    });
    const periodCustomers = periodEntries.length;
    const averageBill = periodCustomers > 0 ? Math.round(periodRevenue / periodCustomers) : 0;

    // Build chart — fill missing days with 0
    const chartMap = {};
    chartAgg.forEach(d => { chartMap[d._id] = d; });
    const dailyRevenueChart = [];
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      dailyRevenueChart.push({ label, revenue: chartMap[key]?.revenue || 0, customers: chartMap[key]?.customers || 0 });
    }

    res.json({
      todayRevenue: periodRevenue, // keep property name for seamless frontend integration
      todayCustomers: periodCustomers,
      todayServicesCount: periodServicesCount,
      averageBill,
      paymentSplit: { cash: periodCash, upi: periodUpi, card: periodCard },
      recentEntries,
      monthlyRevenue: monthlyAgg[0]?.revenue || 0,
      monthlyCustomers: monthlyAgg[0]?.count || 0,
      topStaff: topStaffAgg.filter(s => s.name),
      topServices: topServicesAgg,
      revenueChart: dailyRevenueChart,
      pendingDues: {
        totalAmount: pendingDuesAgg[0]?.totalDue || 0,
        count: pendingDuesAgg[0]?.count || 0
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Failed to compile dashboard stats', error: error.message });
  }
});

// --- REPORTS (Super Admin Only) ---
router.get('/reports', requireSuperAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const range = getDateRange('custom', startDate, endDate);

    const entries = await Entry.find({ createdAt: { $gte: range.start, $lte: range.end } }).populate('customer').populate('staff');

    let revenue = 0, customerCount = entries.length, discountTotal = 0, dueTotal = 0, cash = 0, upi = 0, card = 0;
    const staffStats = {}, serviceStats = {}, dailyStats = {};

    entries.forEach(entry => {
      revenue += entry.finalAmount;
      discountTotal += entry.discount;
      dueTotal += entry.dueAmount || 0;
      cash += entry.paymentBreakdown.cash || 0;
      upi += entry.paymentBreakdown.upi || 0;
      card += entry.paymentBreakdown.card || 0;

      const staffId = entry.staff ? entry.staff._id.toString() : 'Unknown';
      const staffName = entry.staff ? entry.staff.name : 'Unknown';
      if (!staffStats[staffId]) { staffStats[staffId] = { name: staffName, revenue: 0, count: 0 }; }
      staffStats[staffId].revenue += entry.finalAmount;
      staffStats[staffId].count += 1;

      entry.services.forEach(svc => {
        if (!serviceStats[svc.name]) { serviceStats[svc.name] = { name: svc.name, count: 0, revenue: 0 }; }
        serviceStats[svc.name].count += 1;
        serviceStats[svc.name].revenue += svc.price;
      });

      const dayKey = new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dailyStats[dayKey]) { dailyStats[dayKey] = { date: dayKey, revenue: 0, customers: 0 }; }
      dailyStats[dayKey].revenue += entry.finalAmount;
      dailyStats[dayKey].customers += 1;
    });

    const averageBill = customerCount > 0 ? Math.round(revenue / customerCount) : 0;

    res.json({
      summary: { revenue, customerCount, averageBill, discountTotal, dueTotal, payments: { cash, upi, card } },
      staffPerformance: Object.values(staffStats).sort((a, b) => b.revenue - a.revenue),
      serviceSales: Object.values(serviceStats).sort((a, b) => b.count - a.count),
      chartData: Object.values(dailyStats)
    });

  } catch (error) {
    res.status(500).json({ message: 'Failed to compile report', error: error.message });
  }
});

module.exports = router;
