-- Migration 0012: Add category to treatments and expand services
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'IV Drips';
ALTER TABLE treatments ALTER COLUMN five_plus_one_price DROP NOT NULL;
ALTER TABLE treatments ALTER COLUMN ten_plus_two_price DROP NOT NULL;
ALTER TABLE treatments ALTER COLUMN primary_desc DROP NOT NULL;
ALTER TABLE treatments ALTER COLUMN secondary_desc DROP NOT NULL;
ALTER TABLE treatments ALTER COLUMN best_for DROP NOT NULL;
ALTER TABLE treatments ALTER COLUMN duration_minutes DROP NOT NULL;

-- INSERT NAIL CARE
INSERT INTO treatments (slug, name, category, session_price, sort_order) VALUES 
('mani', 'Manicure', 'Nail Care', 449, 10),
('pedi', 'Pedicure', 'Nail Care', 479, 11),
('gelpolish-mani', 'Gelpolish + Mani', 'Nail Care', 649, 12),
('gelpolish-pedi', 'Gelpolish + Pedi', 'Nail Care', 699, 13),
('footspa', 'Footspa', 'Nail Care', 649, 14),
('footspa-pedi', 'Footspa + Pedi', 'Nail Care', 759, 15),
('footspa-pedi-gel', 'Footspa + Pedi Gel', 'Nail Care', 879, 16),
('footspa-package', 'Footspa Package', 'Nail Care', 849, 17),
('softgel-extension', 'Softgel Extension', 'Nail Care', 1198, 18),
('nail-removal', 'Removal', 'Nail Care', 499, 19),
('change-polish', 'Change Polish', 'Nail Care', 499, 20),
('nail-arts', 'Nail Arts', 'Nail Care', 60, 21),
('french-tip', 'French Tip', 'Nail Care', 60, 22),
('stones-small', 'Stones Small', 'Nail Care', 75, 23),
('stones-big', 'Stones Big', 'Nail Care', 100, 24),
('rhinestones-beads', 'Rhinestones/Beads', 'Nail Care', 60, 25),
('unli-stones', 'Unli Stones', 'Nail Care', 350, 26),
('cat-eye', 'Cat Eye', 'Nail Care', 65, 27),
('cat-eye-full', 'Cat Eye (Full Set)', 'Nail Care', 160, 28),
('chrome', 'Chrome', 'Nail Care', 65, 29),
('embossed-chrome', 'Embossed w/ Chrome', 'Nail Care', 80, 30),
('3d-embossed', '3D Embossed', 'Nail Care', 100, 31),
('3d-embossed-colors', '3D Embossed w/ Colors', 'Nail Care', 120, 32),
('ombre', 'Ombre', 'Nail Care', 70, 33),
('marble', 'Marble', 'Nail Care', 75, 34),
('blooming-gel', 'Blooming Gel', 'Nail Care', 65, 35)
ON CONFLICT (slug) DO UPDATE SET session_price = EXCLUDED.session_price;

-- INSERT EYELASH EXTENSION
INSERT INTO treatments (slug, name, category, session_price, primary_desc, sort_order) VALUES
('lash-classic', 'Classic', 'Eyelash Extension', 899, 'Single lash extension applied to each natural lash for a natural, mascara-like look.', 40),
('lash-classic-full', 'Classic Full', 'Eyelash Extension', 999, 'Twice the volume with a lightweight feel.', 41),
('lash-volume', 'Volume', 'Eyelash Extension', 1099, 'Multiple thinner lash extensions fanned out and applied to each natural lash for a fuller, dramatic look.', 42),
('lash-wispy', 'Wispy / Anime', 'Eyelash Extension', 999, 'Classic Full or Volume.', 43),
('lash-add-cateye', 'Cat Eye / Squirrel / Dolly / Eyeliner Add-on', 'Eyelash Extension', 399, 'Style modifier for regular or UV extensions.', 44),
('uv-classic', 'UV Cure Classic', 'Eyelash Extension', 1199, 'Uses a special glue that hardens instantly with UV light. Lasts longer, stays waterproof.', 45),
('uv-classic-full', 'UV Cure Classic Full', 'Eyelash Extension', 1299, 'Uses a special glue that hardens instantly with UV light. Lasts longer, stays waterproof.', 46),
('uv-volume', 'UV Cure Volume', 'Eyelash Extension', 1499, 'Uses a special glue that hardens instantly with UV light. Lasts longer, stays waterproof.', 47),
('uv-wispy', 'UV Cure Wispy / Anime', 'Eyelash Extension', 1299, 'Uses a special glue that hardens instantly with UV light. Lasts longer, stays waterproof.', 48),
('lashlift', 'Lashlift', 'Eyelash Extension', 700, '', 49),
('lashlift-tint', 'Lashlift with Tint', 'Eyelash Extension', 800, '', 50),
('henna-brows', 'Henna Brows', 'Eyelash Extension', 900, '', 51)
ON CONFLICT (slug) DO UPDATE SET session_price = EXCLUDED.session_price;

-- INSERT PRP TREATMENT
INSERT INTO treatments (slug, name, category, session_price, five_plus_one_price, primary_desc, sort_order) VALUES
('prp-hair', 'Hair Rejuvenation', 'PRP Treatment', 2499, 7499, 'Stimulate hair follicles, improve thickness, and promote natural hair growth.', 60),
('prp-facelift', 'Instant Facelift', 'PRP Treatment', 2299, 6999, 'To boost collagen, tighten skin, and give a natural lifted, youthful glow without surgery.', 61),
('prp-acne', 'Acne / Deep Scar Removal', 'PRP Treatment', 2499, 7499, 'To heal skin, boost collagen, and reduce the appearance of deep scars naturally.', 62),
('prp-undereye', 'Undereye Treatment', 'PRP Treatment', 3999, 11999, 'To reduce dark circles, fine lines, and hollowness, restoring a fresher and youthful look.', 63)
ON CONFLICT (slug) DO UPDATE SET session_price = EXCLUDED.session_price;

-- INSERT FACIAL & WARTS
INSERT INTO treatments (slug, name, category, session_price, primary_desc, sort_order) VALUES
('facial-hollywood', 'Hollywood Facial (Carbon Peel)', 'Facial & Warts', 1799, 'Reduces the appearance of marks, imperfections and fine lines, wrinkles and improves firmness.', 70),
('facial-celebrity', 'Celebrity Facial (Oxygeneo)', 'Facial & Warts', 1799, 'Nourish and oxygenate your skin giving you youthfulness and natural glow.', 71),
('facial-hydra', 'Hydra Facial', 'Facial & Warts', 1799, 'Hydrates the skin using advanced technology, leaving it refreshed, glowing, and rejuvenated.', 72),
('facial-radiants-bft', 'Radiants BFT', 'Facial & Warts', 2499, 'Helps fade dark spots, even out skin tone, and boost radiance.', 73),
('facial-carbon-melacell', 'Carbon w/ Melacell', 'Facial & Warts', 4999, 'Penetrates deeper to address discoloration and promote skin renewal.', 74),
('facial-deep-cleansing', 'Deep Cleansing', 'Facial & Warts', 599, 'Removes clogged oil and dirt from your pores.', 75),
('facial-brightening', 'Brightening Facial', 'Facial & Warts', 799, 'Helps with issues of uneven skin tone and texture of skin.', 76),
('facial-diamond-peel', 'Diamond Peel', 'Facial & Warts', 799, 'Removes excess oil, dirt, and dead cells on the surface of the skin.', 77),
('facial-collagen', 'Collagen Facial', 'Facial & Warts', 799, 'Anti-aging and can help moisturize the skin.', 78),
('facial-diamond-nutrients', 'Diamond w/ Nutrients', 'Facial & Warts', 999, 'Removes excess oil, dirt, and dead cells on the surface of the skin.', 79),
('facial-acne', 'Acne Facial', 'Facial & Warts', 999, 'Target congestion with pores, rapidly removes black heads.', 80),
('warts-per-area', 'Warts Removal - Per Area', 'Facial & Warts', 1799, '', 81),
('warts-face-neck', 'Warts Removal - Face & Neck', 'Facial & Warts', 2799, '', 82),
('warts-skintag', 'Skintag Big', 'Facial & Warts', 599, '', 83)
ON CONFLICT (slug) DO UPDATE SET session_price = EXCLUDED.session_price;

-- INSERT CONTOURING & WHITENING
INSERT INTO treatments (slug, name, category, session_price, primary_desc, sort_order) VALUES
('extreme-underarm', 'Extreme Underarm Whitening', 'Contouring & Whitening', 6999, 'Inclusions: IPL Hair Removal 6 sessions, Black Doll Laser 2 sessions, Diamond Peel 2 sessions, Whitening 2 sessions.', 90),
('barbie-arms', 'Barbie Arms', 'Contouring & Whitening', 7999, 'Inclusions: Lemon Bottle 1 session, RF Arms 4 sessions, Botox 1 session.', 91),
('lemon-chin', 'Lemon Bottle (Chin)', 'Contouring & Whitening', 3800, 'Rf 3+1 free', 92),
('lemon-face', 'Lemon Bottle (Face)', 'Contouring & Whitening', 3800, 'Rf 3+1 free', 93),
('lemon-arms', 'Lemon Bottle (Arms)', 'Contouring & Whitening', 4800, 'Rf 3+1 free', 94),
('lemon-tummy', 'Lemon Bottle (Tummy)', 'Contouring & Whitening', 7800, 'Rf 3+1 free', 95),
('lemon-thigh', 'Lemon Bottle (Thigh)', 'Contouring & Whitening', 7800, 'Rf 3+1 free', 96),
('lemon-bra', 'Lemon Bottle (Bra Line)', 'Contouring & Whitening', 5300, 'Rf 3+1 free', 97),
('ems-tummy', 'EMS Sculpt (Tummy)', 'Contouring & Whitening', 2299, 'Package: Buy 5 get 1 free', 98),
('ems-arms', 'EMS Sculpt (Arms)', 'Contouring & Whitening', 2899, 'Package: Buy 5 get 1 free', 99),
('ems-legs', 'EMS Sculpt (Legs)', 'Contouring & Whitening', 1999, 'Package: Buy 5 get 1 free', 100),
('ems-butt', 'EMS Sculpt (Butt)', 'Contouring & Whitening', 1899, 'Package: Buy 5 get 1 free', 101),
('hifu-fullface', 'HIFU (Full Face + Chin)', 'Contouring & Whitening', 3800, 'Cheeks & Jaw', 102),
('hifu-arms', 'HIFU (Arms)', 'Contouring & Whitening', 4300, 'Cheeks & Jaw', 103),
('hifu-tummy', 'HIFU (Tummy)', 'Contouring & Whitening', 5300, 'Cheeks & Jaw', 104),
('hifu-thigh', 'HIFU (Thigh)', 'Contouring & Whitening', 5300, 'Cheeks & Jaw', 105)
ON CONFLICT (slug) DO UPDATE SET session_price = EXCLUDED.session_price;
