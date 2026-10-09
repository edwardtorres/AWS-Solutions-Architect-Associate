import type { Question } from '../../../src/content/types.ts';
import { mc, mr } from '../helpers.ts';

const questions: Question[] = [
  mc({
    id: 'pillar-plaza-001',
    building: 'pillar-plaza',
    d: 1,
    stem: 'After a recent outage, a payments company starts a Well-Architected review. The reviewers want to focus on whether the workload performs its intended function correctly and consistently when customers expect it, including how it is operated and tested through its lifecycle. Which pillar is the BEST match for this focus?',
    correct: ['Reliability', 'The Reliability pillar is defined as the ability of a workload to perform its intended function correctly and consistently when it is expected to, including operating and testing it through its lifecycle.'],
    wrong: [
      ['Security', 'The Security pillar is about protecting data, systems and assets. It does not describe consistent correct function when users expect it.'],
      ['Performance efficiency', 'This pillar is about using cloud resources efficiently to meet performance requirements as demand changes, not about correct and consistent function after failures.'],
      ['Cost optimization', 'This pillar is about running systems to deliver business value at the lowest price point, which is not the focus described.'],
    ],
    slot: 0,
    evidence: [
      'waf-reliability|The Reliability pillar encompasses the ability of a workload to perform its intended function correctly and consistently when it’s expected to.',
      'waf-reliability|This includes the ability to operate and test the workload through its total lifecycle.',
    ],
  }),
  mc({
    id: 'pillar-plaza-002',
    building: 'pillar-plaza',
    d: 2,
    stem: 'A company runs development and test environments on Amazon EC2 around the clock, although developers use them only during the work week. The architecture review board wants a change that follows the Cost Optimization design principles with the LEAST effort spent on forecasting. Which action is the BEST fit?',
    correct: ['Stop the environments when they are not in use and start them again when needed', 'Adopting a consumption model means paying only for the compute you need and changing usage with business requirements, and the framework gives stopping unused environments as the example.'],
    wrong: [
      ['Buy capacity for the expected peak of the year and keep it running continuously', 'This relies on forecasting and pays for idle capacity, which is the opposite of a consumption model.'],
      ['Add a standby copy of each environment in a second Availability Zone', 'This targets resilience and adds running resources, so it does not reduce cost.'],
      ['Move every environment to the largest instance size to finish test runs sooner', 'A larger size may help speed, but the environments still run when nobody uses them and the cost grows.'],
    ],
    slot: 1,
    evidence: [
      'waf-cost-dp|Pay only for the computing resources that you require and increase or decrease usage depending on business requirements, not by using elaborate forecasting.',
      'waf-cost-dp|You can stop these resources when they are not in use',
    ],
  }),
  mc({
    id: 'pillar-plaza-003',
    building: 'pillar-plaza',
    d: 2,
    stem: 'A company runs a fleet of Amazon EC2 instances that average low CPU utilization all day. A new sustainability goal asks the team to reduce the energy the workload needs. Which action BEST follows the Sustainability design principles?',
    correct: ['Right-size the instances and use EC2 Auto Scaling so fewer, busier instances match demand', 'Right-sizing and raising utilization reduces idle resources and the total energy needed to power the workload.'],
    wrong: [
      ['Keep the current fleet and add the same number of idle instances as spare capacity', 'More idle resources increase the energy needed, which works against maximizing utilization.'],
      ['Provision the fleet for the highest yearly peak and leave it fixed in size', 'A fixed peak-sized fleet keeps utilization low, so it does not reduce idle capacity.'],
      ['Run a full duplicate of the fleet in a second Region at all times', 'A permanently running duplicate doubles the idle resources, so it fails the goal of reducing energy.'],
    ],
    slot: 2,
    evidence: [
      'waf-sus-dp|Right-size workloads and implement efficient design to verify high utilization and maximize the energy efficiency of the underlying hardware.',
      'waf-sus-dp|At the same time, reduce or minimize idle resources, processing, and storage to reduce the total energy required to power your workload.',
      'waf-sustainability|The Sustainability pillar focuses on environmental impacts, especially energy consumption and efficiency, since they are important levers for architects to inform direct action to reduce resource usage.',
    ],
  }),
  mr({
    id: 'pillar-plaza-004',
    building: 'pillar-plaza',
    d: 2,
    tags: [],
    stem: 'A security architect is reviewing a new workload against the Security pillar design principles. Which TWO changes BEST align with those principles? (Choose two.)',
    correct: [
      ['Centralize identity management and stop relying on long-term static credentials', 'Centralized identity and the removal of long-term static credentials are part of a strong identity foundation.'],
      ['Apply several security controls at the network edge, the VPC, the load balancer and each instance', 'A defense in depth approach applies multiple controls at every layer instead of one boundary.'],
    ],
    wrong: [
      ['Give developers direct access to production data so they can fix issues faster', 'The principle is to keep people away from data and reduce direct access or manual processing, so this raises risk.'],
      ['Rely on one perimeter firewall as the only control', 'A single control at one layer fails the principle of applying security at all layers.'],
      ['Turn off activity logging to reduce noise', 'The principle is to maintain traceability by monitoring, alerting and auditing actions, so this removes visibility.'],
      ['Review configuration by hand once a year', 'The principle is to automate security best practices so controls scale, which an annual manual review does not do.'],
    ],
    slots: [0, 3],
    evidence: [
      'waf-sec-dp|Centralize identity management, and aim to eliminate reliance on long-term static credentials.',
      'waf-sec-dp|Apply a defense in depth approach with multiple security controls.',
    ],
  }),
  mc({
    id: 'pillar-plaza-005',
    building: 'pillar-plaza',
    d: 2,
    stem: 'A company serves its web application from one very large Amazon EC2 instance. Every failure or reboot takes the whole site down. The reviewers want a design change that follows the Reliability design principles. Which solution is the BEST fit?',
    correct: ['Replace the instance with several smaller instances in an Auto Scaling group behind a load balancer', 'Spreading requests across multiple smaller resources reduces the impact of a single failure on the overall workload.'],
    wrong: [
      ['Move the application to the largest available instance size', 'One bigger instance is still a single point of failure, so a failure still takes the site down.'],
      ['Attach additional EBS volumes to the existing instance', 'More volumes add storage, not a second compute resource, so the instance remains a single point of failure.'],
      ['Take a manual snapshot of the instance every week', 'Snapshots help recovery, but the site still goes down on every failure and recovery is manual.'],
    ],
    slot: 3,
    evidence: [
      'waf-rel-dp|Replace one large resource with multiple small resources to reduce the impact of a single failure on the overall workload.',
      'waf-rel-dp|Distribute requests across multiple, smaller resources to verify that they don’t share a common point of failure.',
    ],
  }),
  mc({
    id: 'pillar-plaza-006',
    building: 'pillar-plaza',
    d: 3,
    stem: 'A team ships one large manual release every month. When a release fails, reversing it takes hours and affects many components. Management wants to reduce the blast radius of changes and speed up recovery, in line with the Operational excellence design principles. Which approach BEST meets these requirements?',
    correct: ['Define the workload as code and deploy small, incremental changes through automation', 'Smaller incremental changes with automated deployment reduce the blast radius and allow faster reversal when a failure occurs.'],
    wrong: [
      ['Combine several months of changes into one larger quarterly release', 'Larger batches widen the blast radius and make reversal harder, which fails both requirements.'],
      ['Add a second manual approval step before each monthly release', 'An extra approval adds delay but the release stays large and manual, so a failure still affects many components.'],
      ['Deploy the monthly release to a second Availability Zone as well', 'A second zone adds capacity for failure of a zone, but a faulty release is still large and slow to reverse.'],
    ],
    slot: 0,
    evidence: [
      'waf-oe-dp|Automated deployment techniques together with smaller, incremental changes reduces the blast radius and allows for faster reversal when failures occur.',
      'waf-oe-dp|You can define your entire workload and its operations (applications, infrastructure, configuration, and procedures) as code, and update it.',
    ],
  }),
  mc({
    id: 'pillar-plaza-007',
    building: 'pillar-plaza',
    d: 1,
    stem: 'A company wants to evaluate its workload architecture against the pillars of the Well-Architected Framework from the AWS Management Console, then save milestones and track improvements over time, with the LEAST custom tooling. Which AWS service should the company use?',
    correct: ['AWS Well-Architected Tool', 'The tool provides a framework for evaluating a cloud architecture in the console and lets you save point-in-time milestones and track changes to measure progress.'],
    wrong: [
      ['AWS Config', 'AWS Config records and evaluates resource configurations against rules, but it does not run a pillar-based architecture review.'],
      ['Amazon Inspector', 'Amazon Inspector scans workloads for vulnerabilities, which is not an architecture review against the pillars.'],
      ['AWS CloudTrail', 'AWS CloudTrail records account activity and API calls, so it does not evaluate an architecture or track improvement milestones.'],
    ],
    slot: 1,
    evidence: [
      'waf-tool|Available in the AWS Management Console, the AWS Well-Architected Tool provides a trusted framework for you to evaluate your cloud architecture and implement designs that will scale over time.',
      'waf-tool|Save point-in-time milestones, implement improvements, and track changes to measure progress.',
    ],
  }),
  mc({
    id: 'pillar-plaza-008',
    building: 'pillar-plaza',
    d: 2,
    stem: 'A small IT team needs a NoSQL database for a new product but has no experience operating one. The team wants to focus on product development rather than provisioning and managing resources. Which approach BEST follows the Performance efficiency design principles?',
    correct: ['Consume NoSQL as a managed service with Amazon DynamoDB', 'The principle is to democratize advanced technologies by consuming them as a service, so the team focuses on the product instead of running the database.'],
    wrong: [
      ['Install and operate a NoSQL database cluster on Amazon EC2 instances', 'The team would have to learn, host and run the technology itself, which is what the principle says to avoid.'],
      ['Send the team on training so it can run a self-managed cluster on premises', 'This keeps the operational burden with the team and delays the product, so it does not meet the requirement.'],
      ['Place the database on the largest memory-optimized Amazon EC2 instance available', 'A bigger instance does nothing about the lack of operating expertise, so the team still manages the database.'],
    ],
    slot: 2,
    evidence: [
      'waf-perf-dp|Rather than asking your IT team to learn about hosting and running a new technology, consider consuming the technology as a service.',
      'waf-perf-dp|In the cloud, these technologies become services that your team can consume, permitting your team to focus on product development rather than resource provisioning and management.',
    ],
  }),
  mr({
    id: 'pillar-plaza-009',
    building: 'pillar-plaza',
    d: 3,
    stem: 'A company is launching a product with unpredictable demand. In the past it bought hardware for a guessed peak and tested only on a small environment. The team wants to follow the general Well-Architected design principles. Which TWO actions BEST meet this goal? (Choose two.)',
    correct: [
      ['Scale capacity in and out automatically with demand instead of guessing a peak', 'The framework says to stop guessing capacity because you can use as much or as little as you need and scale automatically.'],
      ['Create a production-scale test environment on demand, run the tests, then decommission it', 'In the cloud, a production-scale test environment can be created on demand and removed after testing, so tests match production.'],
    ],
    wrong: [
      ['Reserve fixed capacity sized for the highest forecast for the next three years', 'This is a guessed capacity and leaves idle resources or limited capacity if the guess is wrong.'],
      ['Keep testing on the small fixed environment to save effort', 'The small environment does not test at production scale, which the principle recommends.'],
      ['Treat the first architecture as final and avoid changes', 'The framework recommends evolutionary architectures that change as the business evolves, not static one-time decisions.'],
      ['Skip simulated production events to avoid disrupting the team', 'The framework recommends game days that simulate events, which show where improvements are needed.'],
    ],
    slots: [1, 4],
    evidence: [
      'waf-general-dp|You can use as much or as little capacity as you need, and scale in and out automatically.',
      'waf-general-dp|In the cloud, you can create a production-scale test environment on demand, complete your testing, and then decommission the resources.',
    ],
  }),
  mc({
    id: 'pillar-plaza-010',
    building: 'pillar-plaza',
    d: 3,
    stem: 'A company moves a critical application from on premises. Its old tests only proved that the workload ran in one scenario, and recovery plans were never exercised. The team must validate that the new workload can recover from failures before a real incident occurs. Which action BEST follows the Reliability design principles?',
    correct: ['Use automation to simulate failures and rehearse the recovery procedures regularly', 'The Reliability pillar says you can test how a workload fails and validate recovery, using automation to simulate failures, which exposes failure pathways before a real event.'],
    wrong: [
      ['Run load tests that confirm the workload performs well while every component is healthy', 'Load tests on a healthy system show performance, but they never exercise failure or recovery.'],
      ['Write detailed recovery runbooks and file them without running them', 'Untested procedures are not validated, which is the weakness in the old approach.'],
      ['Assume Multi-AZ deployment removes the need to exercise recovery', 'Multi-AZ helps resilience, but it does not validate the recovery procedures or expose failure pathways.'],
    ],
    slot: 3,
    evidence: [
      'waf-rel-dp|In the cloud, you can test how your workload fails, and you can validate your recovery procedures.',
      'waf-rel-dp|You can use automation to simulate different failures or to recreate scenarios that led to failures before.',
    ],
  }),
];

export default questions;
