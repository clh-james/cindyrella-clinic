-- Migration 0016: Delete old duplicate IV Drips

DELETE FROM treatments
WHERE category = 'IV Drips' 
AND slug IN (
  'luxury-glow',
  'total-glow',
  'glow-boost',
  'radiance-plus',
  'recovery-drip',
  'clear-skin',
  'active-glow'
);
