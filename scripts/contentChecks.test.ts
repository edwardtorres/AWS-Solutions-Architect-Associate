import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '../src/data/buildings.ts';
import { ROADS } from '../src/data/roads.ts';
import { BANNED_TERMS } from './banned-terms.ts';
import {
  checkOutline,
  diffOutline,
  diffServices,
  runOfflineChecks,
  type ContentInput,
  type OutlineDoc,
  type QueueEntry,
  type ServicesDoc,
} from './lib/contentChecks.ts';
import { parseDomain, parseIndex, parseServiceCategories } from './lib/parseGuide.ts';

const json = <T>(p: string): T => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8')) as T;
const outline = json<OutlineDoc>('./official-outline.json');
const services = json<ServicesDoc>('./official-services.json');
const queue = json<QueueEntry[]>('../content/needs-verification.json');
const base = (): ContentInput => ({
  outline: structuredClone(outline),
  services: structuredClone(services),
  buildings: structuredClone(BUILDINGS) as ContentInput['buildings'],
  roads: structuredClone(ROADS) as ContentInput['roads'],
  queue: structuredClone(queue),
  banned: BANNED_TERMS,
});

describe('check:content (offline)', () => {
  it('passes on the committed data', () => {
    expect(runOfflineChecks(base())).toEqual([]);
  });

  it('fails when the exam code drifts', () => {
    const i = base();
    i.outline.examCode = 'SAA-C04';
    expect(checkOutline(i.outline).join()).toMatch(/exam code/);
  });

  it('fails when a task is removed from the outline', () => {
    const i = base();
    i.outline.domains[2]?.tasks.pop();
    expect(runOfflineChecks(i).join('\n')).toMatch(/tasks per domain/);
  });

  it('fails when a bullet is unmapped', () => {
    const i = base();
    const b = (i.buildings as unknown as { bullets: string[] }[]).find((x) => x.bullets.length > 2);
    b?.bullets.pop();
    expect(runOfflineChecks(i).join('\n')).toMatch(/not mapped to any building/);
  });

  it('fails when a bullet is mapped twice', () => {
    const i = base();
    const mutable = i.buildings as unknown as { bullets: string[]; task: string | null }[];
    const first = mutable.find((x) => x.task === '1.1');
    const second = mutable.filter((x) => x.task === '1.1')[1];
    if (first && second) second.bullets.push(first.bullets[0] as string);
    expect(runOfflineChecks(i).join('\n')).toMatch(/mapped to 2 buildings/);
  });

  it('fails on a building with only one bullet', () => {
    const i = base();
    const b = (i.buildings as unknown as { bullets: string[] }[]).find((x) => x.bullets.length === 2);
    b?.bullets.pop();
    expect(runOfflineChecks(i).join('\n')).toMatch(/must be 2-5/);
  });

  it('fails on an out-of-scope service', () => {
    const i = base();
    (i.buildings as unknown as { services: string[] }[])[10]?.services.push('AWS CloudShell');
    expect(runOfflineChecks(i).join('\n')).toMatch(/out-of-scope service "AWS CloudShell"/);
  });

  it('fails on a service missing from the in-scope list', () => {
    const i = base();
    (i.buildings as unknown as { services: string[] }[])[10]?.services.push('AWS STS');
    expect(runOfflineChecks(i).join('\n')).toMatch(/not in the in-scope list/);
  });

  it('fails on a cyclic road', () => {
    const i = base();
    (i.roads as unknown as { from: string; to: string; reason: string }[]).push({ from: 'cold-cellar', to: 'freight-depot', reason: 'x'.repeat(30) });
    expect(runOfflineChecks(i).join('\n')).toMatch(/cycle/);
  });

  it('fails on an implied road', () => {
    const i = base();
    (i.roads as unknown as { from: string; to: string; reason: string }[]).push({ from: 'pillar-plaza', to: 'message-quay', reason: 'x'.repeat(30) });
    expect(runOfflineChecks(i).join('\n')).toMatch(/already implied/);
  });

  it('fails when a building is unreachable', () => {
    const i = base();
    (i.buildings as unknown as { id: string; name: string; district: string; task: string | null; bullets: string[]; families: string[]; services: string[] }[]).push({
      id: 'island-of-misfit-toys', name: 'Misfit', district: 'harbor', task: '2.1', bullets: [], families: ['compute'], services: [],
    });
    expect(runOfflineChecks(i).join('\n')).toMatch(/not reachable/);
  });

  it('fails on a sixth Foundation', () => {
    const i = base();
    const f = i.buildings.find((b) => b.task === null);
    (i.buildings as unknown[]).push({ ...f, id: 'extra-foundation', name: 'Extra' });
    (i.buildings as unknown[]).push({ ...f, id: 'extra-foundation-2', name: 'Extra 2' });
    expect(runOfflineChecks(i).join('\n')).toMatch(/limit is 5/);
  });

  it('fails on a banned term', () => {
    const i = base();
    i.banned = [{ term: 'Gatehouse', reason: 'test' }];
    expect(runOfflineChecks(i).join('\n')).toMatch(/banned term "Gatehouse"/);
  });

  it('fails when a source is outside the allowed list', () => {
    const i = base();
    const b = (i.buildings as unknown as { azure?: { sourceUrl: string | null }[] }[]).find((x) => x.azure?.some((a) => a.sourceUrl));
    const tag = b?.azure?.find((a) => a.sourceUrl);
    if (tag) tag.sourceUrl = 'https://example.com/aws-vs-azure';
    expect(runOfflineChecks(i).join('\n')).toMatch(/only learn\.microsoft\.com is allowed/);
  });

  it('requires a queue entry for unverified Azure tags', () => {
    const i = base();
    const b = (i.buildings as unknown as { azure?: { sourceUrl: string | null; status: string }[] }[]).find((x) => x.azure?.length);
    if (b?.azure?.[0]) {
      b.azure[0].sourceUrl = null;
      b.azure[0].status = 'needs-verification';
    }
    i.queue = [];
    expect(runOfflineChecks(i).join('\n')).toMatch(/unverified Azure tags/);
  });
});

describe('check:content --live diffing', () => {
  it('reports a bullet that changed on the live guide', () => {
    const live = structuredClone(outline);
    const bullet = live.domains[0]?.tasks[0]?.bullets[0];
    if (bullet) bullet.text += ' (revised)';
    const diff = diffOutline(outline, live);
    expect(diff.some((d) => d.includes('new on live guide'))).toBe(true);
    expect(diff.some((d) => d.includes('missing from live guide'))).toBe(true);
  });
  it('reports a new in-scope service', () => {
    const live = structuredClone(services);
    live.inScope.categories[0]?.services.push('Amazon Brand New');
    expect(diffServices(services, live).join()).toMatch(/Amazon Brand New/);
  });
  it('reports nothing when identical', () => {
    expect(diffOutline(outline, outline)).toEqual([]);
    expect(diffServices(services, services)).toEqual([]);
  });
});

describe('guide parser', () => {
  it('parses a domain page into tagged, numbered bullets', () => {
    const html = `<h1>Content Domain 9: Demo</h1>
      <h2>Task 9.1: Do things</h2>
      <p>Knowledge of:</p><div><ul class="itemizedlist"><li class="listitem"><p>Alpha  <b>one</b></p></li><li><p>Beta</p></li></ul></div>
      <p>Skills in:</p><ul class="itemizedlist"><li><p>Gamma&nbsp;two</p></li></ul>`;
    const d = parseDomain(html);
    expect(d.tasks[0]?.bullets).toEqual([
      { id: '9.1-K1', type: 'knowledge', text: 'Alpha one' },
      { id: '9.1-K2', type: 'knowledge', text: 'Beta' },
      { id: '9.1-S1', type: 'skill', text: 'Gamma two' },
    ]);
  });
  it('reads exam code and weights from the index page', () => {
    const html = `<h1>Guide (SAA-C03)</h1><ul class="itemizedlist"><li><p><a href="./d1.html">Content Domain 1: Design Secure Architectures (30% of scored content)</a></p></li></ul>`;
    const i = parseIndex(html);
    expect(i.examCode).toBe('SAA-C03');
    expect(i.domains[0]).toMatchObject({ id: 1, weightPercent: 30 });
  });
  it('parses service categories and skips the topic list', () => {
    const html = `<h1>In</h1><p>Intro text</p><div id="inline-topiclist"><h6>Topics</h6><ul><li><a href="#a">A</a></li></ul></div>
      <h2>Analytics</h2><ul class="itemizedlist"><li><p>Amazon Athena</p></li></ul>`;
    const s = parseServiceCategories(html);
    expect(s.categories).toEqual([{ name: 'Analytics', services: ['Amazon Athena'] }]);
  });
});
