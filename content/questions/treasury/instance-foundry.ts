import type { Question } from '../../../src/content/types.ts';
import { mc, mr } from '../helpers.ts';

const questions: Question[] = [
  mc({
    id: 'instance-foundry-001',
    building: 'instance-foundry',
    bullets: ['4.2-K7', '4.2-S5'],
    d: 1,
    stem: 'A company runs a nightly batch job on Amazon EC2 that transcodes media files. The job is CPU-bound and uses little memory. Which instance family is the MOST cost-effective fit for the job?',
    correct: ['Compute optimized instances, which suit batch processing and media transcoding', 'Compute optimized instances are designed for compute-intensive applications and are ideal for batch processing and media transcoding.'],
    wrong: [
      ['Memory optimized instances, which suit large data sets processed in memory', 'The job uses little memory, so the company would pay for memory capacity that it does not use.'],
      ['Storage optimized instances, which suit high sequential access to large data sets on local storage', 'The job is limited by CPU and not by local storage throughput, so the storage capability would go unused.'],
      ['General purpose instances, which use compute, memory and networking in equal proportions', 'The job needs more compute than memory, so a balanced family pays for memory proportions that the job does not use.'],
    ],
    slot: 3,
    evidence: [
      'ec2-co|These instances are ideal for batch processing workloads, media transcoding, high performance web servers, high performance computing (HPC), scientific modeling, dedicated gaming servers, ad server engines, and machine learning inference.',
      'ec2-gp|These instances are ideal for applications that use these resources in equal proportions, such as web servers and code repositories.',
    ],
  }),
  mc({
    id: 'instance-foundry-002',
    building: 'instance-foundry',
    bullets: ['4.2-K7'],
    d: 2,
    stem: 'A company runs development and test web servers on Amazon EC2. The servers sit nearly idle most of the day and show short CPU spikes when developers deploy new builds. Which instance family has the LOWEST cost and meets these needs?',
    correct: ['Burstable performance (T) instances, which can burst above a CPU baseline', 'Burstable instances suit development and test environments, and CPU credits cover the short spikes above the baseline.'],
    wrong: [
      ['Compute optimized instances, which suit compute-intensive applications', 'The servers are idle most of the day, so the company would pay for sustained high CPU performance it rarely uses.'],
      ['Memory optimized instances, which suit large data sets processed in memory', 'The servers are not memory-bound, so the company would pay for memory capacity that it does not need.'],
      ['Accelerated computing instances, which use co-processors for graphics or floating point work', 'The web servers do not need hardware accelerators, so the company would pay for co-processors it never uses.'],
    ],
    slot: 0,
    evidence: [
      'ec2-instance-types|Burstable performance (T) instances provide a baseline level of CPU performance with the ability to burst above the baseline.',
      'ec2-instance-types|The baseline CPU is designed to meet the needs of the majority of general purpose workloads, such as large-scale micro-services, web servers, small and medium databases, data logging, code repositories, virtual desktops, and development and test environments.',
    ],
  }),
  mc({
    id: 'instance-foundry-003',
    building: 'instance-foundry',
    bullets: ['4.2-K7'],
    d: 3,
    stem: 'A high-volume website runs on burstable performance instances configured in unlimited mode. CPU utilization stays well above the baseline for most of the day, and the bill keeps showing charges for surplus credits. Which change BEST fits this workload?',
    correct: ['Move to a fixed performance instance type that is sized for the sustained load', 'Fixed performance instances sustain full CPU performance for as long as a workload needs it, which avoids surplus credit charges.'],
    wrong: [
      ['Keep the burstable instances in unlimited mode and add more instances of the same type', 'Average CPU use above the baseline over 24 hours incurs charges for surplus credits, which is the problem the company has.'],
      ['Move the web servers to memory optimized instances sized for large in-memory data sets', 'Memory optimized instances are designed for large data sets in memory, and the site is limited by CPU and not by memory.'],
      ['Move the web servers to storage optimized instances with large local storage volumes', 'Storage optimized instances are designed for high sequential access to very large data sets on local storage, which the site does not need.'],
    ],
    slot: 2,
    evidence: [
      'ec2-instance-types|If you need consistently high CPU performance for applications such as video encoding, high volume websites, or HPC applications, we recommend that you use fixed performance instances.',
      'ec2-t-unlimited|If the average CPU usage over a 24-hour period exceeds the baseline, you incur charges for surplus credits.',
    ],
  }),
  mc({
    id: 'instance-foundry-004',
    building: 'instance-foundry',
    bullets: ['4.2-S5'],
    d: 2,
    stem: 'A company runs an in-memory analytics application that loads a 300 GB data set into memory. The instances are in the compute optimized family, CPU use averages 10 percent, and the application keeps running out of memory. The company wants to fix this at the LOWEST cost. Which solution meets these requirements?',
    correct: ['Move to memory optimized instances in a size that holds the data set', 'Memory optimized instances are designed for workloads that process large data sets in memory, so the company stops paying for unused CPU.'],
    wrong: [
      ['Move to a larger size in the compute optimized family until the data set fits', 'The extra memory comes bundled with CPU the application does not use, so the company pays for compute capacity it never needs.'],
      ['Move to storage optimized instances with large local storage', 'The data set must be held in memory, and local storage capacity does not fix a shortage of memory.'],
      ['Move to accelerated computing instances with co-processors', 'The application is limited by memory and not by floating point or graphics work, so the co-processors would go unused.'],
    ],
    slot: 1,
    evidence: [
      'ec2-mo|Memory optimized instances are designed to deliver fast performance for workloads that process large data sets in memory.',
      'ec2-instance-types|Select an instance type based on the requirements of the application or software that you plan to run on your instance.',
    ],
  }),
  mc({
    id: 'instance-foundry-005',
    building: 'instance-foundry',
    bullets: ['4.2-S5'],
    d: 1,
    stem: 'A company runs 200 Amazon EC2 instances whose types were chosen by guesswork. It wants recommendations for better-fitting instance types based on actual utilization, with the LEAST operational overhead. Which solution meets these requirements?',
    correct: ['Opt in to AWS Compute Optimizer and review its recommendations', 'Compute Optimizer analyzes configuration and utilization metrics and gives rightsizing recommendations to reduce cost.'],
    wrong: [
      ['Create an AWS Budgets budget for each instance', 'A budget alerts on cost thresholds and does not recommend instance types.'],
      ['Review Amazon CloudWatch CPU graphs for each instance and choose new types by hand', 'This can work, but the team does the analysis and comparison itself for 200 instances, which is more operational effort than a recommendation service.'],
      ['Buy a Compute Savings Plan for the current usage', 'A plan lowers the rate paid for the usage and does not change the instance types that were chosen by guesswork.'],
    ],
    slot: 0,
    evidence: [
      'compute-optimizer|AWS Compute Optimizer is a service that analyzes your AWS resources\' configuration and utilization metrics to provide you with rightsizing recommendations and identify idle resources.',
      'ec2-resize|If you want a recommendation for an instance type that is best able to handle your existing workload, you can use AWS Compute Optimizer.',
    ],
  }),
  mc({
    id: 'instance-foundry-006',
    building: 'instance-foundry',
    bullets: ['4.2-S6'],
    d: 2,
    stem: 'A legacy application runs on an Amazon EC2 instance whose root volume is an instance store volume. Utilization data shows that the instance is much larger than the workload needs, and the company wants to run it on a smaller instance type. Which approach should the company use?',
    correct: ['Launch a new instance of the smaller type and migrate the application to it', 'For an instance store-backed instance, the documented procedure is to migrate to a new instance type.'],
    wrong: [
      ['Stop the instance and change its instance type to the smaller type', 'Changing the type in place applies to EBS-backed instances with a compatible configuration, and it does not apply to an instance store root volume.'],
      ['Change the instance type while the instance keeps running', 'Even for an EBS-backed instance the instance must be stopped before its type can be changed, and the in-place change does not apply to instance store root volumes.'],
      ['Buy a Compute Savings Plan and keep the instance as it is', 'A plan lowers the rate for the usage but does not right-size the instance, so the company would still pay for capacity it does not use.'],
    ],
    slot: 3,
    evidence: [
      'ec2-resize|Root volume Compatibility Use these instructions EBS Compatible Change the instance type EBS Not compatible Migrate to a new instance type Instance store Not applicable Migrate to a new instance type',
      'ec2-resize-ebs|Considerations You must stop your instance before you can change its instance type.',
    ],
  }),
  mr({
    id: 'instance-foundry-007',
    building: 'instance-foundry',
    bullets: ['4.2-S5', '4.2-S6'],
    d: 2,
    stem: 'A company wants rightsizing recommendations for the 60 Amazon EC2 instances that have run in its account for months. The account has not used AWS Compute Optimizer before. Which TWO actions are needed to get usable recommendations with the LEAST effort? (Choose two.)',
    correct: [
      ['Opt in to AWS Compute Optimizer for the account', 'Compute Optimizer analyzes resources only after the account has opted in.'],
      ['Make sure that the instances have accumulated sufficient metric data', 'Resources must have sufficient metric data before Compute Optimizer can generate recommendations, which the months-old instances have.'],
    ],
    wrong: [
      ['Create an AWS Budgets budget for each instance so that recommendations appear', 'Budgets alert on cost and usage and are not a requirement for rightsizing recommendations.'],
      ['Buy a Savings Plan first so that Compute Optimizer can analyze the usage', 'A commitment is not a requirement for the analysis, and it would commit spend before the instances are right-sized.'],
      ['Stop all the instances so that their metrics can be exported', 'Stopping instances halts the utilization data that the analysis relies on and interrupts the workloads.'],
    ],
    slots: [0, 3],
    evidence: [
      'compute-optimizer|You must opt in to have Compute Optimizer analyze your AWS resources.',
      'compute-optimizer|For Compute Optimizer to generate recommendations for these resources, they must meet a specific set of requirements, and must have accumulated sufficient metric data.',
    ],
  }),
  mc({
    id: 'instance-foundry-008',
    building: 'instance-foundry',
    bullets: ['4.2-S6'],
    d: 3,
    stem: 'A production database server runs on an EBS-backed x86 instance that utilization data shows to be oversized. The company wants a smaller instance type with the data kept in place and the LEAST effort, and it can accept a short planned outage. Which approach meets these requirements?',
    correct: ['Stop the instance, change it to a smaller x86 instance type, and start it again', 'An EBS-backed instance with a compatible configuration can have its type changed after it is stopped, and the company pays the rate of the new type.'],
    wrong: [
      ['Change the instance to a smaller Arm-based Graviton type without rebuilding anything', 'An AMI is specific to its processor architecture, so the new type must have the same architecture as the current x86 type.'],
      ['Change the instance type while the instance keeps running', 'The instance must be stopped before its type can be changed, so the change cannot be done while it runs.'],
      ['Launch a new instance of the smaller type, then copy the database and its data to it', 'This works, but a compatible EBS-backed instance can be changed in place, which takes less effort than a migration.'],
    ],
    slot: 2,
    evidence: [
      'ec2-resize-ebs|Considerations You must stop your instance before you can change its instance type.',
      'ec2-resize-compat|Architecture AMIs are specific to the architecture of the processor, so you must select an instance type with the same processor architecture as the current instance type.',
      'ec2-resize|Root volume Compatibility Use these instructions EBS Compatible Change the instance type EBS Not compatible Migrate to a new instance type Instance store Not applicable Migrate to a new instance type',
    ],
  }),
  mr({
    id: 'instance-foundry-009',
    building: 'instance-foundry',
    bullets: ['4.2-K7'],
    d: 3,
    tags: ['mock-reserve'],
    stem: 'A company runs a portable Linux application on x86 Amazon EC2 instances and wants better price performance by using AWS Graviton processors. Which TWO actions are required to move the application? (Choose two.)',
    correct: [
      ['Use an AMI that is built for the Arm processor architecture', 'An AMI is specific to its processor architecture, so Graviton instances need an Arm AMI.'],
      ['Launch the application on a new instance of a Graviton-based instance type', 'Graviton is a family of processors designed to deliver the best price performance for workloads on EC2, and an Arm-limited instance cannot be reached by changing an x86 type.'],
    ],
    wrong: [
      ['Change the instance type of the running x86 instances to a Graviton type', 'The new type must have the same processor architecture as the current type, so an x86 instance cannot be changed to an Arm type.'],
      ['Keep the existing x86 AMI and select a Graviton-based instance type at launch', 'The x86 AMI is specific to its processor architecture and cannot be used with an Arm-based type.'],
      ['Move the application to Spot Instances of the same x86 instance family', 'Spot Instances do not use Graviton processors and can be interrupted, so they do not meet the goal.'],
    ],
    slots: [1, 4],
    evidence: [
      'graviton|AWS Graviton is a family of processors designed to deliver the best price performance for your cloud workloads running in Amazon Elastic Compute Cloud (Amazon EC2).',
      'ec2-resize-compat|Architecture AMIs are specific to the architecture of the processor, so you must select an instance type with the same processor architecture as the current instance type.',
    ],
  }),
];

export default questions;
