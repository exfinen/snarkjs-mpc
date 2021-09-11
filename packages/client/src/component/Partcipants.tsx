import * as React from "react"
import { useEffect } from "react"
import {
  CeremonyEnv,
  Participant,
} from "@snarkjs-mpc/shared-types"
import { FirestoreAgt } from "../agent/firestoreAgt"
import { Computation } from "../types"
import { ymdHms } from "../utils"
import "../public/style.css"

interface ParticipantsProps {
  key: string,
  ceremonyEnv: CeremonyEnv,
  compState: Computation,
  circuitId: string,
}

export const Participants = (props: ParticipantsProps) => {
  const [participants, setParticipants] = React.useState([] as Participant[])
  const firestoreAgt = new FirestoreAgt()

  useEffect(() => {
    firestoreAgt.listen2CircuitDocChanges(
      (circuitSs) => {
        setParticipants(circuitSs.data()!.participants)
      },
      props.ceremonyEnv, props.circuitId)
  }, [])

  // get user with calculation right
  const dnd = firestoreAgt.getDoneNotDone(participants)
  const calcRightUserHash = dnd.notDone.length > 0 ? dnd.notDone[0].hash : ""

  const participantRows = participants.map(x => {
    const userHash = props.compState.userHash
    const userNonUser = x.hash === userHash ? "user-row" : "non-user-row"
    const calcRightPtr = x.hash === calcRightUserHash ? ">>" : ""

    const startTime = x.startTime === undefined ? '-' : x.startTime.format(ymdHms)
    const endTime = x.endTime === undefined ? '-' : x.endTime.format(ymdHms)
    const shouldShowURL = !x.isFailed && x.endTime !== undefined
    const zKeyURL = x.zKeyURL !== "" && shouldShowURL && <a href={x.zKeyURL}>zKey</a>
    const contribSigURL = x.contribSigURL !== "" && shouldShowURL && <a href={x.contribSigURL}>contribSig</a>

    return (
      <tr className={userNonUser} key={`${x.index}`}>
        <td>{ calcRightPtr }</td>
        <td>{ x.index }</td>
        <td>{ x.user } ({ x.hash.slice(0, 8) }...)</td>
        <td>{ startTime }</td>
        <td>{ endTime }</td>
        <td>{ x.failureReason }</td>
        <td>{ zKeyURL }</td>
        <td>{ contribSigURL }</td>
      </tr>
    );
  })

  return (
    <>
      <div className="participants-header">"{props.circuitId}" participants</div>
      <table className="participants-table">
        <thead>
          <tr>
            <th></th>
            <th className="id-col">Contributor #</th>
            <th>E-mail</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Failure Reason</th>
            <th>zKey</th>
            <th>Contrib Sig</th>
          </tr>
        </thead>
        <tbody>
          { participantRows }
        </tbody>
      </table>
    </>
  )
}
