import { Config } from './config'

const config: Config = {
  projectId: "zkcream",
  ceremonyId: "shimoburo",
  circuitDirs: [
    "snarkjs-tutorial",
    "vote",
  ],
  timeout: {  // in sec
    start: 30,
    contrib: 5 * 60,
  },
  pollInterval: 5,
  windowSize: {
    logs: 20,
    participants: 10,
  },
  maxContribRatio: 0.67,
}

module.exports = config