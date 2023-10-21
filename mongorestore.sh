#!/bin/bash

# provide mongodump in dump/<restore-db> folder
# $1 connection url without db at end, e.g. mongodb+srv://user:password@cluster
# $2 <restore-db>
/opt/mongodb-tools/bin/mongorestore --uri $1/$2 --dir dump/$2
