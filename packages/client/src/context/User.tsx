import * as React from "react"
import {
  Dispatch,
  PropsWithChildren,
  useReducer,
} from "react"
import firebase from "firebase"
import { StorageAgt } from "../agent/storageAgt"
import {
  createImmutableContext,
} from "../utils"
import { User } from '../types'

export const defaultUser: User = {
  firebaseUser: undefined,
  credential: undefined,
  desc: "",
}

interface LoginAction {
  type: "Login",
  user: firebase.User,
  credential: firebase.auth.AuthCredential,
}
interface LogoutAction {
  type: "Logout",
}
type Action =
  | LoginAction
  | LogoutAction

type Props = PropsWithChildren<{}>

export const [UserDispatchProvider, useUserDispatch] = createImmutableContext<Dispatch<Action>>()
export const [UserStateProvider, useUserState] = createImmutableContext<User>()

const storage = new StorageAgt()

export const UserProvider = (props: Props) => {
  const reducer = (user: User, action: Action): User => {

    if (action.type === "Login") {
      console.log(`User logged in: ${JSON.stringify(action.user.displayName)}`)
      return {...user, credential: action.credential, firebaseUser: action.user}

    } else if (action.type === "Logout") {
      console.log(`Logged out`);
      firebase.auth().signOut();
      return {...user, credential: undefined, firebaseUser: undefined}

    } else {
      //const _: never = action.type
    }
    return user
  }
  const [user, dispatch] = useReducer(reducer, defaultUser)

  return (
    <UserStateProvider value={user}>
      <UserDispatchProvider value={dispatch}>
        { props.children }
      </UserDispatchProvider>
    </UserStateProvider>
  )
};
