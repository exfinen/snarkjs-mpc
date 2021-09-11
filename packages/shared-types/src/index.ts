import dayjs from "dayjs"
import firebase from 'firebase/app'
import "firebase/firestore"

export interface MpcConfig {
  currentCeremony: string,
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
  maxContribRatio: number,
}

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

export const toNullableNumber = (x: number | undefined): number | null => {
  if (x === undefined) return null
  return x
}

export const toMaybeUndefinedNumber = (x: number | null): number | undefined => {
  if (x === null) return undefined
  return x
}

export const toDayjs = (x: firebase.firestore.Timestamp | null): dayjs.Dayjs | undefined => {
  if (x === null) return undefined
  return dayjs(x.toMillis())
}
