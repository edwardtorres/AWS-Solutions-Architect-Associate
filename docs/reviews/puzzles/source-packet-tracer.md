# Source review: Packet Tracer (rules and scenarios)

Method: all 53 rule quotes checked against the cached live pages with the repo normaliser (all 53 present, all pages HTTP 200); surrounding page text read for the contested ones; evaluator code (`src/puzzles/packet-tracer/def.ts`) and all 22 scenarios walked by hand. `check-puzzles packet-tracer` passes (no refusals). No scenario text or rule matches a `content/post-guide.json` pattern; the NAT gateway rules describe the zonal NAT gateway in a public subnet (exam-era), not the regional mode.

## Rules (quote on page / text within page / evaluator)

| item | verdict | issue | suggested fix |
| --- | --- | --- | --- |
| route-local | OK | Quote present; evaluator uses an implicit local route per VPC CIDR. | |
| route-main | OK | Quote present; unassociated subnet falls to the main table. | |
| route-longest | OK | Quote present ("In general..."); evaluator picks longest prefix and refuses equal-length routes with different targets. | |
| igw-attach | OK | Quote present; evaluator blames `igw:<vpc>` when none is attached for inbound. | |
| igw-public-subnet | OK | Quote present. | |
| igw-no-route | OK | Quote present; text matches the page's private-subnet example. | |
| igw-public-ip | OK | Quote present. | |
| igw-inbound | OK | Quote present. | |
| nat-private-route | OK | Quote present. | |
| nat-public-subnet | FIX | Quote only says a public NAT gateway is created in a public subnet. The rule text ("so that subnet needs a route to the internet gateway") and the evaluator's blame of the NAT subnet's route table go one step further; the supporting sentence is nat-to-igw. | Cite nat-to-igw (or add the igw-public-subnet quote) when blaming the NAT subnet's route table, or reword the text to what the quote says. |
| nat-to-igw | OK | Quote present. | |
| nat-outbound-only | OK | Quote present; used as the trace rule when an internet client reaches a private-subnet instance whose route goes to a NAT gateway. | |
| nat-nacl | OK | Quote present; evaluator checks the NAT subnet NACL in and out. | |
| nat-ports | OK | Quote present ("A NAT gateway uses ports 1024-65535."). Evaluator requires a rule to cover the full range or refuses on partial overlap, which is the safe reading. | |
| nat-no-peering | OK | Quote present. | |
| gwep-no-igw | OK | Quote present. | |
| gwep-route | OK | Quote present. | |
| gwep-unassociated | OK | Quote present. The sentence says such subnets use the public service endpoint; the evaluator concludes "fails" only because the VPC also has no internet gateway or NAT (igw-no-route). Correct, but the trace names only this rule. | Optional: add igw-no-route to the trace note. |
| gwep-precedence | OK | Quote present. The page also says an exact-range route beats the endpoint route; evaluator refuses public CIDR routes in service lookups, so that case never arises. | |
| gwep-other-service | OK | Quote present; same remark as gwep-unassociated (no internet path completes the failure). | |
| gwep-sg | OK | Quote present on both the S3 and DynamoDB pages' equivalent. | |
| gwep-prefix-sg | FIX | Cites only the Amazon S3 page but scenario 012 puts `pl:dynamodb` in a security group rule. The DynamoDB gateway endpoint page (`vpce-gateway-ddb`) has the equivalent sentence ("You can reference the ID of the prefix list for DynamoDB in security group rules."). | Add a second rule (or scenario-level source) with the DynamoDB quote. |
| gwep-nacl | FIX | Cites only the S3 page; the evaluator applies it to DynamoDB too. The DynamoDB page has the equivalent sentence. The evaluator also correctly refuses non-0.0.0.0/0 NACL rules for services (the page says prefix lists cannot be used in NACLs). | Add the DynamoDB quote as a sibling rule. |
| ifep-eni | OK | Quote present. | |
| ifep-sg | OK | Quote present. | |
| ifep-nacl | OK | Quote present. | |
| sg-allow-only | OK | Quote present. | |
| sg-inbound-none | OK | Quote present. | |
| sg-outbound-default | OK | Quote present. | |
| sg-outbound-none | OK | Quote present. | |
| sg-aggregate | OK | Quote present; evaluator takes any allow and refuses when several groups all fail (blame unsettled). | |
| sg-stateful | FIX | Quote covers only "Responses to allowed inbound traffic are allowed to leave". The evaluator also relies on the opposite direction (replies to an outbound request are allowed back in, regardless of inbound rules, used in every outbound scenario). That is the preceding sentence on the same page but is not quoted. | Add that sentence as a second rule or extend the quote. |
| sg-reference | OK | Quote present; page adds that matching uses private IPs of the instances, consistent with the evaluator. | |
| sg-reference-peer | OK | Quote present (same Region); evaluator refuses a cross-VPC group reference without a peering. | |
| nacl-assoc | OK | Quote present. | |
| nacl-order | OK | Quote present. | |
| nacl-first-match | OK | Quote present. | |
| nacl-allow-deny | OK | Quote present. | |
| nacl-stateless | OK | Quote present. | |
| nacl-boundary | OK | Quote present; used for same-subnet traffic (scenario 006). | |
| nacl-default | OK | Quote present. | |
| nacl-final-deny | OK | Quote present. The parenthetical (empty custom ACL denies everything) follows from the quoted `*` rule; acceptable. | |
| nacl-response | OK | Quote present. | |
| eph-client | OK | Quote present. | |
| eph-linux | FIX | Page says "Many Linux kernels (including the Amazon Linux kernel) use ports 32768-61000." The rule text says a Linux client uses it, which overstates "many". | Reword to "Many Linux kernels, including Amazon Linux, use..."; the exhibit already says Amazon Linux, keep that. |
| eph-windows | OK | Quote present. | |
| peer-routes | OK | Quote present. | |
| peer-overlap | OK | Quote present; refusal rule. | |
| peer-non-transitive | OK | Rule is fine; blame choice in scenario 019 is the problem (see below). | |
| peer-no-other | OK | Quote present. | |
| peer-edge-igw | OK | Quote present. | |
| peer-edge-nat | OK | Quote present (page wording "an NAT device" is verbatim). | |
| peer-edge-gwep | OK | Quote present. | |

Rules: 53 reviewed, 48 OK, 5 FIX, 0 DROP.

Cross-cutting evaluator note: the gateway endpoint scenarios assume the default (full-access) endpoint policy, and the exhibit says only "IAM and bucket policies are not involved". Add "the endpoint policy is the default" to the closing exhibit sentence.

## Scenarios (computed answer re-derived by hand; blocker shown in brackets)

| item | verdict | issue | suggested fix |
| --- | --- | --- | --- |
| packet-tracer-001 [addr:web-1] | FIX | Computation is right (no public IPv4, everything else allows). The exhibit then reads "web-1 at its public IPv4 address (none)", which is incoherent: a visitor cannot address a nonexistent address. | Reword the story/exhibit: the visitor tries the address published for the site, but no public address was ever assigned. Or give the attempt a non-`public` form for this case. |
| packet-tracer-002 [nacl:pub-nacl] | OK | Outbound allows only 443, so the Linux reply range 32768-61000 hits the final deny. Single blocker. Rule 110 (SSH) is a harmless distractor. | |
| packet-tracer-003 [sg:db-sg] | OK | db-sg admits web-sg only; source is app-sg. Single blocker. | |
| packet-tracer-004 [nacl:pub-nacl] | OK | Deny 90 precedes allow 100 for 203.0.113.77. Single blocker. Good wrong-guess trap. | |
| packet-tracer-005 [none, succeeds] | OK | Allow 100 matches first; deny 110 never evaluated; outbound 1024-65535 covers replies. | |
| packet-tracer-006 [none, succeeds] | OK | Same-subnet traffic skips the NACL (nacl-boundary); cache-sg trusts app-sg. Supported by the quote. | |
| packet-tracer-007 [rt:priv-rt] | OK | Private-subnet instance with a public IP: route table sends 0.0.0.0/0 to NAT, not the internet gateway, so inbound fails. Supported by igw-no-route. Other components (NACL, SG, IGW, address) all pass, so one blocker. | |
| packet-tracer-008 [nacl:pub-nacl] | OK | Outbound 1024-49151 does not overlap the Windows range 49152-65535, so the final deny applies. Correct and no refusal. Range text in the story is fine. | |
| packet-tracer-009 [rt:app-rt] | FIX | The route table lacks the endpoint route, which is the intended blocker. But "gateway endpoint ... wired into the data subnet" is loose (endpoints are associated with route tables, not subnets), and the option list also offers `gwep:vpce-s3`, which can be defended as "not associated with app-rt". Two defensible answers. | Reword the story to "the endpoint is associated only with the data route table" and keep rt:app-rt, or drop the gwep component from the options when it is not at fault. |
| packet-tracer-010 [rt:priv-rt] | FIX | Agree with the blind reviewer that this is ambiguous. The thing actually missing (a DynamoDB gateway endpoint or its route) is not a listed component; the evaluator assigns blame to priv-rt (rule gwep-other-service) while a player may equally choose `gwep:vpce-s3` ("the endpoint doesn't cover DynamoDB") or conclude nothing exists to blame. The page quote ("Traffic destined for a different AWS service uses the internet gateway") also does not itself say the traffic fails; failure comes from the absence of an internet gateway. | Make the defect a named existing component: give the VPC a DynamoDB gateway endpoint whose route is missing from priv-rt and drop the unrelated S3 endpoint from the options (this then resembles 009, so alternatively drop 010). |
| packet-tracer-011 [sg:ep-sg] | OK | ep-sg admits 10.0.1.0/24, client is 10.0.2.10. Single blocker. Title "wrong client range" fits. | |
| packet-tracer-012 [sg:worker-sg] | OK | Route and endpoint are fine; outbound SG names only the DynamoDB prefix list and db-sg, so S3 is not allowed. Needs the DynamoDB sibling quote for gwep-prefix-sg (rule FIX above) because the prefix-list rule is DynamoDB's. | Resolved by the rule fix. |
| packet-tracer-013 [none, succeeds] | OK | Endpoint route beats 0.0.0.0/0 for S3, so no public IP is needed. Supported by gwep-precedence and gwep-no-igw. | |
| packet-tracer-014 [none, succeeds] | OK | Private tier to NAT in a public subnet with IGW route; default NACLs and SGs. | |
| packet-tracer-015 [rt:main-rt] | FIX | Computed blocker is the main route table (web-sub is implicitly associated with it and it lacks the IGW route). The story ("pub-rt never associated") makes `rt:pub-rt` an equally natural choice and the blind answer was main-rt only after reasoning. | Add to the field prompt or story that the component to name is the route table the subnet actually uses, or rename the options "Route table main-rt (main, used by web-sub)". |
| packet-tracer-016 [none, succeeds] | OK | 198.51.100.0/24 to NAT is more specific than 0.0.0.0/0 to IGW; NAT subnet has an IGW route. Succeeds without a public IP. | |
| packet-tracer-017 [nacl:db-nacl] | OK | Inbound 5432 only from 10.0.2.0/24; client is 10.0.1.10. SG allows. Single blocker. | |
| packet-tracer-018 [rt:b-rt] | OK | Reply route missing in the database VPC route table; SG, NACL allow. Supported by peer-routes (each owner must add a route). | |
| packet-tracer-019 [pcx:pcx-ab] | FIX | Agree with the blind reviewer: ambiguous blame. The documentation states peering is not transitive but names no component that blocks. The evaluator picks pcx-ab (the connection the packet takes), yet `pcx-bc`, B's route table and C's route table are all candidates a solver can defend (C's reply route 10.0.0.0/16 -> pcx-bc also cannot work). | Reword the prompt for this type to "which connection cannot carry the traffic", or make the path unambiguous (for example give A no direct peering and ask which component fails) and state in the story that all routes are configured as shown. Otherwise drop the blocker question for this scenario. |
| packet-tracer-020 [pcx:pcx-hs] | FIX | Same class of ambiguity: blame goes to the peering connection although the spoke route table's default route to the peer, or the hub NAT gateway, are equally defensible. Rule text is sound (peer cannot use the NAT device). Also the story motive "avoid paying for a second NAT gateway" is a cost claim with no source. | Fix the blocker semantics as for 019 (consistent definition: "the connection that cannot carry the traffic") and drop the cost motive. |
| packet-tracer-021 [pcx:pcx-hs] | FIX | Same blame ambiguity as 020. In addition the story says the team wants "to save the cost of another endpoint"; gateway endpoints for S3 carry no endpoint charge, so the motive is misleading and unsourced. | Use "to avoid creating another endpoint" and apply the 019/020 blocker wording. |
| packet-tracer-022 [none, succeeds] | OK | Both route tables point at the peering; db-sg names app-sg of the peer VPC in the same Region (documented), which the evaluator accepts. Good trap for "security groups cannot be named across VPCs". Source: sg-reference-peer. | |

Scenarios: 22 reviewed, 15 OK, 7 FIX (001, 009, 010, 015, 019, 020, 021), 0 DROP. Rule-level FIX items affecting scenarios: 012 (DynamoDB prefix-list quote) is resolved by the rule fix.

## Blind reviewer's ambiguity flags (010 and 019)

- 010: confirmed ambiguous. No existing component corresponds to the real defect (a missing DynamoDB endpoint). The computed route-table answer is defensible but not unique; a solver can choose the S3 endpoint.
- 019: confirmed ambiguous. The evaluator's pcx-ab is one of several defensible components; the cited page establishes the non-transitive limit but not which object blocks. The same wording problem applies to 020 and 021, so fix the blocker definition once for the whole peer-edge family.

## Totals

Rules 53: OK 48, FIX 5, DROP 0. Scenarios 22: OK 15, FIX 7, DROP 0. Post-guide dependencies: none found.
