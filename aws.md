# AWS

## Managing Accounts

### Switching account in console

Show current logged in indenty

```
aws sts get-caller-identity
```

Switch to other identity, e.g. `serverless-deployer`

```
aws configure --profile serverless-deployer
export AWS_PROFILE=serverless-deployer
aws sts get-caller-identity
```

Switch to root identity

```
aws configure --profile root
export AWS_PROFILE=root
aws sts get-caller-identity
```

## Simple E-Mail Service (SES)

I heard about SES and wondered if I could sent via it, rather than my private e-mail provider where, as I experienced, the number of e-Mails sent per day is quite limited (less than 100).

- Each email address used as "from", "sender" or the like must be registered as identity in SES.
- when working in sandbox also each "to" adress must be registered unless using the AWS mailbox simulator (not tested yet)

### Register email adress

- Configuration / Identities
- AWS will send a verification email - click the link to verify

### Use with Serverless

Copilot will help you...

### Use with Nodemailer

Copilot will help you...

## Log files

Log files can be found at lambda / \<function\> / monitor / View CloudWatch logs

## Costs

Cost explorer shows that 6 services are in use.

### Lambda execution time

What you're billed for:

- Number of invocations

- Duration (in milliseconds), based on memory and compute allocated

Free tier:

- 1 million requests/month

- 400,000 GB-seconds of compute/month

Example:

If your function uses 128 MB memory and runs for 200 ms, AWS bills for:

```
(200 ms / 1000) * (128 MB / 1024) = 0.025 GB-seconds per invocation
```

### SES

You're billed for:

- $0.10 per 1,000 emails sent

- Free for first 62,000 emails/month if SES is invoked from an EC2, Lambda, or other AWS service

### Other services

- CloudWatch
- Tax
- CloudFormation
- API Gateway

## Links

- [Serverless Framework](./aws-serverless.md)
