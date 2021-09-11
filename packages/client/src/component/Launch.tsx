import * as React from 'react'
import { useState, useEffect } from 'react'
import {
  useCompState,
  useCeremony,
  useCompDispatch,
  computeUserHash,
} from "../context/Computation"
import { useUserState } from "../context/User"
import { StorageAgt } from "../agent/storageAgt"
import { Participants } from "./Partcipants"
import "../public/style.css"
import { Ceremony } from "../types"

interface Props {
  showLaunchButton: boolean,
  storage: StorageAgt,
}

export const Launch = (props: Props) => {
  const compState = useCompState()
  const user = useUserState()
  const ceremony = useCeremony()
  const compDispatch = useCompDispatch()
  const [participants, setParticipants] = useState([] as JSX.Element[])

  React.useEffect(() => {
    const f = async () => {
      compDispatch({
        type: "SetCircuits",
        circuits: await props.storage.getInitialCircuits(ceremony.id, ceremony.circuitDirs),
      })
    }
    if (ceremony.id !== "") f()
  }, [ceremony.circuitDirs, ceremony.id, compDispatch])

  const handleStart = async () => {
    compDispatch({
      type: "Start",
      user: user!.firebaseUser!.email!,
      userHash: await computeUserHash(user),
      maxContribRatio: ceremony.maxContribRatio,
      gitHubAccessToken: user!.credential!.accessToken!,
      ceremony,
      compDispatch,
    })
  }

  const handleClearList = () => {
    compDispatch({
      type: "ClearParticipantList",
      ceremonyId: ceremony.id,
    })
  }

  React.useEffect(() => {
    const xs = compState.circuits.map(circuit =>
      <Participants
        key={circuit.id}
        ceremonyEnv={ceremony}
        compState={compState}
        circuitId={circuit.id}
      />
    )
    setParticipants(xs)
  }, [compState.circuits])

  const launchCeremonyButton = props.showLaunchButton &&
    <div className="center">
      <span id="launch-ceremony-button" onClick={handleStart}>
        [Launch Ceremony]
      </span>
    </div>

  const ceremonyReady =
    <>
      <div className="desc">
        {`Thank you for joining us for ${ceremony.id} trusted setup ceremony!`}
      </div>
      <div className="desc">
        {`Ready to make your contribution?`}
      </div>
      { launchCeremonyButton }
    </>

  const ceremonyClosed =
    <div className="center status">
      {`Our ceremony has ended. Stay tuned for an update.`}
    </div>

  let body = undefined
  if ((compState.step === "NotStarted" || compState.step === "CircuitsReady") && ceremony.ptauFile.length !== 0) {
    body = ceremonyReady
  } else if (compState.step === "Completed") {
    body = ceremonyClosed
  }

  return (
    <>
      <div className="page-header">Welcome!</div>
      {body}
      <div className="center">
        <span id="clear-participant-list-button" onClick={handleClearList}>
          [Clear Participant List]
        </span>
      </div>
      { participants }
    </>
  );
}
