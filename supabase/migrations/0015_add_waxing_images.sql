-- Migration 0015: Add Hair Waxing Images

UPDATE treatments SET image_url = '/images/waxing/facial.jpg' WHERE slug IN ('wax-upper-lip-hot-thin', 'wax-upper-lip-hot-thick', 'wax-beard-hot-thin', 'wax-beard-hot-thick');
UPDATE treatments SET image_url = '/images/waxing/arms.jpg' WHERE slug IN ('wax-underarm-cold-thin', 'wax-underarm-cold-thick', 'wax-underarm-hot-thin', 'wax-underarm-hot-thick', 'wax-arms-cold-thin', 'wax-arms-cold-thick', 'wax-arms-hot-thin', 'wax-arms-hot-thick');
UPDATE treatments SET image_url = '/images/waxing/legs.jpg' WHERE slug IN ('wax-half-legs-cold-thin', 'wax-half-legs-cold-thick', 'wax-half-legs-hot-thin', 'wax-half-legs-hot-thick', 'wax-full-legs-cold-thin', 'wax-full-legs-cold-thick', 'wax-full-legs-hot-thin', 'wax-full-legs-hot-thick');
UPDATE treatments SET image_url = '/images/waxing/brazilian.jpg' WHERE slug IN ('wax-brazillian-hot-thin', 'wax-brazillian-hot-thick');
