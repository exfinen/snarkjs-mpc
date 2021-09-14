import * as ReactDOM from "react-dom"
import { App } from "./component/App"
import * as React from "react"
import * as process from "process"
import firebase from "firebase/app"

window["process"] = process

ReactDOM.render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>,
  document.getElementById('app')
)
