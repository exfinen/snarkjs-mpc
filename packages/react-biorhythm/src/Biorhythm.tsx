import dayjs from "dayjs"
import "../public/style.css"

export interface BiorhythmProps {
  birthday: Date,
  width: number,
  height: number,
  daysBeforeToday: number,
  daysAfterToday: number,
}

enum Period {
  Physical = 23,
  Emotinoal = 28,
  Intellectual = 33,
}

const getMask = (period: Period): number => {
  if (period === Period.Physical) return 1
  else if (period === Period.Emotinoal) return 2
  else return 4
}

const drawGraph = (
  props: BiorhythmProps,
  daysSinceBirth: number,
) => {

  const begX = daysSinceBirth - props.daysBeforeToday
  const endX = daysSinceBirth + props.daysAfterToday

  const screen: number[] = new Array(props.width * props.height).fill(0)
  const screenRatio = props.width / (endX - begX + 1)

  const f = (t: number, T: Period) => Math.sin(2.0 * Math.PI * t / T)

  // calculate graphs
  for(const period of [Period.Physical, Period.Emotinoal, Period.Intellectual]) {
    const mask = getMask(period)

    for(let t=begX; t<=endX; ++t) {
      for(let delta=0; delta<1; delta+=0.2) {
        const r = f(t + delta, period)

        const y = Math.floor(props.height - ((r + 1) / 2 * props.height))  // 0 - height inverted
        const x = Math.floor((t - begX + delta) * screenRatio)
        const i = x + y * props.width

        screen[i] = screen[i] | mask
      }
    }
  }

  // render graphs
  const lines: JSX.Element[][] = new Array(props.height).fill(<span>&nbsp;</span>)
  const physical = 1
  const emotional = 2
  const intellectual = 4

  for(let y=0; y<props.height; ++y) {
    const xs = screen.slice(y * props.width, (y + 1) * props.width)

    const line = xs.map((x, i) => {
      if (y === Math.floor(props.height / 2)) {
        return <span>-</span>
      } else {
        if (i === Math.floor(props.daysBeforeToday * screenRatio)) {
          return <span className="biorhythm-divisor">&nbsp;</span>
        } else {
          // if the point has multiple rhythms, pick up the one w/ the largest mask
          if (x !== 0 && x !== physical && x !== emotional && x !== intellectual) {
            x = Math.max(Math.max(Math.max(x, physical), emotional), intellectual)
          }
          if (x === 0) {
            return <span>&nbsp;</span>
          }
          else if (x === physical) {
            return <span className="biorhythm-physical">X</span>
          }
          else if (x === emotional) {
            return <span className="biorhythm-emotional">O</span>
          } else {
            return <span className="biorhythm-intellectual">*</span>
          }
        }
      }
    })
    lines[y] = line
  }

  const charScreen = lines.map(line => <div>|{line}|</div>)

  return (
    <div>
      <div>{"-".repeat(props.width + 2)}</div>
      {charScreen}
      <div>{"-".repeat(props.width + 2)}</div>
    </div>
  )
}

export const Biorhythm = (props: BiorhythmProps) => {
  const birthday = dayjs(props.birthday)
  const today = dayjs()

  const days = today.diff(birthday, "day")
  const f = (T: Period) => {
    return Math.sin(2.0 * Math.PI * days / T)
  }
  const graph = drawGraph(props, days)

  return (
    <>
      <div className="mono biorhythm-header">
        <div>Birthday: {birthday.format("YYYY-MM-DD")}</div>
        <div>Days since birth: {days}</div>
      </div>

      <div>
        <span className="mono biorhythm-physical right-pad">Physical:</span>
        <span className="mono biorhythm-physical">{f(Period.Physical).toFixed(2)}%</span>
      </div>
      <div>
        <span className="mono biorhythm-emotional right-pad">Emotional:</span>
        <span className="mono biorhythm-emotional">{f(Period.Emotinoal).toFixed(2)}%</span>
      </div>
      <div>
        <span className="mono biorhythm-intellectual right-pad">Intellectual:</span>
        <span className="mono biorhythm-intellectual">{f(Period.Intellectual).toFixed(2)}%</span>
      </div>
      <div className="mono biorhythm-graph">
        {graph}
      </div>
    </>
  )
}
