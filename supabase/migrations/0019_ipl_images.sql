-- Migration 0019: Assign Image URLs to IPL Hair Removal services

UPDATE treatments SET image_url = '/images/ipl/upper_lip.jpg' WHERE slug = 'ipl-upper-lip';
UPDATE treatments SET image_url = '/images/ipl/beard.jpg' WHERE slug = 'ipl-beard';
UPDATE treatments SET image_url = '/images/ipl/underarm.jpg' WHERE slug = 'ipl-underarm';
UPDATE treatments SET image_url = '/images/ipl/arms.jpg' WHERE slug = 'ipl-arms';
UPDATE treatments SET image_url = '/images/ipl/half_legs.jpg' WHERE slug = 'ipl-half-legs';
UPDATE treatments SET image_url = '/images/ipl/full_legs.jpg' WHERE slug = 'ipl-full-legs';
UPDATE treatments SET image_url = '/images/ipl/bikini.jpg' WHERE slug = 'ipl-bikini';
