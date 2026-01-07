import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types for our database tables
export interface DbCreator {
  id?: number;
  platform: string;
  platform_id: string;
  username: string | null;
  display_name: string;
  profile_url: string;
  followers: number;
  following: number;
  post_count: number;
  total_views: number;
  engagement_rate: number;
  bio: string | null;
  external_url: string | null;
  qualified: boolean;
  qualification_reason: string;
  email: string | null;
  first_name: string | null;
  niche: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbFunnel {
  id?: number;
  funnel_url: string;
  domain: string | null;
  platform: string;
  niche: string | null;
  quality_score: number;
  issues: string | null;
  has_mobile_viewport: boolean;
  has_clear_cta: boolean;
  has_testimonials: boolean;
  has_trust_badges: boolean;
  page_load_time: number | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  owner_instagram: string | null;
  owner_youtube: string | null;
  owner_x: string | null;
  owner_linkedin: string | null;
  owner_website: string | null;
  discovery_source: string;
  search_query: string | null;
  page_title: string | null;
  page_description: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbJob {
  id: string;
  keyword: string;
  platform: string;
  job_type: 'creator' | 'funnel';
  max_results: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  error: string | null;
  created_at?: string;
}
