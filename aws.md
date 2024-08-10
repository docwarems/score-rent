# AWS Lambda using the Serverless framework

## MongoDB connection

The score-rent code, including the MongoDB connection, we sued for the Cyclic hosting worked immeditela without any modification with AWS Lambda / Serverless Framework.

However, according to the Mongoose document here https://mongoosejs.com/docs/lambda.html it is recommendes to make use of Lambda global scope where Lambda will cache the MongoDB connection which will avoid recreate the connection too often. Creating connections take time, and time costs money at Lambda.

Problem so far I don't know how tomuse the provided sample code as it involves a top-level async function and we know top-level await aren't allowed without a configuration nightmare.

I can use this in an example like here https://github.com/serverless/examples/blob/v4/aws-node-mongodb-atlas/handler.js where the connect() is called everytime in the http get handler (i.e. no top-level await). But this is not what I want in score-rent where we habe a lot of handlers, and I don't want to call connect all the time.

Also it seems to be extremely important to reduce the default connection timeout of 30s by option 'serverSelectionTimeoutMS' - otherwise AWS will bill you also for 30s doing nothing.

## Errors

```
No loader is configured for ".html" files
```

You get errors like this if in your serverless.yml you point the entry point to the app.ts file in project root rather than the dist/app.js.
