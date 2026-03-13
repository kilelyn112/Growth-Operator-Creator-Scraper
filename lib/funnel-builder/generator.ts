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
  return `<!-- ==========================================
     CALL FUNNEL FOR: ${funnel.creator_name}
     NICHE: ${funnel.niche}
     Generated by CreatorPairing.com
     ========================================== -->

<!-- HERO SECTION -->
<section class="hero" style="text-align:center; padding:60px 20px;">
  <h1>${escapeHtml(funnel.headline)}</h1>
  <h2>${escapeHtml(funnel.subheadline)}</h2>
  <a href="#application" class="cta-button">${escapeHtml(funnel.hero_cta_text)}</a>
  <p class="cta-subtext">${escapeHtml(funnel.hero_cta_subtext)}</p>
</section>

<!-- VIDEO SECTION -->
<section class="video-section" style="text-align:center; padding:40px 20px;">
  <p>${escapeHtml(funnel.video_section.pre_video_text)}</p>
  <div class="video-placeholder" style="max-width:640px; margin:20px auto; background:#000; aspect-ratio:16/9; display:flex; align-items:center; justify-content:center; border-radius:8px;">
    <span style="color:#fff; font-size:48px;">&#9654;</span>
  </div>
  <p>${escapeHtml(funnel.video_section.post_video_text)}</p>
  <a href="#application" class="cta-button">${escapeHtml(funnel.hero_cta_text)}</a>
</section>

<!-- WHO THIS IS FOR -->
<section class="qualifiers" style="padding:40px 20px;">
  <h2>${escapeHtml(funnel.who_this_is_for.section_title)}</h2>
  <ul class="qualifier-list">
    ${funnel.who_this_is_for.qualifiers.map(q => `<li>&#10003; ${escapeHtml(q)}</li>`).join('\n    ')}
  </ul>
  ${funnel.who_this_is_for.disqualifiers.length > 0 ? `<ul class="disqualifier-list">
    ${funnel.who_this_is_for.disqualifiers.map(d => `<li>&#10007; ${escapeHtml(d)}</li>`).join('\n    ')}
  </ul>` : ''}
</section>

<!-- SOCIAL PROOF -->
<section class="testimonials" style="padding:40px 20px;">
  <h2>${escapeHtml(funnel.social_proof.section_title)}</h2>
  ${funnel.social_proof.testimonials.map(t => `
  <div class="testimonial">
    <p class="quote">&ldquo;${escapeHtml(t.quote)}&rdquo;</p>
    <p class="author">&mdash; ${escapeHtml(t.name)}</p>
    <p class="result">${escapeHtml(t.result)}</p>
  </div>`).join('')}
</section>

<!-- APPLICATION FORM -->
<section id="application" class="application" style="padding:40px 20px;">
  <h2>${escapeHtml(funnel.application.section_title)}</h2>
  <p>${escapeHtml(funnel.application.section_description)}</p>
  <form class="application-form" style="max-width:500px; margin:0 auto;">
    ${funnel.application.fields.map(f => {
      if (f.type === 'select' && f.options) {
        return `<div class="form-group">
      <label>${escapeHtml(f.label)}</label>
      <select>
        <option value="">${escapeHtml(f.placeholder)}</option>
        ${f.options.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('\n        ')}
      </select>
    </div>`;
      }
      if (f.type === 'textarea') {
        return `<div class="form-group">
      <label>${escapeHtml(f.label)}</label>
      <textarea placeholder="${escapeHtml(f.placeholder)}" rows="3"></textarea>
    </div>`;
      }
      return `<div class="form-group">
      <label>${escapeHtml(f.label)}</label>
      <input type="${f.type}" placeholder="${escapeHtml(f.placeholder)}" />
    </div>`;
    }).join('\n    ')}
    <button type="submit" class="cta-button">${escapeHtml(funnel.application.submit_text)}</button>
  </form>
</section>

<!-- ABOUT -->
<section class="about" style="padding:40px 20px;">
  <h2>${escapeHtml(funnel.about_section.title)}</h2>
  <p>${escapeHtml(funnel.about_section.bio)}</p>
  <ul>
    ${funnel.about_section.credentials.map(c => `<li>${escapeHtml(c)}</li>`).join('\n    ')}
  </ul>
</section>

<!-- FINAL CTA -->
<section class="final-cta" style="text-align:center; padding:60px 20px;">
  <h2>${escapeHtml(funnel.final_cta.headline)}</h2>
  <p>${escapeHtml(funnel.final_cta.subheadline)}</p>
  <a href="#application" class="cta-button">${escapeHtml(funnel.final_cta.cta_text)}</a>
</section>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
