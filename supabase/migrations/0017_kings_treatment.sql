-- Migration 0017: Add King's Treatment services

INSERT INTO treatments (name, slug, session_price, package_price, package_sessions, primary_desc, best_for, category, is_active, sort_order)
VALUES
('Penile Enhancement', 'kings-penile-enhancement', 25000, NULL, NULL, 'Starts at ₱25,000', '', 'King''s Treatment', true, 100),
('Penile Combo Grit + Crown', 'kings-penile-combo', 35000, NULL, NULL, 'Starts at ₱35,000', '', 'King''s Treatment', true, 101),
('Mens P-Shot', 'kings-mens-p-shot', 15000, NULL, NULL, '', '', 'King''s Treatment', true, 102),
('Penecial', 'kings-penecial', 5000, NULL, NULL, '', '', 'King''s Treatment', true, 103),
('Genital Warts Removal', 'kings-genital-warts-removal', 5000, NULL, NULL, '', '', 'King''s Treatment', true, 104);
