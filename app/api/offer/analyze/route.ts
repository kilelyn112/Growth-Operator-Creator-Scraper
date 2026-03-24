import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { extractICP, refineService, generateTransformation, scoreOffer } from '@/lib/offer-builder';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { action } = body;

  try {
    switch (action) {
      case 'extract_icp': {
        const result = await extractICP(body.description);
        return NextResponse.json(result);
      }
      case 'refine_service': {
        const result = await refineService(body.input);
        return NextResponse.json(result);
      }
      case 'generate_transformation': {
        const result = await generateTransformation(body.input);
        return NextResponse.json(result);
      }
      case 'score_offer': {
        const result = await scoreOffer(body.offer);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error('Offer analyze error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
