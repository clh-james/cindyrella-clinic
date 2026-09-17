-- Migration 0018: Add Eyelash Images

UPDATE treatments SET image_url = '/images/eyelash/extension.jpg' WHERE slug IN ('lash-classic', 'lash-classic-full', 'lash-volume', 'lash-wispy', 'lash-add-cateye', 'uv-classic', 'uv-classic-full', 'uv-volume', 'uv-wispy', 'lashlift', 'lashlift-tint', 'henna-brows');
