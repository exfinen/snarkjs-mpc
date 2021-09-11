import dayjs from "dayjs"
import firebase from 'firebase/app'
import "firebase/firestore"
import * as Admin from "firebase-admin"
import {
  MpcConfig,
} from "@snarkjs-mpc/shared-types"
import * as path from "path"

const serviceAccountPrvkey = require("../config-firebase/serviceAccountPrvkey.json")
const firebaseConfig = require("../config-firebase/firebaseConfig.js")

Admin.initializeApp({
  credential: Admin.credential.cert(serviceAccountPrvkey as any),
  databaseURL: firebaseConfig.databaseURL,
});

const db = Admin.firestore()

const main = async (newCeremonyId: string) => {
  const configRef = await db.collection("docs").doc("config")

  const mpcConfig = (await configRef.get())!.data() as MpcConfig

  const newMpcConfig: MpcConfig = {
    ...mpcConfig,
    currentCeremony: newCeremonyId,
  }
  await configRef.set(newMpcConfig)

  console.log(`Current ceremony changed from '${mpcConfig.currentCeremony}' to '${newCeremonyId}'`)
}

if (process.argv.length < 3) {
  console.log(`Usage: ${path.basename(process.argv[0])} ${path.basename(process.argv[1])} [new-ceremony-id]`)
  process.exit(0)
}

main(process.argv[2])