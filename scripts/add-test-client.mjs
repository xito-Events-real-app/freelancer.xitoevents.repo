// Quick script to add a test client "WORKSUVASH"
// Run with: node scripts/add-test-client.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xuvwhcwcjdggusrrahrh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1dndoY3djamRnZ3VzcnJhaHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MTQ0MTQsImV4cCI6MjA5NDQ5MDQxNH0.z_lnn40FqD7gOCPWcXw31FaRrkFKlMDMglJSjZhdZ3I';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // 1. Get all agency profiles to find the right user_id
  const { data: profiles, error: pErr } = await supabase
    .from('freelancer_profiles')
    .select('user_id, full_name, business_name, account_type')
    .eq('account_type', 'agency');

  if (pErr) {
    console.error('Error fetching profiles:', pErr.message);
    // Fallback: try fetching ALL profiles
    const { data: all, error: aErr } = await supabase
      .from('freelancer_profiles')
      .select('user_id, full_name, business_name, account_type')
      .limit(10);
    if (aErr) {
      console.error('Error fetching any profiles:', aErr.message);
      return;
    }
    console.log('All profiles found:', JSON.stringify(all, null, 2));
    if (!all || all.length === 0) {
      console.log('No profiles found at all. Please register first.');
      return;
    }
    // Use the first profile
    const userId = all[0].user_id;
    console.log(`Using first profile: ${all[0].full_name} (${userId}) - account_type: ${all[0].account_type}`);
    await insertClient(userId);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('No agency profiles found. Checking all profiles...');
    const { data: all } = await supabase
      .from('freelancer_profiles')
      .select('user_id, full_name, business_name, account_type')
      .limit(10);
    console.log('Profiles:', JSON.stringify(all, null, 2));
    if (all && all.length > 0) {
      console.log(`\nUsing first profile: ${all[0].full_name} (${all[0].account_type})`);
      await insertClient(all[0].user_id);
    }
    return;
  }

  const agency = profiles[0];
  console.log(`Found agency: ${agency.business_name || agency.full_name} (${agency.user_id})`);
  await insertClient(agency.user_id);
}

async function insertClient(userId) {
  const { data, error } = await supabase
    .from('agency_clients')
    .insert({
      user_id: userId,
      client_name: 'WORKSUVASH',
      contact_number: '9800000000',
      whatsapp_number: '9800000000',
      email: 'worksuvash@test.com',
      event_name: 'Test Wedding Event',
      event_date_ad: '2026-07-15',
      event_date_bs: '2083-03-31',
      event_city: 'Kathmandu',
      event_area: 'Baneshwor',
      status: 'booked',
      package_amount: 50000,
      advance_amount: 25000,
      source: 'Direct',
      handler: 'Suvash',
      description: 'Test client added for verification',
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting client:', error.message);
    console.error('Details:', error);
  } else {
    console.log('✅ Client WORKSUVASH added successfully!');
    console.log('Client ID:', data.id);
    console.log('Full data:', JSON.stringify(data, null, 2));
  }
}

main();
