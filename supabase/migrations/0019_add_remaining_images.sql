-- Migration 0019: Add Remaining Images

-- Contouring
UPDATE treatments SET image_url = '/images/contouring/contouring.jpg' WHERE category = 'Contouring & Whitening';

-- Piercings
UPDATE treatments SET image_url = '/images/piercings/piercings.jpg' WHERE category = 'Piercings';

-- Intimate
UPDATE treatments SET image_url = '/images/intimate/queen.jpg' WHERE category = 'Queen''s Intimate Treatment';
UPDATE treatments SET image_url = '/images/intimate/king.jpg' WHERE category = 'King''s Treatment';

-- PRP
UPDATE treatments SET image_url = '/images/prp/prp.jpg' WHERE category = 'PRP Treatment';

-- Facial & Warts
UPDATE treatments SET image_url = '/images/facial/facial.jpg' WHERE category = 'Facial & Warts';
