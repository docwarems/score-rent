# AWS Lambda using the Serverless framework

## Resetup after 6 months

After 6 months of not using score-rent, I tested AWS and Serverless Logins and Deployment.
The "serverless" command was no longer existing - a "npm i serverless -g" brought i back. "serverless info" showed that setup and credentials were still existing. I successfully removed the app using "serverless remove". "serverless deploy" brought it back. However, I decided to finanally remove the app using "serverless remove" because currently the Score-Rent development und usage is paused.

Another 3 months later I tried again

- "serverless info": error "ServerlessError2: Stack with id serverless-score-rent-dev does not exist"
- "serverless deploy" ok
- Score Rent accessible; Login OK
- serverless.com login OK

## MongoDB connection

The score-rent code, including the MongoDB and mail server connection, we used for the Cyclic hosting worked immediately without any modification with AWS Lambda / Serverless Framework.

However, according to the Mongoose document here https://mongoosejs.com/docs/lambda.html it is recommended to make use of Lambda global scope where Lambda will cache the MongoDB connection, which will avoid recreate the connection too often. Creating connections take time, and time costs money at Lambda.

Also it seems to be extremely important to reduce the default connection timeout of 30s by option 'serverSelectionTimeoutMS' - otherwise AWS will bill you also for 30s doing nothing.

### Cluster paused

After a few months on inactivity, I got email warning that my cluster was about to beeing paused, which finally happened.
Some weeks later I logged in and could resume the cluster without any problems.

## Memory limit

AWS will bill you for execution duration times memory limit. Default in serverless.yml ist 1024 MB. AWS Cloudwatch always logs less than 130 MB used memory. So I reduced the memory limit to 512 MB. I also tried even 256 MB, but with this limit the execution duration increased considerably.

## Serverless framework notes

### serverless dev

Will redirect AWS Lambda request to your local project.
This causes problems because Express is started several times and you get 'port in use' errors. There might be a solution for this, though. So far I don't use it.

### Deploying code changes without config changes

```
serverless deploy function -f api
```

### Environment variables

In serverless.yml environment variables are defined like

```
SMTP_HOST: ${env:SMTP_HOST}
```

During deloyment will get the actual values from the .env file

## TODOs

## Errors

```
No loader is configured for ".html" files
```

You get errors like this if in your serverless.yml you point the entry point to the app.ts file in project root rather than the dist/app.js.

```
MongooseServerSelectionError: Could not connect to any servers in your MongoDB Atlas cluster. One common reason is that you're trying to access the database from an IP that isn't whitelisted. Make sure your current IP address is on your Atlas cluster's IP whitelist: https://www.mongodb.com/docs/atlas/security-whitelist/
```

I had this error randomly when doing the first tests with the Lamba deployment. I never this error with the Cylic deployment. AWS will usually bill you for 6000ms before the timeout aborts the request.
