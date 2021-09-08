import * as React from "react"
import { useCeremony, useCompState } from "../context/Computation"
import { Participants } from "./Partcipants"
import { CalcLog } from "./CalcLog"
import "../public/style.css"

interface ProgressPanelProps {
  logLines: string[],
  windowSize: number,
}

export const Progress = (props: ProgressPanelProps) => {
  const compState = useCompState()
  const ceremony = useCeremony()

  const participants = compState.circuits.map(circuit =>
    <Participants
      key={circuit.id}
      ceremonyEnv={ceremony}
      compState={compState}
      circuitId={circuit.id}
    />
  )
  const user = `${compState.user} (${compState.userHash.slice(0, 8)})`
  return (
    <>
      <div className="page-header">{user} contributing...</div>
      <div className="status">{ compState.status }</div>
      <CalcLog logLines={props.logLines} windowSize={props.windowSize} />
      { participants }
    </>
  )
}
