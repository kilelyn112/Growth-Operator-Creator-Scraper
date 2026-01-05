import { NextRequest, NextResponse } from 'next/server';
import { getJob, getQualifiedCreatorsByJobId } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = getJob(id);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const creators = getQualifiedCreatorsByJobId(id);

    // Build CSV with multi-platform support
    const headers = [
      'Platform',
      'Username',
      'Display Name',
      'Profile URL',
      'Followers',
      'Post Count',
      'Total Views',
      'Engagement Rate',
      'Email',
      'First Name',
      'Bio',
      'External URL',
      'Qualification Reason',
    ];

    const rows = creators.map((c) => [
      escapeCsvField(c.platform || 'youtube'),
      escapeCsvField(c.username || ''),
      escapeCsvField(c.display_name || c.channel_name || ''),
      escapeCsvField(c.profile_url || c.channel_url || ''),
      (c.followers ?? c.subscribers ?? 0).toString(),
      (c.post_count ?? c.video_count ?? 0).toString(),
      (c.total_views ?? 0).toString(),
      (c.engagement_rate ?? 0).toFixed(2),
      escapeCsvField(c.email || ''),
      escapeCsvField(c.first_name || ''),
      escapeCsvField(c.bio || ''),
      escapeCsvField(c.external_url || ''),
      escapeCsvField(c.qualification_reason || ''),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const filename = `creators-${job.keyword.replace(/[^a-zA-Z0-9]/g, '-')}-${id.slice(0, 8)}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return NextResponse.json(
      { error: 'Failed to export CSV' },
      { status: 500 }
    );
  }
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
