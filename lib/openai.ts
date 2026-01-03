import OpenAI from 'openai';
import { ChannelDetails, VideoDetails } from './youtube';

// Lazy initialization to avoid build-time errors
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export interface QualificationResult {
  qualified: boolean;
  reason: string;
}

const SYSTEM_PROMPT = `You are a helpful, intelligent assistant that analyzes YouTube channels to determine if they are relevant leads for my business. You help identify channels owned by online coaches, consultants, educators or experts who share or sell educational advice, courses, communities, coaching or some type of mentorship.`;

function buildUserPrompt(
  channel: ChannelDetails,
  videos: VideoDetails[],
  descriptionLinks?: string[]
): string {
  const videoExamples = videos
    .slice(0, 10)
    .map(
      (v, i) => `Video ${i} Title: ${v.title}\nVideo ${i} Description: ${v.description.slice(0, 500)}`
    )
    .join('\n\n');

  return `Your task is to analyze YouTube channels and decide if they are qualified leads for my business, and my outreach campaigns.

I want you to pay close attention to all sources of information: you will receive the channel's name, about section, video titles, video descriptions (some with links included), and channel's description links.

Use all this information to determine if the youtube channel owner is likely to offer or sell advice, courses, coaching, consulting, communities, or mentorship programs, which would make him qualified.

If you can identify any links in the video descriptions, channel's description links or channel's about section, to Skool, Whop, Patreon, Teachable, Kajabi, or any platform for communities/courses/coaching, that is a strong indicator of qualification (though it is not a strict requirement for qualification).

If you can identify words in the video descriptions, channel's description links or channel's about section, such as "mentorship", "coaching", "consulting", "learn", "apply to work with me", "my systems", or other words with similar meaning or intent, that is a strong indicator of qualification (though it is not a strict requirement for qualification).

---

Use the below information for your qualification process:

Channel Name: ${channel.title}

Channel About Section: ${channel.description}

Channel Links Section: ${descriptionLinks ? JSON.stringify(descriptionLinks) : 'N/A'}

Video Examples:

${videoExamples}

---

Qualification rules:

1. Be opportunity aware — Mark as qualified if there's reasonable evidence the YouTube channel involves someone who offers or sells advice, courses, coaching, communities, consulting, or mentorship. The goal is to find potentially monetized knowledge-based businesses, not to exclude channels and creators just because their offers or links aren't explicit or they don't seem to be actively selling. Also when applicable, feel free to include documentation channels. Channels that share knowledge, insights, or processes should be considered qualified if their content could be monetized or they could potentially sell their expertise.
2. If the content appears to be in a non-English language, mark it as not qualified. Disqualify the channel if non-English or non-Latin characters appear frequently in the titles, descriptions, or any other section of the channel.
3. If the channel seems to be primarily from or targeting audiences in developing / third-world countries (e.g. India, Pakistan, Bangladesh, Indonesia, Nigeria, Philippines, etc.), mark it as not qualified. African leads can be accepted.
4. Focus on creators who seem to target English-speaking business owners or professionals.
5. Do not disqualify solely due to disclaimers — Ignore phrases like "not financial advice," "for entertainment only," or similar disclaimers. These are common in monetized, educational, or professional niches.
6. Exclude (mark as not qualified):
- Channels that lack focus — If the channel appears to cover many unrelated topics or side hustles (e.g., random money-making ideas), mark as not qualified. Focus on creators with a clear educational niche.
- Podcast channels.
- Channels that represent or are centered around large, mainstream business influencer brands. These are creators or organizations with broad mass appeal, high production value, and large established audiences (examples include personalities like Alex Hormozi, Kevin O'Leary, Robert Kiyosaki, Gary Vaynerchuk, etc.)
- Channels such as government organizations, real academic institutions, certification bodies, compliance authorities, or regulatory organizations. Do not confuse these with personal brands that use terms like "school," "academy," or "university" in a marketing or coaching context — those can still be qualified.
- Channels owned or operated by prop trading firms themselves (e.g., funding companies). This does not apply to individual traders who simply mention or use prop firms.

---

Return two clean, separate JSON fields - one called "qualified" (true or false) - and one called "reason" (a short explanation with the first thing being, the name of the channel so I can identify who you're talking about).

Return only valid JSON with two top-level fields:

{
  "qualified": true or false,
  "reason": "string explaining why you made this decision"
}`;
}

export async function qualifyCreator(
  channel: ChannelDetails,
  videos: VideoDetails[],
  descriptionLinks?: string[]
): Promise<QualificationResult> {
  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(channel, videos, descriptionLinks) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { qualified: false, reason: 'No response from AI' };
    }

    const result = JSON.parse(content) as QualificationResult;
    return result;
  } catch (error) {
    console.error('OpenAI qualification error:', error);
    return {
      qualified: false,
      reason: `Error during qualification: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
