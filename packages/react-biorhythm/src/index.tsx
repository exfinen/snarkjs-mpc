import * as ReactDOM from "react-dom"
import * as React from "react"
import { Biorhythm } from "./Biorhythm"

export { Biorhythm } from "./Biorhythm"

// render the component for testing purpose

const birthday = new Date(1951, 11, 8)  // month is 0-based

ReactDOM.render(
  <React.StrictMode>
    <Biorhythm
      birthday={new Date(1998, 5, 19)}
      width={100}
      height={50}
      daysBeforeToday={20}
      daysAfterToday={30}
    />
  </React.StrictMode>,
  document.getElementById("app")
)
