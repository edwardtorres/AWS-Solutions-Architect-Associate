/**
 * Regenerates scripts/official-outline.json and scripts/official-services.json
 * from the live SAA-C03 exam guide. Stops (non-zero exit) if the guide is not
 * SAA-C03 or the domain/task counts differ from what the app was designed for.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  CERT_PAGE,
  GUIDE_PAGES,
  fetchText,
  parseCertPage,
  parseDomain,
  parseIndex,
  parseMentions,
  parseServiceCategories,
  parseTechnologies,
  sha256,
  type GuidePageKey,
} from './lib/parseGuide.ts';
import { EXPECTED } from './lib/expected.ts';

const out = (name: string) => fileURLToPath(new URL(`./${name}`, import.meta.url));

export interface Fetched {
  html: Record<GuidePageKey, string>;
  cert: string;
}

export async function fetchAll(): Promise<Fetched> {
  const keys = Object.keys(GUIDE_PAGES) as GuidePageKey[];
  const htmls = await Promise.all(keys.map((k) => fetchText(GUIDE_PAGES[k])));
  const html = Object.fromEntries(keys.map((k, i) => [k, htmls[i]])) as Record<GuidePageKey, string>;
  return { html, cert: await fetchText(CERT_PAGE) };
}

/** Builds both data documents from fetched HTML (no timestamps, so it is diffable). */
export function buildDocuments(f: Fetched) {
  const index = parseIndex(f.html.index);
  const domainKeys = ['domain1', 'domain2', 'domain3', 'domain4'] as const;
  const domains = domainKeys.map((key, i) => {
    const parsed = parseDomain(f.html[key]);
    const meta = index.domains.find((d) => d.id === i + 1);
    if (!meta) throw new Error(`Index page has no domain ${i + 1}`);
    return {
      id: meta.id,
      name: meta.name,
      weightPercent: meta.weightPercent,
      sourceUrl: GUIDE_PAGES[key],
      tasks: parsed.tasks,
    };
  });
  const cert = parseCertPage(f.cert);

  const outline = {
    examCode: index.examCode,
    guideTitle: index.heading,
    sources: Object.fromEntries(
      (['index', ...domainKeys] as const).map((k) => [k, { url: GUIDE_PAGES[k], sha256: sha256(JSON.stringify(k === 'index' ? index : parseDomain(f.html[k]))) }]),
    ),
    examFacts: {
      guide: {
        sourceUrl: GUIDE_PAGES.index,
        scored: index.sentences.scored,
        unscored: index.sentences.unscored,
        scale: index.sentences.scale,
        compensatory: index.sentences.compensatory,
        responseTypes: index.responseTypes,
      },
      certificationPage: { sourceUrl: CERT_PAGE, ...cert },
    },
    domains,
  };

  const inScope = parseServiceCategories(f.html.inScope);
  const outOfScope = parseServiceCategories(f.html.outOfScope);
  const tech = parseTechnologies(f.html.technologies);
  const mentions = parseMentions(f.html.mentions);
  const services = {
    examCode: index.examCode,
    inScope: { sourceUrl: GUIDE_PAGES.inScope, intro: inScope.intro, categories: inScope.categories },
    outOfScope: { sourceUrl: GUIDE_PAGES.outOfScope, intro: outOfScope.intro, categories: outOfScope.categories },
    technologiesAndConcepts: { sourceUrl: GUIDE_PAGES.technologies, intro: tech.intro, items: tech.items },
    shortServiceNames: { sourceUrl: GUIDE_PAGES.mentions, paragraphs: mentions.paragraphs, bullets: mentions.bullets },
    sha256: {
      inScope: sha256(JSON.stringify(inScope)),
      outOfScope: sha256(JSON.stringify(outOfScope)),
      technologies: sha256(JSON.stringify(tech)),
      mentions: sha256(JSON.stringify(mentions)),
    },
  };
  return { outline, services };
}

/** Structural stop conditions from the brief. Returns human-readable problems. */
export function structuralProblems(outline: ReturnType<typeof buildDocuments>['outline']): string[] {
  const problems: string[] = [];
  if (outline.examCode !== EXPECTED.examCode) problems.push(`Exam code is ${String(outline.examCode)}, expected ${EXPECTED.examCode}`);
  if (outline.domains.length !== EXPECTED.domains) problems.push(`Found ${outline.domains.length} domains, expected ${EXPECTED.domains}`);
  const tasksPerDomain = outline.domains.map((d) => d.tasks.length);
  if (JSON.stringify(tasksPerDomain) !== JSON.stringify(EXPECTED.tasksPerDomain)) {
    problems.push(`Tasks per domain ${JSON.stringify(tasksPerDomain)}, expected ${JSON.stringify(EXPECTED.tasksPerDomain)}`);
  }
  const weights = outline.domains.map((d) => d.weightPercent);
  if (JSON.stringify(weights) !== JSON.stringify(EXPECTED.weights)) {
    problems.push(`Weights ${JSON.stringify(weights)}, expected ${JSON.stringify(EXPECTED.weights)}`);
  }
  return problems;
}

async function main() {
  const fetched = await fetchAll();
  const { outline, services } = buildDocuments(fetched);
  const problems = structuralProblems(outline);
  if (problems.length > 0) {
    console.error('STOP: the live exam guide differs from the structure this app was designed for:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(2);
  }
  const retrievedAt = new Date().toISOString().slice(0, 10);
  writeFileSync(out('official-outline.json'), `${JSON.stringify({ retrievedAt, ...outline }, null, 2)}\n`);
  writeFileSync(out('official-services.json'), `${JSON.stringify({ retrievedAt, ...services }, null, 2)}\n`);
  const bullets = outline.domains.flatMap((d) => d.tasks.flatMap((t) => t.bullets));
  console.log(`Wrote official-outline.json (${outline.domains.length} domains, ${outline.domains.reduce((n, d) => n + d.tasks.length, 0)} tasks, ${bullets.length} bullets)`);
  console.log(`Wrote official-services.json (${services.inScope.categories.reduce((n, c) => n + c.services.length, 0)} in-scope, ${services.outOfScope.categories.reduce((n, c) => n + c.services.length, 0)} out-of-scope entries)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
