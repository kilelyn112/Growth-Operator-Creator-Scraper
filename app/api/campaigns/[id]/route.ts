import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCampaign, deleteCampaign, getCampaignResults } from '@/lib/campaigns';

// GET /api/campaigns/[id] - get campaign details + results
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const campaign = await getCampaign(parseInt(id));

    if (!campaign || campaign.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get results
    const results = await getCampaignResults(campaign.id);

    return NextResponse.json({ campaign, results });
  } catch (error) {
    console.error('Get campaign error:', error);
    return NextResponse.json({ error: 'Failed to get campaign' }, { status: 500 });
  }
}

// DELETE /api/campaigns/[id] - delete campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const campaign = await getCampaign(parseInt(id));

    if (!campaign || campaign.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    await deleteCampaign(campaign.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete campaign error:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
