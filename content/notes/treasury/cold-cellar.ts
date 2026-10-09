import type { BuildingNotes } from '../../../src/content/types.ts';
import { b, cue, example } from '../../helpers.ts';

const notes: BuildingNotes = {
  building: 'cold-cellar',
  overview: [
    b('Most data is hot for a short time and cold for a long time. S3 lets you pay less for cold data by moving it to a cheaper storage class, but each cheaper class trades something away: retrieval fees, minimum storage durations, a single Availability Zone or slower retrieval. Choosing the class, and automating the move with a lifecycle rule, is the core cost skill for object storage.',
      ['s3-storage-classes', 's3-glacier-classes', 's3-lifecycle'],
      ['s3-storage-classes|These storage classes require minimum storage durations and retrieval fees making them most effective for rarely accessed data.',
       's3-glacier-classes|Storage classes designed for less frequent access patterns with longer retrieval times offer lower storage costs.',
       's3-lifecycle|Transition actions – These actions define when objects transition to another storage class.']),
  ],
  beyondProject: [
    b('Your static site keeps its files in S3 Standard, the default class. The SAA questions start when data accumulates: access logs, old versions of site files or user uploads that nobody reads after a month. A lifecycle configuration can transition those objects to cheaper classes and expire them, without touching the live site.',
      ['s3-storage-classes', 's3-lifecycle'],
      ['s3-storage-classes|S3 Standard (STANDARD) – The default storage class.',
       's3-lifecycle|Expiration actions – These actions define when objects expire.']),
  ],
  bullets: [
    {
      id: '4.1-K7',
      concepts: [
        b('A data lifecycle is the sequence of states data passes through: created and used frequently, then infrequently, then archived, then deleted. S3 Lifecycle expresses it as rules with transition actions (move objects to another storage class, for example to Standard-IA 30 days after creation or to Glacier Flexible Retrieval one year after creation) and expiration actions (delete objects, after which S3 deletes expired objects on your behalf).',
          's3-lifecycle',
          ['Transition actions – These actions define when objects transition to another storage class.',
           'For example, you might choose to transition objects to the S3 Standard-IA storage class 30 days after creating them, or archive objects to the S3 Glacier Flexible Retrieval storage class one year after creating them.',
           'Expiration actions – These actions define when objects expire. Amazon S3 deletes expired objects on your behalf.']),
        b('Lifecycle transitions follow a waterfall model, a fixed set of allowed paths: from S3 Standard to Standard-IA, Intelligent-Tiering, One Zone-IA, Glacier Instant Retrieval, Glacier Flexible Retrieval or Glacier Deep Archive, and from Standard-IA to Intelligent-Tiering, One Zone-IA or the Glacier classes; objects move toward colder classes, not back. There are costs for lifecycle transition requests, and objects smaller than 128 KB are not transitioned by default because the transition cost can outweigh the storage savings.',
          ['s3-lifecycle-transitions', 's3-lifecycle'],
          ['s3-lifecycle-transitions|Amazon S3 supports a waterfall model for transitioning between storage classes, as shown in the following diagram.',
           's3-lifecycle-transitions|The S3 Standard storage class to the S3 Standard-IA, S3 Intelligent-Tiering, S3 One Zone-IA, S3 Glacier Instant Retrieval, S3 Glacier Flexible Retrieval, or S3 Glacier Deep Archive storage classes.',
           's3-lifecycle-transitions|The S3 Standard-IA storage class to the S3 Intelligent-Tiering, S3 One Zone-IA, S3 Glacier Instant Retrieval, S3 Glacier Flexible Retrieval, or S3 Glacier Deep Archive storage classes.',
           's3-lifecycle-transitions|We don\'t recommend transitioning objects less than 128 KB because you are charged a transition request for each object.',
           's3-lifecycle|There are costs associated with lifecycle transition requests.']),
        b('A lifecycle configuration is set on a bucket; it consists of rules, and each rule has an ID, a status (enabled or disabled), a filter that identifies the objects it applies to, and actions. A bucket can have one lifecycle configuration with up to 1,000 rules, written as XML.',
          's3-lifecycle-rules',
          ['A S3 Lifecycle configuration consist of Lifecycle rules that include various elements that describe the actions Amazon S3 takes during an object\'s lifetime.',
           'Each S3 bucket can have one lifecycle configuration assigned to it, which can contain up to 1,000 rules.',
           'Rule metadata that includes a rule ID, and a status that indicates whether the rule is enabled or disabled.']),
      ],
      services: ['Amazon S3', 'Amazon S3 Glacier'],
      design: [
        b('Cue: "data is accessed frequently for a month and rarely after" → lifecycle transition to an infrequent-access or archive class; "delete after the retention period" → expiration; "unknown pattern" → Intelligent-Tiering instead of a fixed schedule.',
          ['s3-lifecycle', 's3-storage-classes'],
          ['s3-lifecycle|Expiration actions – These actions define when objects expire. Amazon S3 deletes expired objects on your behalf.',
           's3-storage-classes|S3 Intelligent-Tiering is the ideal storage class when you want to optimize storage costs for data that has unknown or changing access patterns.']),
      ],
    },
    {
      id: '4.1-K10',
      concepts: [
        b('Cold tiering for object storage means placing data in a storage class that matches how rarely it is read. The IA classes suit infrequently accessed data that still needs millisecond access (with a retrieval fee); the Glacier classes suit long-term, rarely accessed data and require minimum storage durations and retrieval fees.',
          's3-storage-classes',
          ['Amazon S3 charges a retrieval fee for these objects, so they are most suitable for infrequently accessed data.',
           'These storage classes require minimum storage durations and retrieval fees making them most effective for rarely accessed data.']),
        b('The Glacier classes differ in retrieval: Instant Retrieval offers millisecond retrieval and real-time access (90-day minimum), Flexible Retrieval offers minutes to 12 hours (90-day minimum), and Deep Archive offers 9 to 48 hours (180-day minimum), with Flexible Retrieval and Deep Archive archived and unavailable for real-time access. These are documented values that can change.',
          's3-glacier-classes',
          ['S3 Glacier Instant Retrieval 90 days Quarterly Milliseconds No S3 Glacier Flexible Retrieval 90 days Semi-annually Minutes to 12 hours Yes S3 Glacier Deep Archive 180 days Annually 9 to 48 hours Yes']),
        b('For the two infrequent-access classes, the minimum storage duration is documented two different ways, so do not rely on one figure. The S3 storage classes page says that deleting an object before the end of the 30-day minimum storage duration is charged for 30 days and that objects smaller than 128 KB are charged as 128 KB; the storage decision guide says S3 no longer applies a 30-day minimum storage duration for transitions to Standard-IA and One Zone-IA. The disagreement is recorded; check both pages.',
          ['s3-storage-classes', 'storage-decision'],
          ['s3-storage-classes|If you delete an object before the end of the 30-day minimum storage duration period, you are charged for 30 days.',
           's3-storage-classes|If an object is less than 128 KB, Amazon S3 charges you for 128 KB.',
           'storage-decision|Amazon S3 no longer applies a 30-day minimum storage duration for transitions to Amazon S3 Standard-Infrequent Access and Amazon S3 One Zone-Infrequent Access.'],
          { allow: ['two'] }),
        b('S3 Intelligent-Tiering automates tiering: it stores objects in access tiers (Frequent Access, Infrequent Access and Archive Instant Access automatically, with optional Archive Access and Deep Archive Access) and moves objects that have not been accessed for 30 consecutive days to the Infrequent Access tier and after 90 consecutive days to Archive Instant Access. It has no retrieval fees, but it charges a small monthly object monitoring and automation fee, and objects smaller than 128 KB are not monitored and not eligible for auto-tiering.',
          's3-storage-classes',
          ['S3 Intelligent-Tiering moves objects that have not been accessed in 30 consecutive days to the Infrequent Access tier.',
           'With S3 Intelligent-Tiering, any existing objects that have not been accessed for 90 consecutive days are automatically moved to the Archive Instant Access tier.',
           'There are no retrieval fees for S3 Intelligent-Tiering.',
           'For a small monthly object monitoring and automation fee, S3 Intelligent-Tiering monitors access patterns and automatically moves objects that have not been accessed to lower-cost access tiers.',
           'If the size of an object is less than 128 KB, it is not monitored and not eligible for auto-tiering.']),
      ],
      services: ['Amazon S3', 'Amazon S3 Glacier'],
      design: [
        b('The full class-by-class comparison is in the Don\'t confuse section below. When a requirement states how fast archived data must be retrieved, that answer picks the Glacier class.',
          's3-glacier-classes',
          ['S3 Glacier Instant Retrieval 90 days Quarterly Milliseconds No S3 Glacier Flexible Retrieval 90 days Semi-annually Minutes to 12 hours Yes S3 Glacier Deep Archive 180 days Annually 9 to 48 hours Yes']),
      ],
    },
    {
      id: '4.1-S5',
      concepts: [
        b('To manage lifecycles, create a lifecycle configuration on the bucket with a filter (a key prefix and/or object tags) so only the intended objects are affected, then add transition and expiration actions. A transition cannot happen before a class\'s minimum storage duration: you cannot create a single rule that moves objects out of a class before its minimum duration has passed.',
          ['s3-lifecycle-rules', 's3-lifecycle-transitions'],
          ['s3-lifecycle-rules|A filter that identifies the objects to which the rule applies.',
           's3-lifecycle-transitions|You can\'t create a single Lifecycle rule that transitions objects from one storage class to another before the minimum storage duration period has passed.']),
        b('Four more lifecycle actions control hidden cost. NoncurrentVersionTransition moves noncurrent versions to another class and NoncurrentVersionExpiration permanently deletes noncurrent versions, which an Expiration action does not do. ExpiredObjectDeleteMarker cleans up a delete marker that has no noncurrent versions left. AbortIncompleteMultipartUpload sets a maximum time in days that multipart uploads may stay in progress; object expiration does not remove incomplete multipart uploads, and AWS recommends the abort rule to minimise storage costs.',
          ['s3-lifecycle-rules', 's3-mpu-abort'],
          ['s3-lifecycle-rules|NoncurrentVersionTransition action element – Use this action to specify when Amazon S3 transitions objects to the specified storage class.',
           's3-lifecycle-rules|NoncurrentVersionExpiration action element – Use this action to direct Amazon S3 to permanently delete noncurrent versions of objects.',
           's3-lifecycle-rules|ExpiredObjectDeleteMarker action element – In a versioning-enabled bucket, a delete marker with zero noncurrent versions is referred to as an expired object delete marker.',
           's3-lifecycle-rules|AbortIncompleteMultipartUpload action element – Use this element to set a maximum time (in days) that you want to allow multipart uploads to remain in progress.',
           's3-lifecycle-rules|Object expiration lifecycle configurations don\'t remove incomplete multipart uploads.',
           's3-mpu-abort|As a best practice, we recommend that you configure a lifecycle rule by using the AbortIncompleteMultipartUpload action to minimize your storage costs.'],
          { allow: ['four'] }),
        b('Expiration behaves according to versioning: in a nonversioned bucket S3 queues the object for removal and removes it permanently; in a versioning-enabled bucket it adds a delete marker that becomes the current version and makes the previous version noncurrent. Expiration applies only to an object\'s current version, so versioned buckets need separate rules for noncurrent versions.',
          's3-lifecycle-expire',
          ['Nonversioned bucket – Amazon S3 queues the object for removal and removes it asynchronously, permanently removing the object.',
           'Versioning-enabled bucket – If the current object version is not a delete marker, Amazon S3 adds a delete marker with a unique version ID.',
           'Object expiration applies only to an object\'s current version (it has no impact on noncurrent object versions).']),
      ],
      services: ['Amazon S3'],
      design: [
        b('Cue: "automatically move objects to cheaper storage after N days and delete after M" → lifecycle rule; "only for the logs/ prefix" → prefix filter.',
          's3-lifecycle-rules',
          ['A filter that identifies the objects to which the rule applies.']),
      ],
    },
    {
      id: '4.1-S8',
      concepts: [
        b('Choose the tier by asking: how quickly must the data be available, and how often will it be read. Needs milliseconds and read often → Standard; read rarely but still milliseconds → Standard-IA / One Zone-IA / Glacier Instant Retrieval; can wait minutes to hours → Glacier Flexible Retrieval; can wait 9 to 48 hours and almost never read → Deep Archive; pattern unknown → Intelligent-Tiering.',
          ['s3-glacier-classes', 's3-storage-classes'],
          ['s3-glacier-classes|S3 Glacier Instant Retrieval 90 days Quarterly Milliseconds No S3 Glacier Flexible Retrieval 90 days Semi-annually Minutes to 12 hours Yes S3 Glacier Deep Archive 180 days Annually 9 to 48 hours Yes',
           's3-storage-classes|S3 Intelligent-Tiering is the ideal storage class when you want to optimize storage costs for data that has unknown or changing access patterns.']),
        b('Resilience matters too: One Zone-IA stores data in only one Availability Zone and is not resilient to losing that zone, so it fits re-creatable data or replicas, not the only copy.',
          's3-storage-classes',
          ['S3 One Zone-IA (ONEZONE_IA) – Use if you can re-create the data if the Availability Zone fails, for object replicas when configuring S3 Cross-Region Replication (CRR).']),
      ],
      services: ['Amazon S3', 'Amazon S3 Glacier'],
      design: [
        b('Typical answers: monthly-report archive read twice a year → Glacier Flexible Retrieval; compliance archive read almost never → Deep Archive; user uploads with unpredictable reads → Intelligent-Tiering; re-creatable thumbnails → One Zone-IA.',
          's3-storage-classes',
          ['S3 One Zone-IA (ONEZONE_IA) – Use if you can re-create the data if the Availability Zone fails, for object replicas when configuring S3 Cross-Region Replication (CRR).']),
      ],
    },
    {
      id: '4.1-S9',
      concepts: [
        b('Choose the lifecycle by matching age to access: keep data in Standard while it is read frequently, transition to the infrequent-access or archive class when reads fall away (after the class\'s minimum duration), and expire it when the retention requirement ends. Transitioning or deleting before a minimum storage duration is charged for the remainder of that duration.',
          's3-glacier-classes',
          ['If you delete, overwrite, or transition the object to a different storage class before the minimum, you are charged for the remainder of that duration.']),
        b('S3 Storage Class Analysis can help optimise costs between S3 Standard and S3 Standard-IA by analysing storage access patterns. Its scope is narrow: it only provides recommendations for Standard to Standard-IA, not for the Glacier classes or One Zone-IA, and you can filter it by prefix, by object tags, or both.',
          ['s3-storage-classes', 's3-analytics'],
          ['s3-storage-classes|To help you optimize costs between S3 Standard and S3 Standard-IA you can use Amazon S3 analytics – Storage Class Analysis.',
           's3-analytics|Storage class analysis only provides recommendations for Standard to Standard IA classes.',
           's3-analytics|Or, you can configure filters to group objects together for analysis by common prefix (that is, objects that have names that begin with a common string), by object tags, or by both prefix and tags.']),
      ],
      services: ['Amazon S3'],
      design: [
        b('Cue: "retain for a long compliance period, rarely read" → transition to an archive class and expire at the end of the retention period; add Object Lock or Vault Lock if the requirement is immutability (Archive Annex).',
          's3-lifecycle',
          ['Expiration actions – These actions define when objects expire. Amazon S3 deletes expired objects on your behalf.']),
      ],
    },
  ],
  cues: [
    cue('unknown or changing access pattern, no retrieval fees', 'S3 Intelligent-Tiering',
      b('Intelligent-Tiering suits unknown or changing access patterns and has no retrieval fees.', 's3-storage-classes',
        ['There are no retrieval fees for S3 Intelligent-Tiering.'])),
    cue('infrequently accessed, millisecond access, only copy of the data', 'S3 Standard-IA',
      b('Standard-IA is for your primary or only copy of data that cannot be re-created.', 's3-storage-classes',
        ['S3 Standard-IA (STANDARD_IA) – Use for your primary or only copy of data that can\'t be re-created.'])),
    cue('infrequently accessed and can be re-created, lower cost', 'S3 One Zone-IA',
      b('One Zone-IA stores in a single Availability Zone, which makes it less expensive than Standard-IA.', 's3-storage-classes',
        ['S3 One Zone-IA (ONEZONE_IA) – Amazon S3 stores the object data in only one Availability Zone, which makes it less expensive than S3 Standard-IA.'])),
    cue('archive with millisecond retrieval, accessed about quarterly', 'S3 Glacier Instant Retrieval',
      b('Glacier Instant Retrieval is for long-term rarely accessed data that requires millisecond retrieval.', 's3-storage-classes',
        ['S3 Glacier Instant Retrieval (GLACIER_IR) – Use for long-term data that\'s rarely accessed and requires milliseconds retrieval.'])),
    cue('archive, retrieval in minutes to hours is acceptable', 'S3 Glacier Flexible Retrieval',
      b('Flexible Retrieval is for archives where portions might need to be retrieved in minutes.', 's3-storage-classes',
        ['S3 Glacier Flexible Retrieval (GLACIER) – Use for archives where portions of the data might need to be retrieved in minutes.'])),
    cue('long-term archive that rarely needs access, retrieval within a day or two acceptable', 'S3 Glacier Deep Archive',
      b('Deep Archive is for data that rarely needs to be accessed, with 9 to 48 hours retrieval.', 's3-glacier-classes',
        ['S3 Glacier Deep Archive 180 days Annually 9 to 48 hours Yes'])),
    cue('automatically move objects to cheaper classes by age', 'S3 Lifecycle transition rules',
      b('Transition actions define when objects move to another storage class.', 's3-lifecycle',
        ['Transition actions – These actions define when objects transition to another storage class.'])),
  ],
  examples: [
    example('Lifecycle rule: log objects move colder, then expire', 'lifecycle',
      `
<LifecycleConfiguration>
  <Rule>
    <ID>age-out-logs</ID>
    <Filter>
      <Prefix>logs/</Prefix>
    </Filter>
    <Status>Enabled</Status>
    <Transition>
      <Days>30</Days>
      <StorageClass>STANDARD_IA</StorageClass>
    </Transition>
    <Transition>
      <Days>120</Days>
      <StorageClass>GLACIER</StorageClass>
    </Transition>
    <Expiration>
      <Days>730</Days>
    </Expiration>
  </Rule>
</LifecycleConfiguration>
`,
      [
        b('A lifecycle configuration is XML made of rules; each rule has an ID and a Status that says whether it is enabled, and a Filter that limits which objects it applies to. Here the Filter limits the rule to objects whose key starts with logs/.', 's3-lifecycle-rules',
          ['Rule metadata that includes a rule ID, and a status that indicates whether the rule is enabled or disabled.',
           'A filter that identifies the objects to which the rule applies.']),
        b('Each Transition says when to move objects and to which class. STANDARD_IA is S3 Standard-IA and GLACIER is S3 Glacier Flexible Retrieval; the example moves objects to the first class after 30 days and to the second after a longer period.', 's3-lifecycle',
          ['For example, you might choose to transition objects to the S3 Standard-IA storage class 30 days after creating them, or archive objects to the S3 Glacier Flexible Retrieval storage class one year after creating them.']),
        b('The Expiration action deletes the objects at the end of their lifetime; in a nonversioned bucket S3 queues the object for removal and removes it permanently. The day counts, the prefix and the rule ID are placeholders for illustration, not recommended settings.', 's3-lifecycle-expire',
          ['Nonversioned bucket – Amazon S3 queues the object for removal and removes it asynchronously, permanently removing the object.']),
      ]),
  ],
  confuse: ['s3-storage-classes'],
  azure: [
    {
      concept: 'Storage cool tier',
      aws: 'S3 Standard-IA',
      mapping: b('Learn pairs S3 Infrequent Access with the Azure cool tier: for data that is infrequently accessed but must be available immediately when accessed, the Azure Cool Blob Storage tier provides cheaper storage than standard blob storage.',
        ['learn-storage', 's3-storage-classes'],
        ['learn-storage|For data that is infrequently accessed but must be available immediately when accessed, Azure Cool Blob Storage tier provides cheaper storage than standard blob storage.',
         'learn-storage|This storage tier is comparable to AWS S3 - Infrequent Access storage service.',
         's3-storage-classes|Amazon S3 charges a retrieval fee for these objects, so they are most suitable for infrequently accessed data.']),
      breaks: b('S3 has two infrequent-access classes that differ by resilience (Standard-IA across multiple Availability Zones, One Zone-IA in one), and a separate Intelligent-Tiering class that moves data automatically; the Learn text maps only one S3 IA class.',
        ['s3-storage-classes', 'learn-storage'],
        ['s3-storage-classes|S3 One Zone-IA (ONEZONE_IA) – Amazon S3 stores the object data in only one Availability Zone, which makes it less expensive than S3 Standard-IA.',
         'learn-storage|This storage tier is comparable to AWS S3 - Infrequent Access storage service.'],
        { allow: ['two'] }),
    },
    {
      concept: 'Storage archive access tier',
      aws: 'S3 Glacier storage classes',
      mapping: b('Learn pairs Azure Archive Blob Storage with AWS Glacier: it is intended for rarely accessed data that is stored for at least 180 days and can tolerate several hours of retrieval latency.',
        ['learn-storage', 's3-glacier-classes'],
        ['learn-storage|Azure Archive Blob Storage is comparable to AWS Glacier storage service.',
         'learn-storage|It\'s intended for rarely accessed data that is stored for at least 180 days and can tolerate several hours of retrieval latency.',
         's3-glacier-classes|S3 Glacier Deep Archive 180 days Annually 9 to 48 hours Yes']),
      breaks: b('AWS splits the archive role across three Glacier classes with different retrieval times, including Glacier Instant Retrieval with millisecond access, so the Learn single-tier comparison hides the choice the exam asks you to make.',
        ['s3-glacier-classes', 'learn-storage'],
        ['s3-glacier-classes|S3 Glacier Instant Retrieval 90 days Quarterly Milliseconds No S3 Glacier Flexible Retrieval 90 days Semi-annually Minutes to 12 hours Yes S3 Glacier Deep Archive 180 days Annually 9 to 48 hours Yes',
         'learn-storage|Azure Archive Blob Storage is comparable to AWS Glacier storage service.'],
        { allow: ['three'] }),
    },
  ],
};

export default notes;
