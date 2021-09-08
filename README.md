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

1. Save the Firebase configuration obtained from Firebase console as [Project root]/config/firebaseConfig.js. The content should look like:
   ```javascript
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

### Application
1. Install dependencies

   ```shell
   $ npx lerna bootstrap
   ```

1. build client and deploy
   ```shell
   $ cd client
   $ npm run build
   $ npm run deploy
   ```

## Snarkjs included in this repository
A slightly modified version of Snarkjs 0.4.6 that can run zkey functions on web browsers is included
