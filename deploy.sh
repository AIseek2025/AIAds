#!/bin/bash
cd 
       /Users/surferboy/.openclaw/workspace/AIAds
tar -cf aiads-deploy.tar.gz --exclude 
       node_modules --exclude dist --exclude .git --exclude "*.log" --exclude .DS_Store --exclude 
       src/frontend/node_modules --exclude src/frontend/dist --exclude src/backend/node_modules --exclude 
       src/backend/dist .
gzip aiads-deploy.tar.gz
scp 
       aiads-deploy.tar.gz.gz admin@47.239.7.62:/tmp/
