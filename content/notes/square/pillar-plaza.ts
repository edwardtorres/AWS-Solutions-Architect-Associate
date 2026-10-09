import type { BuildingNotes } from '../../../src/content/types.ts';
import { b, cue } from '../../helpers.ts';

const notes: BuildingNotes = {
  building: 'pillar-plaza',
  overview: [
    b('The exam is built on the {{term:well-architected-framework}}. The exam guide says it validates a candidate\'s ability to design solutions based on that framework, and that the candidate should be able to design architectures that are secure, resilient, high-performing and cost-optimized. Those four words are the four districts of this city.',
      'exam-guide',
      ["The exam validates a candidate's ability to design solutions based on the AWS Well-Architected Framework.",
       'Design architectures that are secure, resilient, high-performing, and cost-optimized'],
      { allow: ['four'] }),
    b('The framework has six {{term:pillar|pillars}}. Four line up with the exam domains: Security (the Citadel), Reliability (Harbor & Levees), Performance efficiency (the Express Quarter) and Cost optimization (the Treasury). Operational excellence and Sustainability are the other two pillars, and the exam guide does not give either of them a content domain of its own.',
      ['waf-pillars', 'exam-guide'],
      ['waf-pillars|the six pillars of operational excellence, security, reliability, performance efficiency, cost optimization, and sustainability',
       'exam-guide|Content Domain 1: Design Secure Architectures (30% of scored content)Content Domain 2: Design Resilient Architectures (26% of scored content)Content Domain 3: Design High-Performing Architectures (24% of scored content)Content Domain 4: Design Cost-Optimized Architectures (20% of scored content)'],
      { allow: ['four', 'two'] }),
    b('A study habit, not an AWS rule: when two answers both seem to work, ask which pillar the question\'s wording is about. The framework exists because, without a shared set of pillars, it can become challenging to build a system that delivers on your expectations and requirements.',
      'waf-pillars', ['it can become challenging to build a system that delivers on your expectations and requirements'],
      { allow: ['two'] }),
  ],
  bullets: [],
  cues: [
    cue('protect data, systems and assets', 'Security pillar (the Citadel)',
      b('The Security pillar is defined as the ability to protect data, systems, and assets.', 'waf-security',
        ['The Security pillar encompasses the ability to protect data, systems, and assets'])),
    cue('perform its intended function correctly and consistently', 'Reliability pillar (Harbor & Levees)',
      b('The Reliability pillar is about a workload performing its intended function correctly and consistently when it is expected to.', 'waf-reliability',
        ['The Reliability pillar encompasses the ability of a workload to perform its intended function correctly and consistently when it’s expected to.'])),
    cue('meet performance requirements as demand changes', 'Performance efficiency pillar (the Express Quarter)',
      b('The Performance efficiency pillar is about using resources efficiently to meet performance requirements and keeping that efficiency as demand changes.', 'waf-performance',
        ['the ability to use cloud resources efficiently to meet performance requirements, and to maintain that efficiency as demand changes and technologies evolve'])),
    cue('lowest price point', 'Cost optimization pillar (the Treasury)',
      b('The Cost Optimization pillar is about running systems to deliver business value at the lowest price point.', 'waf-cost',
        ['The Cost Optimization pillar includes the ability to run systems to deliver business value at the lowest price point.'])),
    cue('operating it at scale, with less team effort', 'Operational excellence pillar',
      b('The Operational excellence pillar covers organizing your team, designing your workload, operating it at scale, and evolving it over time.', 'waf-opex',
        ['best practices for organizing your team, designing your workload, operating it at scale, and evolving it over time'])),
  ],
  examples: [],
  confuse: [],
  azure: [
    {
      concept: 'Azure Well-Architected Review',
      aws: 'AWS Well-Architected Tool',
      mapping: b('If you have used the Azure Well-Architected Review, the AWS Well-Architected Tool is its counterpart: both let you evaluate a workload against a published set of pillars.',
        ['learn-hub', 'waf-tool'],
        ['learn-hub|Examine your workload through the lenses of reliability, security, cost management, operational excellence, and performance efficiency.',
         'waf-tool|the AWS Well-Architected Tool provides a trusted framework for you to evaluate your cloud architecture']),
      breaks: b('The lists of pillars differ. The Learn comparison names five lenses (reliability, security, cost management, operational excellence and performance efficiency), while the AWS framework names six and adds sustainability. Learn writes "cost management" where the AWS framework writes "cost optimization".',
        ['learn-hub', 'waf-pillars'],
        ['learn-hub|reliability, security, cost management, operational excellence, and performance efficiency',
         'waf-pillars|the six pillars of operational excellence, security, reliability, performance efficiency, cost optimization, and sustainability'],
        { allow: ['five'] }),
    },
  ],
};

export default notes;
