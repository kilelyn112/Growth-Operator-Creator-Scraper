import { supabase } from './supabase';
import { getAllNiches, Niche } from './niches';
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;
function getClient(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

// ============ TYPES ============

export interface Campaign {
  id: number;
  user_id: number;
  name: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  offer_description: string | null;
  target_market: string | null;
  platform: string;
  max_results_per_niche: number;
  selected_niches: SelectedNiche[];
  total_niches: number;
  completed_niches: number;
  total_creators_found: number;
  qualified_creators: number;
  creators_with_email: number;
  active_jobs: NicheJob[];
  created_at: string;
  updated_at: string;
}

export interface SelectedNiche {
  id: string;
  name: string;
  searchKeyword: string;
  category?: string;
}

export interface NicheJob {
  niche_id: string;
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface NicheSuggestion {
  id: string;
  name: string;
  category: string;
  searchKeyword: string;
  relevance: 'high' | 'medium' | 'low';
  reason: string;
}

// ============ AI NICHE MAPPING ============

export async function mapOfferToNiches(
  offerDescription: string,
  targetMarket: string
): Promise<NicheSuggestion[]> {
  const allNiches = getAllNiches();

  // Build a compact niche list for the prompt
  const nicheList = allNiches.map(n => `${n.id}|${n.name}|${n.category}`).join('\n');

  const client = getClient();
  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert at matching service offers to creator niches for outreach. Given a service provider's offer and target market, identify ALL relevant niches from the provided list where creators would be ideal prospects for their service.

Think broadly:
- Direct matches (they teach exactly what the service helps with)
- Adjacent matches (they're in a related space and likely need this service)
- Upstream matches (their audience would benefit from this service)

Be aggressive — more niches = more prospects. Include 15-40 niches when relevant.`
      },
      {
        role: 'user',
        content: `OFFER: ${offerDescription}
TARGET MARKET: ${targetMarket}

AVAILABLE NICHES (id|name|category):
${nicheList}

Return JSON with ALL relevant niches. For each, include:
- id (must match exactly from the list)
- name
- category
- searchKeyword (the best search term to find creators in this niche)
- relevance: "high", "medium", or "low"
- reason: 1 sentence explaining why this niche is relevant to the offer

Format:
{
  "niches": [
    {"id": "...", "name": "...", "category": "...", "searchKeyword": "...", "relevance": "high", "reason": "..."},
    ...
  ]
}`
      }
    ],
  });

  const result = JSON.parse(res.choices[0].message.content || '{"niches": []}');

  // Validate niche IDs exist
  const validIds = new Set(allNiches.map(n => n.id));
  return (result.niches || []).filter((n: NicheSuggestion) => validIds.has(n.id));
}

// ============ CAMPAIGN CRUD ============

export async function createCampaign(input: {
  user_id: number;
  name: string;
  offer_description: string;
  target_market: string;
  platform: string;
  max_results_per_niche?: number;
  selected_niches: SelectedNiche[];
}): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      user_id: input.user_id,
      name: input.name,
      offer_description: input.offer_description,
      target_market: input.target_market,
      platform: input.platform,
      max_results_per_niche: input.max_results_per_niche || 30,
      selected_niches: input.selected_niches,
      total_niches: input.selected_niches.length,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create campaign: ${error.message}`);
  return data as Campaign;
}

export async function getCampaign(id: number): Promise<Campaign | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Campaign;
}

export async function getUserCampaigns(userId: number): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data || []) as Campaign[];
}

export async function updateCampaignStatus(
  id: number,
  status: Campaign['status']
): Promise<void> {
  await supabase
    .from('campaigns')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function updateCampaignProgress(
  id: number,
  updates: Partial<Pick<Campaign, 'completed_niches' | 'total_creators_found' | 'qualified_creators' | 'creators_with_email' | 'active_jobs' | 'status'>>
): Promise<void> {
  await supabase
    .from('campaigns')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function deleteCampaign(id: number): Promise<void> {
  await supabase.from('campaigns').delete().eq('id', id);
}

// ============ CAMPAIGN RESULTS ============

export async function addCampaignResult(
  campaignId: number,
  creatorId: number,
  nicheId: string,
  nicheName: string
): Promise<void> {
  await supabase
    .from('campaign_results')
    .upsert({
      campaign_id: campaignId,
      creator_id: creatorId,
      niche_id: nicheId,
      niche_name: nicheName,
    }, { onConflict: 'campaign_id,creator_id' });
}

export async function getCampaignResults(campaignId: number): Promise<{
  creators: Array<{
    id: number;
    platform: string;
    platform_id: string;
    username: string | null;
    display_name: string;
    profile_url: string;
    followers: number;
    post_count: number;
    total_views: number;
    engagement_rate: number;
    bio: string | null;
    external_url: string | null;
    qualified: boolean;
    qualification_reason: string;
    email: string | null;
    first_name: string | null;
    niche_id: string;
    niche_name: string;
  }>;
  byNiche: Record<string, { total: number; qualified: number; withEmail: number }>;
}> {
  const { data, error } = await supabase
    .from('campaign_results')
    .select(`
      niche_id,
      niche_name,
      creators (
        id, platform, platform_id, username, display_name, profile_url,
        followers, post_count, total_views, engagement_rate,
        bio, external_url, qualified, qualification_reason, email, first_name
      )
    `)
    .eq('campaign_id', campaignId);

  if (error || !data) return { creators: [], byNiche: {} };

  const creators: Array<any> = [];
  const byNiche: Record<string, { total: number; qualified: number; withEmail: number }> = {};
  const seen = new Set<number>();

  for (const row of data) {
    const creator = row.creators as any;
    if (!creator || seen.has(creator.id)) continue;
    seen.add(creator.id);

    creators.push({
      ...creator,
      niche_id: row.niche_id,
      niche_name: row.niche_name,
    });

    const nicheKey = row.niche_id || 'unknown';
    if (!byNiche[nicheKey]) {
      byNiche[nicheKey] = { total: 0, qualified: 0, withEmail: 0 };
    }
    byNiche[nicheKey].total++;
    if (creator.qualified) byNiche[nicheKey].qualified++;
    if (creator.email) byNiche[nicheKey].withEmail++;
  }

  // Sort by qualified first, then followers
  creators.sort((a, b) => {
    if (a.qualified !== b.qualified) return b.qualified ? 1 : -1;
    return b.followers - a.followers;
  });

  return { creators, byNiche };
}
