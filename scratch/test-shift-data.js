const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testFetch(shiftId) {
  const { data: shift } = await supabase
    .from('cashier_shifts')
    .select('*, cashier:cashier_id(id, full_name), branch:branch_id(name)')
    .eq('id', shiftId)
    .single();

  console.log('Shift:', shift);

  // Appts
  let apptQuery = supabase
    .from('appointments')
    .select(`
      id, reference_number, appointment_date, appointment_time, payment_status, payment_method, amount_due, status, created_at,
      customers(first_name, last_name, phone),
      treatments(name)
    `)
    .eq('branch_id', shift.branch_id)
    .gte('created_at', shift.opened_at);
  if (shift.closed_at) apptQuery = apptQuery.lte('created_at', shift.closed_at);
  const { data: appts } = await apptQuery;

  // POS sales
  let posQuery = supabase
    .from('pos_sales')
    .select(`
      id, reference_number, created_at, payment_method, status, total_amount,
      customers(first_name, last_name, phone),
      items:pos_sale_items(quantity, price_per_unit, item:inventory_items(name))
    `)
    .eq('branch_id', shift.branch_id)
    .gte('created_at', shift.opened_at);
  if (shift.closed_at) posQuery = posQuery.lte('created_at', shift.closed_at);
  const { data: posSales } = await posQuery;

  console.log('Appts count:', appts?.length);
  console.log('POS Sales count:', posSales?.length);

  // Audit logs
  const { data: rawLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .or(`resource_id.eq.${shift.id},metadata->>shift_id.eq.${shift.id}`)
    .order('created_at', { ascending: false });

  // Voids during shift
  let voidQuery = supabase
    .from('audit_logs')
    .select('*')
    .eq('action', 'VOID_TRANSACTION')
    .gte('created_at', shift.opened_at);
  if (shift.closed_at) voidQuery = voidQuery.lte('created_at', shift.closed_at);
  const { data: voidLogs } = await voidQuery;

  console.log('Raw shift audit logs:', rawLogs?.length);
  console.log('Void audit logs during shift:', voidLogs);
}

testFetch('5bcb2efd-2ea8-462f-83e0-2eb972c325cb');
