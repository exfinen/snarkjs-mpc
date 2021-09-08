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

interface MainPanelProps {
  storage: StorageAgt,
}

export const MainPanel = (props: MainPanelProps) => {
  const compState = useCompState()
  const user = useUserState()
  const ceremony = useCeremony()

  let body = <Login/>

  if (user.firebaseUser === undefined) {
    body = <Login/>
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
        circuitDir={ceremony.circuitDirs[0]}
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
