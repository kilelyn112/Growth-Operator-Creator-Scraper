import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// One-time admin seed endpoint
// DELETE THIS FILE after use
export async function POST() {
  try {
    // Check if admin already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'kile@growthoperator.com')
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Admin account already exists' }, { status: 409 });
    }

    // Hash password with bcryptjs
    const bcrypt = require('bcryptjs');
    const password_hash = bcrypt.hashSync('admin123', 10);

    const { data, error } = await supabase
      .from('users')
      .insert({
        email: 'kile@growthoperator.com',
        first_name: 'Kile',
        password_hash,
        is_member: true,
        onboarding_completed: true,
        trial_started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Seed error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Admin account created', userId: data.id });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed admin' }, { status: 500 });
  }
}
