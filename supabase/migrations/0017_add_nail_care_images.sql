-- Migration 0017: Add Nail Care Images

UPDATE treatments SET image_url = '/images/nail_care/manicure.jpg' WHERE slug IN ('mani', 'gelpolish-mani', 'softgel-extension', 'nail-removal', 'change-polish');
UPDATE treatments SET image_url = '/images/nail_care/pedicure.jpg' WHERE slug IN ('pedi', 'gelpolish-pedi', 'footspa', 'footspa-pedi', 'footspa-pedi-gel', 'footspa-package');
UPDATE treatments SET image_url = '/images/nail_care/nail_art.jpg' WHERE slug IN ('nail-arts', 'french-tip', 'stones-small', 'stones-big', 'rhinestones-beads', 'unli-stones', 'cat-eye', 'cat-eye-full', 'chrome', 'embossed-chrome', '3d-embossed', '3d-embossed-colors', 'ombre', 'marble', 'blooming-gel');
