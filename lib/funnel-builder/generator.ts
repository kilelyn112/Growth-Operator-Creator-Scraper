/**
 * Funnel Generator — Takes a CreatorAnalysis and generates a complete funnel
 *
 * NOTE: This uses a default marketing prompt. The user will provide custom
 * marketing psychology prompts to replace/enhance this.
 */

import OpenAI from 'openai';
import type { CreatorAnalysis } from './analyzer';

let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export interface GeneratedFunnel {
  // Meta
  creator_name: string;
  niche: string;
  target_platform: 'gohighlevel' | 'clickfunnels' | 'generic';

  // Funnel sections
  headline: string;
  subheadline: string;
  hero_section: {
    hook_text: string;
    cta_text: string;
    cta_subtext: string;
  };
  pain_points: {
    section_title: string;
    points: { title: string; description: string }[];
  };
  solution: {
    title: string;
    description: string;
    bullet_points: string[];
  };
  social_proof: {
    section_title: string;
    testimonials: { name: string; result: string; quote: string }[];
  };
  offer: {
    title: string;
    description: string;
    features: { name: string; description: string }[];
    price_anchor: string;
    actual_price: string;
    cta_text: string;
    urgency_text: string;
  };
  about_section: {
    title: string;
    bio: string;
    credentials: string[];
  };
  faq: { question: string; answer: string }[];
  final_cta: {
    headline: string;
    subheadline: string;
    cta_text: string;
    guarantee_text: string;
  };
}

// ============================================================
// DEFAULT FUNNEL GENERATION PROMPT
// This will be replaced/enhanced with the user's custom prompts
// ============================================================

const FUNNEL_SYSTEM_PROMPT = `You are an elite direct response copywriter and funnel architect. You create high-converting sales funnels that combine proven marketing psychology with specific creator insights.

Your funnels follow these principles:
- Lead with the transformation, not features
- Use specific, concrete language (not generic marketing fluff)
- Match the creator's voice and tone
- Address objections before they arise
- Create urgency without being sleazy
- Every section has ONE job: get them to the next section

Return structured JSON for each funnel section.`;

export async function generateFunnel(
  analysis: CreatorAnalysis,
  targetPlatform: 'gohighlevel' | 'clickfunnels' | 'generic' = 'generic'
): Promise<GeneratedFunnel> {
  const openai = getOpenAI();

  const prompt = buildFunnelPrompt(analysis, targetPlatform);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: FUNNEL_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from funnel generator');

  const raw = JSON.parse(content);

  return {
    creator_name: analysis.name,
    niche: analysis.niche,
    target_platform: targetPlatform,
    ...raw,
  };
}

function buildFunnelPrompt(analysis: CreatorAnalysis, targetPlatform: string): string {
  return `Build a complete high-converting sales funnel for this creator. Use their specific content, niche, and audience insights to make every word specific to THEM — not generic.

## CREATOR ANALYSIS

Name: ${analysis.name}
Platform: ${analysis.platform}
Followers: ${analysis.followers.toLocaleString()}
Niche: ${analysis.niche}
Sub-niche: ${analysis.sub_niche}
Target Audience: ${analysis.target_audience}

Pain Points Their Audience Has:
${analysis.audience_pain_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}

What Their Audience Wants:
${analysis.audience_desires.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Content Themes:
${analysis.content_themes.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Tone of Voice: ${analysis.tone_of_voice}

Existing/Potential Offers:
${analysis.identified_offers.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Unique Selling Proposition: ${analysis.unique_selling_proposition}

Credibility:
${analysis.credibility_markers.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Target Platform: ${targetPlatform}

---

Generate a complete funnel with these sections. Every piece of copy should be SPECIFIC to this creator — use their niche language, reference their content themes, and match their tone.

Return JSON:

{
  "headline": "The main headline — should communicate the #1 transformation. Use power words from their niche.",
  "subheadline": "Supporting line that adds specificity and credibility",
  "hero_section": {
    "hook_text": "2-3 sentences that immediately grab attention by calling out the audience's biggest frustration",
    "cta_text": "Primary CTA button text",
    "cta_subtext": "Text below the button (e.g., 'Join 5,000+ students' or 'Limited spots available')"
  },
  "pain_points": {
    "section_title": "A headline for the pain section (e.g., 'Sound familiar?')",
    "points": [
      { "title": "Pain point title", "description": "1-2 sentences elaborating on this specific pain" }
    ]
  },
  "solution": {
    "title": "The solution section headline",
    "description": "2-3 sentences introducing their solution/offer",
    "bullet_points": ["6-8 specific benefits/outcomes using their niche language"]
  },
  "social_proof": {
    "section_title": "Social proof section headline",
    "testimonials": [
      { "name": "Realistic first name", "result": "Specific result achieved", "quote": "A realistic testimonial quote" }
    ]
  },
  "offer": {
    "title": "What's included headline",
    "description": "Overview of the offer",
    "features": [
      { "name": "Feature name", "description": "What it includes and why it matters" }
    ],
    "price_anchor": "Higher perceived value (e.g., 'Value: $4,997')",
    "actual_price": "The actual price or CTA (e.g., 'Today: $997' or 'Book a Free Call')",
    "cta_text": "CTA button text for the offer section",
    "urgency_text": "Urgency/scarcity element"
  },
  "about_section": {
    "title": "About section headline",
    "bio": "3-4 sentences written in first person AS the creator, highlighting their journey and why they teach",
    "credentials": ["4-5 specific credentials or proof points"]
  },
  "faq": [
    { "question": "Common objection phrased as question", "answer": "Answer that overcomes the objection" }
  ],
  "final_cta": {
    "headline": "Final urgency headline",
    "subheadline": "Last chance messaging",
    "cta_text": "Final CTA button text",
    "guarantee_text": "Risk reversal (e.g., '30-day money back guarantee')"
  }
}

Generate 4 pain points, 3 testimonials, 5-6 offer features, and 5 FAQs.`;
}

/**
 * Export funnel as copy-pasteable HTML sections
 */
export function exportFunnelAsHTML(funnel: GeneratedFunnel): string {
  return `<!-- ==========================================
     FUNNEL FOR: ${funnel.creator_name}
     NICHE: ${funnel.niche}
     Generated by CreatorPairing.com
     ========================================== -->

<!-- HERO SECTION -->
<section class="hero">
  <h1>${escapeHtml(funnel.headline)}</h1>
  <h2>${escapeHtml(funnel.subheadline)}</h2>
  <p>${escapeHtml(funnel.hero_section.hook_text)}</p>
  <a href="#offer" class="cta-button">${escapeHtml(funnel.hero_section.cta_text)}</a>
  <p class="cta-subtext">${escapeHtml(funnel.hero_section.cta_subtext)}</p>
</section>

<!-- PAIN POINTS -->
<section class="pain-points">
  <h2>${escapeHtml(funnel.pain_points.section_title)}</h2>
  ${funnel.pain_points.points.map(p => `
  <div class="pain-point">
    <h3>${escapeHtml(p.title)}</h3>
    <p>${escapeHtml(p.description)}</p>
  </div>`).join('')}
</section>

<!-- SOLUTION -->
<section class="solution">
  <h2>${escapeHtml(funnel.solution.title)}</h2>
  <p>${escapeHtml(funnel.solution.description)}</p>
  <ul>
    ${funnel.solution.bullet_points.map(bp => `<li>${escapeHtml(bp)}</li>`).join('\n    ')}
  </ul>
</section>

<!-- SOCIAL PROOF -->
<section class="testimonials">
  <h2>${escapeHtml(funnel.social_proof.section_title)}</h2>
  ${funnel.social_proof.testimonials.map(t => `
  <div class="testimonial">
    <p class="quote">"${escapeHtml(t.quote)}"</p>
    <p class="author">— ${escapeHtml(t.name)}</p>
    <p class="result">${escapeHtml(t.result)}</p>
  </div>`).join('')}
</section>

<!-- OFFER -->
<section id="offer" class="offer">
  <h2>${escapeHtml(funnel.offer.title)}</h2>
  <p>${escapeHtml(funnel.offer.description)}</p>
  ${funnel.offer.features.map(f => `
  <div class="feature">
    <h3>${escapeHtml(f.name)}</h3>
    <p>${escapeHtml(f.description)}</p>
  </div>`).join('')}
  <div class="pricing">
    <p class="anchor">${escapeHtml(funnel.offer.price_anchor)}</p>
    <p class="price">${escapeHtml(funnel.offer.actual_price)}</p>
  </div>
  <a href="#" class="cta-button">${escapeHtml(funnel.offer.cta_text)}</a>
  <p class="urgency">${escapeHtml(funnel.offer.urgency_text)}</p>
</section>

<!-- ABOUT -->
<section class="about">
  <h2>${escapeHtml(funnel.about_section.title)}</h2>
  <p>${escapeHtml(funnel.about_section.bio)}</p>
  <ul>
    ${funnel.about_section.credentials.map(c => `<li>${escapeHtml(c)}</li>`).join('\n    ')}
  </ul>
</section>

<!-- FAQ -->
<section class="faq">
  <h2>Frequently Asked Questions</h2>
  ${funnel.faq.map(f => `
  <div class="faq-item">
    <h3>${escapeHtml(f.question)}</h3>
    <p>${escapeHtml(f.answer)}</p>
  </div>`).join('')}
</section>

<!-- FINAL CTA -->
<section class="final-cta">
  <h2>${escapeHtml(funnel.final_cta.headline)}</h2>
  <p>${escapeHtml(funnel.final_cta.subheadline)}</p>
  <a href="#" class="cta-button">${escapeHtml(funnel.final_cta.cta_text)}</a>
  <p class="guarantee">${escapeHtml(funnel.final_cta.guarantee_text)}</p>
</section>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
