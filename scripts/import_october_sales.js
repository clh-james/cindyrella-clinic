const fs = require('fs');
const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx+1).trim().replace(/^['"]|['"]$/g, '')];
    })
);
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const DAVAO_BRANCH_ID = '3184ce8e-fb98-4d13-939d-aff3e76982e0';

// Raw 23 rows from October sales spreadsheet
const OCTOBER_RECORDS = [
  {
    date: '2026-10-08',
    client: 'Edgardo Batenga',
    serviceName: 'Botox Open promo',
    category: 'Non-invasive',
    penileMain: 0,
    penileWalkin: 0,
    others: 5939,
    deposit: 0,
    total: 5939,
    classification: 'booked',
    notes: 'Botox Open promo availed'
  },
  {
    date: '2026-10-09',
    client: 'Jeric',
    serviceName: 'Alartox',
    category: 'Non-invasive',
    penileMain: 0,
    penileWalkin: 0,
    others: 4454,
    deposit: 0,
    total: 4454,
    classification: 'booked',
    notes: 'Alartox procedure'
  },
  {
    date: '2026-10-15',
    client: 'Marlon Montero',
    serviceName: 'Penile Combo',
    category: "King's Treatment",
    penileMain: 50000,
    penileWalkin: 0,
    others: 1000, // Meds
    deposit: 0,
    total: 51000,
    classification: 'booked',
    notes: 'Penile Combo (₱50,000) + Medication Set (₱1,000)'
  },
  {
    date: '2026-10-16',
    client: 'Shine Escala',
    serviceName: 'Hiko nose promo',
    category: 'Non-invasive',
    penileMain: 0,
    penileWalkin: 0,
    others: 7999,
    deposit: 0,
    total: 7999,
    classification: 'booked',
    notes: 'Hiko nose promo'
  },
  {
    date: '2026-10-17',
    client: 'Madie',
    serviceName: 'Footspa promo',
    category: 'Nail Care',
    penileMain: 0,
    penileWalkin: 0,
    others: 791,
    deposit: 0,
    total: 791,
    classification: 'booked',
    notes: 'Footspa promo'
  },
  {
    date: '2026-10-18',
    client: 'Weshly Canoy',
    serviceName: 'Penile Refill',
    category: "King's Treatment",
    penileMain: 20000,
    penileWalkin: 0,
    others: 1000,
    deposit: 0,
    total: 21000,
    classification: 'booked',
    notes: 'Penile Refill (₱20,000) + Medication Set (₱1,000)'
  },
  {
    date: '2026-10-18',
    client: 'Ariel Conception',
    serviceName: 'Penile combo',
    category: "King's Treatment",
    penileMain: 70000,
    penileWalkin: 0,
    others: 1000,
    deposit: 0,
    total: 71000,
    classification: 'booked',
    notes: 'Penile combo 2-sessions (₱70,000) + Medication Set (₱1,000)'
  },
  {
    date: '2026-10-18',
    client: 'Michelle Macasocol',
    serviceName: 'Eyelash',
    category: 'Eyelash Extension',
    penileMain: 0,
    penileWalkin: 0,
    others: 1199,
    deposit: 0,
    total: 1199,
    classification: 'walk-in',
    notes: 'UV Cure Classic Eyelash'
  },
  {
    date: '2026-10-22',
    client: 'Ranel Corpuz',
    serviceName: 'Penile package',
    category: "King's Treatment",
    penileMain: 0,
    penileWalkin: 45000,
    others: 1000,
    deposit: 0,
    total: 46000,
    classification: 'walk-in',
    notes: 'Penile package walk-in (₱45,000) + Medication Set (₱1,000)'
  },
  {
    date: '2026-10-22',
    client: 'Ranel Corpuz',
    serviceName: 'Botox Open promo',
    category: 'Non-invasive',
    penileMain: 0,
    penileWalkin: 0,
    others: 8000,
    deposit: 0,
    total: 8000,
    classification: 'walk-in',
    notes: 'Botox Open promo'
  },
  {
    date: '2026-10-22',
    client: 'Razoul Masulot',
    serviceName: 'Penile package',
    category: "King's Treatment",
    penileMain: 38000,
    penileWalkin: 0,
    others: 1000,
    deposit: 2000,
    total: 41000,
    classification: 'booked',
    notes: 'Penile package with Advance Deposit (₱2,000) + Balance (₱38,000) + Medication Set (₱1,000)'
  },
  {
    date: '2026-10-23',
    client: 'Januar Yu',
    secondaryClient: 'Ryan Castillo',
    serviceName: 'Penile refill',
    category: "King's Treatment",
    penileMain: 30000,
    penileWalkin: 0,
    others: 1000,
    deposit: 0,
    total: 31000,
    classification: 'booked',
    tandem: 'Januar Yu & Ryan Castillo',
    notes: 'Penile refill (₱30,000) + Medication Set (₱1,000) - Tandem procedure'
  },
  {
    date: '2026-10-24',
    client: 'Loise p magee',
    serviceName: 'Footspa/pedi',
    category: 'Nail Care',
    penileMain: 0,
    penileWalkin: 0,
    others: 571,
    deposit: 0,
    total: 571,
    classification: 'walk-in',
    notes: 'Footspa & Pedicure combo promo'
  },
  {
    date: '2026-10-25',
    client: 'Irin Estabala',
    serviceName: 'Lash lift',
    category: 'Eyelash Extension',
    penileMain: 0,
    penileWalkin: 0,
    others: 490,
    deposit: 0,
    total: 490,
    classification: 'walk-in',
    notes: 'Lash lift promo'
  },
  {
    date: '2026-10-27',
    client: 'Jhialil Wahid Sultan',
    serviceName: 'Penile package',
    category: "King's Treatment",
    penileMain: 35000,
    penileWalkin: 0,
    others: 1000,
    deposit: 0,
    total: 36000,
    classification: 'booked',
    notes: 'Penile package single session (₱35,000) + Medication Set (₱1,000)'
  },
  {
    date: '2026-10-28',
    client: 'Aires Credo',
    serviceName: 'Classic eyelash',
    category: 'Eyelash Extension',
    penileMain: 0,
    penileWalkin: 0,
    others: 629,
    deposit: 0,
    total: 629,
    classification: 'walk-in',
    notes: 'Classic eyelash promo'
  },
  {
    date: '2026-10-28',
    client: 'Aires Credo',
    serviceName: 'Microshading',
    category: 'Non-invasive',
    penileMain: 0,
    penileWalkin: 0,
    others: 1999,
    deposit: 0,
    total: 1999,
    classification: 'walk-in',
    notes: 'Eyebrow Microshading promo'
  },
  {
    date: '2026-10-30',
    client: 'King Fahad',
    serviceName: 'Penile Refill',
    category: "King's Treatment",
    penileMain: 25000,
    penileWalkin: 0,
    others: 1000,
    deposit: 0,
    total: 26000,
    classification: 'booked',
    notes: 'Penile Refill (₱25,000) + Medication Set (₱1,000)'
  },
  {
    date: '2026-10-30',
    client: 'Caroline Raagas',
    serviceName: 'Hiko nose',
    category: 'Non-invasive',
    penileMain: 0,
    penileWalkin: 0,
    others: 15000,
    deposit: 0,
    total: 15000,
    classification: 'booked',
    notes: 'Hiko nose with tip complete procedure'
  },
  {
    date: '2026-10-30',
    client: 'Datu Marohomsar Gaya',
    serviceName: 'Penile package',
    category: "King's Treatment",
    penileMain: 50000,
    penileWalkin: 0,
    others: 1000,
    deposit: 0,
    total: 51000,
    classification: 'booked',
    notes: 'Penile package (₱50,000) + Medication Set (₱1,000)'
  },
  {
    date: '2026-10-31',
    client: 'Ranel corpuz',
    serviceName: 'Gluta package',
    category: 'IV Treatment',
    penileMain: 0,
    penileWalkin: 0,
    others: 9950,
    deposit: 0,
    total: 9950,
    classification: 'booked',
    notes: 'Active Glow 5+1 Gluta Package (6 Sessions)'
  },
  {
    date: '2026-10-31',
    client: 'Loise p magee',
    serviceName: 'Refill lash',
    category: 'Eyelash Extension',
    penileMain: 0,
    penileWalkin: 0,
    others: 75,
    deposit: 0,
    total: 75,
    classification: 'walk-in',
    notes: 'Lash Refill touch-up'
  },
  {
    date: '2026-10-31',
    client: 'Mara Sinahon',
    serviceName: 'Lashes/facial/gluta',
    category: 'IV Treatment',
    penileMain: 0,
    penileWalkin: 0,
    others: 9782,
    deposit: 0,
    total: 9782,
    classification: 'booked',
    notes: 'Triple Wellness Combo: Lashes + Facial + Gluta Drip'
  }
];

async function runImport() {
  console.log(`Starting import of ${OCTOBER_RECORDS.length} October Sales records into Cindyrella...`);

  // 1. Fetch available treatments
  const { data: treatments, error: treatErr } = await supabase.from('treatments').select('id, name, session_price, category');
  if (treatErr) throw treatErr;

  // 2. Fetch or assign primary therapist
  const { data: staffList } = await supabase.from('staff').select('id, full_name, branch_id').eq('is_active', true);
  const defaultStaff = staffList?.find(s => s.full_name.includes('Cloisa') || s.full_name.includes('Camille')) || staffList?.[0];

  let successCount = 0;
  let totalImportedRevenue = 0;

  for (let i = 0; i < OCTOBER_RECORDS.length; i++) {
    const rec = OCTOBER_RECORDS[i];
    const refNum = `OCT-${rec.date.slice(5).replace('-', '')}-${String(i + 1).padStart(2, '0')}`;

    // A. Customer Creation or Lookup
    const nameParts = rec.client.trim().split(' ');
    const firstName = nameParts[0] || 'Patient';
    const lastName = nameParts.slice(1).join(' ') || '';
    const safePhone = `09${Math.floor(100000000 + Math.random() * 900000000)}`;

    let customerId;
    const { data: existingCust } = await supabase
      .from('customers')
      .select('id')
      .ilike('first_name', firstName)
      .ilike('last_name', lastName ? `%${lastName}%` : '%')
      .maybeSingle();

    if (existingCust) {
      customerId = existingCust.id;
    } else {
      const { data: newCust, error: custErr } = await supabase
        .from('customers')
        .insert({
          first_name: firstName,
          last_name: lastName || '.',
          phone: safePhone,
          email: `${firstName.toLowerCase().replace(/[^a-z]/g, '')}${Math.floor(Math.random() * 999)}@client.cindyrella.com`,
          client_classification: rec.classification
        })
        .select('id')
        .single();

      if (custErr) {
        console.error(`Error creating customer ${rec.client}:`, custErr);
        continue;
      }
      customerId = newCust.id;
    }

    // B. Find best matching treatment
    let matchedTreatment = treatments.find(t => t.name.toLowerCase().includes(rec.serviceName.toLowerCase()));
    if (!matchedTreatment) {
      if (rec.category === "King's Treatment") {
        matchedTreatment = treatments.find(t => t.name === 'Penile Enhancement') || treatments[0];
      } else if (rec.category === 'IV Treatment') {
        matchedTreatment = treatments.find(t => t.name.includes('Glow')) || treatments[0];
      } else if (rec.category === 'Eyelash Extension') {
        matchedTreatment = treatments.find(t => t.name.includes('Classic') || t.name.includes('Lash')) || treatments[0];
      } else {
        matchedTreatment = treatments[0];
      }
    }

    // C. Format Items Array for Notes
    const itemsList = [
      {
        id: matchedTreatment.id,
        name: rec.serviceName,
        price: rec.total - (rec.category === "King's Treatment" && rec.others === 1000 ? 1000 : 0),
        quantity: 1,
        category: rec.category
      }
    ];

    if (rec.category === "King's Treatment" && rec.others === 1000) {
      const medSet = treatments.find(t => t.name.includes('MEDICATION'));
      itemsList.push({
        id: medSet ? medSet.id : 'med-set-1000',
        name: 'PENILE MEDICATION SET',
        price: 1000,
        quantity: 1,
        category: "King's Treatment"
      });
    }

    const itemsJson = JSON.stringify(itemsList);
    let fullNotes = `${itemsJson}\n[Classification:${rec.classification}]`;
    if (defaultStaff) {
      fullNotes += `\n[HandledBy:${defaultStaff.id}]`;
      fullNotes += `\n[Handlers:${JSON.stringify([{ staffId: defaultStaff.id, role: 'primary', splitPercent: 100 }])}]`;
    }
    if (rec.deposit > 0) {
      fullNotes += `\n[AdvanceDeposit:₱${rec.deposit}]`;
    }
    fullNotes += `\n${rec.notes}`;

    // D. Insert into appointments
    const payload = {
      reference_number: refNum,
      customer_id: customerId,
      treatment_id: matchedTreatment.id,
      branch_id: DAVAO_BRANCH_ID,
      appointment_date: rec.date,
      appointment_time: '11:00 AM',
      payment_method: 'cash',
      amount_due: rec.total,
      client_classification: rec.classification,
      handled_by: defaultStaff?.id || null,
      status: 'completed',
      payment_status: 'paid',
      notes: fullNotes
    };

    // Check if reference already exists to prevent duplicate
    const { data: existingAppt } = await supabase
      .from('appointments')
      .select('id')
      .eq('reference_number', refNum)
      .maybeSingle();

    if (existingAppt) {
      console.log(`Record ${refNum} (${rec.client}) already imported. Skipping.`);
      successCount++;
      totalImportedRevenue += rec.total;
      continue;
    }

    const { error: insertErr } = await supabase.from('appointments').insert(payload);
    if (insertErr) {
      console.error(`Failed to insert record ${refNum} for ${rec.client}:`, insertErr);
    } else {
      successCount++;
      totalImportedRevenue += rec.total;
      console.log(`✓ [${i+1}/${OCTOBER_RECORDS.length}] ${rec.date} | ${rec.client.padEnd(22)} | ₱${rec.total.toLocaleString().padStart(8)} | Ref: ${refNum}`);
    }
  }

  console.log('\n=============================================');
  console.log(`IMPORT COMPLETE!`);
  console.log(`Successfully processed: ${successCount} / ${OCTOBER_RECORDS.length} transactions`);
  console.log(`Total Sales Revenue Imported: ₱${totalImportedRevenue.toLocaleString()} (Target: ₱440,878)`);
  console.log('=============================================');
}

runImport().catch(console.error);

