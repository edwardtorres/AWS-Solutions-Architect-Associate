import { fetchPage } from './lib/pageCache.ts';
import { def } from '../src/puzzles/policy-court/def.ts';
import scenarios from '../content/puzzles/policy-court.ts';
import sources from '../content/sources.ts';
const norm=(t:string)=>t.replace(/\s+/g,' ').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").trim();
const want=new Set(['principal-identity','scp-no-principal','resource-wildcard','resource-wildcard-colon','cond-cidr','cond-ip-operators','cond-ip']);
for(const r of def.rules){ if(!want.has(r.id))continue;
 const src:any=(sources as any[]).find((x:any)=>x.id===r.src); const p=await fetchPage(src.url);
 const t=norm((p.text??'')+' '+(p.display??'')); console.log(r.id, t.includes(norm(r.quote))?'FOUND':'MISSING');}
for(const sc of scenarios as any[]){ if(!/-(003|008|009|015|017|020|024|026)$/.test(sc.id))continue;
 const e=def.evaluate(sc.data); console.log('\n##',sc.id,sc.title,'\n',JSON.stringify(e?.answer)); e?.trace.forEach((t:any)=>console.log('  ',t.rule,'|',t.note));}
console.log(scenarios.length);
