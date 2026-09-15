-- Migration 0014: Add New Services (Hair Waxing, IPL, IV Drips, Augmentation)
-- IV Treatments
INSERT INTO treatments (slug, name, category, badge, session_price, five_plus_one_price, ten_plus_two_price, primary_desc, secondary_desc, best_for, sort_order) VALUES
('iv-luxury-glow', 'Luxury Glow', 'IV Treatment', 'Best Choice', 2999, 14995, 29990, 'Pampers, nourishes, & rejuvenates the skin.', 'Skin brightening, silky and all-over glow.', 'Clients wanting an indulgent, high-end beauty treatment.', 110),
('iv-total-glow', 'Total Glow Drip', 'IV Treatment', 'Recommended', 2499, 12495, 24990, 'Beauty and wellness experience in one infusion.', 'Brightening & deep revitalization from head to toe.', 'Those wanting both full-body wellness and visible beauty results.', 111),
('iv-glow-boost', 'Glow Boost', 'IV Treatment', null, 1999, 9950, 19990, 'Glow from within with hydration & nutrients.', 'Skin brightening for a dewy glow.', 'Anyone feeling dull, or in need of an instant skin refresh.', 112),
('iv-radiance-plus', 'Radiance Plus', 'IV Treatment', null, 1999, 9950, 19990, 'A silky infusion for glowing, even-toned skin.', 'Skin lightening for a luminous glow.', 'Those with uneven skin tone, discoloration, or dullness.', 113),
('iv-recovery-drip', 'Recovery Drip', 'IV Treatment', 'Best Value', 2699, 13495, 26990, 'Hydration, electrolytes, and restores energy.', 'Brightening, rested, healthy, camera-ready glow.', 'Post-party, jet lag, dehydration, and post-workout recovery.', 114),
('iv-clear-skin', 'Clear Skin Boost', 'IV Treatment', 'Top Seller', 1499, 7495, 14990, 'Blend that soothes irritation and clears blemishes.', 'Lightening for a smooth, radiant complexion.', 'Anyone struggling with breakouts, redness, or uneven skin.', 115),
('iv-active-glow', 'Active Glow', 'IV Treatment', null, 1999, 9950, 19990, 'Stamina support for active, busy lifestyles.', 'Brightening for a vibrant, healthy glow all day.', 'Anyone always on the move and exposed to sun.', 116)
ON CONFLICT (slug) DO UPDATE SET 
  session_price = EXCLUDED.session_price,
  five_plus_one_price = EXCLUDED.five_plus_one_price,
  ten_plus_two_price = EXCLUDED.ten_plus_two_price;

-- IPL Hair Removal
INSERT INTO treatments (slug, name, category, session_price, five_plus_one_price, sort_order) VALUES
('ipl-upper-lip', 'Upper Lip', 'IPL Hair Removal', 699, 3499, 120),
('ipl-beard', 'Beard', 'IPL Hair Removal', 899, 4499, 121),
('ipl-underarm', 'Underarm', 'IPL Hair Removal', 899, 4499, 122),
('ipl-arms', 'Arms', 'IPL Hair Removal', 1299, 6499, 123),
('ipl-half-legs', 'Half Legs', 'IPL Hair Removal', 1799, 8999, 124),
('ipl-full-legs', 'Full Legs', 'IPL Hair Removal', 1299, 6499, 125),
('ipl-bikini', 'Bikini', 'IPL Hair Removal', 1299, 6499, 126)
ON CONFLICT (slug) DO UPDATE SET 
  session_price = EXCLUDED.session_price,
  five_plus_one_price = EXCLUDED.five_plus_one_price;

-- Hair Waxing
INSERT INTO treatments (slug, name, category, session_price, sort_order) VALUES
('wax-upper-lip-hot-thin', 'Upper Lip (Hot Wax Thin)', 'Hair Waxing', 549, 130),
('wax-upper-lip-hot-thick', 'Upper Lip (Hot Wax Thick)', 'Hair Waxing', 549, 131),
('wax-beard-hot-thin', 'Beard (Hot Wax Thin)', 'Hair Waxing', 599, 132),
('wax-beard-hot-thick', 'Beard (Hot Wax Thick)', 'Hair Waxing', 799, 133),
('wax-underarm-cold-thin', 'Underarm (Cold Wax Thin)', 'Hair Waxing', 449, 134),
('wax-underarm-cold-thick', 'Underarm (Cold Wax Thick)', 'Hair Waxing', 449, 135),
('wax-underarm-hot-thin', 'Underarm (Hot Wax Thin)', 'Hair Waxing', 549, 136),
('wax-underarm-hot-thick', 'Underarm (Hot Wax Thick)', 'Hair Waxing', 549, 137),
('wax-arms-cold-thin', 'Arms (Cold Wax Thin)', 'Hair Waxing', 599, 138),
('wax-arms-cold-thick', 'Arms (Cold Wax Thick)', 'Hair Waxing', 799, 139),
('wax-arms-hot-thin', 'Arms (Hot Wax Thin)', 'Hair Waxing', 699, 140),
('wax-arms-hot-thick', 'Arms (Hot Wax Thick)', 'Hair Waxing', 899, 141),
('wax-half-legs-cold-thin', 'Half Legs (Cold Wax Thin)', 'Hair Waxing', 699, 142),
('wax-half-legs-cold-thick', 'Half Legs (Cold Wax Thick)', 'Hair Waxing', 899, 143),
('wax-half-legs-hot-thin', 'Half Legs (Hot Wax Thin)', 'Hair Waxing', 799, 144),
('wax-half-legs-hot-thick', 'Half Legs (Hot Wax Thick)', 'Hair Waxing', 999, 145),
('wax-full-legs-cold-thin', 'Full Legs (Cold Wax Thin)', 'Hair Waxing', 1099, 146),
('wax-full-legs-cold-thick', 'Full Legs (Cold Wax Thick)', 'Hair Waxing', 1299, 147),
('wax-full-legs-hot-thin', 'Full Legs (Hot Wax Thin)', 'Hair Waxing', 1199, 148),
('wax-full-legs-hot-thick', 'Full Legs (Hot Wax Thick)', 'Hair Waxing', 1399, 149),
('wax-brazillian-hot-thin', 'Brazillian (Hot Wax Thin)', 'Hair Waxing', 1299, 150),
('wax-brazillian-hot-thick', 'Brazillian (Hot Wax Thick)', 'Hair Waxing', 1499, 151)
ON CONFLICT (slug) DO UPDATE SET session_price = EXCLUDED.session_price;

-- Breast Augmentation
INSERT INTO treatments (slug, name, category, session_price, primary_desc, sort_order) VALUES
('breast-aug-100cc', 'Breast Augmentation 100 CC', 'Breast Augmentation', 20000, 'Free 3 session of gluta', 160),
('breast-aug-200cc', 'Breast Augmentation 200 CC', 'Breast Augmentation', 30000, 'Free 50 CC + 5 Session of Gluta', 161),
('breast-aug-300cc', 'Breast Augmentation 300 CC', 'Breast Augmentation', 45000, 'Free 50 CC + 10 Session of Gluta', 162),
('breast-aug-500cc', 'Breast Augmentation 500 CC', 'Breast Augmentation', 75000, 'Free 100 CC + 10 Session of Gluta', 163)
ON CONFLICT (slug) DO UPDATE SET session_price = EXCLUDED.session_price;

-- Butt Augmentation
INSERT INTO treatments (slug, name, category, session_price, primary_desc, sort_order) VALUES
('butt-aug-100cc', 'Butt Augmentation 100 CC', 'Butt Augmentation', 20000, 'Free 3 session of gluta', 170),
('butt-aug-200cc', 'Butt Augmentation 200 CC', 'Butt Augmentation', 30000, 'Free 50 CC + 5 Session of Gluta', 171),
('butt-aug-300cc', 'Butt Augmentation 300 CC', 'Butt Augmentation', 45000, 'Free 50 CC + 10 Session of Gluta', 172),
('butt-aug-500cc', 'Butt Augmentation 500 CC', 'Butt Augmentation', 75000, 'Free 100 CC + 10 Session of Gluta', 173)
ON CONFLICT (slug) DO UPDATE SET session_price = EXCLUDED.session_price;
