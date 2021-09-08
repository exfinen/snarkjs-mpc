import firebase from "firebase"
import * as dayjs from "dayjs"

export interface User {
  firebaseUser: firebase.User | undefined,
  credential: firebase.auth.OAuthCredential | undefined,
  desc: string,
}

export interface CeremonyEnv {
  id: string,
  projectId: string,
  circuitDirs: string[],
  startTime: dayjs.Dayjs,
  endTime: dayjs.Dayjs,
  startTimeout: number,
  contribTimeout: number,
  pollInterval: number,
  logWindowSize: number,
  maxContrib: number,
}

export type Ceremony = CeremonyEnv & { ptauFile: Uint8Array }

interface BaseParticipant {
  index: number,
  user: string,  // email address
  hash: string,
  zKeyURL: string,
  contribSigURL: string,
  isFailed: boolean,
  failureReason: string,
}

export type Participant = BaseParticipant & {
  createdAt: dayjs.Dayjs,
  zKeyIndex: number | undefined,
  startTime: dayjs.Dayjs | undefined,
  endTime: dayjs.Dayjs | undefined,
}

export type ParticipantFirestore = BaseParticipant & {
  createdAt: firebase.firestore.Timestamp,
  zKeyIndex: number | null,
  startTime: firebase.firestore.Timestamp | null,
  endTime: firebase.firestore.Timestamp | null,
}

export interface CircuitCfg {
  id: string,
  participants: Participant[],
}

export interface CircuitCfgFirestore {
  id: string,
  participants: ParticipantFirestore[],
}

export type Circuit = CircuitCfg & {
  r1cs: Uint8Array | undefined,
}

export interface ContribSig {
  circuitId: string,
  participantIdx: number,
  sig: Uint8Array,
}

export type ComputationStep =
  | "NotStarted"
  | "CircuitsReady"
  | "Started"
  | "Failed"
  | "Completed"

export interface Computation {
  step: ComputationStep,
  currCircuit: number,
  circuits: Circuit[],
  user: string,
  userHash: string,
  gitHubAccessToken: string,
  status: string,
  logLines: string[]
  contribSigs: ContribSig[],
}
