BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (
  user_id,
  name,
  email,
  role,
  department,
  password_hash
)
VALUES
  ('2f5e5ca2-1f74-4aec-a649-a4037e9f6f9a', 'System Administrator', 'sysadmin@alumex.local', 'SYSTEM_ADMIN'::"Role", 'IT', crypt('Admin@12345', gen_salt('bf', 12))),
  ('49cfb6d6-8474-45c3-8a6f-3f83f5dd52da', 'Export Coordinator', 'export.coordinator@alumex.local', 'EXPORT_COORDINATOR'::"Role", 'Logistics', crypt('Export@12345', gen_salt('bf', 12))),
  ('95e15f6c-ef81-4af2-9f90-2990eb4fb8ad', 'Warehouse Officer', 'warehouse.officer@alumex.local', 'WAREHOUSE_OFFICER'::"Role", 'Warehouse', crypt('Warehouse@12345', gen_salt('bf', 12))),
  ('c434ef36-4557-43b2-a7d3-60841c229688', 'Production Supervisor', 'production.supervisor@alumex.local', 'PRODUCTION_SUPERVISOR'::"Role", 'Production', crypt('Production@12345', gen_salt('bf', 12)))
ON CONFLICT (user_id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  department = EXCLUDED.department;

INSERT INTO suppliers (
  supplier_id,
  name,
  country,
  contact_email,
  certification,
  deleted_at
)
VALUES
  ('8f7d4033-f9e4-4ec6-bfd6-d2db3ff646a1', 'Lanka Billet Imports (Pvt) Ltd', 'Sri Lanka', 'supply@lankabillet.lk', 'ISO 9001', NULL),
  ('d9bf9f0a-9c4a-42a8-a3c6-8ec14c75725f', 'South Asia Alloy Traders', 'India', 'ops@saatraders.in', 'ISO 14001', NULL),
  ('904faf17-8de4-4237-96e2-cdd3eff8eb11', 'Global Chem Supplies', 'Singapore', 'export@globalchem.sg', 'REACH Compliant', NULL),
  ('3f2b21ff-c47e-454f-a5dd-f07f8a7ec122', 'Ceylon Coating Solutions', 'Sri Lanka', 'sales@ceyloncoating.lk', 'ISO 9001', NULL),
  ('f4fceb07-0081-4d0f-a0cc-80a62e8ca9d5', 'Legacy Metals Export House', 'Malaysia', 'legacy@metalsexport.my', 'ISO 45001', '2026-03-01T00:00:00.000Z')
ON CONFLICT (supplier_id) DO UPDATE SET
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  contact_email = EXCLUDED.contact_email,
  certification = EXCLUDED.certification,
  deleted_at = EXCLUDED.deleted_at;

INSERT INTO raw_materials (
  material_id,
  material_category,
  material_type,
  grade,
  quantity_kg,
  unit,
  reorder_level,
  origin,
  supplier_id,
  deleted_at
)
VALUES
  ('f129cae8-cf8e-4279-a16f-8f8a3f8de822', 'BILLET'::"MaterialCategory", 'Aluminium Billet 6063', 'AA6063-T5', 10650, 'kg', 5000, 'UAE', '8f7d4033-f9e4-4ec6-bfd6-d2db3ff646a1', NULL),
  ('449ecb51-0266-42d9-bb74-c970563f9ec3', 'BILLET'::"MaterialCategory", 'Aluminium Billet 6061', 'AA6061-T6', 2600, 'kg', 4000, 'India', '8f7d4033-f9e4-4ec6-bfd6-d2db3ff646a1', NULL),
  ('b30344ac-e2f4-4071-8cfa-a0777ba496f4', 'ALLOY'::"MaterialCategory", 'Magnesium Additive', 'Mg-99.9', 450, 'kg', 300, 'India', 'd9bf9f0a-9c4a-42a8-a3c6-8ec14c75725f', NULL),
  ('a2f2a8e4-4fcc-4595-a657-309f10f6f905', 'CHEMICAL'::"MaterialCategory", 'Degreasing Agent', 'DG-Industrial', 180, 'kg', 200, 'Singapore', '904faf17-8de4-4237-96e2-cdd3eff8eb11', NULL),
  ('4d20f9df-ae71-49b4-8fd1-4046bc66ce02', 'COATING'::"MaterialCategory", 'Powder Coating - Matte Black', 'RAL 9005', 980, 'kg', 500, 'Sri Lanka', '3f2b21ff-c47e-454f-a5dd-f07f8a7ec122', NULL),
  ('2aa15be6-6287-4f28-a9c5-3e8f8da4e98e', 'TRADED_GOOD'::"MaterialCategory", 'Packaging Film Roll', 'PF-Standard', 250, 'kg', 150, 'Sri Lanka', '3f2b21ff-c47e-454f-a5dd-f07f8a7ec122', NULL),
  ('ad3898ad-a1e3-4734-bf20-8f140a6a5cf6', 'CHEMICAL'::"MaterialCategory", 'Anodizing Sealant', 'AS-Prime', 320, 'kg', 250, 'Malaysia', '904faf17-8de4-4237-96e2-cdd3eff8eb11', NULL),
  ('66f3005d-9e7f-4b99-a24c-f58d88f3422d', 'ALLOY'::"MaterialCategory", 'Silicon Additive', 'Si-98', 140, 'kg', 175, 'India', 'd9bf9f0a-9c4a-42a8-a3c6-8ec14c75725f', '2026-02-10T00:00:00.000Z')
ON CONFLICT (material_id) DO UPDATE SET
  material_category = EXCLUDED.material_category,
  material_type = EXCLUDED.material_type,
  grade = EXCLUDED.grade,
  quantity_kg = EXCLUDED.quantity_kg,
  unit = EXCLUDED.unit,
  reorder_level = EXCLUDED.reorder_level,
  origin = EXCLUDED.origin,
  supplier_id = EXCLUDED.supplier_id,
  deleted_at = EXCLUDED.deleted_at;

INSERT INTO dies (
  die_id,
  profile_code,
  product_category,
  usage_count,
  max_usage,
  condition,
  deleted_at
)
VALUES
  ('a2cf88e9-57ca-4229-b307-bcde9f21c773', 'SLID-1001-1', 'Architectural', 7200, 10000, 'good', NULL),
  ('56569a3f-c896-4052-9f43-c72f262a5ce5', 'SWD-101', 'Household', 9050, 10000, 'good', NULL),
  ('44f6f313-cd0d-4fae-81bc-642228684d72', 'ST-1X1', 'Hardware', 10000, 10000, 'retired', NULL),
  ('fe69d610-80be-4ace-bf6a-74f81e38e0a6', 'ALC-RP-101AT', 'Industrial', 4300, 9000, 'maintenance', NULL),
  ('d640a95a-87f8-4d48-b91d-6f0f5137fcfe', 'LOV-01', 'Trading', 1500, 8500, 'good', NULL),
  ('f168e7e4-2f4d-46e7-9f7c-315f419ecf2b', 'PAR-5153', 'Architectural', 2200, 7000, 'retired', '2026-01-20T00:00:00.000Z')
ON CONFLICT (die_id) DO UPDATE SET
  profile_code = EXCLUDED.profile_code,
  product_category = EXCLUDED.product_category,
  usage_count = EXCLUDED.usage_count,
  max_usage = EXCLUDED.max_usage,
  condition = EXCLUDED.condition,
  deleted_at = EXCLUDED.deleted_at;

INSERT INTO products (
  product_id,
  sku,
  name,
  category,
  finish_type,
  length_mm,
  unit
)
VALUES
  ('071d36d3-20f8-4f5c-9fe2-208f16f9c421', 'ALX-ARCH-001', 'Architectural Hollow Profile', 'Architectural', 'Mill Finish', 6000, 'kg'),
  ('1fe08c28-3318-4f06-91cc-38551e5f73d3', 'ALX-HOME-015', 'Household Window Frame Set', 'Household', 'Powder Coated', 5400, 'kg'),
  ('52276ed7-44e1-4f94-a0ca-a96f4eb91595', 'ALX-HARD-208', 'Hardware U Channel', 'Hardware', 'Anodized', 4500, 'kg'),
  ('810b9f7e-a56e-4210-bf4c-28f05f4ccf4a', 'ALX-IND-312', 'Industrial Curtain Wall Mullion', 'Industrial', 'PVDF Coated', 6000, 'kg'),
  ('a85af70c-f8d7-4c20-af9d-4cd3de246992', 'ALX-TRADE-410', 'Trading Export Assembly', 'Trading', 'Mill Finish', 5000, 'kg')
ON CONFLICT (product_id) DO UPDATE SET
  sku = EXCLUDED.sku,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  finish_type = EXCLUDED.finish_type,
  length_mm = EXCLUDED.length_mm,
  unit = EXCLUDED.unit;

INSERT INTO production_jobs (
  job_id,
  material_id,
  die_id,
  process_type,
  input_qty_kg,
  output_qty_kg,
  status,
  qc_status,
  metadata,
  started_at,
  completed_at,
  deleted_at
)
VALUES
  (
    '40c60071-03f1-4ba1-a4ff-46b2ed2e427d',
    'f129cae8-cf8e-4279-a16f-8f8a3f8de822',
    'a2cf88e9-57ca-4229-b307-bcde9f21c773',
    'EXTRUSION'::"ProcessType",
    1500,
    1380,
    'completed',
    'PASS'::"QcStatus",
    '{"batch_no":"EXT-APR-001","line":"L1","operator":"Suresh"}'::jsonb,
    '2026-04-20T07:30:00.000Z',
    '2026-04-20T16:20:00.000Z',
    NULL
  ),
  (
    '1b53485f-c1d0-4c4b-bd5d-76fd5d1f6fe9',
    '449ecb51-0266-42d9-bb74-c970563f9ec3',
    '56569a3f-c896-4052-9f43-c72f262a5ce5',
    'EXTRUSION'::"ProcessType",
    600,
    NULL,
    'in_progress',
    'HOLD'::"QcStatus",
    '{"batch_no":"EXT-APR-004","line":"L2","shift":"night"}'::jsonb,
    '2026-04-23T02:00:00.000Z',
    NULL,
    NULL
  ),
  (
    '8ea7b34f-d2bc-4f35-a211-e5f4c89a6bbf',
    'f129cae8-cf8e-4279-a16f-8f8a3f8de822',
    'd640a95a-87f8-4d48-b91d-6f0f5137fcfe',
    'COATING'::"ProcessType",
    350,
    NULL,
    'on_hold',
    'REJECT'::"QcStatus",
    '{"batch_no":"COAT-APR-002","coating_agent":"RAL9005"}'::jsonb,
    '2026-04-22T09:10:00.000Z',
    NULL,
    NULL
  ),
  (
    '617d8342-caf8-4c8c-b7f2-7194f842f4eb',
    'b30344ac-e2f4-4071-8cfa-a0777ba496f4',
    'fe69d610-80be-4ace-bf6a-74f81e38e0a6',
    'VALUE_ADD'::"ProcessType",
    200,
    NULL,
    'pending',
    'PENDING'::"QcStatus",
    '{"batch_no":"VA-APR-005","value_add_type":"custom_cut"}'::jsonb,
    NULL,
    NULL,
    NULL
  ),
  (
    '76381b6e-3f87-4e89-87cd-715ad438ff1e',
    'ad3898ad-a1e3-4734-bf20-8f140a6a5cf6',
    'fe69d610-80be-4ace-bf6a-74f81e38e0a6',
    'COATING'::"ProcessType",
    100,
    92,
    'cancelled',
    'PENDING'::"QcStatus",
    '{"batch_no":"COAT-APR-006","reason":"power_interruption"}'::jsonb,
    '2026-04-21T05:40:00.000Z',
    NULL,
    NULL
  )
ON CONFLICT (job_id) DO UPDATE SET
  material_id = EXCLUDED.material_id,
  die_id = EXCLUDED.die_id,
  process_type = EXCLUDED.process_type,
  input_qty_kg = EXCLUDED.input_qty_kg,
  output_qty_kg = EXCLUDED.output_qty_kg,
  status = EXCLUDED.status,
  qc_status = EXCLUDED.qc_status,
  metadata = EXCLUDED.metadata,
  started_at = EXCLUDED.started_at,
  completed_at = EXCLUDED.completed_at,
  deleted_at = EXCLUDED.deleted_at;

INSERT INTO qc_inspections (
  inspection_id,
  job_id,
  status,
  inspector_name,
  notes,
  inspected_at
)
VALUES
  (
    '354f3ba4-f35b-4f8b-83f6-fa0c01f4ac16',
    '40c60071-03f1-4ba1-a4ff-46b2ed2e427d',
    'PASS'::"QcStatus",
    'Nimal Perera',
    'Dimensional checks and surface finish approved.',
    '2026-04-20T15:40:00.000Z'
  ),
  (
    '0b95c6d6-2a07-49d6-af6f-32349c8ab7f7',
    '40c60071-03f1-4ba1-a4ff-46b2ed2e427d',
    'HOLD'::"QcStatus",
    'Nimal Perera',
    'Initial visual inspection requested re-cleaning; later cleared.',
    '2026-04-20T13:05:00.000Z'
  ),
  (
    '4d3f7bc7-08b0-4b7c-9c8b-2de79d1f7dc5',
    '1b53485f-c1d0-4c4b-bd5d-76fd5d1f6fe9',
    'HOLD'::"QcStatus",
    'Ayesha Fernando',
    'Hold due to minor profile deviation on sample lot.',
    '2026-04-23T04:45:00.000Z'
  ),
  (
    '7d44879f-9d46-4d64-8f04-1bbf6df78866',
    '8ea7b34f-d2bc-4f35-a211-e5f4c89a6bbf',
    'REJECT'::"QcStatus",
    'Chamodi Silva',
    'Coating adhesion failed cross-hatch test.',
    '2026-04-22T12:30:00.000Z'
  )
ON CONFLICT (inspection_id) DO UPDATE SET
  job_id = EXCLUDED.job_id,
  status = EXCLUDED.status,
  inspector_name = EXCLUDED.inspector_name,
  notes = EXCLUDED.notes,
  inspected_at = EXCLUDED.inspected_at;

INSERT INTO inventory_items (
  item_id,
  product_id,
  job_id,
  quantity,
  reserved_quantity,
  location_code,
  warehouse_zone,
  needs_supervisor_review,
  received_at
)
VALUES
  (
    '6aa650cb-47fa-49f0-b3c9-f4612248d7f6',
    '071d36d3-20f8-4f5c-9fe2-208f16f9c421',
    '40c60071-03f1-4ba1-a4ff-46b2ed2e427d',
    1380,
    120,
    'FG-DEFAULT',
    'FINISHED_GOODS',
    false,
    '2026-04-20T16:25:00.000Z'
  ),
  (
    'f4867cc8-bd9d-4748-bf14-cac9de2f3f87',
    '1fe08c28-3318-4f06-91cc-38551e5f73d3',
    NULL,
    240,
    40,
    'FG-WF-01',
    'FINISHED_GOODS',
    false,
    '2026-04-19T10:00:00.000Z'
  ),
  (
    'b2b67c9f-fd88-4e34-a6c6-5f0b026b6ab2',
    'a85af70c-f8d7-4c20-af9d-4cd3de246992',
    NULL,
    95,
    15,
    'EXP-ZONE-A1',
    'export',
    true,
    '2026-04-21T11:30:00.000Z'
  )
ON CONFLICT (item_id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  job_id = EXCLUDED.job_id,
  quantity = EXCLUDED.quantity,
  reserved_quantity = EXCLUDED.reserved_quantity,
  location_code = EXCLUDED.location_code,
  warehouse_zone = EXCLUDED.warehouse_zone,
  needs_supervisor_review = EXCLUDED.needs_supervisor_review,
  received_at = EXCLUDED.received_at;

INSERT INTO stock_movements (
  movement_id,
  item_id,
  movement_type,
  quantity,
  reason,
  performed_by,
  moved_at
)
VALUES
  (
    'af4e4d6d-c787-4d50-9388-2403f2bf1844',
    '6aa650cb-47fa-49f0-b3c9-f4612248d7f6',
    'RECEIVE',
    1380,
    'Initial finished goods receipt from completed production batch',
    '95e15f6c-ef81-4af2-9f90-2990eb4fb8ad',
    '2026-04-20T16:26:00.000Z'
  ),
  (
    '5d6fe7a5-0cbb-40b2-b3fe-e95f7884d2af',
    'f4867cc8-bd9d-4748-bf14-cac9de2f3f87',
    'MANUAL_ADJUSTMENT',
    -12,
    'Damaged during handling; quantity adjusted after supervisor confirmation',
    '95e15f6c-ef81-4af2-9f90-2990eb4fb8ad',
    '2026-04-22T09:00:00.000Z'
  ),
  (
    'cdd043f1-1830-4d58-8978-113cd84057c0',
    'f4867cc8-bd9d-4748-bf14-cac9de2f3f87',
    'TRANSFER_OUT',
    -40,
    'Moved to export buffer for shipment preparation',
    '49cfb6d6-8474-45c3-8a6f-3f83f5dd52da',
    '2026-04-23T08:45:00.000Z'
  ),
  (
    'e11a2fdb-90a0-4c11-b791-e07b7489f477',
    'b2b67c9f-fd88-4e34-a6c6-5f0b026b6ab2',
    'TRANSFER_IN',
    40,
    'Received from finished goods to export buffer for shipment preparation',
    '49cfb6d6-8474-45c3-8a6f-3f83f5dd52da',
    '2026-04-23T08:46:00.000Z'
  ),
  (
    'e3b215d6-f338-44ae-b58d-b9cc5798ee4e',
    'b2b67c9f-fd88-4e34-a6c6-5f0b026b6ab2',
    'STOCKTAKE_ADJUSTMENT',
    -3,
    'Stocktake variance adjustment (system=95, counted=92)',
    '2f5e5ca2-1f74-4aec-a649-a4037e9f6f9a',
    '2026-04-23T12:20:00.000Z'
  )
ON CONFLICT (movement_id) DO UPDATE SET
  item_id = EXCLUDED.item_id,
  movement_type = EXCLUDED.movement_type,
  quantity = EXCLUDED.quantity,
  reason = EXCLUDED.reason,
  performed_by = EXCLUDED.performed_by,
  moved_at = EXCLUDED.moved_at;

INSERT INTO customers (
  customer_id,
  name,
  type,
  country,
  contact_email
)
VALUES
  (
    '26f97f8f-3e1d-4ce7-8bf2-4f15f6eea101',
    'Lanka Fabrication Works',
    'fabricator',
    'LK',
    'ops@lankafabrication.lk'
  ),
  (
    '8d449a1f-ff21-47df-8d3f-0cc5c8be6102',
    'Gulf Build Materials LLC',
    'export',
    'AE',
    'orders@gulfbuild.ae'
  ),
  (
    'b7d32a0d-1912-4305-a595-93ac9f5a8f03',
    'City Retail Projects',
    'retail',
    'LK',
    'procurement@cityretail.lk'
  ),
  (
    '4fca0f2f-a226-4ec7-bf2f-d6bc2f6ab904',
    'South Asia Construction Hub',
    'B2B',
    'IN',
    'buying@sachub.in'
  )
ON CONFLICT (customer_id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  country = EXCLUDED.country,
  contact_email = EXCLUDED.contact_email;

INSERT INTO sales_orders (
  order_id,
  customer_id,
  channel,
  status,
  order_date,
  dispatch_date
)
VALUES
  (
    '4d86c3ca-958e-4f6a-8f0a-a2f7f57e4b11',
    '26f97f8f-3e1d-4ce7-8bf2-4f15f6eea101',
    'local',
    'pending',
    '2026-04-23T09:00:00.000Z',
    NULL
  ),
  (
    '965e3c9b-f4f0-4a12-8e01-39e6e7f65872',
    '8d449a1f-ff21-47df-8d3f-0cc5c8be6102',
    'export',
    'dispatched',
    '2026-04-21T08:15:00.000Z',
    '2026-04-22T14:00:00.000Z'
  ),
  (
    'f16af1aa-e0ad-4fd8-a4ec-8f4ccfd5905f',
    'b7d32a0d-1912-4305-a595-93ac9f5a8f03',
    'alumex_store',
    'cancelled',
    '2026-04-22T11:30:00.000Z',
    NULL
  ),
  (
    '2f589748-bca1-40bc-8e79-47a6099c191f',
    '8d449a1f-ff21-47df-8d3f-0cc5c8be6102',
    'export',
    'returned',
    '2026-04-20T10:00:00.000Z',
    '2026-04-20T16:30:00.000Z'
  ),
  (
    'c5f7ca76-5a86-433e-b9ca-c76854dd83fc',
    '8d449a1f-ff21-47df-8d3f-0cc5c8be6102',
    'export',
    'pending',
    '2026-04-23T13:20:00.000Z',
    NULL
  )
ON CONFLICT (order_id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  channel = EXCLUDED.channel,
  status = EXCLUDED.status,
  order_date = EXCLUDED.order_date,
  dispatch_date = EXCLUDED.dispatch_date;

INSERT INTO order_lines (
  line_id,
  order_id,
  product_id,
  qty_ordered,
  qty_dispatched,
  unit_price
)
VALUES
  (
    '8fb3b8f0-e2f5-4a4f-b6db-4c3e65090b93',
    '4d86c3ca-958e-4f6a-8f0a-a2f7f57e4b11',
    '071d36d3-20f8-4f5c-9fe2-208f16f9c421',
    120,
    0,
    2450
  ),
  (
    'fbc95a68-3d18-4538-a9ab-f845f659ad56',
    '4d86c3ca-958e-4f6a-8f0a-a2f7f57e4b11',
    '1fe08c28-3318-4f06-91cc-38551e5f73d3',
    40,
    0,
    3100
  ),
  (
    '53c4fdb8-0d17-4470-a11a-0601d4c6f892',
    '965e3c9b-f4f0-4a12-8e01-39e6e7f65872',
    'a85af70c-f8d7-4c20-af9d-4cd3de246992',
    30,
    30,
    5200
  ),
  (
    '4c84bd6c-7c03-4fd9-a861-84f995f48ac0',
    'f16af1aa-e0ad-4fd8-a4ec-8f4ccfd5905f',
    '52276ed7-44e1-4f94-a0ca-a96f4eb91595',
    25,
    0,
    2750
  ),
  (
    '0d8aa2d4-c00e-4668-a4ca-d5609f0a58b7',
    '2f589748-bca1-40bc-8e79-47a6099c191f',
    'a85af70c-f8d7-4c20-af9d-4cd3de246992',
    10,
    0,
    5150
  ),
  (
    '0900b58e-a853-4d7d-9960-cf3cb7e5a216',
    'c5f7ca76-5a86-433e-b9ca-c76854dd83fc',
    'a85af70c-f8d7-4c20-af9d-4cd3de246992',
    15,
    0,
    5300
  )
ON CONFLICT (line_id) DO UPDATE SET
  order_id = EXCLUDED.order_id,
  product_id = EXCLUDED.product_id,
  qty_ordered = EXCLUDED.qty_ordered,
  qty_dispatched = EXCLUDED.qty_dispatched,
  unit_price = EXCLUDED.unit_price;

INSERT INTO order_line_reservations (
  reservation_id,
  line_id,
  item_id,
  quantity,
  created_at
)
VALUES
  (
    '3e91a665-4cf0-4ed7-a63a-4fb4b08f4f19',
    '8fb3b8f0-e2f5-4a4f-b6db-4c3e65090b93',
    '6aa650cb-47fa-49f0-b3c9-f4612248d7f6',
    120,
    '2026-04-23T09:05:00.000Z'
  ),
  (
    '9985d3f2-1f62-4d83-a6a2-f228cb15f9fa',
    'fbc95a68-3d18-4538-a9ab-f845f659ad56',
    'f4867cc8-bd9d-4748-bf14-cac9de2f3f87',
    40,
    '2026-04-23T09:05:00.000Z'
  ),
  (
    '2d34da19-8de4-4552-9434-2fcaf4167d6d',
    '53c4fdb8-0d17-4470-a11a-0601d4c6f892',
    'b2b67c9f-fd88-4e34-a6c6-5f0b026b6ab2',
    30,
    '2026-04-22T13:40:00.000Z'
  ),
  (
    'f23c0604-9710-4d9d-8fc1-fb89ef65f759',
    '0d8aa2d4-c00e-4668-a4ca-d5609f0a58b7',
    'b2b67c9f-fd88-4e34-a6c6-5f0b026b6ab2',
    10,
    '2026-04-20T16:10:00.000Z'
  ),
  (
    'ff1a70d0-a15f-4faf-a166-033f5c4f0f86',
    '0900b58e-a853-4d7d-9960-cf3cb7e5a216',
    'b2b67c9f-fd88-4e34-a6c6-5f0b026b6ab2',
    15,
    '2026-04-23T13:24:00.000Z'
  )
ON CONFLICT (reservation_id) DO UPDATE SET
  line_id = EXCLUDED.line_id,
  item_id = EXCLUDED.item_id,
  quantity = EXCLUDED.quantity,
  created_at = EXCLUDED.created_at;

INSERT INTO stock_movements (
  movement_id,
  item_id,
  movement_type,
  quantity,
  reason,
  performed_by,
  moved_at
)
VALUES
  (
    '58bbd57d-a438-4ba7-a8a4-9e9435d21273',
    'b2b67c9f-fd88-4e34-a6c6-5f0b026b6ab2',
    'DISPATCH',
    -30,
    'Order 965e3c9b-f4f0-4a12-8e01-39e6e7f65872 dispatched',
    '95e15f6c-ef81-4af2-9f90-2990eb4fb8ad',
    '2026-04-22T14:00:00.000Z'
  ),
  (
    'fd7d69f2-5606-4d5b-9fc4-78a9fcf86808',
    'b2b67c9f-fd88-4e34-a6c6-5f0b026b6ab2',
    'DISPATCH',
    -10,
    'Order 2f589748-bca1-40bc-8e79-47a6099c191f dispatched',
    '49cfb6d6-8474-45c3-8a6f-3f83f5dd52da',
    '2026-04-20T16:30:00.000Z'
  ),
  (
    '9c7f181c-8dc6-4f61-aa7c-0b6701deab2e',
    'b2b67c9f-fd88-4e34-a6c6-5f0b026b6ab2',
    'RETURN',
    10,
    'Order 2f589748-bca1-40bc-8e79-47a6099c191f returned',
    '49cfb6d6-8474-45c3-8a6f-3f83f5dd52da',
    '2026-04-21T09:20:00.000Z'
  )
ON CONFLICT (movement_id) DO UPDATE SET
  item_id = EXCLUDED.item_id,
  movement_type = EXCLUDED.movement_type,
  quantity = EXCLUDED.quantity,
  reason = EXCLUDED.reason,
  performed_by = EXCLUDED.performed_by,
  moved_at = EXCLUDED.moved_at;

-- ============================================================
-- Extended seed data (generated): ~13 months, June 2025 -> June 2026
-- Generated by prisma/generate-extended-seed.cjs (deterministic)
-- ============================================================

INSERT INTO customers (customer_id, name, type, country, contact_email)
VALUES
  ('f0c10000-0000-4000-8000-000000000001', 'Colombo Glass & Aluminium', 'fabricator', 'LK', 'orders@colomboglass.lk'),
  ('f0c10000-0000-4000-8000-000000000002', 'Emirates Facade Systems', 'export', 'AE', 'procure@emiratesfacade.ae'),
  ('f0c10000-0000-4000-8000-000000000003', 'Highland Hardware Stores', 'retail', 'LK', 'buying@highlandhardware.lk'),
  ('f0c10000-0000-4000-8000-000000000004', 'Metro Builders (Pvt) Ltd', 'B2B', 'LK', 'supplies@metrobuilders.lk'),
  ('f0c10000-0000-4000-8000-000000000005', 'Indus Trading Co', 'export', 'IN', 'imports@industrading.in')
ON CONFLICT (customer_id) DO UPDATE SET
  name = EXCLUDED.name, type = EXCLUDED.type, country = EXCLUDED.country, contact_email = EXCLUDED.contact_email;

INSERT INTO sales_orders (order_id, customer_id, channel, status, order_date, dispatch_date)
VALUES
  ('f0010000-0000-4000-8000-000000000001', 'f0c10000-0000-4000-8000-000000000002', 'export', 'dispatched', '2025-06-11T09:00:00.000Z', '2025-06-13T17:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000002', 'f0c10000-0000-4000-8000-000000000004', 'local', 'dispatched', '2025-06-13T11:00:00.000Z', '2025-06-14T11:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000003', 'f0c10000-0000-4000-8000-000000000001', 'local', 'dispatched', '2025-06-07T08:00:00.000Z', '2025-06-11T11:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000004', '4fca0f2f-a226-4ec7-bf2f-d6bc2f6ab904', 'local', 'dispatched', '2025-06-23T15:00:00.000Z', '2025-06-27T16:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000005', 'f0c10000-0000-4000-8000-000000000003', 'alumex_store', 'dispatched', '2025-07-24T08:00:00.000Z', '2025-07-27T11:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000006', '8d449a1f-ff21-47df-8d3f-0cc5c8be6102', 'export', 'dispatched', '2025-07-18T08:00:00.000Z', '2025-07-20T13:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000007', 'f0c10000-0000-4000-8000-000000000004', 'local', 'dispatched', '2025-07-03T12:00:00.000Z', '2025-07-04T17:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000008', 'f0c10000-0000-4000-8000-000000000001', 'local', 'dispatched', '2025-07-22T14:00:00.000Z', '2025-07-23T12:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000009', '26f97f8f-3e1d-4ce7-8bf2-4f15f6eea101', 'local', 'dispatched', '2025-08-20T13:00:00.000Z', '2025-08-24T17:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000010', '4fca0f2f-a226-4ec7-bf2f-d6bc2f6ab904', 'local', 'dispatched', '2025-08-24T10:00:00.000Z', '2025-08-26T14:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000011', '4fca0f2f-a226-4ec7-bf2f-d6bc2f6ab904', 'local', 'dispatched', '2025-08-24T12:00:00.000Z', '2025-08-26T14:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000012', 'f0c10000-0000-4000-8000-000000000004', 'local', 'dispatched', '2025-08-11T10:00:00.000Z', '2025-08-13T12:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000013', 'f0c10000-0000-4000-8000-000000000005', 'export', 'dispatched', '2025-09-25T09:00:00.000Z', '2025-09-26T15:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000014', '8d449a1f-ff21-47df-8d3f-0cc5c8be6102', 'export', 'dispatched', '2025-09-26T10:00:00.000Z', '2025-09-27T10:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000015', '8d449a1f-ff21-47df-8d3f-0cc5c8be6102', 'export', 'dispatched', '2025-09-21T09:00:00.000Z', '2025-09-25T10:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000016', 'f0c10000-0000-4000-8000-000000000003', 'alumex_store', 'dispatched', '2025-10-09T10:00:00.000Z', '2025-10-10T14:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000017', 'f0c10000-0000-4000-8000-000000000001', 'local', 'dispatched', '2025-10-19T10:00:00.000Z', '2025-10-22T14:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000018', 'f0c10000-0000-4000-8000-000000000005', 'export', 'cancelled', '2025-10-25T12:00:00.000Z', NULL),
  ('f0010000-0000-4000-8000-000000000019', 'f0c10000-0000-4000-8000-000000000005', 'export', 'dispatched', '2025-11-24T12:00:00.000Z', '2025-11-28T13:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000020', 'f0c10000-0000-4000-8000-000000000001', 'local', 'dispatched', '2025-11-11T10:00:00.000Z', '2025-11-15T14:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000021', 'f0c10000-0000-4000-8000-000000000001', 'local', 'dispatched', '2025-11-05T15:00:00.000Z', '2025-11-09T10:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000022', 'f0c10000-0000-4000-8000-000000000004', 'local', 'dispatched', '2025-11-21T10:00:00.000Z', '2025-11-24T14:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000023', 'f0c10000-0000-4000-8000-000000000004', 'local', 'dispatched', '2025-12-05T14:00:00.000Z', '2025-12-08T14:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000024', 'f0c10000-0000-4000-8000-000000000002', 'export', 'dispatched', '2025-12-24T12:00:00.000Z', '2025-12-27T16:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000025', 'f0c10000-0000-4000-8000-000000000002', 'export', 'dispatched', '2025-12-08T13:00:00.000Z', '2025-12-11T10:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000026', '4fca0f2f-a226-4ec7-bf2f-d6bc2f6ab904', 'local', 'dispatched', '2026-01-26T08:00:00.000Z', '2026-01-28T13:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000027', 'f0c10000-0000-4000-8000-000000000004', 'local', 'dispatched', '2026-01-10T13:00:00.000Z', '2026-01-14T11:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000028', 'f0c10000-0000-4000-8000-000000000002', 'export', 'dispatched', '2026-01-08T14:00:00.000Z', '2026-01-10T10:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000029', 'f0c10000-0000-4000-8000-000000000001', 'local', 'dispatched', '2026-02-05T15:00:00.000Z', '2026-02-07T11:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000030', 'f0c10000-0000-4000-8000-000000000005', 'export', 'dispatched', '2026-02-01T12:00:00.000Z', '2026-02-05T10:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000031', '26f97f8f-3e1d-4ce7-8bf2-4f15f6eea101', 'local', 'dispatched', '2026-02-07T14:00:00.000Z', '2026-02-11T11:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000032', '4fca0f2f-a226-4ec7-bf2f-d6bc2f6ab904', 'local', 'dispatched', '2026-02-11T09:00:00.000Z', '2026-02-12T17:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000033', 'f0c10000-0000-4000-8000-000000000001', 'local', 'dispatched', '2026-03-20T15:00:00.000Z', '2026-03-24T12:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000034', 'f0c10000-0000-4000-8000-000000000005', 'export', 'dispatched', '2026-03-14T13:00:00.000Z', '2026-03-16T10:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000035', 'f0c10000-0000-4000-8000-000000000002', 'export', 'dispatched', '2026-03-18T08:00:00.000Z', '2026-03-20T13:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000036', '4fca0f2f-a226-4ec7-bf2f-d6bc2f6ab904', 'local', 'dispatched', '2026-04-09T10:00:00.000Z', '2026-04-12T14:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000037', '26f97f8f-3e1d-4ce7-8bf2-4f15f6eea101', 'local', 'dispatched', '2026-04-04T15:00:00.000Z', '2026-04-06T10:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000038', '26f97f8f-3e1d-4ce7-8bf2-4f15f6eea101', 'local', 'dispatched', '2026-04-14T09:00:00.000Z', '2026-04-17T14:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000039', 'f0c10000-0000-4000-8000-000000000004', 'local', 'dispatched', '2026-05-08T10:00:00.000Z', '2026-05-12T17:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000040', 'b7d32a0d-1912-4305-a595-93ac9f5a8f03', 'alumex_store', 'dispatched', '2026-05-24T12:00:00.000Z', '2026-05-27T13:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000041', '4fca0f2f-a226-4ec7-bf2f-d6bc2f6ab904', 'local', 'dispatched', '2026-05-12T09:00:00.000Z', '2026-05-15T13:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000042', '26f97f8f-3e1d-4ce7-8bf2-4f15f6eea101', 'local', 'pending', '2026-06-23T15:00:00.000Z', NULL),
  ('f0010000-0000-4000-8000-000000000043', 'f0c10000-0000-4000-8000-000000000002', 'export', 'pending', '2026-06-08T12:00:00.000Z', NULL),
  ('f0010000-0000-4000-8000-000000000044', 'f0c10000-0000-4000-8000-000000000003', 'alumex_store', 'dispatched', '2026-06-05T12:00:00.000Z', '2026-06-08T10:00:00.000Z'),
  ('f0010000-0000-4000-8000-000000000045', 'f0c10000-0000-4000-8000-000000000005', 'export', 'dispatched', '2026-06-15T13:00:00.000Z', '2026-06-19T13:00:00.000Z')
ON CONFLICT (order_id) DO UPDATE SET
  customer_id = EXCLUDED.customer_id, channel = EXCLUDED.channel, status = EXCLUDED.status, order_date = EXCLUDED.order_date, dispatch_date = EXCLUDED.dispatch_date;

INSERT INTO order_lines (line_id, order_id, product_id, qty_ordered, qty_dispatched, unit_price)
VALUES
  ('f0020000-0000-4000-8000-000000000001', 'f0010000-0000-4000-8000-000000000001', 'a1a1a1a1-0000-4000-8000-000000000006', 174, 174, 1833.73),
  ('f0020000-0000-4000-8000-000000000002', 'f0010000-0000-4000-8000-000000000001', 'a1a1a1a1-0000-4000-8000-000000000011', 89, 89, 680.54),
  ('f0020000-0000-4000-8000-000000000003', 'f0010000-0000-4000-8000-000000000001', 'a1a1a1a1-0000-4000-8000-000000000007', 191, 191, 1544.61),
  ('f0020000-0000-4000-8000-000000000004', 'f0010000-0000-4000-8000-000000000002', 'a1a1a1a1-0000-4000-8000-000000000012', 68, 68, 817.43),
  ('f0020000-0000-4000-8000-000000000005', 'f0010000-0000-4000-8000-000000000002', '1fe08c28-3318-4f06-91cc-38551e5f73d3', 50, 50, 3195.35),
  ('f0020000-0000-4000-8000-000000000006', 'f0010000-0000-4000-8000-000000000003', 'a1a1a1a1-0000-4000-8000-000000000009', 112, 112, 1182.86),
  ('f0020000-0000-4000-8000-000000000007', 'f0010000-0000-4000-8000-000000000003', 'a85af70c-f8d7-4c20-af9d-4cd3de246992', 79, 79, 5234.7),
  ('f0020000-0000-4000-8000-000000000008', 'f0010000-0000-4000-8000-000000000003', '1fe08c28-3318-4f06-91cc-38551e5f73d3', 167, 167, 3028.33),
  ('f0020000-0000-4000-8000-000000000009', 'f0010000-0000-4000-8000-000000000004', 'a1a1a1a1-0000-4000-8000-000000000011', 103, 103, 648.22),
  ('f0020000-0000-4000-8000-000000000010', 'f0010000-0000-4000-8000-000000000004', 'a1a1a1a1-0000-4000-8000-000000000007', 78, 78, 1518.45),
  ('f0020000-0000-4000-8000-000000000011', 'f0010000-0000-4000-8000-000000000004', 'a1a1a1a1-0000-4000-8000-000000000012', 83, 83, 860.62),
  ('f0020000-0000-4000-8000-000000000012', 'f0010000-0000-4000-8000-000000000005', '071d36d3-20f8-4f5c-9fe2-208f16f9c421', 135, 135, 2330.99),
  ('f0020000-0000-4000-8000-000000000013', 'f0010000-0000-4000-8000-000000000005', 'a1a1a1a1-0000-4000-8000-000000000006', 93, 93, 1865.54),
  ('f0020000-0000-4000-8000-000000000014', 'f0010000-0000-4000-8000-000000000006', '810b9f7e-a56e-4210-bf4c-28f05f4ccf4a', 71, 71, 3503.42),
  ('f0020000-0000-4000-8000-000000000015', 'f0010000-0000-4000-8000-000000000006', '1fe08c28-3318-4f06-91cc-38551e5f73d3', 168, 168, 3115.85),
  ('f0020000-0000-4000-8000-000000000016', 'f0010000-0000-4000-8000-000000000007', 'a85af70c-f8d7-4c20-af9d-4cd3de246992', 34, 34, 5146.82),
  ('f0020000-0000-4000-8000-000000000017', 'f0010000-0000-4000-8000-000000000007', '1fe08c28-3318-4f06-91cc-38551e5f73d3', 66, 66, 3194.82),
  ('f0020000-0000-4000-8000-000000000018', 'f0010000-0000-4000-8000-000000000008', 'a1a1a1a1-0000-4000-8000-000000000006', 215, 215, 1818.97),
  ('f0020000-0000-4000-8000-000000000019', 'f0010000-0000-4000-8000-000000000009', 'a1a1a1a1-0000-4000-8000-000000000009', 24, 24, 1153.43),
  ('f0020000-0000-4000-8000-000000000020', 'f0010000-0000-4000-8000-000000000009', 'a1a1a1a1-0000-4000-8000-000000000006', 59, 59, 1743.62),
  ('f0020000-0000-4000-8000-000000000021', 'f0010000-0000-4000-8000-000000000009', '810b9f7e-a56e-4210-bf4c-28f05f4ccf4a', 102, 102, 3580.45),
  ('f0020000-0000-4000-8000-000000000022', 'f0010000-0000-4000-8000-000000000010', '1fe08c28-3318-4f06-91cc-38551e5f73d3', 117, 117, 3148.5),
  ('f0020000-0000-4000-8000-000000000023', 'f0010000-0000-4000-8000-000000000011', '52276ed7-44e1-4f94-a0ca-a96f4eb91595', 84, 84, 2626.16),
  ('f0020000-0000-4000-8000-000000000024', 'f0010000-0000-4000-8000-000000000012', 'a1a1a1a1-0000-4000-8000-000000000006', 210, 210, 1884.48),
  ('f0020000-0000-4000-8000-000000000025', 'f0010000-0000-4000-8000-000000000012', 'a85af70c-f8d7-4c20-af9d-4cd3de246992', 202, 202, 5296.06),
  ('f0020000-0000-4000-8000-000000000026', 'f0010000-0000-4000-8000-000000000012', '810b9f7e-a56e-4210-bf4c-28f05f4ccf4a', 47, 47, 3644.37),
  ('f0020000-0000-4000-8000-000000000027', 'f0010000-0000-4000-8000-000000000013', '071d36d3-20f8-4f5c-9fe2-208f16f9c421', 202, 202, 2559.37),
  ('f0020000-0000-4000-8000-000000000028', 'f0010000-0000-4000-8000-000000000013', 'a1a1a1a1-0000-4000-8000-000000000007', 128, 128, 1499.39),
  ('f0020000-0000-4000-8000-000000000029', 'f0010000-0000-4000-8000-000000000014', '810b9f7e-a56e-4210-bf4c-28f05f4ccf4a', 79, 79, 3615.53),
  ('f0020000-0000-4000-8000-000000000030', 'f0010000-0000-4000-8000-000000000014', '071d36d3-20f8-4f5c-9fe2-208f16f9c421', 162, 162, 2521.48),
  ('f0020000-0000-4000-8000-000000000031', 'f0010000-0000-4000-8000-000000000015', 'a1a1a1a1-0000-4000-8000-000000000009', 88, 88, 1189.15),
  ('f0020000-0000-4000-8000-000000000032', 'f0010000-0000-4000-8000-000000000015', 'a85af70c-f8d7-4c20-af9d-4cd3de246992', 133, 133, 4997.22),
  ('f0020000-0000-4000-8000-000000000033', 'f0010000-0000-4000-8000-000000000015', '1fe08c28-3318-4f06-91cc-38551e5f73d3', 216, 216, 3248.89),
  ('f0020000-0000-4000-8000-000000000034', 'f0010000-0000-4000-8000-000000000016', '1fe08c28-3318-4f06-91cc-38551e5f73d3', 92, 92, 3010.86),
  ('f0020000-0000-4000-8000-000000000035', 'f0010000-0000-4000-8000-000000000016', 'a85af70c-f8d7-4c20-af9d-4cd3de246992', 203, 203, 5174.07),
  ('f0020000-0000-4000-8000-000000000036', 'f0010000-0000-4000-8000-000000000016', 'a1a1a1a1-0000-4000-8000-000000000009', 40, 40, 1166.64),
  ('f0020000-0000-4000-8000-000000000037', 'f0010000-0000-4000-8000-000000000017', 'a85af70c-f8d7-4c20-af9d-4cd3de246992', 81, 81, 5044.82),
  ('f0020000-0000-4000-8000-000000000038', 'f0010000-0000-4000-8000-000000000017', 'a1a1a1a1-0000-4000-8000-000000000007', 192, 192, 1447.39),
  ('f0020000-0000-4000-8000-000000000039', 'f0010000-0000-4000-8000-000000000018', 'a1a1a1a1-0000-4000-8000-000000000009', 58, 0, 1197.71),
  ('f0020000-0000-4000-8000-000000000040', 'f0010000-0000-4000-8000-000000000018', '810b9f7e-a56e-4210-bf4c-28f05f4ccf4a', 93, 0, 3388.1),
  ('f0020000-0000-4000-8000-000000000041', 'f0010000-0000-4000-8000-000000000018', '071d36d3-20f8-4f5c-9fe2-208f16f9c421', 195, 0, 2430),
  ('f0020000-0000-4000-8000-000000000042', 'f0010000-0000-4000-8000-000000000019', 'a1a1a1a1-0000-4000-8000-000000000006', 132, 132, 1788.11),
  ('f0020000-0000-4000-8000-000000000043', 'f0010000-0000-4000-8000-000000000019', 'a1a1a1a1-0000-4000-8000-000000000007', 60, 60, 1551.81),
  ('f0020000-0000-4000-8000-000000000044', 'f0010000-0000-4000-8000-000000000019', 'a1a1a1a1-0000-4000-8000-000000000012', 87, 87, 873.96),
  ('f0020000-0000-4000-8000-000000000045', 'f0010000-0000-4000-8000-000000000020', '071d36d3-20f8-4f5c-9fe2-208f16f9c421', 162, 162, 2388.6),
  ('f0020000-0000-4000-8000-000000000046', 'f0010000-0000-4000-8000-000000000020', 'a1a1a1a1-0000-4000-8000-000000000009', 28, 28, 1143.61),
  ('f0020000-0000-4000-8000-000000000047', 'f0010000-0000-4000-8000-000000000020', 'a1a1a1a1-0000-4000-8000-000000000012', 19, 19, 875.82),
  ('f0020000-0000-4000-8000-000000000048', 'f0010000-0000-4000-8000-000000000021', 'a1a1a1a1-0000-4000-8000-000000000007', 176, 176, 1467.38),
  ('f0020000-0000-4000-8000-000000000049', 'f0010000-0000-4000-8000-000000000021', '1fe08c28-3318-4f06-91cc-38551e5f73d3', 44, 44, 3058.9),
  ('f0020000-0000-4000-8000-000000000050', 'f0010000-0000-4000-8000-000000000021', '52276ed7-44e1-4f94-a0ca-a96f4eb91595', 65, 65, 2827.1),
  ('f0020000-0000-4000-8000-000000000051', 'f0010000-0000-4000-8000-000000000022', 'a1a1a1a1-0000-4000-8000-000000000009', 77, 77, 1145.97),
  ('f0020000-0000-4000-8000-000000000052', 'f0010000-0000-4000-8000-000000000022', '1fe08c28-3318-4f06-91cc-38551e5f73d3', 21, 21, 3087),
  ('f0020000-0000-4000-8000-000000000053', 'f0010000-0000-4000-8000-000000000022', '071d36d3-20f8-4f5c-9fe2-208f16f9c421', 74, 74, 2348.79),
  ('f0020000-0000-4000-8000-000000000054', 'f0010000-0000-4000-8000-000000000023', 'a1a1a1a1-0000-4000-8000-000000000011', 16, 16, 633.33),
  ('f0020000-0000-4000-8000-000000000055', 'f0010000-0000-4000-8000-000000000023', 'a85af70c-f8d7-4c20-af9d-4cd3de246992', 30, 30, 5271.13),
  ('f0020000-0000-4000-8000-000000000056', 'f0010000-0000-4000-8000-000000000024', 'a1a1a1a1-0000-4000-8000-000000000009', 70, 70, 1179.13),
  ('f0020000-0000-4000-8000-000000000057', 'f0010000-0000-4000-8000-000000000025', '52276ed7-44e1-4f94-a0ca-a96f4eb91595', 23, 23, 2873.31),
  ('f0020000-0000-4000-8000-000000000058', 'f0010000-0000-4000-8000-000000000026', 'a1a1a1a1-0000-4000-8000-000000000012', 17, 17, 860.64),
  ('f0020000-0000-4000-8000-000000000059', 'f0010000-0000-4000-8000-000000000026', 'a1a1a1a1-0000-4000-8000-000000000006', 147, 147, 1886.21),
  ('f0020000-0000-4000-8000-000000000060', 'f0010000-0000-4000-8000-000000000027', 'a1a1a1a1-0000-4000-8000-000000000012', 10, 10, 873.86),
  ('f0020000-0000-4000-8000-000000000061', 'f0010000-0000-4000-8000-000000000027', '52276ed7-44e1-4f94-a0ca-a96f4eb91595', 40, 40, 2643.88),
  ('f0020000-0000-4000-8000-000000000062', 'f0010000-0000-4000-8000-000000000028', '1fe08c28-3318-4f06-91cc-38551e5f73d3', 93, 93, 2988.84),
  ('f0020000-0000-4000-8000-000000000063', 'f0010000-0000-4000-8000-000000000029', '810b9f7e-a56e-4210-bf4c-28f05f4ccf4a', 120, 120, 3662.23),
  ('f0020000-0000-4000-8000-000000000064', 'f0010000-0000-4000-8000-000000000029', 'a1a1a1a1-0000-4000-8000-000000000006', 152, 152, 1807.27),
  ('f0020000-0000-4000-8000-000000000065', 'f0010000-0000-4000-8000-000000000029', 'a85af70c-f8d7-4c20-af9d-4cd3de246992', 183, 183, 5159.65),
  ('f0020000-0000-4000-8000-000000000066', 'f0010000-0000-4000-8000-000000000030', 'a1a1a1a1-0000-4000-8000-000000000007', 216, 216, 1437.77),
  ('f0020000-0000-4000-8000-000000000067', 'f0010000-0000-4000-8000-000000000030', 'a1a1a1a1-0000-4000-8000-000000000006', 168, 168, 1751.92),
  ('f0020000-0000-4000-8000-000000000068', 'f0010000-0000-4000-8000-000000000031', '810b9f7e-a56e-4210-bf4c-28f05f4ccf4a', 169, 169, 3586.8),
  ('f0020000-0000-4000-8000-000000000069', 'f0010000-0000-4000-8000-000000000031', 'a85af70c-f8d7-4c20-af9d-4cd3de246992', 184, 184, 5343.64),
  ('f0020000-0000-4000-8000-000000000070', 'f0010000-0000-4000-8000-000000000032', 'a1a1a1a1-0000-4000-8000-000000000006', 141, 141, 1828.25),
  ('f0020000-0000-4000-8000-000000000071', 'f0010000-0000-4000-8000-000000000033', 'a85af70c-f8d7-4c20-af9d-4cd3de246992', 89, 89, 5389.46),
  ('f0020000-0000-4000-8000-000000000072', 'f0010000-0000-4000-8000-000000000033', 'a1a1a1a1-0000-4000-8000-000000000007', 90, 90, 1455.52),
  ('f0020000-0000-4000-8000-000000000073', 'f0010000-0000-4000-8000-000000000033', 'a1a1a1a1-0000-4000-8000-000000000012', 150, 150, 824.94),
  ('f0020000-0000-4000-8000-000000000074', 'f0010000-0000-4000-8000-000000000034', '810b9f7e-a56e-4210-bf4c-28f05f4ccf4a', 140, 140, 3646.24),
  ('f0020000-0000-4000-8000-000000000075', 'f0010000-0000-4000-8000-000000000034', 'a1a1a1a1-0000-4000-8000-000000000009', 10, 10, 1153.18),
  ('f0020000-0000-4000-8000-000000000076', 'f0010000-0000-4000-8000-000000000035', '1fe08c28-3318-4f06-91cc-38551e5f73d3', 65, 65, 2999.19),
  ('f0020000-0000-4000-8000-000000000077', 'f0010000-0000-4000-8000-000000000036', 'a1a1a1a1-0000-4000-8000-000000000009', 97, 97, 1183.12),
  ('f0020000-0000-4000-8000-000000000078', 'f0010000-0000-4000-8000-000000000036', 'a1a1a1a1-0000-4000-8000-000000000011', 80, 80, 670.87),
  ('f0020000-0000-4000-8000-000000000079', 'f0010000-0000-4000-8000-000000000036', 'a1a1a1a1-0000-4000-8000-000000000006', 97, 97, 1762.5),
  ('f0020000-0000-4000-8000-000000000080', 'f0010000-0000-4000-8000-000000000037', '071d36d3-20f8-4f5c-9fe2-208f16f9c421', 43, 43, 2437.8),
  ('f0020000-0000-4000-8000-000000000081', 'f0010000-0000-4000-8000-000000000038', 'a85af70c-f8d7-4c20-af9d-4cd3de246992', 67, 67, 4949.87),
  ('f0020000-0000-4000-8000-000000000082', 'f0010000-0000-4000-8000-000000000038', 'a1a1a1a1-0000-4000-8000-000000000009', 106, 106, 1186.4),
  ('f0020000-0000-4000-8000-000000000083', 'f0010000-0000-4000-8000-000000000039', 'a1a1a1a1-0000-4000-8000-000000000011', 46, 46, 680.59),
  ('f0020000-0000-4000-8000-000000000084', 'f0010000-0000-4000-8000-000000000040', '071d36d3-20f8-4f5c-9fe2-208f16f9c421', 214, 214, 2423.83),
  ('f0020000-0000-4000-8000-000000000085', 'f0010000-0000-4000-8000-000000000040', 'a1a1a1a1-0000-4000-8000-000000000007', 147, 147, 1451.07),
  ('f0020000-0000-4000-8000-000000000086', 'f0010000-0000-4000-8000-000000000041', '071d36d3-20f8-4f5c-9fe2-208f16f9c421', 23, 23, 2373.94),
  ('f0020000-0000-4000-8000-000000000087', 'f0010000-0000-4000-8000-000000000042', '1fe08c28-3318-4f06-91cc-38551e5f73d3', 102, 0, 3229.87),
  ('f0020000-0000-4000-8000-000000000088', 'f0010000-0000-4000-8000-000000000042', '071d36d3-20f8-4f5c-9fe2-208f16f9c421', 32, 0, 2375.53),
  ('f0020000-0000-4000-8000-000000000089', 'f0010000-0000-4000-8000-000000000042', 'a1a1a1a1-0000-4000-8000-000000000011', 27, 0, 618.23),
  ('f0020000-0000-4000-8000-000000000090', 'f0010000-0000-4000-8000-000000000043', 'a1a1a1a1-0000-4000-8000-000000000011', 15, 0, 618.21),
  ('f0020000-0000-4000-8000-000000000091', 'f0010000-0000-4000-8000-000000000044', '1fe08c28-3318-4f06-91cc-38551e5f73d3', 101, 101, 3245.19),
  ('f0020000-0000-4000-8000-000000000092', 'f0010000-0000-4000-8000-000000000044', '071d36d3-20f8-4f5c-9fe2-208f16f9c421', 166, 166, 2433.2),
  ('f0020000-0000-4000-8000-000000000093', 'f0010000-0000-4000-8000-000000000044', 'a1a1a1a1-0000-4000-8000-000000000012', 43, 43, 847.2),
  ('f0020000-0000-4000-8000-000000000094', 'f0010000-0000-4000-8000-000000000045', '810b9f7e-a56e-4210-bf4c-28f05f4ccf4a', 152, 152, 3560.48),
  ('f0020000-0000-4000-8000-000000000095', 'f0010000-0000-4000-8000-000000000045', 'a1a1a1a1-0000-4000-8000-000000000006', 20, 20, 1767.34),
  ('f0020000-0000-4000-8000-000000000096', 'f0010000-0000-4000-8000-000000000045', 'a1a1a1a1-0000-4000-8000-000000000009', 125, 125, 1219.51)
ON CONFLICT (line_id) DO UPDATE SET
  order_id = EXCLUDED.order_id, product_id = EXCLUDED.product_id, qty_ordered = EXCLUDED.qty_ordered, qty_dispatched = EXCLUDED.qty_dispatched, unit_price = EXCLUDED.unit_price;

INSERT INTO production_jobs (job_id, material_id, die_id, process_type, input_qty_kg, output_qty_kg, status, qc_status, metadata, started_at, completed_at)
VALUES
  ('f0030000-0000-4000-8000-000000000001', '449ecb51-0266-42d9-bb74-c970563f9ec3', 'a2cf88e9-57ca-4229-b307-bcde9f21c773', 'COATING'::"ProcessType", 449, 399, 'completed', 'PASS'::"QcStatus", '{"batch_no":"BATCH-202506-001","line":"L2"}'::jsonb, '2025-06-19T07:30:00.000Z', '2025-06-19T16:00:00.000Z'),
  ('f0030000-0000-4000-8000-000000000002', 'f129cae8-cf8e-4279-a16f-8f8a3f8de822', 'd640a95a-87f8-4d48-b91d-6f0f5137fcfe', 'VALUE_ADD'::"ProcessType", 1448, 1368, 'completed', 'HOLD'::"QcStatus", '{"batch_no":"BATCH-202507-002","line":"L1"}'::jsonb, '2025-07-03T07:30:00.000Z', '2025-07-03T16:00:00.000Z'),
  ('f0030000-0000-4000-8000-000000000003', 'ad3898ad-a1e3-4734-bf20-8f140a6a5cf6', '56569a3f-c896-4052-9f43-c72f262a5ce5', 'COATING'::"ProcessType", 1301, 1231, 'completed', 'PASS'::"QcStatus", '{"batch_no":"BATCH-202508-003","line":"L3"}'::jsonb, '2025-08-18T07:30:00.000Z', '2025-08-18T16:00:00.000Z'),
  ('f0030000-0000-4000-8000-000000000004', '4d20f9df-ae71-49b4-8fd1-4046bc66ce02', 'd640a95a-87f8-4d48-b91d-6f0f5137fcfe', 'DIE_CASTING'::"ProcessType", 1030, 885, 'completed', 'PASS'::"QcStatus", '{"batch_no":"BATCH-202509-004","line":"L1"}'::jsonb, '2025-09-15T07:30:00.000Z', '2025-09-15T16:00:00.000Z'),
  ('f0030000-0000-4000-8000-000000000005', 'ad3898ad-a1e3-4734-bf20-8f140a6a5cf6', 'd640a95a-87f8-4d48-b91d-6f0f5137fcfe', 'COATING'::"ProcessType", 825, 755, 'completed', 'PASS'::"QcStatus", '{"batch_no":"BATCH-202510-005","line":"L3"}'::jsonb, '2025-10-06T07:30:00.000Z', '2025-10-06T16:00:00.000Z'),
  ('f0030000-0000-4000-8000-000000000006', '449ecb51-0266-42d9-bb74-c970563f9ec3', 'd640a95a-87f8-4d48-b91d-6f0f5137fcfe', 'EXTRUSION'::"ProcessType", 1228, 1085, 'completed', 'PASS'::"QcStatus", '{"batch_no":"BATCH-202511-006","line":"L3"}'::jsonb, '2025-11-02T07:30:00.000Z', '2025-11-02T16:00:00.000Z'),
  ('f0030000-0000-4000-8000-000000000007', '4d20f9df-ae71-49b4-8fd1-4046bc66ce02', 'a2cf88e9-57ca-4229-b307-bcde9f21c773', 'COATING'::"ProcessType", 346, 327, 'completed', 'PASS'::"QcStatus", '{"batch_no":"BATCH-202512-007","line":"L1"}'::jsonb, '2025-12-09T07:30:00.000Z', '2025-12-09T16:00:00.000Z'),
  ('f0030000-0000-4000-8000-000000000008', 'ad3898ad-a1e3-4734-bf20-8f140a6a5cf6', '56569a3f-c896-4052-9f43-c72f262a5ce5', 'VALUE_ADD'::"ProcessType", 902, 821, 'completed', 'PASS'::"QcStatus", '{"batch_no":"BATCH-202601-008","line":"L2"}'::jsonb, '2026-01-14T07:30:00.000Z', '2026-01-14T16:00:00.000Z'),
  ('f0030000-0000-4000-8000-000000000009', 'b30344ac-e2f4-4071-8cfa-a0777ba496f4', 'd640a95a-87f8-4d48-b91d-6f0f5137fcfe', 'EXTRUSION'::"ProcessType", 516, 495, 'completed', 'PASS'::"QcStatus", '{"batch_no":"BATCH-202602-009","line":"L3"}'::jsonb, '2026-02-04T07:30:00.000Z', '2026-02-04T16:00:00.000Z'),
  ('f0030000-0000-4000-8000-000000000010', 'f129cae8-cf8e-4279-a16f-8f8a3f8de822', 'fe69d610-80be-4ace-bf6a-74f81e38e0a6', 'DIE_CASTING'::"ProcessType", 638, 575, 'completed', 'PASS'::"QcStatus", '{"batch_no":"BATCH-202603-010","line":"L1"}'::jsonb, '2026-03-21T07:30:00.000Z', '2026-03-21T16:00:00.000Z'),
  ('f0030000-0000-4000-8000-000000000011', '4d20f9df-ae71-49b4-8fd1-4046bc66ce02', 'a2cf88e9-57ca-4229-b307-bcde9f21c773', 'EXTRUSION'::"ProcessType", 1563, 1384, 'completed', 'REJECT'::"QcStatus", '{"batch_no":"BATCH-202604-011","line":"L3"}'::jsonb, '2026-04-03T07:30:00.000Z', '2026-04-03T16:00:00.000Z'),
  ('f0030000-0000-4000-8000-000000000012', 'b30344ac-e2f4-4071-8cfa-a0777ba496f4', 'd640a95a-87f8-4d48-b91d-6f0f5137fcfe', 'DIE_CASTING'::"ProcessType", 977, 905, 'completed', 'PASS'::"QcStatus", '{"batch_no":"BATCH-202604-012","line":"L1"}'::jsonb, '2026-04-20T07:30:00.000Z', '2026-04-20T16:00:00.000Z'),
  ('f0030000-0000-4000-8000-000000000013', '449ecb51-0266-42d9-bb74-c970563f9ec3', 'a2cf88e9-57ca-4229-b307-bcde9f21c773', 'DIE_CASTING'::"ProcessType", 445, 408, 'completed', 'REJECT'::"QcStatus", '{"batch_no":"BATCH-202605-013","line":"L2"}'::jsonb, '2026-05-23T07:30:00.000Z', '2026-05-23T16:00:00.000Z'),
  ('f0030000-0000-4000-8000-000000000014', '449ecb51-0266-42d9-bb74-c970563f9ec3', 'fe69d610-80be-4ace-bf6a-74f81e38e0a6', 'COATING'::"ProcessType", 762, 718, 'completed', 'PASS'::"QcStatus", '{"batch_no":"BATCH-202606-014","line":"L3"}'::jsonb, '2026-06-22T07:30:00.000Z', '2026-06-22T16:00:00.000Z'),
  ('f0030000-0000-4000-8000-000000000015', 'f129cae8-cf8e-4279-a16f-8f8a3f8de822', 'd640a95a-87f8-4d48-b91d-6f0f5137fcfe', 'DIE_CASTING'::"ProcessType", 1487, 1268, 'completed', 'PASS'::"QcStatus", '{"batch_no":"BATCH-202606-015","line":"L2"}'::jsonb, '2026-06-17T07:30:00.000Z', '2026-06-17T16:00:00.000Z')
ON CONFLICT (job_id) DO UPDATE SET
  material_id = EXCLUDED.material_id, die_id = EXCLUDED.die_id, process_type = EXCLUDED.process_type, input_qty_kg = EXCLUDED.input_qty_kg, output_qty_kg = EXCLUDED.output_qty_kg, status = EXCLUDED.status, qc_status = EXCLUDED.qc_status, metadata = EXCLUDED.metadata, started_at = EXCLUDED.started_at, completed_at = EXCLUDED.completed_at;

INSERT INTO qc_inspections (inspection_id, job_id, status, inspector_name, notes, inspected_at)
VALUES
  ('f0040000-0000-4000-8000-000000000001', 'f0030000-0000-4000-8000-000000000001', 'PASS'::"QcStatus", 'Nimal Perera', 'Dimensional and surface checks approved.', '2025-06-19T15:00:00.000Z'),
  ('f0040000-0000-4000-8000-000000000002', 'f0030000-0000-4000-8000-000000000002', 'HOLD'::"QcStatus", 'Chamodi Silva', 'Held for minor deviation; pending re-check.', '2025-07-03T15:00:00.000Z'),
  ('f0040000-0000-4000-8000-000000000003', 'f0030000-0000-4000-8000-000000000003', 'PASS'::"QcStatus", 'Chamodi Silva', 'Dimensional and surface checks approved.', '2025-08-18T15:00:00.000Z'),
  ('f0040000-0000-4000-8000-000000000004', 'f0030000-0000-4000-8000-000000000004', 'PASS'::"QcStatus", 'Ayesha Fernando', 'Dimensional and surface checks approved.', '2025-09-15T15:00:00.000Z'),
  ('f0040000-0000-4000-8000-000000000005', 'f0030000-0000-4000-8000-000000000005', 'PASS'::"QcStatus", 'Ayesha Fernando', 'Dimensional and surface checks approved.', '2025-10-06T15:00:00.000Z'),
  ('f0040000-0000-4000-8000-000000000006', 'f0030000-0000-4000-8000-000000000006', 'PASS'::"QcStatus", 'Ruwan Jayasuriya', 'Dimensional and surface checks approved.', '2025-11-02T15:00:00.000Z'),
  ('f0040000-0000-4000-8000-000000000007', 'f0030000-0000-4000-8000-000000000007', 'PASS'::"QcStatus", 'Nimal Perera', 'Dimensional and surface checks approved.', '2025-12-09T15:00:00.000Z'),
  ('f0040000-0000-4000-8000-000000000008', 'f0030000-0000-4000-8000-000000000008', 'PASS'::"QcStatus", 'Ayesha Fernando', 'Dimensional and surface checks approved.', '2026-01-14T15:00:00.000Z'),
  ('f0040000-0000-4000-8000-000000000009', 'f0030000-0000-4000-8000-000000000009', 'PASS'::"QcStatus", 'Chamodi Silva', 'Dimensional and surface checks approved.', '2026-02-04T15:00:00.000Z'),
  ('f0040000-0000-4000-8000-000000000010', 'f0030000-0000-4000-8000-000000000010', 'PASS'::"QcStatus", 'Ruwan Jayasuriya', 'Dimensional and surface checks approved.', '2026-03-21T15:00:00.000Z'),
  ('f0040000-0000-4000-8000-000000000011', 'f0030000-0000-4000-8000-000000000011', 'REJECT'::"QcStatus", 'Ruwan Jayasuriya', 'Failed adhesion / dimensional tolerance.', '2026-04-03T15:00:00.000Z'),
  ('f0040000-0000-4000-8000-000000000012', 'f0030000-0000-4000-8000-000000000012', 'PASS'::"QcStatus", 'Ayesha Fernando', 'Dimensional and surface checks approved.', '2026-04-20T15:00:00.000Z'),
  ('f0040000-0000-4000-8000-000000000013', 'f0030000-0000-4000-8000-000000000013', 'REJECT'::"QcStatus", 'Nimal Perera', 'Failed adhesion / dimensional tolerance.', '2026-05-23T15:00:00.000Z'),
  ('f0040000-0000-4000-8000-000000000014', 'f0030000-0000-4000-8000-000000000014', 'PASS'::"QcStatus", 'Nimal Perera', 'Dimensional and surface checks approved.', '2026-06-22T15:00:00.000Z'),
  ('f0040000-0000-4000-8000-000000000015', 'f0030000-0000-4000-8000-000000000015', 'PASS'::"QcStatus", 'Ruwan Jayasuriya', 'Dimensional and surface checks approved.', '2026-06-17T15:00:00.000Z')
ON CONFLICT (inspection_id) DO UPDATE SET
  job_id = EXCLUDED.job_id, status = EXCLUDED.status, inspector_name = EXCLUDED.inspector_name, notes = EXCLUDED.notes, inspected_at = EXCLUDED.inspected_at;

-- Enrich production jobs with practical Alco profile attributes:
-- surface finish (NA/PC/MF/BR/WF), standard length (mm) and output pieces.
UPDATE production_jobs pj
SET metadata = COALESCE(pj.metadata, '{}'::jsonb) || jsonb_build_object(
  'finish', CASE
              WHEN d.profile_code LIKE 'SLID-%' OR d.profile_code LIKE '80SLID-%' THEN 'NA'
              WHEN d.profile_code LIKE 'LOV-%' THEN 'BR'
              WHEN d.profile_code LIKE 'PAR-%' THEN 'MF'
              WHEN d.profile_code LIKE 'SWD-%' THEN 'PC'
              WHEN d.profile_code LIKE 'ST-%' OR d.profile_code LIKE 'RT-%' THEN 'MF'
              WHEN d.profile_code LIKE 'ALC-RP-%' THEN 'WF'
              ELSE 'PC' END,
  'standard_length_mm', CASE
              WHEN d.profile_code LIKE 'SLID-%' OR d.profile_code LIKE '80SLID-%' OR d.profile_code LIKE 'SWD-%' THEN 6500
              WHEN d.profile_code LIKE 'ST-%' OR d.profile_code LIKE 'RT-%' OR d.profile_code LIKE 'ALC-RP-%' THEN 3660
              ELSE 6100 END,
  'output_pcs', CASE
              WHEN pj.output_qty_kg IS NOT NULL THEN GREATEST(1, ROUND(pj.output_qty_kg / 8.0))
              ELSE NULL END
)
FROM dies d
WHERE pj.die_id = d.die_id;

COMMIT;
