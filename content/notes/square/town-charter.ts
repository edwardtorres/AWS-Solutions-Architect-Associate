import type { BuildingNotes } from '../../../src/content/types.ts';
import { b, cue } from '../../helpers.ts';

const notes: BuildingNotes = {
  building: 'town-charter',
  overview: [
    b('The exam guide says distractors are generally plausible responses that match the content area, so more than one option can look reasonable. As a study habit, read the stem for the requirement that separates the options before you look at them.',
      'exam-guide', ['Distractors are generally plausible responses that match the content area.']),
    b('Know the two question formats. Multiple choice has one correct response and three distractors. Multiple response has two or more correct responses out of five or more options, so read for how many to select.',
      'exam-guide', ['Multiple choice: Has one correct response and three incorrect responses (distractors)', 'Multiple response: Has two or more correct responses out of five or more response options'],
      { allow: ['three'] }),
    b('Unanswered questions are scored as incorrect and there is no penalty for guessing, so always answer. Some questions on the exam do not count toward your score, and they are not identified.',
      'exam-guide', ['Unanswered questions are scored as incorrect; there is no penalty for guessing.', 'These unscored questions are not identified on the exam.']),
    b('The exam also asks you to review an existing solution and determine improvements, not only to design a new one. When a question describes a current architecture, the task can be to decide what to improve.',
      'exam-guide', ['Review existing solutions and determine improvements']),
  ],
  bullets: [],
  cues: [
    cue('least operational overhead / least administrative effort', 'a service where AWS runs the infrastructure for you, such as Lambda',
      b('AWS Lambda manages the underlying infrastructure for you, including server maintenance, capacity provisioning, scaling and patching. That is the kind of work "least operational overhead" asks you to avoid.',
        'lambda-welcome', ['Lambda automatically manages the underlying infrastructure – including server maintenance, capacity provisioning, scaling, and patching'])),
    cue('most cost-effective', 'the Cost optimization pillar: the lowest cost option that still meets every stated requirement',
      b('The Cost optimization pillar is about running systems to deliver business value at the lowest price point.',
        'waf-cost', ['run systems to deliver business value at the lowest price point'])),
    cue('highly available / fault tolerant / must keep working', 'the Reliability pillar',
      b('Reliability is a workload performing its intended function correctly and consistently when expected to.',
        'waf-reliability', ['perform its intended function correctly and consistently when it’s expected to'])),
    cue('secure / protect / restrict access', 'the Security pillar',
      b('Security is the ability to protect data, systems and assets.',
        'waf-security', ['the ability to protect data, systems, and assets'])),
    cue('scale / meet performance requirements as demand changes', 'the Performance efficiency pillar',
      b('Performance efficiency is about meeting performance requirements and keeping that efficiency as demand changes.',
        'waf-performance', ['to maintain that efficiency as demand changes and technologies evolve'])),
    cue('select TWO (or THREE)', 'multiple response: two or more correct answers',
      b('A multiple-response question has two or more correct responses out of five or more options.',
        'exam-guide', ['Multiple response: Has two or more correct responses out of five or more response options'])),
  ],
  examples: [],
  confuse: [],
};

export default notes;
