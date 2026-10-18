# Re-review resolution: labs 07 and 08

- lab-07 log group recreated by a late invocation (low): fixed; v3 checkpoint says to delete a listed group with `aws logs delete-log-group`.
- lab-07 s3 download wording (low): fixed; "Download the template from the lab page, then upload it to CloudShell".
- lab-08 c1/c2 print TableArn (medium): fixed; both marked `sensitive: true`.
- lab-08 disable PITR before delete (low): not changed; it adds a step and a command the lab does not otherwise teach, and v2 already shows and explains the free system backup.
- lab-08 s8 caveat without citation (low): not changed; the step type has no callout field, and the caveat is labelled in the text as a teaching shortcut. Lab 08 s8 already cites the GSI page for its main claim.
