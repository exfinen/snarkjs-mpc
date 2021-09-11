import { CeremonyEnv } from "@snarkjs-mpc/shared-types"

export type CeremonyEnvCfg = Omit<CeremonyEnv, "startTime" | "endTime"> & {
  startTime: string,
  endTime: string,
}

export const config: CeremonyEnvCfg = {
  id: "kindaichi",
  projectId: "zkcream",
  circuitDirs: [
    "snarkjs-tutorial",
    "vote",
  ],
  startTime: "2021-09-01",
  endTime: "2021-12-31",
  startTimeout: 15,  // in sec
  contribTimeout: 10 * 60,  // in sec
  pollInterval: 15,  // in sec
  logWindowSize: 20,
  maxContribRatio: 0.67,

}

export default config
