import * as React from "react"
import { useEffect, useState } from "react"
import "../public/style.css"

interface CalcLogProps {
  logLines: string[],
  windowSize: number,
}

export const CalcLog = (props: CalcLogProps) => {
  const [lines, setLines] = useState([] as JSX.Element[])

  useEffect(() => {
    const xs = []
    const start = Math.max(props.logLines.length - props.windowSize, 0)
    for(let i=start; i<props.logLines.length; ++i) {
      xs.push(<tr key={i}><td className="calc-log-row">{ props.logLines[i] }</td></tr>)
    }
    setLines(xs)
  }, [props.logLines])

  return (
    <div className="calc-log-table">
      <table>
        <tbody>
          { lines }
        </tbody>
      </table>
    </div>
  )
}
