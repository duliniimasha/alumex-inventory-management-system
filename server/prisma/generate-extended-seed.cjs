/*
 * Generates a deterministic block of extra seed data spanning ~13 months
 * (June 2025 -> June 2026) so the Reports charts/exports have realistic,
 * time-distributed data. Output is SQL with ON CONFLICT upserts (idempotent).
 *
 * Usage: node prisma/generate-extended-seed.cjs   (prints SQL to stdout)
 */

// --- deterministic RNG (mulberry32) so re-running yields identical rows ---
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260623);
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const round2 = (n) => Math.round(n * 100) / 100;

function uuid(prefix, n) {
  // prefix is 4 hex chars; produces a valid v4-shaped uuid
  return `${prefix}0000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}
function iso(y, m, d, h = 9, min = 0) {
  return new Date(Date.UTC(y, m - 1, d, h, min)).toISOString();
}
function sqlStr(v) {
  return v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;
}

// --- reference data (existing seed IDs) ---
const customers = [
  { id: '26f97f8f-3e1d-4ce7-8bf2-4f15f6eea101', type: 'fabricator', channel: 'local' },
  { id: '8d449a1f-ff21-47df-8d3f-0cc5c8be6102', type: 'export', channel: 'export' },
  { id: 'b7d32a0d-1912-4305-a595-93ac9f5a8f03', type: 'retail', channel: 'alumex_store' },
  { id: '4fca0f2f-a226-4ec7-bf2f-d6bc2f6ab904', type: 'B2B', channel: 'local' },
  // new customers (defined below)
  { id: uuid('f0c1', 1), type: 'fabricator', channel: 'local' },
  { id: uuid('f0c1', 2), type: 'export', channel: 'export' },
  { id: uuid('f0c1', 3), type: 'retail', channel: 'alumex_store' },
  { id: uuid('f0c1', 4), type: 'B2B', channel: 'local' },
  { id: uuid('f0c1', 5), type: 'export', channel: 'export' },
];

const newCustomerRows = [
  [uuid('f0c1', 1), 'Colombo Glass & Aluminium', 'fabricator', 'LK', 'orders@colomboglass.lk'],
  [uuid('f0c1', 2), 'Emirates Facade Systems', 'export', 'AE', 'procure@emiratesfacade.ae'],
  [uuid('f0c1', 3), 'Highland Hardware Stores', 'retail', 'LK', 'buying@highlandhardware.lk'],
  [uuid('f0c1', 4), 'Metro Builders (Pvt) Ltd', 'B2B', 'LK', 'supplies@metrobuilders.lk'],
  [uuid('f0c1', 5), 'Indus Trading Co', 'export', 'IN', 'imports@industrading.in'],
];

const products = [
  { id: '071d36d3-20f8-4f5c-9fe2-208f16f9c421', unit: 'ft', price: 2450 },
  { id: '1fe08c28-3318-4f06-91cc-38551e5f73d3', unit: 'ft', price: 3100 },
  { id: '52276ed7-44e1-4f94-a0ca-a96f4eb91595', unit: 'ft', price: 2750 },
  { id: '810b9f7e-a56e-4210-bf4c-28f05f4ccf4a', unit: 'ft', price: 3500 },
  { id: 'a85af70c-f8d7-4c20-af9d-4cd3de246992', unit: 'ft', price: 5200 },
  { id: 'a1a1a1a1-0000-4000-8000-000000000006', unit: 'ft', price: 1800 },
  { id: 'a1a1a1a1-0000-4000-8000-000000000007', unit: 'ft', price: 1500 },
  { id: 'a1a1a1a1-0000-4000-8000-000000000009', unit: 'pcs', price: 1200 },
  { id: 'a1a1a1a1-0000-4000-8000-000000000011', unit: 'pcs', price: 650 },
  { id: 'a1a1a1a1-0000-4000-8000-000000000012', unit: 'pcs', price: 850 },
];

const materials = [
  'f129cae8-cf8e-4279-a16f-8f8a3f8de822',
  '449ecb51-0266-42d9-bb74-c970563f9ec3',
  'b30344ac-e2f4-4071-8cfa-a0777ba496f4',
  '4d20f9df-ae71-49b4-8fd1-4046bc66ce02',
  'ad3898ad-a1e3-4734-bf20-8f140a6a5cf6',
];
const dies = [
  'a2cf88e9-57ca-4229-b307-bcde9f21c773',
  '56569a3f-c896-4052-9f43-c72f262a5ce5',
  'fe69d610-80be-4ace-bf6a-74f81e38e0a6',
  'd640a95a-87f8-4d48-b91d-6f0f5137fcfe',
];
const processTypes = ['EXTRUSION', 'COATING', 'VALUE_ADD', 'DIE_CASTING'];
const inspectors = ['Nimal Perera', 'Ayesha Fernando', 'Chamodi Silva', 'Ruwan Jayasuriya'];

// --- months: 2025-06 .. 2026-06 (13 months) ---
const months = [];
for (let i = 0; i < 13; i++) {
  const base = new Date(Date.UTC(2025, 5 + i, 1));
  months.push({ y: base.getUTCFullYear(), m: base.getUTCMonth() + 1 });
}
const CURRENT = { y: 2026, m: 6 };

// --- generate sales orders + lines ---
const orderRows = [];
const lineRows = [];
let orderSeq = 0;
let lineSeq = 0;

for (const { y, m } of months) {
  const numOrders = randInt(3, 4);
  for (let o = 0; o < numOrders; o++) {
    orderSeq += 1;
    const customer = pick(customers);
    const orderDay = randInt(1, 26);
    const isCurrentMonth = y === CURRENT.y && m === CURRENT.m;

    // status distribution
    let status = 'dispatched';
    let dispatchDate = null;
    const roll = rand();
    if (isCurrentMonth && roll < 0.5) {
      status = 'pending';
    } else if (roll < 0.08) {
      status = 'cancelled';
    } else {
      status = 'dispatched';
      const dd = orderDay + randInt(1, 4);
      dispatchDate = iso(y, m, Math.min(dd, 28), randInt(10, 17), 0);
    }

    const orderId = uuid('f001', orderSeq);
    orderRows.push([
      orderId,
      customer.id,
      customer.channel,
      status,
      iso(y, m, orderDay, randInt(8, 15), 0),
      dispatchDate,
    ]);

    // lines
    const numLines = randInt(1, 3);
    const used = new Set();
    for (let l = 0; l < numLines; l++) {
      let product = pick(products);
      let guard = 0;
      while (used.has(product.id) && guard < 5) {
        product = pick(products);
        guard += 1;
      }
      used.add(product.id);
      lineSeq += 1;

      const qty = product.unit === 'pcs' ? randInt(10, 150) : randInt(20, 220);
      const priceVar = 1 + (rand() - 0.5) * 0.1; // +/-5%
      const unitPrice = round2(product.price * priceVar);
      const qtyDispatched = status === 'dispatched' ? qty : 0;

      lineRows.push([
        uuid('f002', lineSeq),
        orderId,
        product.id,
        qty,
        qtyDispatched,
        unitPrice,
      ]);
    }
  }
}

// --- generate production jobs + inspections ---
const jobRows = [];
const inspectionRows = [];
let jobSeq = 0;
let inspSeq = 0;

for (const { y, m } of months) {
  const numJobs = randInt(1, 2);
  for (let j = 0; j < numJobs; j++) {
    jobSeq += 1;
    const day = randInt(1, 26);
    const input = randInt(200, 1600);
    const yieldPct = 0.85 + rand() * 0.11; // 85-96%
    const output = Math.round(input * yieldPct);
    const qcRoll = rand();
    const qcStatus = qcRoll < 0.82 ? 'PASS' : qcRoll < 0.92 ? 'HOLD' : 'REJECT';
    const jobId = uuid('f003', jobSeq);
    const startedAt = iso(y, m, day, 7, 30);
    const completedAt = iso(y, m, day, 16, 0);
    const batch = `BATCH-${y}${String(m).padStart(2, '0')}-${String(jobSeq).padStart(3, '0')}`;

    jobRows.push([
      jobId,
      pick(materials),
      pick(dies),
      pick(processTypes),
      input,
      output,
      'completed',
      qcStatus,
      JSON.stringify({ batch_no: batch, line: pick(['L1', 'L2', 'L3']) }),
      startedAt,
      completedAt,
    ]);

    inspSeq += 1;
    inspectionRows.push([
      uuid('f004', inspSeq),
      jobId,
      qcStatus,
      pick(inspectors),
      qcStatus === 'PASS'
        ? 'Dimensional and surface checks approved.'
        : qcStatus === 'HOLD'
          ? 'Held for minor deviation; pending re-check.'
          : 'Failed adhesion / dimensional tolerance.',
      iso(y, m, day, 15, 0),
    ]);
  }
}

// --- emit SQL ---
const out = [];
out.push('-- ============================================================');
out.push('-- Extended seed data (generated): ~13 months, June 2025 -> June 2026');
out.push('-- Generated by prisma/generate-extended-seed.cjs (deterministic)');
out.push('-- ============================================================');
out.push('');

// customers
out.push('INSERT INTO customers (customer_id, name, type, country, contact_email)');
out.push('VALUES');
out.push(
  newCustomerRows
    .map(
      (r) =>
        `  (${sqlStr(r[0])}, ${sqlStr(r[1])}, ${sqlStr(r[2])}, ${sqlStr(r[3])}, ${sqlStr(r[4])})`,
    )
    .join(',\n'),
);
out.push('ON CONFLICT (customer_id) DO UPDATE SET');
out.push('  name = EXCLUDED.name, type = EXCLUDED.type, country = EXCLUDED.country, contact_email = EXCLUDED.contact_email;');
out.push('');

// sales orders
out.push('INSERT INTO sales_orders (order_id, customer_id, channel, status, order_date, dispatch_date)');
out.push('VALUES');
out.push(
  orderRows
    .map(
      (r) =>
        `  (${sqlStr(r[0])}, ${sqlStr(r[1])}, ${sqlStr(r[2])}, ${sqlStr(r[3])}, ${sqlStr(r[4])}, ${r[5] === null ? 'NULL' : sqlStr(r[5])})`,
    )
    .join(',\n'),
);
out.push('ON CONFLICT (order_id) DO UPDATE SET');
out.push('  customer_id = EXCLUDED.customer_id, channel = EXCLUDED.channel, status = EXCLUDED.status, order_date = EXCLUDED.order_date, dispatch_date = EXCLUDED.dispatch_date;');
out.push('');

// order lines
out.push('INSERT INTO order_lines (line_id, order_id, product_id, qty_ordered, qty_dispatched, unit_price)');
out.push('VALUES');
out.push(
  lineRows
    .map(
      (r) =>
        `  (${sqlStr(r[0])}, ${sqlStr(r[1])}, ${sqlStr(r[2])}, ${r[3]}, ${r[4]}, ${r[5]})`,
    )
    .join(',\n'),
);
out.push('ON CONFLICT (line_id) DO UPDATE SET');
out.push('  order_id = EXCLUDED.order_id, product_id = EXCLUDED.product_id, qty_ordered = EXCLUDED.qty_ordered, qty_dispatched = EXCLUDED.qty_dispatched, unit_price = EXCLUDED.unit_price;');
out.push('');

// production jobs
out.push('INSERT INTO production_jobs (job_id, material_id, die_id, process_type, input_qty_kg, output_qty_kg, status, qc_status, metadata, started_at, completed_at)');
out.push('VALUES');
out.push(
  jobRows
    .map(
      (r) =>
        `  (${sqlStr(r[0])}, ${sqlStr(r[1])}, ${sqlStr(r[2])}, ${sqlStr(r[3])}::"ProcessType", ${r[4]}, ${r[5]}, ${sqlStr(r[6])}, ${sqlStr(r[7])}::"QcStatus", ${sqlStr(r[8])}::jsonb, ${sqlStr(r[9])}, ${sqlStr(r[10])})`,
    )
    .join(',\n'),
);
out.push('ON CONFLICT (job_id) DO UPDATE SET');
out.push('  material_id = EXCLUDED.material_id, die_id = EXCLUDED.die_id, process_type = EXCLUDED.process_type, input_qty_kg = EXCLUDED.input_qty_kg, output_qty_kg = EXCLUDED.output_qty_kg, status = EXCLUDED.status, qc_status = EXCLUDED.qc_status, metadata = EXCLUDED.metadata, started_at = EXCLUDED.started_at, completed_at = EXCLUDED.completed_at;');
out.push('');

// qc inspections
out.push('INSERT INTO qc_inspections (inspection_id, job_id, status, inspector_name, notes, inspected_at)');
out.push('VALUES');
out.push(
  inspectionRows
    .map(
      (r) =>
        `  (${sqlStr(r[0])}, ${sqlStr(r[1])}, ${sqlStr(r[2])}::"QcStatus", ${sqlStr(r[3])}, ${sqlStr(r[4])}, ${sqlStr(r[5])})`,
    )
    .join(',\n'),
);
out.push('ON CONFLICT (inspection_id) DO UPDATE SET');
out.push('  job_id = EXCLUDED.job_id, status = EXCLUDED.status, inspector_name = EXCLUDED.inspector_name, notes = EXCLUDED.notes, inspected_at = EXCLUDED.inspected_at;');
out.push('');

const total =
  newCustomerRows.length + orderRows.length + lineRows.length + jobRows.length + inspectionRows.length;
console.error(
  `Generated rows: customers=${newCustomerRows.length}, orders=${orderRows.length}, lines=${lineRows.length}, jobs=${jobRows.length}, inspections=${inspectionRows.length}, total=${total}`,
);

process.stdout.write(out.join('\n'));
