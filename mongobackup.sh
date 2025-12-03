#!/bin/bash

# Example (use quotes!!)
# ./mongobackup.sh "mongodb+srv://... " "/mnt/c/temp"

# Check if both parameters are provided
if [ $# -lt 2 ]; then
    echo "Usage: $0 <mongodb_uri> <output_directory>"
    echo "Example: $0 'mongodb+srv://...' /mnt/c/temp"
    exit 1
fi

~/opt/mongodb-tools/bin/mongodump --uri $1

mv dump/prod dump/prod_20$(date +"%y%m%d")

cp -r dump/prod_20$(date +"%y%m%d") "$2"