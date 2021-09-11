import firebase from "firebase"
import {
  CeremonyEnv,
  CircuitCfg,
} from "@snarkjs-mpc/shared-types"

export interface User {
  firebaseUser: firebase.User | undefined,
  credential: firebase.auth.OAuthCredential | undefined,
  desc: string,
}

export type Ceremony = CeremonyEnv & { ptauFile: Uint8Array }

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
