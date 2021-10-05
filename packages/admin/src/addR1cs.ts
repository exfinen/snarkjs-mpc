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
  storageBucket: firebaseConfig.storageBucket,
});


const main = async (circuitDir: string, r1csFile: string) => {
  if (!fs.existsSync(r1csFile)) {
    console.error(`${r1csFile} not found`)
    process.exit(1)
  }
  const buf = fs.readFileSync(r1csFile)
  console.log(`Loaded ${r1csFile}`)

  const bucket = Admin.storage().bucket()

  const storagePath = `${config.id}/circuits/${circuitDir}/r1cs`
  const file = bucket.file(storagePath)
  await file.save(buf)
  console.log(`Uploaded ${r1csFile} as ${storagePath}`)
}

if (process.argv.length < 4) {
  console.log(`Usage: ${path.basename(process.argv[0])} ${path.basename(process.argv[1])} [circuit-dir] [r1cs-file]`)
  process.exit(0)
}

main(process.argv[2], process.argv[3])
