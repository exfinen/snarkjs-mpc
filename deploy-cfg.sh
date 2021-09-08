#!/bin/bash

# Files expected to be in [repository root]/config dir:
# - firebaseConfig.js

FIREBASE_CONFIG=firebaseConfig
CLIENT_CONFIG_DIR=packages/client/src/config

if [ ! -f config/$FIREBASE_CONFIG.js ]; then
  echo "$FIREBASE_CONFIG.js is missing"
  exit 1
fi

# client
sed "s/const $FIREBASE_CONFIG/export const $FIREBASE_CONFIG: any/" config/$FIREBASE_CONFIG.js > $CLIENT_CONFIG_DIR/$FIREBASE_CONFIG.ts
