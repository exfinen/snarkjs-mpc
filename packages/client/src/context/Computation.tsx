import * as React from 'react'
import {
  useEffect,
  Dispatch,
  useReducer,
  PropsWithChildren,
} from "react"
import {
  createImmutableContext,
  sleep,
  buildLogger,
  buildContribSigLogger,
} from "../utils"
import { StorageAgt } from "../agent/storageAgt"
import { zKey, MemFile, Logger } from 'snarkjs'
import firebase from 'firebase/app'
import "firebase/firestore"
import "firebase/storage"
import {
  User,
  Ceremony,
  CeremonyEnv,
  Computation,
  Circuit,
  Participant,
} from "../types"
import { FirestoreAgt, AddParticipantResult } from "../agent/firestoreAgt"
import { GistAgt } from "../agent/gistAgt"
import dayjs from 'dayjs'

export const initialCompState = (): Computation => {
  return {
    step: "NotStarted",
    currCircuit: 0,
    circuits: [],
    user: "",
    userHash: "",
    gitHubAccessToken: "",
    status: "",
    logLines: [],
    contribSigs: [],
  }
}
interface StartComputationAction {
  type: "Start",
  user: string,
  userHash: string,
  maxContrib: number,
  gitHubAccessToken: string,
  ceremony: Ceremony,
  compDispatch: Dispatch<CompStateAction>
}
interface FinishCircuitComputationAction {
  type: "FinishCircuitComputation",
}
interface FailCircuitComputationAction {
  type: "FailCircuitComputation",
  reason: string,
}
interface SetCircuitsAction {
  type: "SetCircuits",
  circuits: Circuit[],
}
interface SetStatusAction {
  type: "SetStatus",
  status: string,
}
interface ClearParticipantListAction {
  type: "ClearParticipantList",
  ceremonyId: string,
}
interface AddLogAction {
  type: "AddLog",
  msg: string,
}
interface AddContribSigAction {
  type: "AddContribSig",
  circuitId: string,
  participantIdx: number,
  sig: Uint8Array,
}

export type CompStateAction =
  | StartComputationAction
  | FinishCircuitComputationAction
  | FailCircuitComputationAction
  | SetCircuitsAction
  | SetStatusAction
  | ClearParticipantListAction
  | AddLogAction
  | AddContribSigAction

type CompStateReducer = (state: Computation, action: CompStateAction) => Computation

interface Succeeded {
  type: "Succeeded"
}
interface AlreadyFailed {
  type: "AlreadyFailed"
}
interface AlreadyStarted {
  type: "AlreadyStarted"
}
type ComputeCircuitResult =
  | Succeeded
  | AlreadyFailed
  | AlreadyStarted

interface SetPtauFileAction {
  type: "SetPtauFile",
  ptauFile: Uint8Array,
}

type CeremonyStateAction =
  | SetPtauFileAction

type CeremonyStateReducer = (state: Ceremony, action: CeremonyStateAction) => Ceremony

export const [CompStateProvider, useCompState] = createImmutableContext<Computation>()
export const [CompDispatchProvider, useCompDispatch] = createImmutableContext<Dispatch<CompStateAction>>()
export const [CeremonyProvider, useCeremony] = createImmutableContext<Ceremony>()
export const [CeremonyDispatchProvider, useCeremonyDispath] = createImmutableContext<Dispatch<CeremonyStateAction>>()

type CeremonyEnvProviderProps = PropsWithChildren<CeremonyEnv>

const storage = new StorageAgt()
const firestoreAgt = new FirestoreAgt()
const gistAgt = new GistAgt()

export const CeremonyEnvProvider = (props: CeremonyEnvProviderProps) => {
  const [compState, compStateDispatch] =
    useReducer<CompStateReducer>(compStateReducer, initialCompState())

  const ceremony: Ceremony = {
    ...props,
    ptauFile: new Uint8Array(),
  }
  const [ceremonyState, ceremonyStateDispatch] =
    useReducer<CeremonyStateReducer>(ceremonyStateReducer, ceremony)

  useEffect(() => {
    const f = async () => {
      console.log(`Getting Ptau file of ${ceremony.id}...`)
      const ptauFile = await storage.getPtauFile(ceremony.id)
      ceremonyStateDispatch({ type: "SetPtauFile", ptauFile })
    }
    f()
  }, [props.id])

  return (
    <CompStateProvider value={compState}>
      <CompDispatchProvider value={compStateDispatch}>
        <CeremonyDispatchProvider value={ceremonyStateDispatch}>
          <CeremonyProvider value={ceremonyState}>
            {props.children}
          </CeremonyProvider>
        </CeremonyDispatchProvider>
      </CompDispatchProvider>
    </CompStateProvider>
  )
}

export const ceremonyStateReducer = (ceremony: Ceremony, action: CeremonyStateAction): Ceremony => {
  if (action.type === "SetPtauFile") {
    console.log("Setting ptau file loaded from Storge")
    return { ...ceremony, ptauFile: action.ptauFile }

  } else {
    //const _: never = action.type
  }
  return ceremony
}

const mergeArrays = (a: Uint8Array, b: Uint8Array): Uint8Array => {
  const merged = new Uint8Array(a.length + b.length)
  merged.set(a)
  merged.set(b, a.length)
  return merged
}

export const computeUserHash = async (user: User): Promise<string> => {
  const encoder = new TextEncoder()

  const now = firestoreAgt.getNowAsUint8Array()
  const email = encoder.encode(user.firebaseUser!.email!)
  const photoUrl = encoder.encode(user.firebaseUser!.photoURL!)
  const name = encoder.encode(user.firebaseUser!.displayName!)
  const merged = [email, photoUrl, name, now]
    .reduce((acc, x) => mergeArrays(acc, x), new Uint8Array(0))

  const hashArrayBuf = await window.crypto.subtle.digest("SHA-256", merged)
  const hash = [...new Uint8Array(hashArrayBuf)]
    .map(b => b.toString(16).padStart(2, '0')).join('')
  return hash
}

export const compStateReducer = (computation: Computation, action: CompStateAction): Computation => {
  if (action.type === "Start") {
    const next: Computation = {
      ...computation,
      step: "Started",
      user: action.user,
      userHash: action.userHash,
      gitHubAccessToken: action.gitHubAccessToken,
    }

    const circuitId = computation.circuits[computation.currCircuit].id
    firestoreAgt.addParticipant(
      action.ceremony.id,
      circuitId,
      action.user,
      action.userHash,
      action.maxContrib,
    ).then((res: AddParticipantResult) => {
      if (res.type === "Added") {
        computeCircuits(action.ceremony, res.participant, next, action.compDispatch)
      } else if (res.type === "AlreadyWaiting") {
      } else if (res.type === "ExceededContribLimit") {
        action.compDispatch({
          type: "FailCircuitComputation",
          reason: "Exceeded conbtibution limit",
        })
      } else {
        const _: never = res
      }
    })
    return next
  }
  else if (action.type === "SetCircuits") {
    if (action.circuits.length === 0) {
      console.log(`Circuits hadn't been loaded to ceremony yet. Try again later`)
      return { ...computation }
    }
    return { ...computation, circuits: action.circuits, step: "CircuitsReady" }
  }
  else if (action.type === "SetStatus") {
    return { ...computation, status: action.status }
  }
  else if (action.type === "AddLog") {
    const logLines = computation.logLines.slice()
    logLines.push(action.msg)
    return { ...computation, logLines }
  }
  else if (action.type === "AddContribSig") {
    const contribSigs = computation.contribSigs.slice()
    contribSigs.push({
      circuitId: action.circuitId,
      participantIdx: action.participantIdx,
      sig: action.sig,
    })
    return { ...computation, contribSigs }
  }
  else if (action.type === "FinishCircuitComputation") {
    if (computation.currCircuit === computation.circuits.length - 1) {  // if last circuit, finish
      console.log("Finishing contribution session...")
      return { ...computation, step: "Completed" }
    } else {
      return { ...computation, currCircuit: computation.currCircuit + 1 }  // go to next circuit
    }
  }
  else if (action.type === "FailCircuitComputation") {
    return { ...computation, step: "Failed", status: `${action.reason}` }

  } else if (action.type === "ClearParticipantList") {
    const f = async () => {
      for(const circuit of computation.circuits) {
        firestoreAgt.clearParticipantList(action.ceremonyId, circuit.id)
        const res = await storage.getFileList(action.ceremonyId, circuit.id)
        for (const x of res.items) {
          if (/^zKey[0-9]*$/i.test(x.name) || /^contribSig[0-9]*$/i.test(x.name)) {
            storage.deleteFile(x.fullPath)
            console.log(`Deleted`, JSON.stringify(x.name), x.fullPath)
          }
        }
      }
    }
    f()
  } else {
    const _: never = action
  }
  return { ...computation }
}

const calculateFirstZkey = async (
  ptau: Uint8Array, r1cs: Uint8Array, logger: Logger): Promise<MemFile> => {

  console.log(`Generating first zKey... w/ ptau=${ptau.length}, r1cs=${r1cs.length}`)
  const zKey0: MemFile = { type: 'mem' }
  await zKey.newZKey(r1cs, ptau, zKey0, logger);
  console.log(`Generated zKey=${zKey0.data!.length}`)
  return zKey0;
}

const timed = async <T extends unknown>(what: string, f: () => Promise<T>) => {
  const beg = new Date().getTime()
  const res = await f()
  const end = new Date().getTime()
  console.log(`${what} took ${end - beg} ms`)
  return res
}

const computeContribution = async (
  ceremony: Ceremony,
  circuit: Circuit,
  computation: Computation,
  zKeyIndex: number,
  userHash: string,
  participantIdx: number,
  setStatus: (s: string) => void,
  compDispatch: Dispatch<CompStateAction>,
) => {
  const logger = buildLogger(compDispatch)
  const logContribSig = buildContribSigLogger(compDispatch)
  const entropy = new Uint8Array(64)
  window.crypto.getRandomValues(entropy)
  console.log(`Generated 512-bit entropy`)

  const r1cs = circuit.r1cs!

  let prevZKey: MemFile
  if (zKeyIndex === 1) {  // if nobody has completed zKey contribution previously
    // generate the first zKey
    logger.info(`Calculating first zKey...`)
    prevZKey = await calculateFirstZkey(ceremony.ptauFile, r1cs, logger)
    logger.info(`Calculated first zKey`)
  } else {
    // try to get zkey calculated by previous participant
    logger.info(`Getting previous participant's zKey...`)
    prevZKey = await storage.getZkeyFile(ceremony.id, circuit.id, zKeyIndex - 1)
    logger.info(`Got zKey${zKeyIndex - 1}`)
    logger.info(`Found previous participant's zkey. size=${prevZKey.data!.length}`)
  }

  // contribute to the ceremony
  let nextZKey: MemFile = { type: 'mem' }
  setStatus(`Calculating contribution...`)
  const contribSig = await timed("Calculating contribution", async () =>
    await zKey.contribute(prevZKey!, nextZKey, computation.user, entropy, logger)
  )
  logContribSig(circuit.id, participantIdx, contribSig)

  // verfiy contribution
  setStatus(`Verifying contribution...`)
  logger.info(`Veryfying the correctness of zKey...`)
  const veriRes = await timed("Contribution verification", async () =>
    await zKey.verifyFromR1cs(r1cs, ceremony.ptauFile, nextZKey, logger)
  )
  logger.info(`Verication result ${veriRes}`)
  if (!veriRes) {
    throw new Error("Failed to verify contribution")
  }

  setStatus(`Saving zKey and calculation hash...`)
  await storage.saveZKeyFile(ceremony.id, circuit.id, nextZKey.data!, zKeyIndex, logger)
  await storage.saveContribSigFile(ceremony.id, circuit.id, contribSig, zKeyIndex, logger)
  await firestoreAgt.setDownloadURLs(ceremony, circuit.id, userHash)

  compDispatch({
    type: "FinishCircuitComputation",
  })
}

const computeCircuit = async (
  ceremony: Ceremony,
  computation: Computation,
  participant: Participant,
  compDispatch: Dispatch<CompStateAction>,
  logger: Logger,
  circuit: Circuit,
  setStatus: (s: string) => void,
): Promise<ComputeCircuitResult> => {
  // at this point, newly added participant may or may not be listed
  await firestoreAgt.waitUntilParticipantIsListed(ceremony.id, circuit.id, participant)

  while (true) {
    // maket the list up-to-date first
    await firestoreAgt.processTimeouts(ceremony, circuit.id, logger)

    if (participant.isFailed) {
      logger.warn(`${participant.user} has failed the computation already. exiting...`)
      return { type: "AlreadyFailed" }
    }
    const { done, notDone } = await firestoreAgt.getDoneNotDoneParticipants(ceremony.id, circuit.id)
    if (
      notDone.length > 0 &&
      notDone[0].hash === computation.userHash &&
      notDone[0].startTime !== undefined
    ) {
      logger.info(`${participant.user} already started which should not happen. exiting...`)
      return { type: "AlreadyStarted" }
    }
    // otherwise check if this user is allowed to start
    const getLockRes = await firestoreAgt.try2GetCalculationLock(
      ceremony, circuit.id, computation.user, computation.userHash)

    if (getLockRes.type === "AllDone" || getLockRes.type === "ListEmpty") {
      logger.info(`No calculation slot for ${participant.user} found (${getLockRes.type}). will be try again....`)
      await sleep(ceremony.pollInterval * 1000)
      continue
    }
    else if (getLockRes.type === "Need2Wait") {
      logger.info(`${computation.user} (${computation.userHash}) is not allowed to start yet. will wait and try again...`)
      // wait for a while and try again
      await sleep(ceremony.pollInterval * 1000)
      continue
    }
    else if (getLockRes.type === "GotLock") {
      logger.info(`${computation.user} got the calculation lock and started calculating contribution for ${ceremony.id}/${circuit.id}`)
      try {
        await computeContribution(
          ceremony,
          circuit,
          computation,
          getLockRes.zKeyIndex,
          participant.hash,
          participant.index,
          setStatus,
          compDispatch,
        )
      } catch (err: any) {
        await firestoreAgt.setFailed(ceremony, circuit.id, computation.user, computation.userHash, err)
        compDispatch({
          type: "FailCircuitComputation",
          reason: err,
        })
      } finally {
        const res = await firestoreAgt.releaseCalculationLock(
          ceremony, circuit.id, computation.user, computation.userHash)

        if (res.type === "NoParticipant" || res.type === "AnotherParticipantOwnsLock" || res.type === "MultipleParticipants") {
          console.warn(`${computation.user} failed to release the calculation lock. This should not happen.`)
        }
        else if (res.type === "Released") {
        }
        else {
          const _: never = res
        }
      }
      return { type: "Succeeded" }
    }
  }
}

export const computeCircuits = async (
  ceremony: Ceremony,
  participant: Participant,
  computation: Computation,
  compDispatch: Dispatch<CompStateAction>,
) => {
  const logger = buildLogger(compDispatch)

  const setStatus = (status: string) => {
    compDispatch({
      type: "SetStatus",
      status,
    })
  }
  const numCircuits = computation.circuits.length
  logger.info(`Started calcuating ${numCircuits} circuits`)

  for (const circuit of computation.circuits) {
    const msg = `Joined '${circuit.id}'`
    logger.info(msg)
    setStatus(msg)

    const res = await computeCircuit(
      ceremony,
      computation,
      participant,
      compDispatch,
      logger,
      circuit,
      setStatus,
    )
    console.log(`Compute circuit result`, JSON.stringify(res))
    if (res.type === "Succeeded") {
      continue
    }
    else if (res.type === "AlreadyFailed" || res.type === "AlreadyStarted") {
      return
    }
    else { const _: never = res }
  }
}
