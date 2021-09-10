export interface Config {
  projectId: string,
  ceremonyId: string,
  circuitDirs: string[],
  timeout: {  // in sec
    start: number,
    contrib: number,
  },
  pollInterval: number,
  windowSize: {
    logs: number,
    participants: number,
  },
  maxContribRatio: number,
}
