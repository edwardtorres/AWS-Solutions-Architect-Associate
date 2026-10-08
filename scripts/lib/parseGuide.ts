import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';

export const GUIDE_BASE = 'https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/';
export const CERT_PAGE = 'https://aws.amazon.com/certification/certified-solutions-architect-associate/';

export const GUIDE_PAGES = {
  index: `${GUIDE_BASE}solutions-architect-associate-03.html`,
  domain1: `${GUIDE_BASE}solutions-architect-associate-03-domain1.html`,
  domain2: `${GUIDE_BASE}solutions-architect-associate-03-domain2.html`,
  domain3: `${GUIDE_BASE}solutions-architect-associate-03-domain3.html`,
  domain4: `${GUIDE_BASE}solutions-architect-associate-03-domain4.html`,
  inScope: `${GUIDE_BASE}saa-03-in-scope-services.html`,
  outOfScope: `${GUIDE_BASE}saa-03-out-of-scope-services.html`,
  technologies: `${GUIDE_BASE}saa-technologies-concepts.html`,
  mentions: `${GUIDE_BASE}saa-service-mentions.html`,
} as const;
export type GuidePageKey = keyof typeof GUIDE_PAGES;

export type BulletType = 'knowledge' | 'skill';
export interface OutlineBullet {
  id: string;
  type: BulletType;
  text: string;
}
export interface OutlineTask {
  id: string;
  title: string;
  bullets: OutlineBullet[];
}
export interface OutlineDomain {
  id: number;
  name: string;
  weightPercent: number;
  sourceUrl: string;
  tasks: OutlineTask[];
}
export interface ServiceCategory {
  name: string;
  services: string[];
}

/** Collapse whitespace (including non-breaking spaces); text is otherwise verbatim. */
export function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

export function pageTitle(html: string): string {
  const $ = cheerio.load(html);
  return clean($('h1').first().text());
}

/** Exam-guide index page: version, domain list with weights, exam-content sentences. */
export function parseIndex(html: string) {
  const $ = cheerio.load(html);
  const heading = clean($('h1').first().text());
  const examCode = /\((SAA-C\d+)\)/.exec(heading)?.[1] ?? null;
  const domains: { id: number; name: string; weightPercent: number; href: string }[] = [];
  $('ul.itemizedlist li a').each((_, el) => {
    const text = clean($(el).text());
    const m = /^Content Domain (\d+): (.+?) \((\d+)% of scored content\)$/.exec(text);
    if (m) {
      domains.push({
        id: Number(m[1]),
        name: m[2] as string,
        weightPercent: Number(m[3]),
        href: $(el).attr('href') ?? '',
      });
    }
  });
  const paragraphs = $('p')
    .map((_, el) => clean($(el).text()))
    .get();
  const find = (needle: string) => paragraphs.find((p) => p.includes(needle)) ?? null;
  return {
    heading,
    examCode,
    domains,
    sentences: {
      scored: find('questions that affect your score'),
      unscored: find('unscored questions that do not affect your score'),
      scale: find('scaled score of 100'),
      compensatory: find('compensatory scoring model'),
    },
    responseTypes: $('#solutions-architect-associate-03-response-types')
      .nextUntil('h3')
      .find('ul > li')
      .map((_, el) => clean($(el).text()))
      .get(),
  };
}

/** Domain page: tasks with Knowledge/Skills bullets. */
export function parseDomain(html: string) {
  const $ = cheerio.load(html);
  const heading = clean($('h1').first().text());
  const hm = /^Content Domain (\d+): (.+)$/.exec(heading);
  const tasks: OutlineTask[] = [];
  $('h2').each((_, h2) => {
    const title = clean($(h2).text());
    const tm = /^Task (\d+\.\d+): (.+)$/.exec(title);
    if (!tm) return;
    const taskId = tm[1] as string;
    const counters = { knowledge: 0, skill: 0 };
    const bullets: OutlineBullet[] = [];
    let mode: BulletType | null = null;
    $(h2)
      .nextUntil('h2')
      .each((_, el) => {
        const $el = $(el);
        if ($el.is('p')) {
          const t = clean($el.text());
          if (/^Knowledge of:?$/.test(t)) mode = 'knowledge';
          else if (/^Skills in:?$/.test(t)) mode = 'skill';
          return;
        }
        const items = $el.is('ul') ? $el.children('li') : $el.find('ul > li');
        items.each((_, li) => {
          if (!mode) throw new Error(`List item before a Knowledge/Skills heading in task ${taskId}`);
          counters[mode] += 1;
          bullets.push({
            id: `${taskId}-${mode === 'knowledge' ? 'K' : 'S'}${counters[mode]}`,
            type: mode,
            text: clean($(li).text()),
          });
        });
      });
    tasks.push({ id: taskId, title: tm[2] as string, bullets });
  });
  return { domainId: hm ? Number(hm[1]) : null, name: hm ? (hm[2] as string) : heading, tasks };
}

/** Service pages: categories (h2) with bullet lists, plus intro text. */
export function parseServiceCategories(html: string) {
  const $ = cheerio.load(html);
  const intro = clean($('h1').first().nextAll('p').first().text());
  const categories: ServiceCategory[] = [];
  $('h2').each((_, h2) => {
    const name = clean($(h2).text());
    const services = $(h2)
      .nextUntil('h2')
      .find('ul > li')
      .map((_, li) => clean($(li).text()))
      .get();
    if (services.length > 0) categories.push({ name, services });
  });
  return { intro, categories };
}

/** Technologies & Concepts page: a single flat list. */
export function parseTechnologies(html: string) {
  const $ = cheerio.load(html);
  const intro = clean($('h1').first().nextAll('p').first().text());
  const items = $('ul.itemizedlist > li')
    .map((_, li) => clean($(li).text()))
    .get();
  return { intro, items };
}

/** Mentions page: the note on short service names. */
export function parseMentions(html: string) {
  const $ = cheerio.load(html);
  const paragraphs = $('h1')
    .first()
    .nextAll('p')
    .map((_, p) => clean($(p).text()))
    .get();
  const bullets = $('ul.itemizedlist > li')
    .map((_, li) => clean($(li).text()))
    .get();
  return { paragraphs, bullets };
}

/** Certification page: facts are embedded in JSON ("itemHeading"/"itemLongLoc"). */
export function parseCertPage(html: string) {
  const facts: Record<string, string> = {};
  const re = /"itemHeading":"([^"]+)","itemLongLoc":"((?:[^"\\]|\\.)*)"/g;
  for (const m of html.matchAll(re)) {
    const heading = m[1] as string;
    const raw = JSON.parse(`"${m[2] as string}"`) as string;
    const text = clean(cheerio.load(raw).text());
    if (heading === 'Exam duration' || heading === 'Exam format') facts[heading] = text;
  }
  return facts;
}

export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': 'saa-region-builder-content-check' } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.text();
}
