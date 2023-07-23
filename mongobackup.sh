#!/bin/bash

/opt/mongodb-tools/bin/mongodump --uri $1

mv dump/test dump/test_20$(date +"%y%m%d")

cp -r dump/test_20$(date +"%y%m%d") "$2"