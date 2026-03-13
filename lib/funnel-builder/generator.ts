/**
 * Funnel Generator — Generates call booking / application funnel outlines
 *
 * Structure: Headline → Subheadline → Video placeholder → Apply CTA →
 * Who this is for → Social proof → Application form → About → Final CTA
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
  hero_cta_text: string;
  hero_cta_subtext: string;
  video_section: {
    pre_video_text: string;
    post_video_text: string;
  };
  who_this_is_for: {
    section_title: string;
    qualifiers: string[];
    disqualifiers: string[];
  };
  social_proof: {
    section_title: string;
    testimonials: { name: string; result: string; quote: string }[];
  };
  application: {
    section_title: string;
    section_description: string;
    fields: { label: string; type: 'text' | 'email' | 'phone' | 'select' | 'textarea'; placeholder: string; options?: string[] }[];
    submit_text: string;
  };
  about_section: {
    title: string;
    bio: string;
    credentials: string[];
  };
  final_cta: {
    headline: string;
    subheadline: string;
    cta_text: string;
  };
}

const FUNNEL_SYSTEM_PROMPT = `You are an elite funnel architect who builds high-converting call booking / application funnels. NOT course sales pages. NOT product pages.

You build funnels that get prospects to APPLY and BOOK A CALL. The structure is simple and proven:
- Strong qualifying headline
- Short VSL / video section
- "Apply Now" CTA
- Who this is for (qualify the prospect)
- Social proof / results
- Short application form
- About the mentor
- Final CTA

Your copy is:
- Direct and confident, not salesy or hype-y
- Qualifying — makes the prospect feel like THEY need to earn the spot
- Specific to the creator's niche and voice
- Focused on results and transformation, not features

NEVER include pricing, course features, "enroll now", money-back guarantees, or product sales language. This is a CALL FUNNEL.

Return structured JSON.`;

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
  return `Build a complete CALL BOOKING / APPLICATION FUNNEL for this creator. This is NOT a course sales page. The goal is to get qualified prospects to apply and book a call.

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

Generate a call funnel with these sections. Every piece of copy should be SPECIFIC to this creator. Match their tone and use their niche language.

Return JSON:

{
  "headline": "The main qualifying headline — should call out who this is for and hint at the transformation. Example tone: 'Want to scale your Amazon FBA business to 7 figures?' or 'Ready to build a real estate portfolio that replaces your income?'",
  "subheadline": "Supporting line — adds credibility or specificity. Example: 'Learn the exact system I used to generate $2M in revenue'",
  "hero_cta_text": "Primary CTA button text (e.g., 'Apply Now', 'Book Your Free Call', 'See If You Qualify')",
  "hero_cta_subtext": "Text below the button (e.g., 'Limited spots available' or 'Free strategy session')",
  "video_section": {
    "pre_video_text": "Short text above the video placeholder (e.g., 'Watch this short video to see if this is right for you')",
    "post_video_text": "Text below the video pushing them to apply (e.g., 'If this resonated with you, apply below')"
  },
  "who_this_is_for": {
    "section_title": "Section headline (e.g., 'This Is For You If...')",
    "qualifiers": ["5-6 qualifying statements that describe their ideal client. Start each with 'You...' — e.g., 'You're already making $5K/month and want to scale'"],
    "disqualifiers": ["3-4 disqualifying statements. Start each with 'This is NOT for you if...' — e.g., 'This is NOT for you if you're looking for a get-rich-quick scheme'"]
  },
  "social_proof": {
    "section_title": "Social proof headline (e.g., 'Results From Our Clients')",
    "testimonials": [
      { "name": "Realistic first name", "result": "Specific measurable result (e.g., 'Went from $3K to $15K/month in 90 days')", "quote": "A short realistic quote about their experience" }
    ]
  },
  "application": {
    "section_title": "Application section headline (e.g., 'Apply For Your Free Strategy Call')",
    "section_description": "1-2 sentences explaining what happens after they apply (e.g., 'Fill out the short application below and if you qualify, we will reach out to schedule your free strategy call.')",
    "fields": [
      { "label": "Full Name", "type": "text", "placeholder": "Your full name" },
      { "label": "Email", "type": "email", "placeholder": "your@email.com" },
      { "label": "Phone Number", "type": "phone", "placeholder": "(555) 000-0000" },
      { "label": "A qualifying question specific to their niche", "type": "select", "placeholder": "Select one", "options": ["Option 1", "Option 2", "Option 3", "Option 4"] },
      { "label": "Another qualifying question", "type": "textarea", "placeholder": "Tell us about..." }
    ],
    "submit_text": "Submit Application"
  },
  "about_section": {
    "title": "About section headline (e.g., 'Who Is [Name]?')",
    "bio": "3-4 sentences written in third person about the creator — their journey, results, and why they mentor",
    "credentials": ["4-5 specific credentials or proof points"]
  },
  "final_cta": {
    "headline": "Final push headline (e.g., 'Ready To Take The Next Step?')",
    "subheadline": "Final supporting line creating urgency without being sleazy",
    "cta_text": "Final CTA button text (e.g., 'Apply Now')"
  }
}

Generate 3 testimonials and 5 application form fields (including 1-2 qualifying questions specific to their niche as select or textarea fields).`;
}

/**
 * Export funnel as copy-pasteable HTML
 */
export function exportFunnelAsHTML(funnel: GeneratedFunnel): string {
  return `<!-- CALL FUNNEL FOR: ${funnel.creator_name} | Generated by CreatorPairing.com -->
<style>
  .funnel-page { font-family: 'Poppins', 'Montserrat', Arial, sans-serif; color: #111; margin: 0; padding: 0; }
  .funnel-page * { box-sizing: border-box; }
  .funnel-section { max-width: 700px; margin: 0 auto; padding: 40px 20px; text-align: center; }
  .funnel-page h1 { font-size: 2.5rem; font-weight: 900; line-height: 1.15; margin: 0 0 12px; }
  .funnel-page h2 { font-size: 1.5rem; font-weight: 700; margin: 0 0 8px; }
  .funnel-page p { color: #666; margin: 0 0 8px; }
  .funnel-cta { display: inline-block; background: #7ed956; color: #fff; font-size: 1.2rem; font-weight: 700; padding: 16px 40px; border-radius: 8px; text-decoration: none; box-shadow: 0 8px 24px -8px rgba(126,217,86,0.5); margin-top: 16px; }
  .funnel-cta:hover { filter: brightness(1.1); }
  .funnel-video { max-width: 600px; margin: 20px auto; background: #000; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; border-radius: 8px; }
  .funnel-video span { color: #fff; font-size: 48px; }
  .funnel-form { max-width: 480px; margin: 0 auto; text-align: left; }
  .funnel-form label { display: block; font-size: 0.85rem; font-weight: 600; color: #333; margin-bottom: 4px; }
  .funnel-form input, .funnel-form select, .funnel-form textarea { width: 100%; padding: 12px 16px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.9rem; margin-bottom: 16px; font-family: inherit; }
  .funnel-form button { width: 100%; background: #7ed956; color: #fff; font-size: 1.1rem; font-weight: 700; padding: 16px; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 8px 24px -8px rgba(126,217,86,0.5); }
  .funnel-testimonials { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 700px; margin: 0 auto; }
  .funnel-testimonial { background: #f9f9f9; border: 1px solid #eee; border-radius: 12px; padding: 20px; text-align: left; }
  .funnel-testimonial .quote { font-size: 0.9rem; color: #333; margin-bottom: 12px; }
  .funnel-testimonial .name { font-weight: 700; font-size: 0.85rem; color: #111; margin: 0; }
  .funnel-testimonial .result { font-size: 0.8rem; color: #7ed956; font-weight: 600; margin: 2px 0 0; }
  @media (max-width: 600px) {
    .funnel-page h1 { font-size: 1.8rem; }
    .funnel-testimonials { grid-template-columns: 1fr; }
  }
</style>

<div class="funnel-page">
  <!-- HERO -->
  <div class="funnel-section" style="padding-top:56px; padding-bottom:32px;">
    <h1>${escapeHtml(funnel.headline)}</h1>
    <p style="font-size:1.1rem;">${escapeHtml(funnel.subheadline)}</p>
    <p style="font-size:0.85rem; color:#999;">${escapeHtml(funnel.hero_cta_subtext)}</p>
    <a href="#application" class="funnel-cta">${escapeHtml(funnel.hero_cta_text)}</a>
  </div>

  <!-- STEP 1: VIDEO -->
  <div class="funnel-section">
    <h2>Step 1: Watch The Video</h2>
    <p>${escapeHtml(funnel.video_section.pre_video_text)}</p>
    <div class="funnel-video"><span>&#9654;</span></div>
    <p>${escapeHtml(funnel.video_section.post_video_text)}</p>
  </div>

  <!-- STEP 2: APPLICATION -->
  <div class="funnel-section" id="application">
    <h2>Step 2: Apply Below</h2>
    <p style="font-size:0.9rem;">${escapeHtml(funnel.application.section_description)}</p>
    <form class="funnel-form" style="margin-top:24px;">
      ${funnel.application.fields.map(f => {
        if (f.type === 'select' && f.options) {
          return `<label>${escapeHtml(f.label)}</label>
      <select><option value="">${escapeHtml(f.placeholder)}</option>${f.options.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}</select>`;
        }
        if (f.type === 'textarea') {
          return `<label>${escapeHtml(f.label)}</label>
      <textarea placeholder="${escapeHtml(f.placeholder)}" rows="3"></textarea>`;
        }
        return `<label>${escapeHtml(f.label)}</label>
      <input type="${f.type}" placeholder="${escapeHtml(f.placeholder)}" />`;
      }).join('\n      ')}
      <button type="submit">${escapeHtml(funnel.application.submit_text)}</button>
    </form>
  </div>

  <!-- TESTIMONIALS -->
  <div class="funnel-section">
    <h2>${escapeHtml(funnel.social_proof.section_title)}</h2>
    <div class="funnel-testimonials" style="margin-top:24px;">
      ${funnel.social_proof.testimonials.map(t => `<div class="funnel-testimonial">
        <p class="quote">&ldquo;${escapeHtml(t.quote)}&rdquo;</p>
        <p class="name">${escapeHtml(t.name)}</p>
        <p class="result">${escapeHtml(t.result)}</p>
      </div>`).join('\n      ')}
    </div>
  </div>
</div>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
