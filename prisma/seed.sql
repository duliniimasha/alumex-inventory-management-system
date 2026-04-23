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
  ('f129cae8-cf8e-4279-a16f-8f8a3f8de822', 'BILLET'::"MaterialCategory", 'Aluminium Billet 6063', 'AA6063-T5', 12500, 'kg', 5000, 'UAE', '8f7d4033-f9e4-4ec6-bfd6-d2db3ff646a1', NULL),
  ('449ecb51-0266-42d9-bb74-c970563f9ec3', 'BILLET'::"MaterialCategory", 'Aluminium Billet 6061', 'AA6061-T6', 3200, 'kg', 4000, 'India', '8f7d4033-f9e4-4ec6-bfd6-d2db3ff646a1', NULL),
  ('b30344ac-e2f4-4071-8cfa-a0777ba496f4', 'ALLOY'::"MaterialCategory", 'Magnesium Additive', 'Mg-99.9', 650, 'kg', 300, 'India', 'd9bf9f0a-9c4a-42a8-a3c6-8ec14c75725f', NULL),
  ('a2f2a8e4-4fcc-4595-a657-309f10f6f905', 'CHEMICAL'::"MaterialCategory", 'Degreasing Agent', 'DG-Industrial', 180, 'kg', 200, 'Singapore', '904faf17-8de4-4237-96e2-cdd3eff8eb11', NULL),
  ('4d20f9df-ae71-49b4-8fd1-4046bc66ce02', 'COATING'::"MaterialCategory", 'Powder Coating - Matte Black', 'RAL 9005', 980, 'kg', 500, 'Sri Lanka', '3f2b21ff-c47e-454f-a5dd-f07f8a7ec122', NULL),
  ('2aa15be6-6287-4f28-a9c5-3e8f8da4e98e', 'TRADED_GOOD'::"MaterialCategory", 'Packaging Film Roll', 'PF-Standard', 250, 'kg', 150, 'Sri Lanka', '3f2b21ff-c47e-454f-a5dd-f07f8a7ec122', NULL),
  ('ad3898ad-a1e3-4734-bf20-8f140a6a5cf6', 'CHEMICAL'::"MaterialCategory", 'Anodizing Sealant', 'AS-Prime', 420, 'kg', 250, 'Malaysia', '904faf17-8de4-4237-96e2-cdd3eff8eb11', NULL),
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

COMMIT;
