const { initialize, getDb, saveDatabase } = require('./database');

// Sample products data
const sampleProducts = [
  {
    ref_no: 'HRC-001',
    name: 'Commercial Gas Range 4 Burner',
    description: 'Heavy duty commercial gas range with 4 burners. Stainless steel construction, high efficiency burners with electronic ignition. Suitable for restaurants and hotels.',
    model_no: 'GR-4B-900',
    unit_price: 4500,
    country: 'Italy',
    category: 'Cooking Equipment'
  },
  {
    ref_no: 'HRC-002',
    name: 'Undercounter Refrigerator 2 Door',
    description: 'Commercial undercounter refrigerator with 2 solid doors. Digital temperature control, automatic defrost, stainless steel interior and exterior.',
    model_no: 'UCR-2D-280L',
    unit_price: 3200,
    country: 'Germany',
    category: 'Refrigeration'
  },
  {
    ref_no: 'HRC-003',
    name: 'Commercial Dishwasher Hood Type',
    description: 'High capacity hood type dishwasher with automatic hood lift. Wash cycle 60/120 seconds, rinse aid and detergent dispenser included.',
    model_no: 'DW-HOOD-60',
    unit_price: 12500,
    country: 'Italy',
    category: 'Warewashing'
  },
  {
    ref_no: 'HRC-004',
    name: 'Stainless Steel Work Table',
    description: 'Commercial grade stainless steel work table. 304 grade stainless steel top with backsplash, adjustable undershelf, heavy duty legs with adjustable feet.',
    model_no: 'WT-1800-700',
    unit_price: 850,
    country: 'UAE',
    category: 'Furniture'
  },
  {
    ref_no: 'HRC-005',
    name: 'Convection Oven Electric 10 Tray',
    description: 'Electric convection oven with 10 tray capacity (GN 1/1). Digital control panel, steam injection, reversing fan motor, tempered glass door.',
    model_no: 'CO-E10-GN',
    unit_price: 8900,
    country: 'Spain',
    category: 'Cooking Equipment'
  },
  {
    ref_no: 'HRC-006',
    name: 'Ice Cube Maker 80kg/day',
    description: 'Automatic ice cube maker with 80kg daily production. Air cooled condenser, stainless steel exterior, built-in storage bin 40kg capacity.',
    model_no: 'ICM-80-AC',
    unit_price: 4200,
    country: 'China',
    category: 'Refrigeration'
  },
  {
    ref_no: 'HRC-007',
    name: 'Commercial Blender Heavy Duty',
    description: 'Heavy duty commercial blender with 2L capacity. Variable speed control, pulse function, stainless steel blades, sound enclosure included.',
    model_no: 'BL-HD-2000',
    unit_price: 1850,
    country: 'USA',
    category: 'Food Preparation'
  },
  {
    ref_no: 'HRC-008',
    name: 'Salamander Grill Gas',
    description: 'Gas salamander grill with adjustable height rack. Stainless steel construction, ceramic infrared burners, removable crumb tray.',
    model_no: 'SG-G-900',
    unit_price: 2400,
    country: 'Turkey',
    category: 'Cooking Equipment'
  },
  {
    ref_no: 'HRC-009',
    name: 'Vertical Display Refrigerator',
    description: 'Upright display refrigerator with glass door. LED lighting, digital thermostat, automatic defrost, 5 adjustable shelves, 650L capacity.',
    model_no: 'VDR-650L',
    unit_price: 5600,
    country: 'Italy',
    category: 'Refrigeration'
  },
  {
    ref_no: 'HRC-010',
    name: 'Deep Fryer Electric Double',
    description: 'Commercial double tank electric deep fryer. 2 x 12L oil capacity, thermostatic control, safety features included, stainless steel construction.',
    model_no: 'DF-E-2X12',
    unit_price: 2100,
    country: 'Germany',
    category: 'Cooking Equipment'
  }
];

async function seed() {
  // Initialize database
  await initialize();
  const db = getDb();

  console.log('🌱 Seeding sample products...\n');

  for (const product of sampleProducts) {
    try {
      db.prepare(`
        INSERT OR IGNORE INTO products (ref_no, name, description, model_no, unit_price, country, category)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        product.ref_no,
        product.name,
        product.description,
        product.model_no,
        product.unit_price,
        product.country,
        product.category
      );
      console.log(`  ✅ Added: ${product.name}`);
    } catch (error) {
      console.log(`  ⚠️ Skipped (already exists): ${product.name}`);
    }
  }

  // Save database
  saveDatabase();

  const count = db.prepare('SELECT COUNT(*) as count FROM products').get();
  console.log(`\n✅ Seed completed successfully!`);
  console.log(`📊 Total products in database: ${count.count}`);
}

seed().catch(console.error);
