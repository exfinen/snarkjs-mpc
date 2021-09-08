import * as React from "react"
import "../public/style.css"

interface FailedProps {
  status: string,
}

export const Failed = (props: FailedProps) => {
  return (
    <>
      <div className="page-header">Failed</div>
      <div className="status">
        { props.status }
      </div>
    </>
  )
}
