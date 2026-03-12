import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { clearCachedCreators, Platform } from '@/lib/db';

const ADMIN_EMAILS = ['kile@growthoperator.com', 'admin@creatorpairing.com', 'kilelyn8@gmail.com'];
const VALID_PLATFORMS = ['youtube', 'instagram', 'x', 'tiktok', 'linkedin', 'skool', 'substack', 'all'];

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { platform, keyword } = await request.json();

    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: 'Valid platform is required' }, { status: 400 });
    }

    const deleted = await clearCachedCreators(platform as Platform | 'all', keyword || undefined);

    return NextResponse.json({
      success: true,
      deleted,
      message: `Cleared ${deleted} cached creators${keyword ? ` for "${keyword}"` : ''}${platform !== 'all' ? ` on ${platform}` : ' across all platforms'}`,
    });
  } catch (error) {
    console.error('Admin clear cache error:', error);
    const message = error instanceof Error ? error.message : 'Failed to clear cache';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
