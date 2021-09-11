import dayjs from "dayjs"
import { config } from "../config/default"
import { CeremonyEnv } from "@snarkjs-mpc/shared-types"

export const ceremony: CeremonyEnv = {...config,
  startTime: dayjs(config.startTime),
  endTime: dayjs(config.endTime),
}
