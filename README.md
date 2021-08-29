# My personal email inbox

This is my personal email inbox for my development projects, it's not your usual email inbox though.

For this inbox, we are going to take emails from S3 that SES has stored in our bucket and then process the found email.

During our processing, we are going to attempt to categorise the email, generate JSON from our parsed contents and then store that JSON within a folder that's specific to that category within the same bucket.

We can then target these folders individually from additional Lambdas for the specific tasks that we want to do.

You can find out more about this service on my blog here:

https://nicholasgriffin.dev/blog/cf3c4661-f676-4028-879b-f2686852b82b
