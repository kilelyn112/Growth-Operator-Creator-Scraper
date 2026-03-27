import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { mapOfferToNiches } from '@/lib/campaigns';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { offer_description, target_market } = await request.json();

    if (!offer_description || !target_market) {
      return NextResponse.json(
        { error: 'offer_description and target_market are required' },
        { status: 400 }
      );
    }

    const niches = await mapOfferToNiches(offer_description, target_market);

    return NextResponse.json({ niches });
  } catch (error) {
    console.error('Map niches error:', error);
    return NextResponse.json({ error: 'Failed to map niches' }, { status: 500 });
  }
}
