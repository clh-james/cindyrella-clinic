alter table payments
  add column if not exists external_reference text;

create index if not exists payments_external_reference_idx
  on payments (external_reference);
