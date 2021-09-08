import * as React from 'react'
import { MainPanel } from "./MainPanel"
import { CeremonyEnvProvider } from "../context/Computation"
import { UserProvider } from "../context/User"
import { StorageAgt } from '../agent/storageAgt'
import { FirestoreAgt } from '../agent/firestoreAgt'
import { CeremonyEnv } from '../types'
import { useEffect, useState } from 'react'
import "../public/style.css"

interface AppProps {
}

const App = (props: AppProps) => {
  const storage = new StorageAgt()
  const firestoreAgt = new FirestoreAgt()

  // TODO move this out to config file
  const initialCeremonyEnv: CeremonyEnv = firestoreAgt.initialCeremonyEnv(
    "zkcream",   // project id
    "shimoburo",  // ceremony id
    [  // circuit dirs
      // "snarkjs-tutorial",
      "vote",
    ],
    30,   // start timeout (sec)
    5 * 60,   // contrib timeout (sec)
    5,   // poll interval (sec)
    20,  // log window size
    0.67,  // max contribution ratio
  )

  const [ceremonyEnv, setCeremonyEnv] =
    useState<CeremonyEnv>(initialCeremonyEnv)

  useEffect(() => {
    const f = async () => {
      const x = await firestoreAgt.getCeremonyEnv(ceremonyEnv.id)
      if (x === undefined) {
        throw new Error(`Missing ceremony ${ceremonyEnv.projectId}`)
      }
      console.log(`Starting application w/ ${JSON.stringify(x)}`)
      setCeremonyEnv(x)
    }
    if (ceremonyEnv === undefined) f()

  }, [ceremonyEnv])

  return (
    <CeremonyEnvProvider {...ceremonyEnv}>
      <UserProvider>
          <MainPanel storage={storage} />
        <div style={{ height: '140px' }} />
      </UserProvider>
    </CeremonyEnvProvider>
  );
};

export default App
