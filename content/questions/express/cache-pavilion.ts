import type { Question } from '../../../src/content/types.ts';
import { mc, mr } from '../helpers.ts';

const questions: Question[] = [
  mc({
    id: 'cache-pavilion-001',
    building: 'cache-pavilion',
    bullets: ['3.3-K2'],
    d: 2,
    stem: 'A gaming company stores player profiles in Amazon Aurora. Its leaderboard queries are slow, so the company wants a managed in-memory store that keeps player rankings in sorted sets, keeps a replica of the data, and fails over automatically when a node is lost. Which solution meets these requirements with the LEAST operational overhead?',
    correct: ['Create an Amazon ElastiCache for Valkey cache with a replica and automatic failover for the rankings', 'The Valkey engine supports sorted sets, replication and automatic failover, and ElastiCache manages the nodes for the company.'],
    wrong: [
      ['Create an Amazon ElastiCache for Memcached cluster with several nodes spread across Availability Zones', 'The Memcached engine has no replication, no automatic failover and no sorted sets, so it fails every named requirement.'],
      ['Place an Amazon DynamoDB Accelerator (DAX) cluster in front of the Aurora database to serve the ranking reads', 'DAX is a caching service that is compatible with DynamoDB only, so it cannot sit in front of an Aurora database.'],
      ['Add Aurora Replicas to the cluster and send the ranking queries to the cluster reader endpoint', 'Aurora Replicas are relational read-only database instances rather than an in-memory store with sorted sets, so the ranking queries stay slow.'],
    ],
    slot: 1,
    evidence: [
      'elasticache-engines|High availability (replication) No Yes Yes Automatic failover No Optional Required Pub/Sub capabilities No Yes Yes Sorted sets No Yes Yes',
      'dax|DAX is a DynamoDB-compatible caching service that enables you to benefit from fast in-memory performance for demanding applications.',
    ],
  }),
  mc({
    id: 'cache-pavilion-002',
    building: 'cache-pavilion',
    bullets: ['3.3-K2'],
    d: 1,
    stem: 'A company caches rendered page fragments that it reads from its database. The cached values are simple objects. The company wants the simplest possible caching model, large nodes with multiple cores, and the ability to add and remove nodes as demand changes. Replication is not needed. Which choice is the SIMPLEST fit for these requirements?',
    correct: ['Amazon ElastiCache for Memcached', 'Memcached is the engine to choose for the simplest model, large multi-core nodes, scaling out and in by adding and removing nodes, and caching objects.'],
    wrong: [
      ['Amazon ElastiCache for Valkey with cluster mode enabled and replica nodes in every shard', 'It adds replication and shard management that the company does not need, so it is not the simplest model that fits the requirements.'],
      ['Amazon ElastiCache for Redis OSS with a replication group and required automatic failover', 'Replication groups with failover add complexity the company did not ask for, so the model is not the simplest possible.'],
      ['Amazon DynamoDB Accelerator (DAX) with a cluster of several nodes in front of the database', 'DAX caches only DynamoDB tables, and the company is caching reads from its own database, so it cannot serve here.'],
    ],
    slot: 3,
    evidence: [
      'elasticache-engines|Choose Memcached if the following apply for you: You need the simplest model possible. You need to run large nodes with multiple cores or threads. You need the ability to scale out and in, adding and removing nodes as demand on your system increases and decreases. You need to cache objects.',
    ],
  }),
  mc({
    id: 'cache-pavilion-003',
    building: 'cache-pavilion',
    bullets: ['3.3-K2'],
    d: 1,
    stem: 'A new application has unpredictable traffic, and the team has no experience running caches. The team wants a highly available cache created in minutes, with no instances or clusters to size and no cache capacity to plan. Which solution meets these requirements with the LEAST operational overhead?',
    correct: ['Create an Amazon ElastiCache serverless cache', 'ElastiCache Serverless creates a highly available cache quickly and removes the need to provision instances, configure nodes or plan capacity.'],
    wrong: [
      ['Create a node-based ElastiCache for Memcached cluster sized for the expected peak load', 'The team would still have to choose node types and a node count and plan capacity, which the requirements rule out.'],
      ['Create a node-based ElastiCache for Valkey replication group with replicas in several Availability Zones', 'It is highly available but needs nodes to be chosen and sized, so it keeps the capacity planning the team wants to avoid.'],
      ['Run a self-managed Valkey server on Amazon EC2 instances in an Auto Scaling group', 'The team would install, patch and scale the cache itself, which is the opposite of the LEAST operational overhead.'],
    ],
    slot: 0,
    evidence: [
      'elasticache-what-is|ElastiCache Serverless enables you to create a highly available cache in under a minute, and eliminates the need to provision instances or configure nodes or clusters.',
      'elasticache-what-is|ElastiCache Serverless also removes the need to plan and manage caching capacity.',
    ],
  }),
  mc({
    id: 'cache-pavilion-004',
    building: 'cache-pavilion',
    bullets: ['3.3-S5'],
    d: 2,
    stem: 'A company runs four applications on Amazon DynamoDB and plans to add a DAX cluster for only one of them. Which application is the BEST candidate for DAX?',
    correct: ['A product page service that reads the same few popular items many times per second and accepts eventually consistent reads', 'DAX suits applications that read a small number of items more often than others and can use eventually consistent reads from the cache.'],
    wrong: [
      ['A ledger service that must always read the latest committed balance by using strongly consistent reads', 'DAX passes strongly consistent reads through to DynamoDB, and it is not ideal for applications that cannot tolerate eventually consistent reads.'],
      ['A telemetry service that writes millions of new items per hour and almost never reads the same item twice', 'DAX is not ideal for write-intensive applications or for applications without many repeated reads.'],
      ['A nightly job that scans the whole table once and writes a summary report to Amazon S3', 'A single scan has no repeated reads to serve from the cache, so DAX adds cost without improving the job.'],
    ],
    slot: 2,
    evidence: [
      'dax|Applications that read a small number of items more frequently than others.',
      'dax|Applications that require strongly consistent reads (or that cannot tolerate eventually consistent reads).',
      'dax|Applications that are write-intensive.',
    ],
  }),
  mc({
    id: 'cache-pavilion-005',
    building: 'cache-pavilion',
    bullets: ['3.3-S5'],
    d: 3,
    stem: 'An application reads product items from Amazon DynamoDB through a DAX cluster that uses the default item cache settings. A third-party batch tool that the company cannot modify writes price updates directly to the DynamoDB table, and shoppers see old prices for several minutes after each batch. New prices must appear within about 30 seconds, and the company still wants repeated reads served from the cache. Which solution meets these requirements with the LEAST change?',
    correct: ['Create a custom DAX parameter group that sets the item cache TTL to 30 seconds and use it for the cluster', 'The TTL of the item cache is set through a parameter group, and items expire after that TTL, so each item is re-read from DynamoDB within 30 seconds while other reads still hit the cache.'],
    wrong: [
      ['Change the batch tool to send its price updates through the DAX cluster endpoint instead of DynamoDB', 'Writes through DAX are written through to the cache, but the batch tool cannot be modified, so this change is not possible.'],
      ['Have the application request strongly consistent reads for every product read through the DAX client', 'Strongly consistent reads are passed through to DynamoDB, so the cache would no longer serve the repeated reads the company wants.'],
      ['Move the DAX cluster to a larger node type so that it can hold more items in its item cache', 'Node size changes how many items fit but not how long an item stays, so old prices still remain until the default TTL expires.'],
    ],
    slot: 1,
    evidence: [
      'dax-concepts|The item cache has a Time to Live (TTL) setting, which is 5 minutes by default.',
      'dax-concepts|An item expires if it has remained in the cache for longer than the TTL setting.',
      'dax-cluster-mgmt|You can use a parameter group to specify cache TTL behavior.',
      'dax-cluster-mgmt|If you want to use different TTL settings, you can launch a DAX cluster using a custom parameter group.',
      'dax-concepts|If the request specifies strongly consistent reads, DAX passes the request through to DynamoDB.',
    ],
  }),
  mr({
    id: 'cache-pavilion-006',
    building: 'cache-pavilion',
    bullets: ['3.3-K2'],
    d: 3,
    stem: 'A company is adding caching in two places. A ticketing application reads inventory from an Amazon DynamoDB table by using eventually consistent reads, and the company wants the LEAST application change there. A reporting dashboard re-runs the same queries against an Amazon RDS for PostgreSQL database all day. Which TWO solutions meet these requirements? (Choose two.)',
    correct: [
      ['Add a DAX cluster in front of the DynamoDB table and use the DAX client', 'DAX is API-compatible with DynamoDB, so it needs only minimal functional changes to an existing application.'],
      ['Add an Amazon ElastiCache cache between the dashboard and the RDS database', 'ElastiCache is an in-memory store that sits between the application and the database, so repeated queries can be answered from memory.'],
    ],
    wrong: [
      ['Add a DAX cluster in front of the RDS for PostgreSQL database for the dashboard queries', 'DAX is compatible with DynamoDB only, so it cannot cache queries to an RDS database.'],
      ['Add an ElastiCache for Memcached cluster in front of the DynamoDB table and write the lazy-loading code in the ticketing application', 'It works as a cache but requires new caching logic in the application, so it is not the LEAST application change.'],
      ['Add an RDS read replica and point the ticketing application at it for the inventory reads', 'The inventory is in DynamoDB, which has no RDS read replica, so this does nothing for the ticketing application.'],
    ],
    slots: [0, 3],
    evidence: [
      'dax|DAX reduces operational and application complexity by providing a managed service that is API-compatible with DynamoDB.',
      'dax|Therefore, it requires only minimal functional changes to use with an existing application.',
      'elasticache-strategies|Amazon ElastiCache is an in-memory key-value store that sits between your application and the data store (database) that it accesses.',
    ],
  }),
  mc({
    id: 'cache-pavilion-007',
    building: 'cache-pavilion',
    bullets: ['3.3-S5'],
    d: 2,
    stem: 'A team uses an Amazon ElastiCache serverless cache for a read-heavy application and wants better read performance. The team does not want to change the cache type or add another caching layer. Which change BEST improves read performance?',
    correct: ['Configure the application to read from the cache replicas instead of only from the primary cache node', 'AWS states that reading from replicas instead of the primary cache node can significantly improve performance for serverless caches.'],
    wrong: [
      ['Place a DAX cluster in front of the serverless cache to hold the hottest keys in a second layer', 'DAX is a caching service for DynamoDB tables and cannot sit in front of an ElastiCache cache, and it adds a layer the team ruled out.'],
      ['Replace the serverless cache with a node-based Memcached cluster and add nodes to spread the keys', 'It changes the cache type, which the team ruled out, and it adds node management without using the replicas that are already there.'],
      ['Add an Amazon RDS read replica behind the cache so that cache misses are answered more quickly', 'A faster database helps only on cache misses, and it does not speed up the reads the cache already serves.'],
    ],
    slot: 3,
    evidence: [
      'elasticache-strategies|You can often significantly improve performance for ElastiCache serverless caches by reading from replicas instead of the primary cache node.',
    ],
  }),
  mr({
    id: 'cache-pavilion-008',
    building: 'cache-pavilion',
    bullets: ['3.3-S5'],
    d: 2,
    stem: 'A company caches customer records from Amazon RDS in Amazon ElastiCache by using write-through: each change is written to the database and to the cache. After a failed cache node was replaced, reads for records that had not changed since then missed the cache because the new node started empty. Most records are never read after they are written, so the cache is also full of unused data. Which TWO changes fix both problems with the LEAST redesign? (Choose two.)',
    correct: [
      ['Add lazy loading so the application writes a record to the cache whenever a read misses', 'Lazy loading fills the empty node on demand, which removes the missing data that write-through alone leaves behind.'],
      ['Set a time to live (TTL) value on every record written to the cache', 'The TTL expires records that are never read, so unused data no longer fills the cache.'],
    ],
    wrong: [
      ['Replace the cache with a DAX cluster that caches the RDS queries', 'DAX is compatible with DynamoDB only, so it cannot cache an RDS database.'],
      ['Move to a larger cache node type so that more unused records fit in memory', 'More memory leaves the empty-node misses unsolved and just stores more unread data.'],
      ['Add an RDS read replica and send all of the reads to the replica', 'It does not repopulate the cache or remove unused data from it, so neither problem is fixed.'],
    ],
    slots: [1, 4],
    evidence: [
      'elasticache-strategies|If you spin up a new node, whether due to a node failure or scaling out, there is missing data.',
      'elasticache-strategies|You can minimize this by implementing lazy loading with write-through.',
      'elasticache-strategies|By adding a time to live (TTL) value, you can minimize wasted space.',
    ],
  }),
  mc({
    id: 'cache-pavilion-009',
    building: 'cache-pavilion',
    bullets: ['3.3-K2'],
    d: 2,
    tags: ['mock-reserve'],
    stem: 'A company is building a chat feature. Application servers must publish messages to channels and subscribe to them through a managed in-memory service, which must also keep a replica of the data and fail over automatically. Which solution BEST meets these requirements?',
    correct: ['An Amazon ElastiCache for Redis OSS replication group with automatic failover', 'The Redis OSS engine supports Pub/Sub, replication and automatic failover, and ElastiCache manages the in-memory nodes.'],
    wrong: [
      ['An Amazon ElastiCache for Memcached cluster with nodes in several Availability Zones', 'The Memcached engine has no Pub/Sub, no replication and no automatic failover.'],
      ['An Amazon DynamoDB Accelerator (DAX) cluster placed between the application servers', 'DAX is a cache for DynamoDB tables and does not provide channels for publishing and subscribing between application servers.'],
      ['An Amazon SNS topic with a subscription for each application server', 'SNS is a messaging service, not an in-memory data service with a replica and failover of cached data, so the data requirement is not met.'],
    ],
    slot: 0,
    evidence: [
      'elasticache-engines|High availability (replication) No Yes Yes Automatic failover No Optional Required Pub/Sub capabilities No Yes Yes Sorted sets No Yes Yes',
    ],
  }),
];

export default questions;
