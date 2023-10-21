#!/bin/bash

/opt/mongodb-tools/bin/mongodump --uri $1

mv dump/prod dump/prod_20$(date +"%y%m%d")

cp -r dump/prod_20$(date +"%y%m%d") "$2"