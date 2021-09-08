import dayjs from "dayjs"
import * as React from "react"
import { Dispatch } from "react"
import { Logger } from "snarkjs"
import { CompStateAction } from "./context/Computation"

type Setter<T> = (t: T) => void
type Value<T> = T | undefined

export const ymdHms = "YYYY-MM-DD HH:mm:ss"

export function createMutableContext<T>(x: [T, Setter<T>]) {
  const Context = React.createContext<[Value<T>, Setter<T>]>(x)

  function useContext() {
    const [context, setContext] = React.useContext(Context)
    if (context === undefined) {
      throw new Error(`Context Provider is missing`)
    }
    return [context, setContext]
  }
  return [Context.Provider, useContext] as [React.Provider<[Value<T>, Setter<T>]>, () => [T, Setter<T>]]
}

export function createImmutableContext<T>(defaultValue?: T) {
  const Context = React.createContext<T | undefined>(defaultValue)

  function useContext() {
    const context = React.useContext(Context)
    if (context === undefined) {
      throw new Error(`Context Provider is missing`)
    }
    return context
  }
  return [Context.Provider, useContext] as [React.Provider<T>, () => T]
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => resolve(), ms)
  })
}

export function last<T>(xs: T[]): T | undefined {
  if (xs.length === 0) return undefined
  return xs[xs.length - 1]
}

const fireAddLog = (
  compDispatch: React.Dispatch<CompStateAction>,
  msg: string,
) => {
  const timedMsg = `[${dayjs().format(`HH:mm:ss`)}] ${msg}`
  compDispatch({
    type: "AddLog",
    msg: timedMsg,
  })
  console.log(timedMsg)
}

const fireAddContribSig = (
  compDispatch: React.Dispatch<CompStateAction>,
  circuitId: string,
  participantIdx: number,
  sig: Uint8Array,
) => {
  compDispatch({
    type: "AddContribSig",
    participantIdx,
    circuitId,
    sig,
  })
}

export type ContribSigLogger =
  (circuitId: string, participantIdx: number, sig: Uint8Array) => void

export const buildLogger: (compDispatch: Dispatch<CompStateAction>) => Logger =
  (compDispatch: Dispatch<CompStateAction>) => {
    const f = (msg: string) => fireAddLog(compDispatch, msg)
    return {
      log: (msg: string) => f(msg),
      debug: (msg: string) => f(msg),
      info: (msg: string) => f(msg),
      warn: (msg: string) => f(msg),
      error: (msg: string) => f(msg),
    }
  }

export const buildContribSigLogger: (compDispatch: Dispatch<CompStateAction>) => ContribSigLogger =
  (compDispatch: Dispatch<CompStateAction>) => {
    return (
      circuitId: string,
      participantIdx: number,
      sig: Uint8Array,
    ) => fireAddContribSig(compDispatch, circuitId, participantIdx, sig)
  }
