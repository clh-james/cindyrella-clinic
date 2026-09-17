-- Migration 0016: Add Augmentation Images

UPDATE treatments SET image_url = '/images/augmentation/consultation.jpg' WHERE slug IN ('breast-aug-100cc', 'breast-aug-200cc', 'breast-aug-300cc', 'breast-aug-500cc');
UPDATE treatments SET image_url = '/images/augmentation/butt_consultation.jpg' WHERE slug IN ('butt-aug-100cc', 'butt-aug-200cc', 'butt-aug-300cc', 'butt-aug-500cc');
