import { useUserDispatch } from "../context/User"
import firebase from "firebase"
import "../public/style.css"
import { CeremonyEnv } from "@snarkjs-mpc/shared-types/src"
import { Biorhythm } from "react-biorhythm"
import { useEffect, useState, useRef } from "react"
import dayjs from "dayjs"

const dockerNames = require('docker-names')

const Body = () => {
  const userDispatch = useUserDispatch()

  const handleTestLogin = () => {
    const name = dockerNames.getRandomName()
    const user: any = {
      email: `${name}@foo.com`,
      displayName: `${name}`,
    }
    const credential: any = {}
    userDispatch({
      type: "Login",
      user,
      credential,
    })
  }

  const handleGitHubLogin = async () => {
    const provider = new firebase.auth.GithubAuthProvider()
    provider.addScope('read:user')
    provider.addScope('gist')

    try {
      // TODO move this to FirebaseAgt
      await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE)
      const result = await firebase.auth().signInWithPopup(provider)
      //console.log(`Authorization result: ${JSON.stringify(result)}`)

      if (result === null) {
        throw new Error(`signInWithPopup returned null`)
      }
      if (result.user === null) {
        throw new Error(`user is null`)
      }
      if (result.credential === null) {
        throw new Error(`credential is null`)
      }

      const user = result.user!;
      const credential = result.credential! as firebase.auth.OAuthCredential;
      userDispatch({
        type: "Login",
        user,
        credential,
      })
    } catch (err) {
      // TODO show gui error message
      console.error(`GitHub login failed: ${err}`)
    }
  }

  return (
    <div className="center">
      <span id="login-button" className="btn" onClick={handleGitHubLogin}>
        GitHub Login
      </span>
    </div>
  )
}

interface LoginPanelProps {
  ceremony: CeremonyEnv,
}

export const Login = (props: LoginPanelProps) => {
  const projectId = props.ceremony.projectId
  const ceremonyId = props.ceremony.id
  const startTime = props.ceremony.startTime.format("YYYY-MM-DD")
  const endTime = props.ceremony.endTime.format("YYYY-MM-DD")
  const biorhythmBegDate = "1920-01-01"

  const [birthday, setBirthday] = useState(dayjs(biorhythmBegDate))
  const birthdayRef = useRef(birthday)

  useEffect(() => {
    birthdayRef.current = birthday
  }, [birthday])

  useEffect(() => {
    setInterval(() => {
      const nextDay = birthdayRef.current.add(1, "day")
      if (nextDay.isAfter(dayjs().add(-1, "day"))) {
        setBirthday(dayjs(biorhythmBegDate))
      } else {
        setBirthday(nextDay)
      }
    }, 2000)
  }, [])

  return (
    <>
      <div className="page-header">{projectId}/{ceremonyId}</div>

      <div className="center desc" >
        {`Trusted Setup Ceremony held between ${startTime} and ${endTime}`}
      </div>

      <div className="center desc">
        {`Participate using your GitHub account.`}
      </div>

      <Body />

      <div className="center biorhythm">
        <Biorhythm
          birthday={birthday.toDate()}
          width={100}
          height={50}
          daysBeforeToday={20}
          daysAfterToday={30}
        />
      </div>
    </>
  )
}
