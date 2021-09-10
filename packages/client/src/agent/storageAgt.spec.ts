import firebase from "firebase/app"
import "firebase/auth"
import "firebase/firestore"
import "firebase/storage"
import { firebaseConfig } from "../config-firebase/firebaseConfig"
import * as fs from "fs"
import { zKey, MemFile } from "snarkjs"
import * as Crypto from "crypto"
import { StorageAgt } from "./storageAgt"

global.TextEncoder = require("util").TextEncoder

firebase.initializeApp(firebaseConfig)
firebase.firestore()

describe("snarkjs", () => {
  const fileDir = `resource/snarkjs-tutorial`
  it("should calculate first zkey and handle first contribution", async () => {
    const ptau = Uint8Array.from(fs.readFileSync(`${fileDir}/ptau`))
    const r1cs = Uint8Array.from(fs.readFileSync(`${fileDir}/r1cs`))

    const name = "kz"
    const entropy = Crypto.randomBytes(64)
    const zkey0: MemFile = { type: 'mem' }
    const zkey1: MemFile = { type: 'mem' }

    await zKey.newZKey(r1cs, ptau, zkey0, console);

    const res = await zKey.contribute(  // main.cjs 5409
      zkey0,
      zkey1,
      name,
      entropy,
      console
    )
    console.log("RES", res)

    //const res2 = await zKey.verity()

    // const inputFd = { type: 'mem', data: params };
    // let outFd =  { type: 'mem', data: new Uint8Array() };
    // try {
    //   zKey.contribute(
    //     inputFd,
    //     outFd,
    //     participant,
    //     entropy.buffer,
    //     console,
    //     progressOptions,
    //   ).then((hash: any) => {
    //     console.log(`contribution hash: ${JSON.stringify(hash)}`);
    //     dispatch({type: 'SET_HASH', hash});
    //     const result = outFd.data;
    //     console.debug(`COMPLETE ${result.length}`);
    //     dispatch({type: 'COMPUTE_DONE', newParams: result, dispatch });
    //   });
    // } catch (err) {
    //     console.error(`Error in contribute: ${err}`);
    // }
  })

})
