BEGIN;

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
  ('a2cf88e9-57ca-4229-b307-bcde9f21c773', 'ALX-1001', 'Architectural Profiles', 7200, 10000, 'good', NULL),
  ('56569a3f-c896-4052-9f43-c72f262a5ce5', 'ALX-1015', 'Window Frames', 9050, 10000, 'good', NULL),
  ('44f6f313-cd0d-4fae-81bc-642228684d72', 'ALX-1100', 'Door Systems', 10000, 10000, 'retired', NULL),
  ('fe69d610-80be-4ace-bf6a-74f81e38e0a6', 'ALX-1208', 'Industrial Channels', 4300, 9000, 'maintenance', NULL),
  ('d640a95a-87f8-4d48-b91d-6f0f5137fcfe', 'ALX-1312', 'Curtain Wall Systems', 1500, 8500, 'good', NULL),
  ('f168e7e4-2f4d-46e7-9f7c-315f419ecf2b', 'ALX-0999', 'Legacy Profile', 2200, 7000, 'retired', '2026-01-20T00:00:00.000Z')
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
  ('071d36d3-20f8-4f5c-9fe2-208f16f9c421', 'ALX-ARCH-001', 'Architectural Hollow Profile', 'Architectural Profiles', 'Mill Finish', 6000, 'kg'),
  ('1fe08c28-3318-4f06-91cc-38551e5f73d3', 'ALX-WIN-015', 'Window Frame Extrusion Set', 'Window Frames', 'Powder Coated', 5400, 'kg'),
  ('52276ed7-44e1-4f94-a0ca-a96f4eb91595', 'ALX-IND-208', 'Industrial U Channel', 'Industrial Channels', 'Anodized', 4500, 'kg'),
  ('810b9f7e-a56e-4210-bf4c-28f05f4ccf4a', 'ALX-CW-312', 'Curtain Wall Mullion', 'Curtain Wall Systems', 'PVDF Coated', 6000, 'kg')
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
  location_code,
  warehouse_zone,
  received_at
)
VALUES
  (
    '6aa650cb-47fa-49f0-b3c9-f4612248d7f6',
    '071d36d3-20f8-4f5c-9fe2-208f16f9c421',
    '40c60071-03f1-4ba1-a4ff-46b2ed2e427d',
    1380,
    'FG-DEFAULT',
    'FINISHED_GOODS',
    '2026-04-20T16:25:00.000Z'
  ),
  (
    'f4867cc8-bd9d-4748-bf14-cac9de2f3f87',
    '1fe08c28-3318-4f06-91cc-38551e5f73d3',
    NULL,
    240,
    'FG-WF-01',
    'FINISHED_GOODS',
    '2026-04-19T10:00:00.000Z'
  )
ON CONFLICT (item_id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  job_id = EXCLUDED.job_id,
  quantity = EXCLUDED.quantity,
  location_code = EXCLUDED.location_code,
  warehouse_zone = EXCLUDED.warehouse_zone,
  received_at = EXCLUDED.received_at;

COMMIT;
