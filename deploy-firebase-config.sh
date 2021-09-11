#!/bin/bash

# Files expected to be in [repository root]/config dir:
# - firebaseConfig.js

FIREBASE_CONFIG=firebaseConfig
SERVICE_ACCOUNT_PRVKEY=serviceAccountPrvkey

CLIENT_CONFIG_DIR=packages/client/src/config-firebase
ADMIN_CONFIG_DIR=packages/admin/config-firebase

if [ ! -f config/$FIREBASE_CONFIG.js ]; then
  echo "$FIREBASE_CONFIG.js is missing"
  exit 1
fi

if [ ! -f config/$SERVICE_ACCOUNT_PRVKEY.json ]; then
  echo "$SERVICE_ACCOUNT_PRVKEY.json is missing"
  exit 1
fi

# admin
sed "s/const $FIREBASE_CONFIG/export const $FIREBASE_CONFIG: any/" config/$FIREBASE_CONFIG.js > $ADMIN_CONFIG_DIR/$FIREBASE_CONFIG.ts
cp config/$SERVICE_ACCOUNT_PRVKEY.json $ADMIN_CONFIG_DIR/$SERVICE_ACCOUNT_PRVKEY.json

# client
sed "s/const $FIREBASE_CONFIG/export const $FIREBASE_CONFIG: any/" config/$FIREBASE_CONFIG.js > $CLIENT_CONFIG_DIR/$FIREBASE_CONFIG.ts
