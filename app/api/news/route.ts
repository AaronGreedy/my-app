import { NextRequest } from 'next/server';

export const runtime = 'edge';
export const revalidate = 900; // 15 min

interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: number; // epoch ms
  description: string;
}

interface Feed {
  source: string;
  url: string;
}

const FEEDS: Feed[] = [
  { source: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { source: 'The Verge',     url: 'https://www.theverge.com/rss/index.xml' },
  { source: 'Hacker News',   url: 'https://hnrss.org/frontpage?points=150' },
  { source: 'Smashing',      url: 'https://www.smashingmagazine.com/feed/' },
];

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pick(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? decodeEntities(m[1]) : '';
}

function pickAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["'][^>]*\\/?>`, 'i');
  const m = xml.match(re);
  return m ? m[1] : '';
}

function parseItems(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const isAtom = /<feed[^>]*>/i.test(xml);
  const tag = isAtom ? 'entry' : 'item';
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');

  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) && items.length < 20) {
    const block = m[1];
    const title = pick(block, 'title');
    let link = pick(block, 'link');
    if (!link && isAtom) link = pickAttr(block, 'link', 'href');
    const dateStr = pick(block, 'pubDate') || pick(block, 'published') || pick(block, 'updated');
    const description = pick(block, 'description') || pick(block, 'summary') || pick(block, 'content');

    if (!title || !link) continue;
    const pubDate = dateStr ? Date.parse(dateStr) : Date.now();
    items.push({
      title,
      link,
      source,
      pubDate: isNaN(pubDate) ? Date.now() : pubDate,
      description: description.slice(0, 220),
    });
  }
  return items;
}

async function fetchFeed(feed: Feed): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 PersonalGrowthApp/1.0' },
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseItems(xml, feed.source);
  } catch {
    return [];
  }
}

async function translateTitlesIT(items: NewsItem[]): Promise<NewsItem[]> {
  const key = process.env.CEREBRAS_API_KEY;
  if (!key || items.length === 0) return items;
  try {
    const list = items.map((it, i) => `${i + 1}. ${it.title}`).join('\n');
    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'qwen-3-235b-a22b-instruct-2507',
        messages: [
          { role: 'system', content: 'Translate the following English news headlines to natural Italian. Keep them tight and idiomatic. Output ONLY a JSON array of strings, same order, same length, nothing else. No code fences, no commentary.' },
          { role: 'user', content: list },
        ],
        temperature: 0.2,
        max_tokens: 2048,
      }),
    });
    if (!res.ok) return items;
    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? '';
    const m = raw.match(/\[[\s\S]*\]/);
    if (!m) return items;
    const arr = JSON.parse(m[0]) as unknown;
    if (!Array.isArray(arr) || arr.length !== items.length) return items;
    return items.map((it, i) => ({
      ...it,
      title: typeof arr[i] === 'string' && (arr[i] as string).trim() ? (arr[i] as string).trim() : it.title,
    }));
  } catch {
    return items;
  }
}

export async function GET(_req: NextRequest) {
  const all = await Promise.all(FEEDS.map(fetchFeed));
  const merged = all.flat()
    .sort((a, b) => b.pubDate - a.pubDate)
    .slice(0, 30);

  const translated = await translateTitlesIT(merged);

  return Response.json({ items: translated }, {
    headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' },
  });
}
