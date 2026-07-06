const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Flag to switch database modes
let useMock = false;

function setUseMock(value) {
  useMock = value;
  if (useMock) {
    console.log('--- BACKEND SWITCHED TO MOCK JSON FILE DATABASE ---');
    // Ensure directory exists
    const dbDir = path.join(__dirname, 'mock_data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir);
    }
  }
}

// ----------------------------------------------------
// 1. MONGOOSE MAPPING (STANDARD PRODUCTION DATABASE)
// ----------------------------------------------------

const mongooseStaffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  salary: { type: Number, default: 0 },
  commission: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const mongooseServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

const mongooseCustomerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const mongooseEntrySchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  services: [{
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true },
  paymentMode: { type: String, enum: ['Cash', 'UPI', 'Card', 'Mixed', 'Partial'], required: true },
  paymentBreakdown: {
    cash: { type: Number, default: 0 },
    upi: { type: Number, default: 0 },
    card: { type: Number, default: 0 }
  },
  dueAmount: { type: Number, default: 0 },
  dueStatus: { type: String, enum: ['pending', 'paid'], default: 'paid' },
  dueClearMethod: { type: String, enum: ['Cash', 'UPI'] },
  dueClearedAt: { type: Date },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const mongooseSettingsSchema = new mongoose.Schema({
  salonName: { type: String, default: 'R Unisex Salon' },
  logo: { type: String, default: '' },
  currency: { type: String, default: '₹' },
  theme: { type: String, default: 'light' }
});

const MongooseStaff = mongoose.model('Staff', mongooseStaffSchema);
const MongooseService = mongoose.model('Service', mongooseServiceSchema);
const MongooseCustomer = mongoose.model('Customer', mongooseCustomerSchema);
const MongooseEntry = mongoose.model('Entry', mongooseEntrySchema);
const MongooseSettings = mongoose.model('Settings', mongooseSettingsSchema);

// ----------------------------------------------------
// 2. FILE-BASED DATABASE (FALLBACK MOCK SCHEMAS)
// ----------------------------------------------------

const getFilePath = (modelName) => path.join(__dirname, 'mock_data', `${modelName.toLowerCase()}.json`);

const readJson = (modelName) => {
  const file = getFilePath(modelName);
  if (!fs.existsSync(file)) return [];
  try {
    const text = fs.readFileSync(file, 'utf8');
    return JSON.parse(text || '[]');
  } catch (e) {
    return [];
  }
};

const writeJson = (modelName, data) => {
  const file = getFilePath(modelName);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
};

// Mock Query Chain
class MockQueryChain {
  constructor(modelName, dataPromise) {
    this._modelName = modelName;
    this._promise = dataPromise;
  }

  async then(resolve, reject) {
    try {
      const data = await this._promise;
      if (resolve) return resolve(data);
      return data;
    } catch (e) {
      if (reject) return reject(e);
      throw e;
    }
  }

  catch(onRejected) {
    return this._promise.catch(onRejected);
  }

  sort(sortObj) {
    const next = this._promise.then(data => {
      const field = Object.keys(sortObj)[0];
      const dir = sortObj[field];
      return [...data].sort((a, b) => {
        let valA = a[field];
        let valB = b[field];
        if (field === 'createdAt') {
          valA = new Date(valA);
          valB = new Date(valB);
        }
        if (valA < valB) return dir === -1 ? 1 : -1;
        if (valA > valB) return dir === -1 ? -1 : 1;
        return 0;
      });
    });
    return new MockQueryChain(this._modelName, next);
  }

  skip(count) {
    const next = this._promise.then(data => data.slice(Number(count)));
    return new MockQueryChain(this._modelName, next);
  }

  limit(count) {
    const next = this._promise.then(data => data.slice(0, Number(count)));
    return new MockQueryChain(this._modelName, next);
  }

  lean() {
    return this;
  }

  populate(field) {
    const next = this._promise.then(data => {
      const customers = readJson('Customer');
      const staffMembers = readJson('Staff');
      
      const populateItem = (item) => {
        if (!item) return item;
        const newItem = { ...item };
        if (field === 'customer' && item.customer) {
          const custId = item.customer.toString();
          newItem.customer = customers.find(c => c._id === custId) || { _id: custId, name: 'Walk-in' };
        }
        if (field === 'staff' && item.staff) {
          const staffId = item.staff.toString();
          newItem.staff = staffMembers.find(s => s._id === staffId) || { _id: staffId, name: 'N/A', role: 'Staff' };
        }
        return newItem;
      };

      if (Array.isArray(data)) {
        return data.map(populateItem);
      } else {
        return populateItem(data);
      }
    });
    return new MockQueryChain(this._modelName, next);
  }
}

// Factory helper to build Mock Instances
const buildMockModelClass = (modelName) => {
  return class MockInstance {
    constructor(data = {}) {
      Object.assign(this, data);
      if (!this._id) {
        this._id = new mongoose.Types.ObjectId().toString();
      }
      if (!this.createdAt) {
        this.createdAt = new Date().toISOString();
      }
    }

    async save() {
      const list = readJson(modelName);
      const idx = list.findIndex(item => item._id === this._id);
      
      const plain = { ...this };

      // Handle references properly (store IDs as strings)
      if (plain.customer && typeof plain.customer === 'object' && plain.customer._id) {
        plain.customer = plain.customer._id.toString();
      }
      if (plain.staff && typeof plain.staff === 'object' && plain.staff._id) {
        plain.staff = plain.staff._id.toString();
      }

      if (idx >= 0) {
        list[idx] = plain;
      } else {
        list.push(plain);
      }
      writeJson(modelName, list);
      return this;
    }

    // Static finders
    static find(query = {}) {
      let list = readJson(modelName);

      if (Object.keys(query).length > 0) {
        list = list.filter(item => {
          for (const key in query) {
            // 1. Text searches with regex
            if (query[key] && typeof query[key] === 'object' && '$regex' in query[key]) {
              const regex = new RegExp(query[key].$regex, query[key].$options || '');
              if (!regex.test(item[key] || '')) return false;
              continue;
            }

            // 2. Date ranges
            if (key === 'createdAt' && query.createdAt && typeof query.createdAt === 'object') {
              const itemTime = new Date(item.createdAt).getTime();
              if (query.createdAt.$gte) {
                const limitTime = new Date(query.createdAt.$gte).getTime();
                if (itemTime < limitTime) return false;
              }
              if (query.createdAt.$lte) {
                const limitTime = new Date(query.createdAt.$lte).getTime();
                if (itemTime > limitTime) return false;
              }
              continue;
            }

            // 3. Or logic
            if (key === '$or' && Array.isArray(query.$or)) {
              const matchAny = query.$or.some(clause => {
                const clauseKey = Object.keys(clause)[0];
                const clauseVal = clause[clauseKey];
                
                if (clauseVal && typeof clauseVal === 'object' && '$regex' in clauseVal) {
                  const regex = new RegExp(clauseVal.$regex, clauseVal.$options || '');
                  
                  if (clauseKey.includes('.')) {
                    const [parent, child] = clauseKey.split('.');
                    if (Array.isArray(item[parent])) {
                      return item[parent].some(subItem => regex.test(subItem[child] || ''));
                    }
                    return false;
                  }
                  
                  return regex.test(item[clauseKey] || '');
                }

                if (clauseVal && typeof clauseVal === 'object' && '$in' in clauseVal) {
                  return clauseVal.$in.map(v => v.toString()).includes((item[clauseKey] || '').toString());
                }

                return (item[clauseKey] || '').toString() === clauseVal.toString();
              });
              if (!matchAny) return false;
              continue;
            }

            // 4. Standard equality match
            if ((item[key] || '').toString() !== (query[key] || '').toString()) {
              return false;
            }
          }
          return true;
        });
      }

      return new MockQueryChain(modelName, Promise.resolve(list));
    }

    static findOne(query = {}) {
      const chain = this.find(query);
      const next = chain._promise.then(list => list.length > 0 ? new MockInstance(list[0]) : null);
      return new MockQueryChain(modelName, next);
    }

    static findById(id) {
      const next = Promise.resolve().then(() => {
        if (!id) return null;
        const list = readJson(modelName);
        const item = list.find(item => item._id === id.toString());
        return item ? new MockInstance(item) : null;
      });
      return new MockQueryChain(modelName, next);
    }

    static async findByIdAndUpdate(id, updateData, options = {}) {
      const list = readJson(modelName);
      const idx = list.findIndex(item => item._id === id.toString());
      if (idx === -1) return null;

      list[idx] = { ...list[idx], ...updateData };
      writeJson(modelName, list);
      return new MockInstance(list[idx]);
    }

    static async findByIdAndDelete(id) {
      const list = readJson(modelName);
      const idx = list.findIndex(item => item._id === id.toString());
      if (idx === -1) return null;

      const deleted = list[idx];
      list.splice(idx, 1);
      writeJson(modelName, list);
      return new MockInstance(deleted);
    }

    static async countDocuments(query = {}) {
      const chain = this.find(query);
      const list = await chain._promise;
      return list.length;
    }

    static async insertMany(itemsArray) {
      const list = readJson(modelName);
      const createdItems = itemsArray.map(item => {
        const instance = new MockInstance(item);
        const plain = { ...instance };
        return plain;
      });
      list.push(...createdItems);
      writeJson(modelName, list);
      return createdItems.map(item => new MockInstance(item));
    }

    static async deleteMany(query = {}) {
      if (Object.keys(query).length === 0) {
        writeJson(modelName, []);
        return { deletedCount: 0 };
      }
      let list = readJson(modelName);
      const initialLength = list.length;
      list = list.filter(item => {
        for (const key in query) {
          if (item[key] !== query[key]) return true;
        }
        return false;
      });
      writeJson(modelName, list);
      return { deletedCount: initialLength - list.length };
    }

    static async updateMany(query = {}, update = {}) {
      let list = readJson(modelName);
      let modifiedCount = 0;
      const setFields = update.$set || update;
      list = list.map(item => {
        let matches = true;
        for (const key in query) {
          if (key === '$or') {
            matches = query.$or.some(sub => {
              for (const k in sub) {
                if (item[k] !== sub[k]) return false;
              }
              return true;
            });
          } else {
            if (item[key] !== query[key]) matches = false;
          }
        }
        if (matches) {
          modifiedCount++;
          return { ...item, ...setFields };
        }
        return item;
      });
      writeJson(modelName, list);
      return { modifiedCount };
    }

    static async aggregate(pipeline = []) {
      let list = readJson(modelName);
      
      for (const stage of pipeline) {
        if (stage.$match) {
          list = list.filter(item => {
            for (const key in stage.$match) {
              const queryVal = stage.$match[key];
              if (key === 'createdAt' && queryVal && typeof queryVal === 'object') {
                const itemTime = new Date(item.createdAt).getTime();
                if (queryVal.$gte) {
                  const limit = new Date(queryVal.$gte).getTime();
                  if (itemTime < limit) return false;
                }
                if (queryVal.$lte) {
                  const limit = new Date(queryVal.$lte).getTime();
                  if (itemTime > limit) return false;
                }
              } else if (key === 'services.name') {
                const hasSvc = item.services && item.services.some(s => s.name === queryVal);
                if (!hasSvc) return false;
              } else if (queryVal !== undefined) {
                const itemVal = item[key];
                if ((itemVal || '').toString() !== queryVal.toString()) return false;
              }
            }
            return true;
          });
        } else if (stage.$unwind) {
          const path = typeof stage.$unwind === 'string' ? stage.$unwind.replace('$', '') : stage.$unwind.path.replace('$', '');
          const unwound = [];
          list.forEach(item => {
            const arr = item[path];
            if (Array.isArray(arr)) {
              arr.forEach(element => {
                unwound.push({ ...item, [path]: element });
              });
            } else if (arr) {
              unwound.push({ ...item, [path]: arr });
            } else if (stage.$unwind.preserveNullAndEmptyArrays) {
              unwound.push({ ...item, [path]: null });
            }
          });
          list = unwound;
        } else if (stage.$group) {
          const { _id, ...accumulators } = stage.$group;
          const groups = {};
          
          list.forEach(item => {
            let groupKey = '';
            if (_id === null) {
              groupKey = 'null';
            } else if (typeof _id === 'string' && _id.startsWith('$')) {
              const field = _id.replace('$', '');
              groupKey = (item[field] || 'null').toString();
            } else if (typeof _id === 'object' && _id.$dateToString) {
              const dateField = _id.$dateToString.date.replace('$', '');
              const dateVal = new Date(item[dateField]);
              if (!isNaN(dateVal.getTime())) {
                const offsetDate = new Date(dateVal.getTime() + (5.5 * 60 * 60 * 1000));
                groupKey = offsetDate.toISOString().slice(0, 10);
              } else {
                groupKey = 'null';
              }
            }
            
            if (!groups[groupKey]) {
              groups[groupKey] = { _id: _id === null ? null : groupKey };
              for (const accName in accumulators) {
                groups[groupKey][accName] = 0;
              }
            }
            
            for (const accName in accumulators) {
              const accObj = accumulators[accName];
              if (accObj.$sum) {
                let sumVal = 0;
                if (typeof accObj.$sum === 'number') {
                  sumVal = accObj.$sum;
                } else if (typeof accObj.$sum === 'string' && accObj.$sum.startsWith('$')) {
                  const field = accObj.$sum.replace('$', '');
                  if (field.includes('.')) {
                    const [p, c] = field.split('.');
                    sumVal = Number(item[p]?.[c] || 0);
                  } else {
                    sumVal = Number(item[field] || 0);
                  }
                }
                groups[groupKey][accName] += sumVal;
              }
            }
          });
          
          list = Object.values(groups);
        } else if (stage.$sort) {
          const sortField = Object.keys(stage.$sort)[0];
          const dir = stage.$sort[sortField];
          list.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];
            if (valA < valB) return dir === -1 ? 1 : -1;
            if (valA > valB) return dir === -1 ? -1 : 1;
            return 0;
          });
        } else if (stage.$limit) {
          list = list.slice(0, stage.$limit);
        } else if (stage.$lookup) {
          const { from, localField, foreignField, as } = stage.$lookup;
          const targetList = readJson(from === 'staff' ? 'Staff' : from === 'services' ? 'Service' : from);
          list.forEach(item => {
            const localVal = item[localField];
            const matches = targetList.filter(t => (t[foreignField] || '').toString() === (localVal || '').toString());
            item[as] = matches;
          });
        } else if (stage.$project) {
          const proj = stage.$project;
          list = list.map(item => {
            const newItem = {};
            for (const key in proj) {
              if (proj[key] === 1) {
                newItem[key] = item[key];
              } else if (typeof proj[key] === 'string' && proj[key].startsWith('$')) {
                const sourceField = proj[key].replace('$', '');
                if (sourceField.includes('.')) {
                  const parts = sourceField.split('.');
                  let current = item;
                  for (const part of parts) {
                    current = current?.[part];
                  }
                  newItem[key] = current;
                } else {
                  newItem[key] = item[sourceField];
                }
              }
            }
            if (proj._id === 0) {
              delete newItem._id;
            }
            return newItem;
          });
        }
      }
      return list;
    }
  };
};

const MockStaff = buildMockModelClass('Staff');
const MockService = buildMockModelClass('Service');
const MockCustomer = buildMockModelClass('Customer');
const MockEntry = buildMockModelClass('Entry');
const MockSettings = buildMockModelClass('Settings');

// ----------------------------------------------------
// 3. MAIN ES6 CLASS DISPATCHERS (TRANSPARENT REPLACEMENT)
// ----------------------------------------------------

class Staff {
  constructor(data) {
    return useMock ? new MockStaff(data) : new MongooseStaff(data);
  }
  static find(q) { return useMock ? MockStaff.find(q) : MongooseStaff.find(q); }
  static findOne(q) { return useMock ? MockStaff.findOne(q) : MongooseStaff.findOne(q); }
  static findById(id) { return useMock ? MockStaff.findById(id) : MongooseStaff.findById(id); }
  static findByIdAndUpdate(id, update, opt) { return useMock ? MockStaff.findByIdAndUpdate(id, update, opt) : MongooseStaff.findByIdAndUpdate(id, update, opt); }
  static findByIdAndDelete(id) { return useMock ? MockStaff.findByIdAndDelete(id) : MongooseStaff.findByIdAndDelete(id); }
  static countDocuments(q) { return useMock ? MockStaff.countDocuments(q) : MongooseStaff.countDocuments(q); }
  static insertMany(arr) { return useMock ? MockStaff.insertMany(arr) : MongooseStaff.insertMany(arr); }
  static deleteMany(q) { return useMock ? MockStaff.deleteMany(q) : MongooseStaff.deleteMany(q); }
  static updateMany(q, u) { return useMock ? MockStaff.updateMany(q, u) : MongooseStaff.updateMany(q, u); }
}

class Service {
  constructor(data) {
    return useMock ? new MockService(data) : new MongooseService(data);
  }
  static find(q) { return useMock ? MockService.find(q) : MongooseService.find(q); }
  static findOne(q) { return useMock ? MockService.findOne(q) : MongooseService.findOne(q); }
  static findById(id) { return useMock ? MockService.findById(id) : MongooseService.findById(id); }
  static findByIdAndUpdate(id, update, opt) { return useMock ? MockService.findByIdAndUpdate(id, update, opt) : MongooseService.findByIdAndUpdate(id, update, opt); }
  static findByIdAndDelete(id) { return useMock ? MockService.findByIdAndDelete(id) : MongooseService.findByIdAndDelete(id); }
  static countDocuments(q) { return useMock ? MockService.countDocuments(q) : MongooseService.countDocuments(q); }
  static insertMany(arr) { return useMock ? MockService.insertMany(arr) : MongooseService.insertMany(arr); }
  static deleteMany(q) { return useMock ? MockService.deleteMany(q) : MongooseService.deleteMany(q); }
  static updateMany(q, u) { return useMock ? MockService.updateMany(q, u) : MongooseService.updateMany(q, u); }
}

class Customer {
  constructor(data) {
    return useMock ? new MockCustomer(data) : new MongooseCustomer(data);
  }
  static find(q) { return useMock ? MockCustomer.find(q) : MongooseCustomer.find(q); }
  static findOne(q) { return useMock ? MockCustomer.findOne(q) : MongooseCustomer.findOne(q); }
  static findById(id) { return useMock ? MockCustomer.findById(id) : MongooseCustomer.findById(id); }
  static findByIdAndUpdate(id, update, opt) { return useMock ? MockCustomer.findByIdAndUpdate(id, update, opt) : MongooseCustomer.findByIdAndUpdate(id, update, opt); }
  static findByIdAndDelete(id) { return useMock ? MockCustomer.findByIdAndDelete(id) : MongooseCustomer.findByIdAndDelete(id); }
  static countDocuments(q) { return useMock ? MockCustomer.countDocuments(q) : MongooseCustomer.countDocuments(q); }
  static insertMany(arr) { return useMock ? MockCustomer.insertMany(arr) : MongooseCustomer.insertMany(arr); }
  static deleteMany(q) { return useMock ? MockCustomer.deleteMany(q) : MongooseCustomer.deleteMany(q); }
  static updateMany(q, u) { return useMock ? MockCustomer.updateMany(q, u) : MongooseCustomer.updateMany(q, u); }
  static populate(d, o) {
    if (useMock) {
      const customers = readJson('Customer');
      const list = Array.isArray(d) ? d : [d];
      list.forEach(item => {
        if (item && item._id) {
          const custId = item._id.toString();
          const match = customers.find(c => c._id === custId);
          item._id = match || { _id: custId, name: 'Walk-in', phone: '0000000000' };
        }
      });
      return d;
    }
    return MongooseCustomer.populate(d, o);
  }
}

class Entry {
  constructor(data) {
    return useMock ? new MockEntry(data) : new MongooseEntry(data);
  }
  static find(q) { return useMock ? MockEntry.find(q) : MongooseEntry.find(q); }
  static findOne(q) { return useMock ? MockEntry.findOne(q) : MongooseEntry.findOne(q); }
  static findById(id) { return useMock ? MockEntry.findById(id) : MongooseEntry.findById(id); }
  static findByIdAndUpdate(id, update, opt) { return useMock ? MockEntry.findByIdAndUpdate(id, update, opt) : MongooseEntry.findByIdAndUpdate(id, update, opt); }
  static findByIdAndDelete(id) { return useMock ? MockEntry.findByIdAndDelete(id) : MongooseEntry.findByIdAndDelete(id); }
  static countDocuments(q) { return useMock ? MockEntry.countDocuments(q) : MongooseEntry.countDocuments(q); }
  static insertMany(arr) { return useMock ? MockEntry.insertMany(arr) : MongooseEntry.insertMany(arr); }
  static deleteMany(q) { return useMock ? MockEntry.deleteMany(q) : MongooseEntry.deleteMany(q); }
  static updateMany(q, u) { return useMock ? MockEntry.updateMany(q, u) : MongooseEntry.updateMany(q, u); }
  static aggregate(p) { return useMock ? MockEntry.aggregate(p) : MongooseEntry.aggregate(p); }
  static populate(d, o) { return useMock ? d : MongooseEntry.populate(d, o); }
}

class Settings {
  constructor(data) {
    return useMock ? new MockSettings(data) : new MongooseSettings(data);
  }
  static find(q) { return useMock ? MockSettings.find(q) : MongooseSettings.find(q); }
  static findOne(q) { return useMock ? MockSettings.findOne(q) : MongooseSettings.findOne(q); }
  static findById(id) { return useMock ? MockSettings.findById(id) : MongooseSettings.findById(id); }
  static findByIdAndUpdate(id, update, opt) { return useMock ? MockSettings.findByIdAndUpdate(id, update, opt) : MongooseSettings.findByIdAndUpdate(id, update, opt); }
  static findByIdAndDelete(id) { return useMock ? MockSettings.findByIdAndDelete(id) : MongooseSettings.findByIdAndDelete(id); }
  static countDocuments(q) { return useMock ? MockSettings.countDocuments(q) : MongooseSettings.countDocuments(q); }
  static insertMany(arr) { return useMock ? MockSettings.insertMany(arr) : MongooseSettings.insertMany(arr); }
  static deleteMany(q) { return useMock ? MockSettings.deleteMany(q) : MongooseSettings.deleteMany(q); }
  static updateMany(q, u) { return useMock ? MockSettings.updateMany(q, u) : MongooseSettings.updateMany(q, u); }
}

module.exports = {
  Staff,
  Service,
  Customer,
  Entry,
  Settings,
  setUseMock
};
