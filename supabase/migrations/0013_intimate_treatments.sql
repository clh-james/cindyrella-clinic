-- Migration 0013: Add Intimate Treatments
-- Queen's Intimate Treatment
INSERT INTO treatments (slug, name, category, session_price, primary_desc, sort_order) VALUES
('nip-pink', 'Nip Pink', 'Queen''s Intimate Treatment', 15000, 'Brighter, Confident You', 110),
('pinky-fem', 'Pinky Fem', 'Queen''s Intimate Treatment', 18000, 'Feminine Care Inside and Out', 111),
('vaginal-rejuvenation', 'Vaginal Rejuvenation', 'Queen''s Intimate Treatment', 20000, 'Restore Natural Beauty', 112),
('vaginal-tightening', 'Vaginal Tightening', 'Queen''s Intimate Treatment', 25000, 'Firmer. Stronger. More Confident.', 113)
ON CONFLICT (slug) DO UPDATE SET session_price = EXCLUDED.session_price;

-- King's Treatment
INSERT INTO treatments (slug, name, category, session_price, primary_desc, sort_order) VALUES
('penile-enhancement', 'Penile Enhancement', 'King''s Treatment', 25000, 'Starts @ P25,000', 120),
('penile-combo', 'Penile Combo Grit + Crown', 'King''s Treatment', 35000, 'Starts @ P35,000', 121),
('mens-p-shot', 'Mens P-Shot', 'King''s Treatment', 15000, '', 122),
('penecial', 'Penecial', 'King''s Treatment', 5000, '', 123),
('genetal-warts-removal', 'Genetal Warts Removal', 'King''s Treatment', 5000, '', 124)
ON CONFLICT (slug) DO UPDATE SET session_price = EXCLUDED.session_price;
