-- Migration 0018: Add Piercing services

INSERT INTO treatments (name, slug, session_price, primary_desc, best_for, category, is_active, sort_order)
VALUES
-- Facial Piercings
('Horizontal Eyebrow', 'piercing-horizontal-eyebrow', 1600, '', '', 'Piercings', true, 130),
('Eyebrow', 'piercing-eyebrow', 1600, '', '', 'Piercings', true, 131),
('Bridge', 'piercing-bridge', 1200, '', '', 'Piercings', true, 132),
('Anti Eyebrow (Butterfly Kiss)', 'piercing-anti-eyebrow', 1200, '', '', 'Piercings', true, 133),
('Teardrop', 'piercing-teardrop', 1200, '', '', 'Piercings', true, 134),
('Nostril', 'piercing-nostril', 900, '', '', 'Piercings', true, 135),
('Septum', 'piercing-septum', 1200, '', '', 'Piercings', true, 136),
('Septum (Ring)', 'piercing-septum-ring', 1200, '', '', 'Piercings', true, 137),
('Madonna', 'piercing-madonna', 1300, '', '', 'Piercings', true, 138),
('Angel Bites (Pair)', 'piercing-angel-bites', 2200, '', '', 'Piercings', true, 139),
('Dahlia Bites', 'piercing-dahlia-bites', 1600, '', '', 'Piercings', true, 140),
('Spider Bite (Pair)', 'piercing-spider-bite', 2200, '', '', 'Piercings', true, 141),
('Shark Bite (Pair)', 'piercing-shark-bite', 2600, '', '', 'Piercings', true, 142),
('Labret', 'piercing-labret', 1400, '', '', 'Piercings', true, 143),

-- Other Piercings
('Navel', 'piercing-navel', 1600, '', '', 'Piercings', true, 144),
('Nipple', 'piercing-nipple', 1600, '', '', 'Piercings', true, 145),
('Tongue', 'piercing-tongue', 1400, '', '', 'Piercings', true, 146),
('Smiley', 'piercing-smiley', 1300, '', '', 'Piercings', true, 147),

-- Ear Piercings
('Helix', 'piercing-helix', 1100, '', '', 'Piercings', true, 148),
('Forward Helix', 'piercing-forward-helix', 1100, '', '', 'Piercings', true, 149),
('Rook', 'piercing-rook', 1100, '', '', 'Piercings', true, 150),
('Daith', 'piercing-daith', 1100, '', '', 'Piercings', true, 151),
('Tragus', 'piercing-tragus', 1200, '', '', 'Piercings', true, 152),
('Inner Conch', 'piercing-inner-conch', 1300, '', '', 'Piercings', true, 153),
('Flat', 'piercing-flat', 900, '', '', 'Piercings', true, 154),
('Snug', 'piercing-snug', 1100, '', '', 'Piercings', true, 155),
('Anti-Tragus', 'piercing-anti-tragus', 1300, '', '', 'Piercings', true, 156),
('Upper Lobe', 'piercing-upper-lobe', 400, '', '', 'Piercings', true, 157),
('Lobe (1st)', 'piercing-lobe-1st', 600, '/ Item', '', 'Piercings', true, 158),
('Lobe (2nd/3rd)', 'piercing-lobe-2nd-3rd', 800, '/ Item', '', 'Piercings', true, 159),
('Lobe (3rd/4th)', 'piercing-lobe-3rd-4th', 1000, '/ Item', '', 'Piercings', true, 160),

-- Ear Lobe Set
('Ear Lobe Set (2 Piercings)', 'piercing-ear-lobe-set-2', 1000, '', '', 'Piercings', true, 161),
('Ear Lobe Set (3 Piercings)', 'piercing-ear-lobe-set-3', 1300, '', '', 'Piercings', true, 162),
('Ear Lobe Set (4 Piercings)', 'piercing-ear-lobe-set-4', 1400, '', '', 'Piercings', true, 163),
('Ear Lobe Set (5 Piercings)', 'piercing-ear-lobe-set-5', 1600, '', '', 'Piercings', true, 164);
