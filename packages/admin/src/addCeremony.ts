import dayjs from "dayjs"
import firebase from 'firebase/app'
import "firebase/firestore"
import * as Admin from "firebase-admin"
import { ceremony } from "./config"
import {
  CeremonyEnv,
  CircuitCfg,
  CircuitCfgFirestore,
  toNullableNumber,
  toMaybeUndefinedNumber,
  toDayjs,
} from "@snarkjs-mpc/shared-types"

const serviceAccountPrvkey = require("../config-firebase/serviceAccountPrvkey.json")
const firebaseConfig = require("../config-firebase/firebaseConfig.js")

Admin.initializeApp({
  credential: Admin.credential.cert(serviceAccountPrvkey as any),
  databaseURL: firebaseConfig.databaseURL,
});

const toTimestamp = (x: dayjs.Dayjs | undefined): Admin.firestore.Timestamp | null => {
  if (x === undefined) return null
  return Admin.firestore.Timestamp.fromMillis(x.valueOf())
}

const ceremonyEnvConv: Admin.firestore.FirestoreDataConverter<CeremonyEnv> = {
  toFirestore: (x: CeremonyEnv) => { return {
      ...x,
      startTime: toTimestamp(x.startTime),
      endTime: toTimestamp(x.endTime),
    }
  },
  fromFirestore: (
    snapshot: Admin.firestore.QueryDocumentSnapshot,
  ) => {
    const x = snapshot.data() as CeremonyEnv
    return {
      ...x,
      startTime: toDayjs(snapshot.data().startTime),
      endTime: toDayjs(snapshot.data().endTime),
    } as CeremonyEnv
  },
}

export const circuitCfgConv: Admin.firestore.FirestoreDataConverter<CircuitCfg> = {
  toFirestore: (x: CircuitCfg) => {
    //console.log("CircuitCfgConv-TO GOT", JSON.stringify(x))
    const participants = x.participants === undefined ? [] :
      x.participants.map(p => { return {
          ...p,
          zKeyIndex: toNullableNumber(p.zKeyIndex),
          createdAt: toTimestamp(p.createdAt),
          startTime: toTimestamp(p.startTime),
          endTime: toTimestamp(p.endTime),
        }
      })
    //console.log("CircuitCfgConv-TO CONVERTED TO", participants)
    return { ...x, participants }
  },
  fromFirestore: (
    snapshot: Admin.firestore.QueryDocumentSnapshot,
  ) => {
    const x = snapshot.data() as CircuitCfgFirestore
    //console.log(`CircuitCfgConv-FROM GOT`, x)
    const participants = x.participants === undefined ? [] :
      x.participants.map(p => {
        const y = {
          ...p,
          zKeyIndex: toMaybeUndefinedNumber(p.zKeyIndex),
          createdAt: toDayjs(p.createdAt),
          startTime: toDayjs(p.startTime),
          endTime: toDayjs(p.endTime),
        }
        return y
      })
    //console.log("CircuitCfgConv-FROM CONVERTED TO", x)
    return { ...x, participants } as CircuitCfg
  },
}

const db = Admin.firestore()

const main = async () => {
  await db.collection("ceremonies")
    .withConverter(ceremonyEnvConv)
    .doc(ceremony.id)
    .set(ceremony)

  console.log(`Added ceremony '${ceremony.id}'`)

  for(const circuitDir of ceremony.circuitDirs) {
    const circuit = {
      id: circuitDir,
      participants: [],
    }
    await db
      .collection("ceremonies")
      .doc(ceremony.id)
      .collection("circuits")
      .withConverter(circuitCfgConv)
      .doc(circuitDir)
      .set(circuit)

    console.log(`Added circuit '${ceremony.id}'/${circuitDir}'`)
  }
}

main()