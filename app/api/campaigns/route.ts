import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createCampaign, getUserCampaigns } from '@/lib/campaigns';

// GET /api/campaigns - list user's campaigns
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaigns = await getUserCampaigns(session.user.id);
    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    return NextResponse.json({ error: 'Failed to get campaigns' }, { status: 500 });
  }
}

// POST /api/campaigns - create a new campaign
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, offer_description, target_market, platform, max_results_per_niche, selected_niches } = body;

    if (!name || !selected_niches || selected_niches.length === 0) {
      return NextResponse.json(
        { error: 'name and selected_niches are required' },
        { status: 400 }
      );
    }

    const campaign = await createCampaign({
      user_id: session.user.id,
      name,
      offer_description: offer_description || '',
      target_market: target_market || '',
      platform: platform || 'youtube',
      max_results_per_niche,
      selected_niches,
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Create campaign error:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
