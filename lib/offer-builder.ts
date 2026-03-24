import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

// ============ TYPES ============

export interface Offer {
  id?: number;
  user_id: number;
  status: 'draft' | 'complete' | 'needs_revision';
  version: number;
  // Step 1
  target_market: string;
  target_pain_points: string[];
  target_desires: string[];
  // Step 2
  service_category: string;
  service_description: string;
  delivery_method: string;
  // Step 3
  before_state: string;
  after_state: string;
  timeframe: string;
  // Step 4
  case_studies: CaseStudy[];
  credentials: string[];
  unique_mechanism: string;
  // Step 5
  offer_name: string;
  price_point: string;
  offer_stack: OfferStackItem[];
  guarantee: string;
  // AI
  offer_score: number;
  ai_feedback: AIFeedback | null;
}

export interface CaseStudy {
  client: string;
  before: string;
  after: string;
  timeframe: string;
}

export interface OfferStackItem {
  item: string;
  value: string;
  description: string;
}

export interface AIFeedback {
  overall: string;
  specificity: { score: number; feedback: string };
  transformation: { score: number; feedback: string };
  proof: { score: number; feedback: string };
  uniqueness: { score: number; feedback: string };
  stack: { score: number; feedback: string };
}

export type OfferStep = 'who_you_serve' | 'what_you_do' | 'transformation' | 'proof' | 'offer_stack';

// ============ AI FUNCTIONS ============

const SYSTEM_PROMPT = `You are an elite offer positioning consultant. Your job is to help online service providers (agency owners, freelancers, growth operators, copywriters, etc.) build irresistible offers.

KEY PRINCIPLES:
- Most service providers sell a COMMODITY ("I do social media management"). Your job is to help them build a POSITIONED OFFER with a clear outcome, mechanism, timeline, and risk reversal.
- Specificity beats generality. "Shopify store owners doing $10K-50K/mo who can't profitably scale Meta ads" is 10x better than "ecommerce businesses."
- The transformation (before/after) is what sells, not the deliverables.
- A "Grand Slam Offer" stacks so much value that saying no feels stupid.
- The guarantee removes risk from the buyer and puts it on the seller.

Always be direct, specific, and push for clarity. If something is vague, call it out.`;

/**
 * Extract structured ICP data from a free-form user description
 */
export async function extractICP(description: string): Promise<{
  target_market: string;
  pain_points: string[];
  desires: string[];
}> {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `The user described their target market as: "${description}"

Extract and refine this into a structured ICP. Make the target market description SPECIFIC (include industry, revenue range, team size, or stage if possible). Identify 3-5 specific pain points and 3-5 specific desires.

Return JSON:
{
  "target_market": "specific one-sentence description of who they serve",
  "pain_points": ["specific pain point 1", "specific pain point 2", ...],
  "desires": ["specific desire 1", "specific desire 2", ...]
}` }
    ],
  });

  return JSON.parse(res.choices[0].message.content || '{}');
}

/**
 * Help refine the service description into concrete deliverables
 */
export async function refineService(input: {
  service_category: string;
  service_description: string;
  delivery_method: string;
  target_market: string;
}): Promise<{
  refined_description: string;
  key_deliverables: string[];
}> {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Service category: ${input.service_category}
Description: ${input.service_description}
Delivery: ${input.delivery_method}
Target market: ${input.target_market}

Refine this into a clear, specific service description and list 4-6 concrete deliverables. Make it sound like a premium service, not a commodity.

Return JSON:
{
  "refined_description": "one paragraph positioning the service as premium and outcome-focused",
  "key_deliverables": ["deliverable 1", "deliverable 2", ...]
}` }
    ],
  });

  return JSON.parse(res.choices[0].message.content || '{}');
}

/**
 * Generate transformation narrative
 */
export async function generateTransformation(input: {
  target_market: string;
  service_description: string;
  pain_points: string[];
}): Promise<{
  before_state: string;
  after_state: string;
  suggested_timeframe: string;
}> {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Target market: ${input.target_market}
Service: ${input.service_description}
Pain points: ${input.pain_points.join(', ')}

Write a compelling before/after transformation. The "before" should paint the pain vividly. The "after" should describe the specific, tangible outcome they'll achieve. Suggest a realistic timeframe.

Return JSON:
{
  "before_state": "vivid description of where they are now (2-3 sentences)",
  "after_state": "specific description of where they'll be after (2-3 sentences)",
  "suggested_timeframe": "e.g. 90 days, 6 months"
}` }
    ],
  });

  return JSON.parse(res.choices[0].message.content || '{}');
}

/**
 * Score and provide feedback on the complete offer
 */
export async function scoreOffer(offer: Partial<Offer>): Promise<AIFeedback> {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Score this offer on 5 dimensions (0-20 each, total 0-100):

TARGET MARKET: ${offer.target_market || 'Not set'}
PAIN POINTS: ${JSON.stringify(offer.target_pain_points || [])}
DESIRES: ${JSON.stringify(offer.target_desires || [])}
SERVICE: ${offer.service_category || 'Not set'} - ${offer.service_description || 'Not set'}
DELIVERY: ${offer.delivery_method || 'Not set'}
BEFORE STATE: ${offer.before_state || 'Not set'}
AFTER STATE: ${offer.after_state || 'Not set'}
TIMEFRAME: ${offer.timeframe || 'Not set'}
CASE STUDIES: ${JSON.stringify(offer.case_studies || [])}
CREDENTIALS: ${JSON.stringify(offer.credentials || [])}
UNIQUE MECHANISM: ${offer.unique_mechanism || 'Not set'}
OFFER NAME: ${offer.offer_name || 'Not set'}
PRICE: ${offer.price_point || 'Not set'}
OFFER STACK: ${JSON.stringify(offer.offer_stack || [])}
GUARANTEE: ${offer.guarantee || 'Not set'}

Score each dimension and provide specific, actionable feedback. Be honest — if something is weak, say so directly.

Return JSON:
{
  "overall": "1-2 sentence summary of the offer's strength",
  "specificity": { "score": 0-20, "feedback": "specific feedback on target market clarity" },
  "transformation": { "score": 0-20, "feedback": "feedback on before/after clarity" },
  "proof": { "score": 0-20, "feedback": "feedback on credibility and proof" },
  "uniqueness": { "score": 0-20, "feedback": "feedback on differentiation" },
  "stack": { "score": 0-20, "feedback": "feedback on offer stack and pricing" }
}` }
    ],
  });

  return JSON.parse(res.choices[0].message.content || '{}');
}
