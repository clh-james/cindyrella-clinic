-- Update branches to correct list
delete from branches 
where name in ('Bonifacio Global City', 'Alabang')
and not exists (
  select 1 from appointments where branch_id = branches.id
);

insert into branches (name, address, phone)
select v.name, v.address, v.phone
from (values
  ('Davao', 'Davao', ''),
  ('Parañaque', 'Parañaque', ''),
  ('Quezon City', 'Quezon City', ''),
  ('Makati', 'Makati', ''),
  ('Alaminos Pangasinan', 'Alaminos Pangasinan', ''),
  ('Burgos Pangasinan', 'Burgos Pangasinan', ''),
  ('Dagupan', 'Dagupan', ''),
  ('San Pedro Laguna', 'San Pedro Laguna', ''),
  ('Biñan Laguna', 'Biñan Laguna', '')
) as v(name, address, phone)
where not exists (
  select 1 from branches b where b.name = v.name
);

insert into branch_settings (branch_id, max_bookings_per_slot)
select id, 3 from branches
where not exists (
  select 1 from branch_settings where branch_id = branches.id
);
