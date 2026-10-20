-- Migration 0041: Add 'Serums' to Skincare & Retail Products category subcategories

DO $$
BEGIN
  -- 1. Ensure 'Serums' is present in Skincare & Retail Products subcategories
  UPDATE inventory_categories
  SET subcategories = ARRAY['Cleansers', 'Moisturizers', 'Sunscreen', 'Toners', 'Creams', 'Serums'],
      description = 'Cleansers, moisturizers, sunscreen, serums, lotions, and take-home retail products',
      updated_at = NOW()
  WHERE code = 'SKN' OR LOWER(name) LIKE '%skincare%';

  -- 2. Link any existing serum items to 'Serums' subcategory if they have none
  UPDATE inventory_items
  SET subcategory = 'Serums',
      updated_at = NOW()
  WHERE (subcategory IS NULL OR subcategory = '')
    AND (
      LOWER(name) LIKE '%serum%' 
      OR LOWER(name) LIKE '%collagen serum%'
      OR LOWER(name) LIKE '%vitamin c%'
    )
    AND (category = 'Skincare & Retail Products' OR category_id IN (SELECT id FROM inventory_categories WHERE code = 'SKN'));

END $$;
