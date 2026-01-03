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

    // Build CSV
    const headers = [
      'Channel Name',
      'Channel URL',
      'Subscribers',
      'Video Count',
      'Total Views',
      'Email',
      'First Name',
      'Qualification Reason',
    ];

    const rows = creators.map((c) => [
      escapeCsvField(c.channel_name),
      escapeCsvField(c.channel_url),
      c.subscribers.toString(),
      c.video_count.toString(),
      c.total_views.toString(),
      escapeCsvField(c.email || ''),
      escapeCsvField(c.first_name || ''),
      escapeCsvField(c.qualification_reason),
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
