# Snarkjs-based Trusted Setup Phase 2 MPC

## Setting up environment
### Node.js
1. Install Node.js version 14
   ```shell
   $ nvm install 14
   ```

### Firebase
1. Install firebase tools

   ```shell
   $ npm i -g firebase-tools
   ```

1. Save the Firebase configuration obtained from Firebase console as `packages/client/src/config-firebase/firebaseConfig.js`. The content should look like:
   ```javascript
   // For Firebase JS SDK v7.20.0 and later, measurementId is optional
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     databaseURL: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "...",
     measurementId: "...",
   }
   ```

1. Create OAuth application in GitHub and using the id and secret, set up Firebase GitHub authentication.

1. In repository root directory, run:
   ```shell
   $ ./deploy-cfg.sh
   ```

1. Login to firebase (if haven't logged in yet)
   ```shell
   $ firebase login
   ```

#### CORS
1. Install gstool (https://cloud.google.com/storage/docs/gsutil_install?hl=ja#deb)

2. Set up CORS for the default bucket e.g.

   ```shell
   $ gsutil cors set cors.json gs://zkcream.appspot.com
   ```

## Setting up ceremony
Refer to admin package

## Setting up application
1. Install dependencies

   ```shell
   $ npx lerna bootstrap
   ```

1. Update ceremony config file `packages/client/config/default.ts`

1. build client and deploy
   ```shell
   $ cd client
   $ npm run build
   $ npm run deploy
   ```

## Opening application
Open `https://[project id].web.app` in browser

## Snarkjs included in this repository
A slightly modified version of Snarkjs 0.4.6 that can run zkey functions on web browsers is included
