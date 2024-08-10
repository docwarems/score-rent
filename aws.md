# AWS Lambda using the Serverless framework

## MongoDB connection

The score-rent code, including the MongoDB and mail server connection, we used for the Cyclic hosting worked immediately without any modification with AWS Lambda / Serverless Framework.

However, according to the Mongoose document here https://mongoosejs.com/docs/lambda.html it is recommended to make use of Lambda global scope where Lambda will cache the MongoDB connection, which will avoid recreate the connection too often. Creating connections take time, and time costs money at Lambda.

Problem so far, I don't know how tom se the provided sample code as it involves a top-level async function and we know top-level await aren't allowed without a configuration nightmare.

I can use this in an example like here https://github.com/serverless/examples/blob/v4/aws-node-mongodb-atlas/handler.js where the connect() is called everytime in the http get handler (i.e. no top-level await). But this is not what I want in score-rent where we have a lot of handlers, and I don't want to call connect all the time.

Also it seems to be extremely important to reduce the default connection timeout of 30s by option 'serverSelectionTimeoutMS' - otherwise AWS will bill you also for 30s doing nothing.

## Serverless framework notes

### serverless dev

Will redirect AWS Lambda request to your local project.
This causes problems because Express is started several times and you get 'port in use' errors. There might be a solution for this, though. So far I don't use it.

### Deploying code changes without config changes

```
serverless deploy function -f api
```

## TODOs

use environment variables as shown here: https://github.com/serverless/examples/tree/v4/aws-node-env-variables-encrypted-in-a-file
Otherwise can't add the serverless.yml to Git.

## Errors

```
No loader is configured for ".html" files
```

You get errors like this if in your serverless.yml you point the entry point to the app.ts file in project root rather than the dist/app.js.

```
MongooseServerSelectionError: Could not connect to any servers in your MongoDB Atlas cluster. One common reason is that you're trying to access the database from an IP that isn't whitelisted. Make sure your current IP address is on your Atlas cluster's IP whitelist: https://www.mongodb.com/docs/atlas/security-whitelist/
```

I had this error randomly when doing the first tests with the Lamba deployment. I never this error with the Cylic deployment. AWS will usually bill you for 6000ms before the timeout aborts the request.
