import firebase from "firebase/app"
import "firebase/firestore"
import "firebase/storage"
import fetchStream from "fetch-readablestream"
import { MemFile, Logger } from "snarkjs"
import { Circuit } from "../types"

import { firebaseConfig } from "../config-firebase/firebaseConfig"
firebase.initializeApp(firebaseConfig)

export class StorageAgt {
  private readonly firestore = firebase.firestore()
  private readonly storage = firebase.storage()

  getCircuits = async (ceremonyId: string): Promise<Circuit[]> => {
    console.log(`Getting circuits of ${ceremonyId}...`)

    const circuits: Circuit[] = (await this.firestore
      .collection('ceremonies')
      .doc(ceremonyId)
      .collection('circuits')
      .withConverter(circuitConv)
      .get()
    ).docs.map(x => x.data())

    console.log(`Loaded ${circuits.length} circuits`)
    return circuits
  }

  getInitialCircuits = async (
    ceremonyId: string,
    circuitDirs: string[],
  ): Promise<Circuit[]> => {
    console.log(`Getting initial circuits of ${ceremonyId}-${circuitDirs}`)
    const circuits = []

    for(const circuitDir of circuitDirs) {
      const circuit: Circuit = {
        id: circuitDir,
        participants: [],
        r1cs: await this.getR1csFile(ceremonyId, circuitDir),
      }
      console.log(`Prepared circuit: ${circuitDir}`)
      circuits.push(circuit)
    }
    return circuits
  }

  private getFile = async (fileRef: firebase.storage.Reference): Promise<Uint8Array | undefined> => {
    let url: string
    try {
      url = await fileRef.getDownloadURL()
    } catch {  // getDownloadURL throws an error if the file doesn't exist
      return undefined
    }
    const res = await fetchStream(url)
    const reader = res.body.getReader()

    const metadata = await fileRef.getMetadata()
    const array = new Uint8Array(metadata.size)
    console.log(`Getting ${url}...`)

    let p = 0
    while(true) {
      const resp = await reader.read()
      if (resp.done) break
      const data: Uint8Array = resp.value as Uint8Array
      array.set(data, p)
      p += data.length
    }
    return array
  }

  getPtauFile = async (ceremonyId: string): Promise<Uint8Array> => {
    const fileRef = this.storage.ref(`/${ceremonyId}/ptau`)
    const fileBuf = await this.getFile(fileRef)
    if (fileBuf === undefined) {
      throw new Error(`Ptau file is missing for ${ceremonyId}`)
    }
    console.log(`Got ptau /${ceremonyId}/ptau: size=${fileBuf.length}, url: ${await fileRef.getDownloadURL()}`)
    return fileBuf
  }

  getR1csFile = async (ceremonyId: string, circuitDir: string): Promise<Uint8Array> => {
    const fileRef = this.storage.ref(`/${ceremonyId}/circuits/${circuitDir}/r1cs`)
    const fileBuf = await this.getFile(fileRef)
    if (fileBuf === undefined) {
      throw new Error(`R1CS file is missing for ${ceremonyId}, ${circuitDir}`)
    }
    console.log(`Got r1cs /${ceremonyId}/circuits/${circuitDir}: size=${fileBuf.length}, url: ${await fileRef.getDownloadURL()}`)
    return fileBuf
  }

  getFileWithPath = async (path: string): Promise<MemFile> => {
    const fileRef = this.storage.ref(path)
    const fileBuf = await this.getFile(fileRef)
    if (fileBuf === undefined) {
      throw new Error(`${path} is missing. This should not happen`)
    }
    console.log(`Got ${path}: size=${fileBuf!.length}, url: ${await fileRef.getDownloadURL()}`)
    return { type: 'mem', data: fileBuf }
  }

  getZkeyFile = async (ceremonyId: string, circuitDir: string, index: number): Promise<MemFile> => {
    const path = `/${ceremonyId}/circuits/${circuitDir}/zKey${index}`;
    return this.getFileWithPath(path);
  }

  getContribSigFile = async (ceremonyId: string, circuitDir: string, index: number): Promise<MemFile> => {
    const path = `/${ceremonyId}/circuits/${circuitDir}/contribSig${index}`
    return this.getFileWithPath(path)
  }

  saveFileWithPath = async (path: string, fileBuf: Uint8Array, logger: Logger): Promise<void> => {
    logger.info(`Saving ${path}...`)
    const fileRef = this.storage.ref(path)
    await fileRef.put(fileBuf)
    logger.info(`Saved ${path}`)
  }

  saveZKeyFile = async (ceremonyId: string, circuitDir: string, zKey: Uint8Array, index: number, logger: Logger): Promise<void> => {
    const path = `/${ceremonyId}/circuits/${circuitDir}/zKey${index}`
    await this.saveFileWithPath(path, zKey, logger)
  }

  saveContribSigFile = async (ceremonyId: string, circuitDir: string, contribSig: Uint8Array, index: number, logger: Logger): Promise<void> => {
    const path = `/${ceremonyId}/circuits/${circuitDir}/contribSig${index}`
    await this.saveFileWithPath(path, contribSig, logger)
  }

  getFileList = async (ceremonyId: string, circuitDir: string): Promise<firebase.storage.ListResult> => {
    const storageRef = this.storage.ref()
    const path = `/${ceremonyId}/circuits/${circuitDir}/`
    return storageRef.child(path).listAll()
  }

  deleteFile = async (fullPath: string): Promise<void> => {
    const storageRef = this.storage.ref()
    await storageRef.child(fullPath).delete()
  }

  getDownloadURL = async (
    ceremonyId: string,
    circuitDir: string,
    fileName: string,
  ): Promise<string> => {
    const storageRef = this.storage.ref()
    const path = `/${ceremonyId}/circuits/${circuitDir}/${fileName}`
    return storageRef.child(path).getDownloadURL()
  }
}

const circuitConv: firebase.firestore.FirestoreDataConverter<Circuit> = {
  toFirestore: (x: Circuit) => x,
  fromFirestore: (
    snapshot: firebase.firestore.QueryDocumentSnapshot,
    options: firebase.firestore.SnapshotOptions,
  ) => {
    return {...snapshot.data(options)} as Circuit
  },
}
