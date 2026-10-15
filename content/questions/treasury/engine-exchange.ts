import type { Question } from '../../../src/content/types.ts';
import { mc, mr } from '../helpers.ts';

const questions: Question[] = [
  mc({
    id: 'engine-exchange-001',
    building: 'engine-exchange',
    bullets: ['4.3-K7'],
    d: 1,
    stem: 'A company runs a MySQL database in its own data center and wants to move it to Amazon RDS for MySQL. The application must keep using the source database until the day of the cutover, and the company wants to keep the same database engine. Which solution meets these requirements with the LEAST effort?',
    correct: ['Use AWS DMS to migrate the data to RDS for MySQL and replicate ongoing changes until the cutover', 'The engine stays the same, which AWS DMS supports, and it can replicate ongoing changes to keep the source and the target in sync until cutover.'],
    wrong: [
      ['Convert the schema to PostgreSQL with DMS Schema Conversion and then load the data with AWS DMS', 'Schema conversion is for migrating to a different engine; the company is keeping MySQL, so this adds work and changes the engine.'],
      ['Stop the application, export a one-time dump of the source database, and import it into RDS for MySQL', 'A one-time dump copies the data once and stops the application, so the source cannot keep serving users until the cutover.'],
      ['Use AWS DataSync to copy the database files from the data center to the RDS DB instance storage', 'DataSync copies files between storage systems; it does not load data into a running database or replicate changes.'],
    ],
    slot: 0,
    evidence: [
      'dms-what-is|Conversely, if you want to migrate away from old infrastructure but continue to use the same database engine, AWS DMS also supports that process.',
      'dms-what-is|You can perform one-time migrations or replicate ongoing changes to keep sources and targets in sync.',
    ],
  }),
  mr({
    id: 'engine-exchange-002',
    building: 'engine-exchange',
    bullets: ['4.3-K7', '4.3-S5'],
    d: 2,
    stem: 'A company runs an Oracle database on premises. It wants to move the database to Amazon Aurora PostgreSQL-Compatible to stop paying for the Oracle licences. The schema contains tables, views and stored procedures. Which TWO steps are required to migrate the schema and the data with the LEAST custom work? (Choose two.)',
    correct: [
      ['Use DMS Schema Conversion to assess and convert the Oracle schema and apply the converted code to the Aurora cluster', 'Moving to a different engine needs the source schema converted to the target engine first.'],
      ['After the converted code is applied, use AWS DMS to migrate the data from the Oracle database', 'AWS DMS migrates the data once the converted schema exists on the target, and can keep replicating changes.'],
    ],
    wrong: [
      ['Export the Oracle tables to CSV files and load them into Aurora PostgreSQL with the PostgreSQL COPY command', 'This moves rows only; the views and stored procedures are not converted, so the team would write that code by hand.'],
      ['Rewrite the views and stored procedures by hand in PostgreSQL syntax, then use AWS DMS to migrate the data', 'The data step works, but hand-writing the schema code is the custom work that DMS Schema Conversion avoids.'],
      ['Run AWS DMS alone and let it rewrite the Oracle stored procedures as PostgreSQL code', 'AWS DMS moves data; converting code objects to a new engine is the job of schema conversion.'],
    ],
    slots: [1, 3],
    evidence: [
      'dms-what-is|To migrate to a different database engine, you can use DMS Schema Conversion.',
      'dms-what-is|After you convert your source schemas and apply the converted code to your target database, you can use AWS DMS to migrate your data.',
    ],
  }),
  mc({
    id: 'engine-exchange-003',
    building: 'engine-exchange',
    bullets: ['4.3-S2'],
    d: 2,
    stem: 'A company runs Oracle Database Enterprise Edition on premises, and the application depends on Enterprise Edition features. The company owns active Oracle licences, with Software Update License and Support, that it may use in the cloud. It is moving to Amazon RDS for Oracle and wants to avoid buying licences again. Which licensing option is the MOST cost-effective?',
    correct: ['Use the Bring Your Own License model and run the DB instance on Oracle Enterprise Edition', 'BYOL lets the company use its existing Oracle Database licences on RDS and supports Enterprise Edition.'],
    wrong: [
      ['Use the License Included model and run the DB instance on Oracle Enterprise Edition', 'The License Included model is supported only on Standard Edition 2, so it cannot run the Enterprise Edition features the application needs.'],
      ['Use the License Included model and run the DB instance on Oracle Standard Edition 2', 'This edition lacks the Enterprise Edition features the application depends on, and the company would pay for a licence it already owns.'],
      ['Migrate to Amazon Aurora PostgreSQL-Compatible and keep the Oracle application code unchanged', 'Aurora PostgreSQL is a different engine, so the Oracle features and code would have to be converted, which is not a licensing option.'],
    ],
    slot: 1,
    evidence: [
      'rds-oracle-licensing|In the BYOL model, you can use your existing Oracle Database licenses to deploy databases on Amazon RDS.',
      'rds-oracle-licensing|Amazon RDS supports the BYOL model only for Oracle Database Enterprise Edition (EE) and Oracle Database Standard Edition 2 (SE2).',
      'rds-oracle-licensing|The License Included model is only supported on Amazon RDS for Oracle Database Standard Edition 2 (SE2).',
    ],
  }),
  mc({
    id: 'engine-exchange-004',
    building: 'engine-exchange',
    bullets: ['4.3-S2'],
    d: 3,
    stem: 'A company is launching a production application on Oracle Database Standard Edition 2. It owns no Oracle licences, does not want to buy or track them, and needs the database to fail over automatically to a second Availability Zone. Which solution meets these requirements with the LEAST licensing effort?',
    correct: ['Amazon RDS for Oracle Standard Edition 2 with the License Included model and a Multi-AZ deployment', 'AWS holds the licence in this model, so nothing is bought separately, and RDS supports Multi-AZ for Oracle failover.'],
    wrong: [
      ['Amazon RDS for Oracle Standard Edition 2 with Bring Your Own License and a Multi-AZ deployment', 'BYOL needs licences the company does not own, and a Multi-AZ deployment needs a licence for both the primary and the standby DB instance.'],
      ['Amazon RDS for Oracle Enterprise Edition with the License Included model and a Multi-AZ deployment', 'The License Included model is supported only on Standard Edition 2, so Enterprise Edition cannot be used with it.'],
      ['Oracle Database installed on Amazon EC2 instances in two Availability Zones with the company\'s own failover scripts', 'The company would still have to obtain Oracle licences itself and build and operate the failover, which is more effort.'],
    ],
    slot: 2,
    evidence: [
      'rds-oracle-licensing|In the License Included model, you don\'t need to purchase Oracle Database licenses separately.',
      'rds-oracle-licensing|If you use the Bring Your Own License model, you must have a license for both the primary DB instance and the standby DB instance in a Multi-AZ deployment.',
      'rds-oracle-licensing|Amazon RDS supports Multi-AZ deployments for Oracle as a high-availability, failover solution.',
    ],
  }),
  mc({
    id: 'engine-exchange-005',
    building: 'engine-exchange',
    bullets: ['4.3-S2'],
    d: 2,
    stem: 'A company runs a busy Amazon Aurora MySQL-Compatible cluster that uses the Aurora Standard storage configuration. Read and write I/O charges now make up about 40 percent of the total Aurora bill, and the I/O volume is expected to stay high. Which change is the MOST cost-effective for the same cluster?',
    correct: ['Switch the cluster to the Aurora I/O-Optimized storage configuration', 'I/O-Optimized has no additional charges for read and write I/O and is the best choice when I/O spending is 25 percent or more of the Aurora bill.'],
    wrong: [
      ['Keep Aurora Standard and add more Aurora Replicas so that each instance performs less I/O', 'More replicas add instance charges and still bill I/O requests at the standard rate under Aurora Standard.'],
      ['Move the data to Amazon RDS for MySQL on a larger DB instance class', 'This re-platforms the database and a larger class adds compute cost without removing the I/O charges the company is trying to reduce.'],
      ['Keep Aurora Standard because it is the cost-effective choice for heavy and sustained I/O usage', 'Aurora Standard suits moderate I/O usage and is best when I/O is less than 25 percent of spending, which is not the case here.'],
    ],
    slot: 3,
    evidence: [
      'aurora-storage|Aurora I/O-Optimized is the best choice when your I/O spending is 25% or more of your total Aurora database spending.',
      'aurora-storage|You pay only for the usage and storage of your DB clusters, with no additional charges for read and write I/O operations.',
      'aurora-storage|Aurora Standard is the best choice when your I/O spending is less than 25% of your total Aurora database spending.',
    ],
  }),
  mc({
    id: 'engine-exchange-006',
    building: 'engine-exchange',
    bullets: ['4.3-K7', '4.3-S5'],
    d: 3,
    stem: 'A company runs Microsoft SQL Server on premises, and the licence costs are high. Developers are willing to adjust application code. The company wants to move to Amazon Aurora PostgreSQL-Compatible, keep the source database in use while the data is copied, and avoid writing its own conversion tools. Which approach is the MOST cost-effective way to meet these requirements?',
    correct: ['Convert and apply the schema with DMS Schema Conversion, then run AWS DMS to load the data and replicate changes until the cutover', 'The engine changes, so the schema is converted first, and DMS then migrates the data and keeps source and target in sync.'],
    wrong: [
      ['Export the SQL Server tables to CSV files, load them into Aurora PostgreSQL with COPY, and rewrite the views and procedures by hand', 'This is a one-time copy with no ongoing replication, so the source and target drift apart, and all code conversion is custom work.'],
      ['Run AWS DMS with a full load only, and ask developers to recreate the views and stored procedures by hand', 'Without schema conversion the developers write the conversion by hand, and a full load alone leaves the source out of sync after the copy.'],
      ['Convert the schema with DMS Schema Conversion, stop the application, and copy the data once with a database export and import', 'The source database would be unavailable during the copy, which fails the requirement to keep it in use while the data is copied.'],
    ],
    slot: 0,
    evidence: [
      'dms-what-is|AWS DMS supports fully heterogeneous data migrations between the supported engines.',
      'dms-what-is|This service automatically assesses and converts your source schemas to a new target engine.',
      'dms-what-is|You can perform one-time migrations or replicate ongoing changes to keep sources and targets in sync.',
    ],
  }),
  mc({
    id: 'engine-exchange-007',
    building: 'engine-exchange',
    bullets: ['4.3-S5'],
    d: 2,
    stem: 'A company migrates many small databases to AWS over several months. The volume of each migration varies, and the team does not want to estimate capacity, pick a replication instance size or manage replication engine versions. The team wants to pay only for the capacity the migrations use. Which solution meets these requirements with the LEAST operational overhead?',
    correct: ['AWS DMS Serverless, which provisions and scales the replication capacity automatically', 'DMS Serverless removes capacity estimation, provisioning and engine-version management, and bills on a pay-for-use model.'],
    wrong: [
      ['AWS DMS with a replication instance sized for the largest database and kept running between migrations', 'The team would estimate and manage the instance and pay for idle capacity while smaller migrations run.'],
      ['AWS DMS with a separate replication instance for every database, resized by hand before each migration', 'This still needs capacity estimation, provisioning and patching for every instance, which is the overhead the team wants to avoid.'],
      ['DMS Schema Conversion run for every database before each data load', 'Schema conversion converts schemas to a new engine and does not provide the replication capacity that moves the data.'],
    ],
    slot: 1,
    evidence: [
      'dms-serverless|AWS DMS Serverless is a feature that provides automatic provisioning, scaling, built-in high availability, and a pay-for-use billing model, to increase operations agility and optimize your costs.',
      'dms-serverless|The Serverless feature eliminates replication instance management tasks like capacity estimation, provisioning, cost optimization, and managing replication engine versions and patching.',
    ],
  }),
  mc({
    id: 'engine-exchange-008',
    building: 'engine-exchange',
    bullets: ['4.3-K7', '4.3-S2'],
    d: 1,
    stem: 'A company\'s application runs on MySQL today, and its code and tools are written for MySQL. The company wants a managed relational database that the existing code, tools and applications can keep using, without moving to a non-relational model. Which service BEST meets these requirements?',
    correct: ['Amazon Aurora MySQL-Compatible', 'Aurora is compatible with MySQL, so the code, tools and applications used with existing MySQL databases can be used with it.'],
    wrong: [
      ['Amazon DynamoDB', 'DynamoDB is a non-relational service, so the MySQL queries and tools would need to be rewritten.'],
      ['Amazon DocumentDB', 'DocumentDB is a document database service, not a relational one, so the SQL-based code and tools would not carry over.'],
      ['Amazon Redshift', 'Redshift is a data warehouse for analytics, not a drop-in relational database for the existing MySQL application.'],
    ],
    slot: 2,
    evidence: [
      'aurora-overview|The code, tools, and applications you use today with your existing MySQL and PostgreSQL databases can be used with Aurora.',
      'aurora-overview|Amazon Aurora (Aurora) is a fully managed relational database engine that\'s compatible with MySQL and PostgreSQL.',
    ],
  }),
  mc({
    id: 'engine-exchange-009',
    building: 'engine-exchange',
    bullets: ['4.3-S5'],
    d: 2,
    tags: ['mock-reserve'],
    stem: 'A company keeps an on-premises PostgreSQL database of closed orders that no application queries any more. Auditors may ask for the data, and the company wants to keep it on low-cost storage instead of a running database. Which solution moves the data with the LEAST custom code?',
    correct: ['Use AWS DMS to migrate the tables to Amazon S3', 'AWS DMS can move data to low-cost storage platforms such as Amazon S3, so no custom extraction code is needed.'],
    wrong: [
      ['Create an Amazon RDS for PostgreSQL DB instance and keep the data there for auditors', 'A running DB instance keeps charging for compute and storage, though no application queries the data.'],
      ['Create an Amazon Aurora PostgreSQL cluster and stop it when the auditors are not asking', 'This still keeps a database cluster whose storage is billed, and it is a database rather than low-cost storage.'],
      ['Write an AWS Lambda function that queries every table and writes the rows to Amazon S3', 'This is custom code to write, test and run for large tables, which the company wants to avoid.'],
    ],
    slot: 3,
    evidence: [
      'dms-what-is|Or it can help you move to the managed data warehouse service provided by Amazon Redshift, NoSQL platforms like Amazon DynamoDB, or low-cost storage platforms like Amazon Simple Storage Service (Amazon S3).',
    ],
  }),
];

export default questions;
