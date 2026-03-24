import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSupabase } from '@/lib/supabase';

// GET — fetch user's offer
export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('user_id', session.userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ offer: data || null });
}

// POST — create or update user's offer
export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const supabase = getSupabase();

  // Check if offer exists
  const { data: existing } = await supabase
    .from('offers')
    .select('id')
    .eq('user_id', session.userId)
    .single();

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from('offers')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('user_id', session.userId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ offer: data });
  } else {
    // Create
    const { data, error } = await supabase
      .from('offers')
      .insert({ ...body, user_id: session.userId })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ offer: data }, { status: 201 });
  }
}
