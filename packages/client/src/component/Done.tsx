import * as React from "react"
import {
  useCeremony,
  useCompState,
} from "../context/Computation"
import { StorageAgt } from "../agent/storageAgt"
import { Participants } from "./Partcipants"
import { GistAgt } from "../agent/gistAgt"
import "../public/style.css"

interface DoneProps {
  storage: StorageAgt,
}

export const Done = (props: DoneProps) => {
  const gistAgt = new GistAgt()
  const ceremony = useCeremony()
  const computation = useCompState()


  const participants = computation.circuits.map(circuit =>
    <Participants
      key={circuit.id}
      ceremonyEnv={ceremony}
      compState={computation}
      circuitId={circuit.id}
    />
  )

  const handlePublish2Git = async () => {
    console.log(`Publishing attestation to Gist...`)
    await gistAgt.publishContribDoc(ceremony, computation)
    console.log(`Published`)
    alert("Published")
  }

  const tweetText=`Join ${ceremony.projectId}/${ceremony.id} ceremony at https://${ceremony.projectId}.web.app`
  return (
    <>
      <div className="page-header">Done</div>

      <div className="center">
        <span id="publish-attestation-button" onClick={handlePublish2Git}>
            [Publish attestation to Gist]
        </span>
      </div>
      <div className="center">
        <span className="tweet-link">
          <a
            className="twitter-share-button no-underline"
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
            target="_blank"
          >
          [Tweet]</a>
        </span>
      </div>

      { participants }
    </>
  )
}
