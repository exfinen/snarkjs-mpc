import { Dispatch } from 'react'
import firebase from 'firebase/app'
import "firebase/firestore"
import {
  CeremonyEnv,
  CircuitCfg,
  Participant,
  Circuit,
  CircuitCfgFirestore,
} from "../types"
import dayjs from "dayjs"
import { ymdHms, last, sleep } from "../utils"
import { Logger } from "snarkjs"
import { StorageAgt } from "../agent/storageAgt"

interface DoneNotDone {
  done: Participant[],
  notDone: Participant[],
}
interface GotLock {
  type: "GotLock"
  participantIndex: number,
  zKeyIndex: number,
}
interface ListEmpty { type: "ListEmpty" }
interface AllDone { type: "AllDone" }
interface Need2Wait { type: "Need2Wait" }
type Try2GetCalculationLockResult =
  | GotLock
  | AllDone
  | ListEmpty
  | Need2Wait

interface Released { type: "Released"}
interface MultipleParticipants { type: "MultipleParticipants"}
interface NoParticipant { type: "NoParticipant" }
interface AnotherParticipantOwnsLock { type: "AnotherParticipantOwnsLock" }
type ReleaseCalculationLockResult =
  | Released
  | MultipleParticipants
  | NoParticipant
  | AnotherParticipantOwnsLock

export interface Added { type: "Added", participant: Participant }
export interface AlreadyWaiting { type: "AlreadyWaiting" }
export interface ExceededContribLimit { type: "ExceededContribLimit"}
export type AddParticipantResult =
  | Added
  | AlreadyWaiting
  | ExceededContribLimit

const storageAgt = new StorageAgt()

const toTimestamp = (x: dayjs.Dayjs | undefined): firebase.firestore.Timestamp | null => {
  if (x === undefined) return null
  return firebase.firestore.Timestamp.fromMillis(x.valueOf())
}

const toNullableNumber = (x: number | undefined): number | null => {
  if (x === undefined) return null
  return x
}

const toMaybeUndefinedNumber = (x: number | null): number | undefined => {
  if (x === null) return undefined
  return x
}

const toDayjs = (x: firebase.firestore.Timestamp | null): dayjs.Dayjs | undefined => {
  if (x === null) return undefined
  return dayjs(x.toMillis())
}

const ceremonyEnvConv: firebase.firestore.FirestoreDataConverter<CeremonyEnv> = {
  toFirestore: (x: CeremonyEnv) => { return {
      ...x,
      startTime: toTimestamp(x.startTime),
      endTime: toTimestamp(x.endTime),
    }
  },
  fromFirestore: (
    snapshot: firebase.firestore.QueryDocumentSnapshot,
  ) => {
    const x = snapshot.data() as CeremonyEnv
    return {
      ...x,
      startTime: toDayjs(snapshot.data().startTime),
      endTime: toDayjs(snapshot.data().endTime),
    } as CeremonyEnv
  },
}

export const circuitCfgConv: firebase.firestore.FirestoreDataConverter<CircuitCfg> = {
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
    snapshot: firebase.firestore.QueryDocumentSnapshot,
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

export class FirestoreAgt {
  private readonly db = firebase.firestore()

  defaultParticipant(index: number, user: string, hash: string): Participant {
    return {
      index,
      zKeyIndex: undefined,
      user,
      hash,
      zKeyURL: "",
      contribSigURL: "",
      createdAt: dayjs(),
      startTime: undefined,
      endTime: undefined,
      isFailed: false,
      failureReason: "",
    }
  }

  initialCeremonyEnv(
    projectId: string,
    id: string,
    circuitDirs: string[],
    startTimeout: number,
    contribTimeout: number,
    pollInterval: number,
    logWindowSize: number,
    maxContrib: number,
  ): CeremonyEnv {

    return {
      projectId,
      id,
      startTime: dayjs(),
      endTime: dayjs(),
      circuitDirs,
      startTimeout,
      contribTimeout,
      pollInterval,
      logWindowSize,
      maxContrib,
    }
  }

  now(): firebase.firestore.Timestamp {
    return firebase.firestore.Timestamp.now()
  }

  async getParticipants(
    ceremonyId: string,
    circuitId: string,
  ): Promise<Participant[]> {
    const circuitSs = await this.db
      .collection("ceremonies")
      .doc(ceremonyId)!
      .collection("circuits")
      .withConverter(circuitCfgConv)
      .doc(circuitId)!
      .get()

    const circuit = circuitSs.data() as Circuit
    return circuit.participants
  }

  async waitUntilParticipantIsListed(
    ceremonyId: string,
    circuitId: string,
    participant: Participant,
  ) {
    while(true) {
      try {
        await this.getParticipant(
          ceremonyId,
          circuitId,
          participant.user,
          participant.hash,
        )
      } catch {
        await sleep(500)
        continue
      }
      break
    }
  }

  async getParticipant(
    ceremonyId: string,
    circuitId: string,
    user: string,
    userHash: string,
  ): Promise<Participant> {
    const ps = await this.getParticipants(ceremonyId, circuitId)
    for(const p of ps) {
      if (p.hash === userHash) {
        return p
      }
    }
    throw new Error(`Failed to get ${user}`)
  }

  async getDoneNotDoneParticipants(
    ceremonyId: string,
    circuitId: string,
  ): Promise<DoneNotDone> {
    const participants = await this.getParticipants(ceremonyId, circuitId)
    return this.getDoneNotDone(participants)
  }

  partitionParticipantsBy(
    participants: Participant[],
    pred: (x: Participant) => boolean
  ): [Participant[], Participant[]] {

    const trues: Participant[] = []
    const falses: Participant[] = []

    for(const participant of participants) {
      if (pred(participant)) {
        trues.push(participant)
      } else {
        falses.push(participant)
      }
    }
    return [trues, falses]
  }

  mergeParticipantLists(a: Participant[], b: Participant[]): Participant[] {
    let ai = 0, bi = 0
    const res: Participant[] = []

    let i = 0
    while(true) {
      if (i === 10) return []

      // if all items of a and b are added, exit
      if (ai === a.length && bi === b.length) return res
      // if only b remains, add b
      else if (ai === a.length) {
        res.push(b[bi++])
      }
      // if only a remains, add a
      else if (bi === b.length) {
        res.push(a[ai++])
      }
      // otherwise add both a and b
      else {
        if (a[ai].index < b[bi].index) {
          res.push(a[ai++])
          res.push(b[bi++])
        } else {
          res.push(b[bi++])
          res.push(a[ai++])
        }
      }
      i++
    }
  }

  async addParticipant(
    ceremonyId: string,
    circuitId: string,
    user: string,
    hash: string,
    maxContribRatio: number,
    participant?: Participant,
  ): Promise<AddParticipantResult> {
    const ceremonyRef = this.db
      .collection("ceremonies")
      .doc(ceremonyId)!

    const circuitRef = ceremonyRef
      .collection("circuits")
      .doc(circuitId)
      .withConverter(circuitCfgConv)

    return await this.db.runTransaction(async (txn: firebase.firestore.Transaction) => {
      const circuitSs = await txn.get(circuitRef)
      const participants: Participant[] = circuitSs.data() === undefined ? [] : circuitSs.data()!.participants!

      // check if the participant is already listed excluding its failures
      for(const participant of participants) {
        // found entry w/o failure
        if (
          participant.hash === hash &&
          !participant.isFailed &&
          participant.startTime === undefined
        ) {
          console.warn(`${user} is already on the list and waiting to start. not adding`)
          return { type: "AlreadyWaiting" }
        }
      }

      // check the contrib ratio if not the first time
      if (participants.find(x => x.hash === hash) !== undefined) {
        const numPastContribs = participants.reduce((acc, x) =>
          x.hash === hash && !x.isFailed ? acc + 1 : acc
        , 0)
        const contribRatio = (numPastContribs + 1) / (participants.length + 1)
        if (contribRatio > maxContribRatio) {
          console.warn(
            `${user} will have contribution ratio of ${contribRatio * 100}% by adding a new contribution, ` +
            `but that will exceed max contributton radio ${maxContribRatio * 100}%. not adding`)
          return { type: "ExceededContribLimit" }
        }
      }

      // assign 1-based index
      const index = participants.length + 1

      if (participant === undefined) {
        participant = this.defaultParticipant(index, user, hash)
      } else {
        participant.index = index  // original index is discarded
      }
      participants.push(participant)

      txn.set(circuitRef, { ...circuitSs.data()!, participants })
      console.log(`Added participant ${user}`)

      return { type: "Added", participant }
    })
  }

  async addCircuits(ceremonyEnv: CeremonyEnv): Promise<void> {
    const ceremonyRef = this.db
      .collection("ceremonies")
      .doc(ceremonyEnv.id)!

    const ceremonySs = await ceremonyRef
      .withConverter(ceremonyEnvConv)
      .get()

    const ceremony = ceremonySs.data()!
    for(const circuitDir of ceremony.circuitDirs) {
      console.log(`Adding ceremony circuit: ${ceremony.id}/${circuitDir}`)

      const circuitRef = ceremonyRef
        .withConverter(circuitCfgConv)
        .collection("circuits")
        .doc(circuitDir)

      const circuitSs = await circuitRef.get()

      if (circuitSs.exists) continue

      console.log(`Adding ${circuitDir}...`)
      const circuitCfg: CircuitCfg = {
        id: circuitDir,
        participants: [],
      }

      await circuitRef.set(circuitCfg)
      console.log(`Added new circuit ${circuitDir}`)
    }
  }

  async clearParticipantList(ceremonyId: string, circuitId: string) {
    const circuitRef = this.db
      .collection("ceremonies")
      .doc(ceremonyId)!
      .collection("circuits")
      .doc(circuitId)!
      .withConverter(circuitCfgConv)

    const circuitSs = await circuitRef.get()
    const newDoc = {...circuitSs.data()!, participants: []}
    await circuitRef.set(newDoc)
    console.log(`Cleared participant list`)
  }

  async getCeremonyEnv(ceremonyId: string): Promise<CeremonyEnv | undefined> {
    const ceremonySs = await this.db
      .collection("ceremonies")
      .doc(ceremonyId)!
      .withConverter(ceremonyEnvConv)
      .get()

    return ceremonySs.data()
  }

  async deleteCeremonyEnv(ceremonyId: string): Promise<void> {
    if ((await this.getCeremonyEnv(ceremonyId)) === undefined) return
    console.log(`Deleted exsiting ceremony ${ceremonyId}`)
    const ceremonyRef = this.db
      .collection("ceremonies")
      .doc(ceremonyId)

    const circuitsSs = await ceremonyRef
      .collection("circuits")
      .get()

    circuitsSs.forEach(async doc => {
      await doc.ref.delete()
    })
    await ceremonyRef.delete()
  }

  async addCeremonyEnv(ceremonyEnv: CeremonyEnv): Promise<void> {
    const ceremonyRef = this.db
      .collection("ceremonies")
      .doc(ceremonyEnv.id)

    const ceremonySs = await ceremonyRef.get()
    if (ceremonySs.exists) {
      throw new Error(`ceremony ${ceremonyEnv.id} already exist`)
    }

    await ceremonyRef.withConverter(ceremonyEnvConv).set(ceremonyEnv)
  }

  getDoneNotDone(participants: Participant[]): DoneNotDone {
    const [done, notDone] = this.partitionParticipantsBy(participants, (x: Participant) => {
      return x.isFailed || x.startTime !== undefined && x.endTime !== undefined
    })
    return { done, notDone }
  }

  async processTimeouts(ceremonyEnv: CeremonyEnv, circuitId: string, logger: Logger): Promise<void> {
    const circuitRef = this.db
      .collection("ceremonies")
      .doc(ceremonyEnv.id)!
      .collection("circuits")
      .doc(circuitId)!
      .withConverter(circuitCfgConv)

    return await this.db.runTransaction(async (txn: firebase.firestore.Transaction) => {
      const circuitSs = await txn.get(circuitRef)
      const participants = circuitSs.data()?.participants!

      let listChanged = false
      const now = firebase.firestore.Timestamp.now()

      // handle contribution timeout
      for(const p of participants) {
        if (
          p.startTime !== undefined &&
          p.endTime === undefined &&
          !p.isFailed &&
          p.startTime.unix() + ceremonyEnv.contribTimeout < now.seconds
        ) {
          p.endTime = dayjs.unix(now.seconds)
          p.isFailed = true
          p.failureReason = `Contribution timeout at ${dayjs.unix(now.seconds).format(ymdHms)}`
          logger.info(`${p.user} (${p.hash.slice(0, 8)}) contribution timed out`)
          listChanged = true
        }
      }

      // handle start timeout
      const { done, notDone } = this.getDoneNotDone(participants)
      logger.info(`${notDone.length} not-done participants, ${done.length} done participants found`)

      // if there are waiting participants
      if (notDone.length > 0) {

        // if next participant to calculate is not calculating
        if (notDone[0].startTime === undefined) {
          let begTime: dayjs.Dayjs

          // if no past participants exist, check by the creation time
          if (done.length === 0) {
            begTime = notDone[0].createdAt
          }
          else {
            // otherwise use the time closest to now from below:
            // a. last participant end time
            // b. last participant start time
            // c.last participant createdAt
            // d. next participant createdAt
            //
            // note that a < b < c always holds, but d can be anywhere is the inquiality

            let prevLastRecorded
            const p = last(done)!
            if (p.endTime) { prevLastRecorded = p.endTime }
            else if (p.startTime) { prevLastRecorded = p.startTime }
            else { prevLastRecorded = p.createdAt }

            begTime = prevLastRecorded < notDone[0].createdAt ?
              notDone[0].createdAt : prevLastRecorded
          }

          // fail the next participants if it hasn't started within the startTime period
          if (begTime.unix() + ceremonyEnv.startTimeout < now.seconds) {
            notDone[0].isFailed = true
            notDone[0].failureReason = `Start timeout at ${dayjs.unix(now.seconds).format(ymdHms)}`
            logger.info(`${notDone[0].user} (${notDone[0].hash.slice(0, 8)}) didn't start. marking ${notDone[0].user} as failed...`)
            listChanged = true
          }
        }
      }

      if (listChanged) {
        txn.set(circuitRef, {
          ...circuitSs.data()!,
          participants,
        })
      }
    })
  }

  async try2GetCalculationLock(
    ceremonyEnv: CeremonyEnv,
    circuitId: string,
    user: string,
    userHash: string,
  ): Promise<Try2GetCalculationLockResult> {
    const circuitRef = this.db
      .collection("ceremonies")
      .doc(ceremonyEnv.id)!
      .collection("circuits")
      .doc(circuitId)!
      .withConverter(circuitCfgConv)

    return await this.db.runTransaction(async (txn: firebase.firestore.Transaction) => {
      const circuitSs = await txn.get(circuitRef)
      const participants: Participant[] = circuitSs.data()?.participants!

      if (participants.length === 0) {
        return { type: "ListEmpty" }
      }
      const dnd = this.getDoneNotDone(participants)

      if (dnd.notDone.length === 0) {  // no need to get the lock if all partipants (including self) are done
        return { type: "AllDone" }
      }
      const next = dnd.notDone[0]
      console.log(`Participant w/ calc right: ${next.user} (${next.hash.slice(0, 8)})`)
      if (next.hash !== userHash) {  // cannot get th1e lock if next participant is not the calling participant
        return { type: "Need2Wait" }
      }

      // let the participant start w/ next zKey index
      const [succeeded, __] = this.partitionParticipantsBy(participants, (x: Participant) => {
        return !x.isFailed && x.startTime !== undefined && x.endTime !== undefined
      })
      const lastSucc = last(succeeded)
      next.zKeyIndex = lastSucc === undefined ? 1 : lastSucc.zKeyIndex! + 1
      console.log(`${user} got the right to calculate zkey${next.zKeyIndex}`)

      next.startTime = dayjs.unix(firebase.firestore.Timestamp.now().toMillis() / 1000)
      txn.set(circuitRef, { ...circuitSs.data()!, participants })

      return {
        type: "GotLock",
        participantIndex: next.index,
        zKeyIndex: next.zKeyIndex,
      }
    })
  }

  async releaseCalculationLock(
    ceremonyEnv: CeremonyEnv,
    circuitId: string,
    user: string,
    userHash: string,
  ): Promise<ReleaseCalculationLockResult> {
    const circuitRef = this.db
      .collection("ceremonies")
      .doc(ceremonyEnv.id)!
      .collection("circuits")
      .doc(circuitId)!
      .withConverter(circuitCfgConv)

    return await this.db.runTransaction(async (txn: firebase.firestore.Transaction) => {
      const circuitSs = await txn.get(circuitRef)
      const participants: Participant[] = circuitSs.data()?.participants!

      if (participants.length === 0) {
        console.warn(`There is no participant on the list. This should not happen.`)
        return { type: "NoParticipant" }
      }

      const [calculating, _] = this.partitionParticipantsBy(participants, (x: Participant) => {
        return !x.isFailed && (x.startTime !== undefined && x.endTime === undefined)
      })

      if (calculating.length === 0) {  // nobody is calculating
        console.warn(`No calculating participant found. This should not happen.`)
        return { type: "NoParticipant" }
      }
      if (calculating.length !== 1) {  // multiple participants are calculating
        console.warn(`Multiple calculating participants found. This should not happen.`, JSON.stringify(calculating))
        // TODO mark all participants as failed
        return { type: "MultipleParticipants" }
      }
      const p = calculating[0]
      if (p.hash !== userHash) {  // cannot release the lock if the lock owner is not the calling participant
        return { type: "AnotherParticipantOwnsLock"}
      }

      // let the participant finish
      console.log(`${user} released the right to calculate`)

      calculating[0].endTime = dayjs.unix(firebase.firestore.Timestamp.now().toMillis() / 1000)
      txn.set(circuitRef, { ...circuitSs.data()!, participants })

      return { type: "Released" }
    })
  }

  async setFailed(
    ceremonyEnv: CeremonyEnv,
    circuitId: string,
    user: string,
    userHash: string,
    err: string,
  ) {
    const circuitRef = this.db
      .collection("ceremonies")
      .doc(ceremonyEnv.id)!
      .collection("circuits")
      .doc(circuitId)!
      .withConverter(circuitCfgConv)

    await this.db.runTransaction(async (txn: firebase.firestore.Transaction) => {
      const circuitSs = await txn.get(circuitRef)
      const participants: Participant[] = circuitSs.data()?.participants!

      for(const p of participants) {
        if (p.hash === userHash) {
          console.log(`${user} failed. reason: ${err}`)
          p.isFailed = true
          p.failureReason = JSON.stringify(err)
          txn.set(circuitRef, { ...circuitSs.data()!, participants })
          return
        }
      }
    })
  }

  listen2CircuitDocChanges = (
    f: (doc: firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>) => void,
    ceremonyEnv: CeremonyEnv,
    circuitId: string,
  ): (() => void) => {

    const circuitRef = this.db
      .collection("ceremonies")
      .doc(ceremonyEnv.id)!
      .collection("circuits")
      .doc(circuitId)
      .withConverter(circuitCfgConv)

    const unsubscribe = circuitRef.onSnapshot(doc => f(doc))
    return unsubscribe
  }

  setDownloadURLs = async (
    ceremonyEnv: CeremonyEnv,
    circuitId: string,
    userHash: string,
  ) => {

    const circuitRef = this.db
      .collection("ceremonies")
      .doc(ceremonyEnv.id)!
      .collection("circuits")
      .doc(circuitId)
      .withConverter(circuitCfgConv)

    const circuitSs = await circuitRef.get()
    const participants = circuitSs.data()!.participants
    for(const p of participants) {
      if (p.hash === userHash) {
        const zKeyFile = `zKey${p.zKeyIndex}`
        const contribSigFile = `contribSig${p.zKeyIndex}`
        p.zKeyURL = await storageAgt.getDownloadURL(ceremonyEnv.id, circuitId, zKeyFile)
        p.contribSigURL = await storageAgt.getDownloadURL(ceremonyEnv.id, circuitId, contribSigFile)
        break
      }
    }
    await circuitRef.set({...circuitSs.data()!, participants})
  }

  getNowAsUint8Array(): Uint8Array {
    const now = firebase.firestore.Timestamp.now()
    let hex = now.toMillis().toString(16)
    if (hex.length % 2 === 1) hex = `0${hex}`
    return new Uint8Array(Buffer.from(hex, 'hex'))
  }
}