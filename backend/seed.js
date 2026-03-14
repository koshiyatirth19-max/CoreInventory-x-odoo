const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Product = require('./models/Product');
const { Category, Warehouse, Location, StockLedger, StockMove } = require('./models/Inventory');
const { Receipt, Delivery } = require('./models/Operations');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected. Seeding...');

  await Promise.all([
    User.deleteMany(), Product.deleteMany(), Category.deleteMany(),
    Warehouse.deleteMany(), Location.deleteMany(),
    StockLedger.deleteMany(), StockMove.deleteMany(),
    Receipt.deleteMany(), Delivery.deleteMany(),
  ]);

  // Users
  const admin   = await User.create({ name: 'Admin User',   email: 'admin@core.com',  password: 'admin123', role: 'admin' });
  const manager = await User.create({ name: 'Priya Sharma', email: 'priya@core.com',  password: 'admin123', role: 'manager' });
  const staff   = await User.create({ name: 'Ravi Mehta',   email: 'ravi@core.com',   password: 'admin123', role: 'staff' });

  // Categories
  const cats = await Category.insertMany([
    { name: 'Raw Materials',  color: '#1B4FD8', createdBy: admin._id },
    { name: 'Finished Goods', color: '#16A34A', createdBy: admin._id },
    { name: 'Packaging',      color: '#D97706', createdBy: admin._id },
    { name: 'Spare Parts',    color: '#DC2626', createdBy: admin._id },
  ]);

  // Warehouses
  const wh1 = await Warehouse.create({ name: 'Main Warehouse',   code: 'WH-MAIN', address: 'GIDC, Ahmedabad',   createdBy: admin._id });
  const wh2 = await Warehouse.create({ name: 'Production Floor', code: 'WH-PROD', address: 'Factory Block A',   createdBy: admin._id });
  const wh3 = await Warehouse.create({ name: 'Dispatch Bay',     code: 'WH-DISP', address: 'Loading Dock',      createdBy: admin._id });

  // Sub-locations (Rack/Shelf)
  await Location.insertMany([
    { warehouse: wh1._id, name: 'Rack A', code: 'RACK-A', type: 'rack',  createdBy: admin._id },
    { warehouse: wh1._id, name: 'Rack B', code: 'RACK-B', type: 'rack',  createdBy: admin._id },
    { warehouse: wh1._id, name: 'Shelf 1', code: 'SHELF-1', type: 'shelf', createdBy: admin._id },
    { warehouse: wh2._id, name: 'Rack P1', code: 'RACK-P1', type: 'rack', createdBy: admin._id },
    { warehouse: wh3._id, name: 'Bin D1',  code: 'BIN-D1',  type: 'bin',  createdBy: admin._id },
  ]);

  // Products
  const products = await Product.insertMany([
    { name: 'Steel Rods 12mm',       sku: 'STL-ROD-12',  category: cats[0]._id, uom: 'kg',   reorderPoint: 50,  createdBy: admin._id },
    { name: 'Aluminium Sheet 3mm',   sku: 'ALU-SHT-3',   category: cats[0]._id, uom: 'sheet',reorderPoint: 20,  createdBy: admin._id },
    { name: 'Industrial Chair A',    sku: 'CHR-IND-A',   category: cats[1]._id, uom: 'pcs',  reorderPoint: 10,  createdBy: admin._id },
    { name: 'Cardboard Box Large',   sku: 'PKG-BOX-L',   category: cats[2]._id, uom: 'pcs',  reorderPoint: 100, createdBy: admin._id },
    { name: 'Bearing 6205',          sku: 'SPR-BRG-6205',category: cats[3]._id, uom: 'pcs',  reorderPoint: 30,  createdBy: admin._id },
    { name: 'Paint White 20L',       sku: 'PNT-WHT-20',  category: cats[0]._id, uom: 'drum', reorderPoint: 5,   createdBy: admin._id },
  ]);

  // Stock
  const stockData = [
    { product: products[0]._id, warehouse: wh1._id, quantity: 320 },
    { product: products[1]._id, warehouse: wh1._id, quantity: 45  },
    { product: products[2]._id, warehouse: wh2._id, quantity: 18  },
    { product: products[3]._id, warehouse: wh1._id, quantity: 80  },
    { product: products[4]._id, warehouse: wh1._id, quantity: 12  },
    { product: products[5]._id, warehouse: wh1._id, quantity: 3   },
    { product: products[0]._id, warehouse: wh2._id, quantity: 60  },
  ];
  await StockLedger.insertMany(stockData);
  for (const s of stockData) {
    await StockMove.create({ product: s.product, toWarehouse: s.warehouse, quantity: s.quantity, type: 'receipt', reference: 'SEED', createdBy: admin._id });
  }

  // Sample receipt (ready to validate)
  await Receipt.create({
    supplier: 'Tata Steel Ltd', warehouse: wh1._id,
    items: [{ product: products[0]._id, quantity: 100, uom: 'kg' }, { product: products[1]._id, quantity: 20, uom: 'sheet' }],
    status: 'ready', createdBy: manager._id,
  });

  // Sample delivery (draft)
  await Delivery.create({
    customer: 'ABC Furniture Co.', warehouse: wh2._id,
    items: [{ product: products[2]._id, quantity: 5, uom: 'pcs' }],
    status: 'draft', createdBy: staff._id,
  });

  console.log('\n✅ Seed complete!\n');
  console.log('  Admin:   admin@core.com   / admin123');
  console.log('  Manager: priya@core.com   / admin123');
  console.log('  Staff:   ravi@core.com    / admin123\n');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
