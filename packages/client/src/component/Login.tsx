import { useUserDispatch } from "../context/User"
import { useCeremony } from "../context/Computation"
import firebase from "firebase"
import "../public/style.css"

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
      <span id="login-button" onClick={handleGitHubLogin}>
        [GitHub Login]
      </span>
    </div>
  )
}

interface LoginPanelProps {}

export const Login = (props: LoginPanelProps) => {
  const ceremony = useCeremony()
  return (
    <>
      <div className="page-header">{ceremony.projectId}/{ceremony.id}</div>

      <div className="center desc" >
        {`Trusted Setup Ceremony held between ${ceremony.startTime.format("YYYY-MM-DD")} and ${ceremony.endTime.format("YYYY-MM-DD")}`}
      </div>

      <div className="center desc">
        {`Participate using your GitHub account.`}
      </div>

      <Body />
    </>
  )
}
