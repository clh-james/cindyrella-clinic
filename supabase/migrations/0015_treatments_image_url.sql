-- Migration 0015: Add image_url to treatments

ALTER TABLE treatments
ADD COLUMN IF NOT EXISTS image_url text;

UPDATE treatments SET image_url = '/images/drips/luxury-glow.jpg' WHERE slug = 'iv-luxury-glow';
UPDATE treatments SET image_url = '/images/drips/total-glow.jpg' WHERE slug = 'iv-total-glow';
UPDATE treatments SET image_url = '/images/drips/glow-boost.jpg' WHERE slug = 'iv-glow-boost';
UPDATE treatments SET image_url = '/images/drips/radiance-plus.jpg' WHERE slug = 'iv-radiance-plus';
UPDATE treatments SET image_url = '/images/drips/recovery-drip.jpg' WHERE slug = 'iv-recovery-drip';
UPDATE treatments SET image_url = '/images/drips/clear-skin-boost.jpg' WHERE slug = 'iv-clear-skin';
UPDATE treatments SET image_url = '/images/drips/active_glow.jpg' WHERE slug = 'iv-active-glow';
