# Step 2 source re-read (Step 3, Part A6)

Scope: blocks changed in the last Step 2 edit round that had only automatic checks.
Reviewers did not edit notes; results are per building in this folder.

## Square / Citadel / Harbor (commit 2f866eb)
Nine findings fixed, one advisory left as is:
1. embassy-row 1.1-S5: same-account sentence said a boundary always limits a resource-policy grant; reworded to the page's exact rule (user-ARN grant not limited by an implicit deny in identity policy or boundary; SCPs still set maximums).
2. archive-annex: "centralised" attributed to both products; now only AWS's own description.
3. disaster-bunker (Azure Backup): "covers only" replaced by Learn's wording plus the on-premises Windows sentence.
4. disaster-bunker (Site Recovery breaks): scope claim replaced by a neutral statement that Learn lists neither product.
5. watchtower: Shield Response Team access now carries the Business or Enterprise Support condition and its quote.
6. disaster-bunker (Site Recovery mapping): "closest match" replaced by "comparable purpose" plus a disclosure that Learn does not list the pairing.
7. message-quay (Service Bus): "closest match" replaced by a disclosure that Learn does not list Service Bus.
8. island-charts: alias record claim now backed by the page's alias sentence.
9. legacy-wharf 2.2-S8: dropped the unquoted EC2 contrast.
Advisory (not changed): scaling-floodgate "stateless application tier behind a load balancer" is study guidance, labelled as such in the UI.
