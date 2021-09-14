import * as React from 'react'
import { MainPanel } from "./MainPanel"
import {
  CeremonyEnvProvider,
} from "../context/Computation"
import { UserProvider } from "../context/User"
import { StorageAgt } from "../agent/storageAgt"
import "../public/style.css"
import firebase from 'firebase/app'

interface AppProps {
}

export const App = (props: AppProps) => {
  const storage = new StorageAgt()

  return (
    <CeremonyEnvProvider>
      <UserProvider>
          <MainPanel storage={storage} />
        <div style={{ height: '140px' }} />
      </UserProvider>
    </CeremonyEnvProvider>
  );
};
