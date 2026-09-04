-- Seed data — safe to re-run (upserts on slug/name).

insert into branches (name, address, phone)
values
  ('Makati', 'Makati City, Metro Manila', '(0917) 000 0001'),
  ('Bonifacio Global City', 'Taguig City, Metro Manila', '(0917) 000 0002'),
  ('Quezon City', 'Quezon City, Metro Manila', '(0917) 000 0003'),
  ('Alabang', 'Muntinlupa City, Metro Manila', '(0917) 000 0004')
on conflict do nothing;

insert into branch_settings (branch_id, max_bookings_per_slot)
select id, 3 from branches
on conflict (branch_id) do nothing;

insert into treatments
  (slug, name, badge, session_price, five_plus_one_price, ten_plus_two_price,
   primary_desc, secondary_desc, best_for, duration_minutes, sort_order)
values
  ('luxury-glow', 'Luxury Glow', 'Best Choice', 2999, 14995, 29990,
   'Pampers, nourishes, and rejuvenates the skin.',
   'Skin brightening, silky and all-over glow.',
   'Clients wanting an indulgent, high-end beauty treatment.', 60, 1),

  ('total-glow-drip', 'Total Glow Drip', 'Recommended', 2499, 12495, 24990,
   'Beauty and wellness in one infusion.',
   'Brightening and deep revitalization, head to toe.',
   'Full-body wellness paired with visible beauty results.', 45, 2),

  ('glow-boost', 'Glow Boost', null, 1999, 9950, 19990,
   'Glow from within with hydration and nutrients.',
   'Skin brightening for a dewy glow.',
   'Anyone feeling dull or in need of an instant skin refresh.', 30, 3),

  ('radiance-plus', 'Radiance Plus', null, 1999, 9950, 19990,
   'A silky infusion for glowing, even-toned skin.',
   'Skin lightening for a luminous glow.',
   'Uneven skin tone, discoloration, or dullness.', 30, 4),

  ('recovery-drip', 'Recovery Drip', 'Best Value', 2699, 13495, 26990,
   'Hydration, electrolytes, and restored energy.',
   'Brightening for a rested, camera-ready glow.',
   'Post-party, jet lag, dehydration, and post-workout recovery.', 40, 5),

  ('clear-skin-boost', 'Clear Skin Boost', 'Top Seller', 1499, 7495, 14990,
   'A blend that soothes irritation and clears blemishes.',
   'Lightening for a smooth, radiant complexion.',
   'Breakouts, redness, or uneven skin.', 30, 6),

  ('active-glow', 'Active Glow', null, 1999, 9950, 9950,
   'Stamina support for active, busy lifestyles.',
   'Brightening for a vibrant, healthy glow all day.',
   'Anyone always on the move and exposed to the sun.', 30, 7)
on conflict (slug) do update set
  session_price = excluded.session_price,
  five_plus_one_price = excluded.five_plus_one_price,
  ten_plus_two_price = excluded.ten_plus_two_price;
