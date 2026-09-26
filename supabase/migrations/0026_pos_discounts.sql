-- Add discount_amount to pos_sales
alter table pos_sales add column if not exists discount_amount integer default 0;
alter table pos_sales add column if not exists discount_reason text;

-- Add discount_amount to appointments
alter table appointments add column if not exists discount_amount integer default 0;
alter table appointments add column if not exists discount_reason text;
