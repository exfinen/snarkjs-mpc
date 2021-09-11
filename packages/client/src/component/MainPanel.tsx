import React from "react"
import { useUserState } from "../context/User"
import {
  useCeremony,
  useCompState,
} from '../context/Computation'
import { Launch } from "./Launch"
import { Progress } from "./Progress"
import { Login } from "./Login"
import { Done } from "./Done"
import { Failed } from "./Failed"
import { StorageAgt } from "../agent/storageAgt"
import { CeremonyEnv } from "@snarkjs-mpc/shared-types"

interface MainPanelProps {
  storage: StorageAgt,
}

export const MainPanel = (props: MainPanelProps) => {
  const ceremony = useCeremony()
  const compState = useCompState()
  const user = useUserState()

  let body = <Login ceremony={ceremony}/>

  if (user.firebaseUser === undefined) {
    body = <Login ceremony={ceremony}/>
  } else {
    if (compState.step === "NotStarted") {
      body = <Launch
        showLaunchButton={false}
        storage={props.storage}
      />
    } else if (compState.step === "CircuitsReady") {
      body = <Launch
        showLaunchButton={true}
        storage={props.storage}
      />
    } else if (compState.step === "Started") {
      body = <Progress
        logLines={compState.logLines}
        windowSize={ceremony.logWindowSize}
      />

    } else if (compState.step === "Completed") {
      body = <Done
        storage={props.storage}
      />
    } else if (compState.step === "Failed") {
      body = <Failed
        status={compState.status}
      />

    } else {
      const _: never = compState.step
    }
  }

  return (
    <>
      {body}
    </>
  )
}
