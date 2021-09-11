import firebase from 'firebase/app'
import "firebase/firestore"
import * as Admin from "firebase-admin"
import {
} from "@snarkjs-mpc/shared-types"
import * as path from "path"
import * as fs from "fs"
import { config } from "../config/default"

const serviceAccountPrvkey = require("../config-firebase/serviceAccountPrvkey.json")
const firebaseConfig = require("../config-firebase/firebaseConfig.js")

Admin.initializeApp({
  credential: Admin.credential.cert(serviceAccountPrvkey as any),
  databaseURL: firebaseConfig.databaseURL,
  storageBucket: "zkcream.appspot.com",
});


const main = async (ptauFile: string) => {
  if (!fs.existsSync(ptauFile)) {
    console.error(`${ptauFile} not found`)
    process.exit(1)
  }
  const buf = fs.readFileSync(ptauFile)
  console.log(`Loaded ${ptauFile}`)

  const bucket = Admin.storage().bucket()

  const storagePath = `${config.id}/ptau`
  const file = bucket.file(storagePath)
  await file.save(buf)
  console.log(`Uploaded ${ptauFile} as ${storagePath}`)
}

if (process.argv.length < 3) {
  console.log(`Usage: ${path.basename(process.argv[0])} ${path.basename(process.argv[1])} [ptau-file]`)
  process.exit(0)
}

main(process.argv[2])
