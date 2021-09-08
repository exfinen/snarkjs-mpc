import firebase from 'firebase/app'
import "firebase/firestore"
import { AddParticipantResult, FirestoreAgt } from "./firestoreAgt"
import {
  CeremonyEnv,
  Participant,
} from "../types"
import stringify from 'json-stringify-nice'
import dayjs from 'dayjs'

describe("Firebase Agent", () => {
  const firestoreAgt = new FirestoreAgt()
  const maxContrib = 0.5  // 50%
  const ceremonyEnv: CeremonyEnv = {
    id: 'test',
    projectId: 'zkTest',
    circuitDirs: ['circuit1'],
    startTime: dayjs(),
    endTime: dayjs(),
    startTimeout: 1,  // 1 sec
    contribTimeout: 10,  // 10 sec
    pollInterval: 1,  // 1 sec
    logWindowSize: 0,
    maxContrib,
  }
  const ceremonyId = ceremonyEnv.id
  const circuitId = ceremonyEnv.circuitDirs[0]

  const getUser = (id: number): [string, string] => {
    return [`user${id}`, `hash${id}`]
  }

  const clearList = async () => {
    // prepare fresh participant list
    await firestoreAgt.deleteCeremonyEnv(ceremonyEnv.id)
    await firestoreAgt.addCeremonyEnv(ceremonyEnv)
    await firestoreAgt.addCircuits(ceremonyEnv)
  }

  describe.only("Get now", () => {
    const x = firestoreAgt.getNowAsUint8Array()
    console.log(x)
  })

  describe("Adding participant", () => {
    const user = "foo"
    const userHash = "hash-of-foo"

    beforeEach(async () => {
      await clearList()
    })

    it("should add to empty list", async () => {
      const res = await firestoreAgt.addParticipant(ceremonyId, circuitId, user, userHash, maxContrib)
      expect(res).toEqual({ type: "Added" })

      const ps = await firestoreAgt.getParticipants(ceremonyId, circuitId)
      expect(ps.length).toBe(1)
      expect(ps[0].index).toBe(1)
      expect(ps[0].user).toBe(user)
      expect(ps[0].hash).toBe(userHash)
      expect(ps[0].startTime).toBeUndefined()
      expect(ps[0].endTime).toBeUndefined()
      expect(ps[0].isFailed).toBeFalsy()
      expect(ps[0].failureReason).toBe("")
    })

    it("should assign 1-based indices to participants in ascending order", async () => {
      const res1 = await firestoreAgt.addParticipant(ceremonyId, circuitId, user, userHash, maxContrib)
      expect(res1).toEqual({ type: "Added" })

      const res2 = await firestoreAgt.addParticipant(ceremonyId, circuitId, `${user}!`, `${userHash}1`, maxContrib)
      expect(res2).toEqual({ type: "Added" })

      const ps = await firestoreAgt.getParticipants(ceremonyId, circuitId)
      expect(ps.length).toBe(2)
      expect(ps[0].index).toBe(1)
      expect(ps[1].index).toBe(2)
    })

    //await expect(f()).rejects.toThrow()
    it("should not add if the participant is on the list already and not started", async () => {
      const res1= await firestoreAgt.addParticipant(ceremonyId, circuitId, user, userHash, maxContrib)
      expect(res1).toEqual({ type: "Added" })

      const res2 = await firestoreAgt.addParticipant(ceremonyId, circuitId, user, userHash, maxContrib)
      expect(res2).toEqual({ type: "AlreadyWaiting" })
    })

    describe("Max contrib ratio check", () => {
      it("should add if the partipant hasn't been added before", async () => {
        const [user, hash] = getUser(2)
        const res = await firestoreAgt.addParticipant(ceremonyId, circuitId, user, hash, 0.50)

        expect(res).toEqual({ type: "Added" })
      })

      it("should add if contrib ratio < maxContribRatio", async () => {
        // 50% contribution w/ 51% limit
        const [user1, hash1] = getUser(1)
        await addDone(user1, hash1)

        const [user2, hash2] = getUser(2)
        await addDone(user2, hash2)

        const [user3, hash3] = getUser(3)
        await addDone(user3, hash3)

        const res = await firestoreAgt.addParticipant(ceremonyId, circuitId, user3, hash3, 0.51)

        expect(res).toEqual({ type: "Added" })
      })

      it("should add if contrib ratio == maxContribRatio", async () => {
        // 50% contribution w/ 50% limit
        const [user1, hash1] = getUser(1)
        await addDone(user1, hash1)

        const [user2, hash2] = getUser(2)
        await addDone(user2, hash2)

        const [user3, hash3] = getUser(3)
        await addDone(user3, hash3)

        const res = await firestoreAgt.addParticipant(ceremonyId, circuitId, user3, hash3, 0.50)

        expect(res).toEqual({ type: "Added" })
      })

      it("should not add if contrib ratio > maxContribRatio", async () => {
        // 50% contribution w/ 49% limit
        const [user1, hash1] = getUser(1)
        await addDone(user1, hash1)

        const [user2, hash2] = getUser(2)
        await addDone(user2, hash2)

        const [user3, hash3] = getUser(3)
        await addDone(user3, hash3)

        const res = await firestoreAgt.addParticipant(ceremonyId, circuitId, user3, hash3, 0.49)

        await expect(res).toEqual({ type: "ExceededContribLimit" })
      })
    })

    it("should add if all existing records of the participant is failure", async () => {
      const failure: Participant = {
        index: 0,
        zKeyIndex: 0,
        user,
        hash: userHash,
        zKeyURL: "",
        contribSigURL: "",
        createdAt: dayjs(),
        startTime: undefined,
        endTime: undefined,
        isFailed: true,
        failureReason: "some reason",
      }
      const res1 = await firestoreAgt.addParticipant(ceremonyId, circuitId, user, userHash, maxContrib, failure)
      expect(res1).toEqual({ type: "Added" })

      const res2 = await firestoreAgt.addParticipant(ceremonyId, circuitId, user, userHash, maxContrib)
      expect(res2).toEqual({ type: "Added" })

      const ps = await firestoreAgt.getParticipants(ceremonyId, circuitId)
      expect(ps.length).toBe(2)
      expect(ps[0].isFailed).toBeTruthy()
      expect(ps[1].isFailed).toBeFalsy()
    })
  })

  describe("Partition/merge participants", () => {
    describe("Partitioning", () => {
      const pred = (x: Participant) => x.isFailed
      const p = (isFailed: boolean): Participant => {
        return {
          index: 0,
          zKeyIndex: 0,
          user: "user",
          hash: "hash",
          zKeyURL: "",
          contribSigURL: "",
          createdAt: dayjs(),
          startTime: dayjs(),
          endTime: dayjs(),
          isFailed,
          failureReason: "",
        }
      }

      it("should handle empty list", () => {
        const [ts, fs] = firestoreAgt.partitionParticipantsBy([], pred)
        expect(ts.length).toBe(0)
        expect(fs.length).toBe(0)
      })

      it("should handle 1-item list", () => {
        {
          const [ts, fs] = firestoreAgt.partitionParticipantsBy([p(true)], pred)
          expect(ts.length).toBe(1)
          expect(fs.length).toBe(0)
        }
        {
          const [ts, fs] = firestoreAgt.partitionParticipantsBy([p(false)], pred)
          expect(ts.length).toBe(0)
          expect(fs.length).toBe(1)
        }
      })

      it("should handle 2-item list", () => {
        {
          const [ts, fs] = firestoreAgt.partitionParticipantsBy([p(true), p(true)], pred)
          expect(ts.length).toBe(2)
          expect(fs.length).toBe(0)
        }
        {
          const [ts, fs] = firestoreAgt.partitionParticipantsBy([p(true), p(false)], pred)
          expect(ts.length).toBe(1)
          expect(fs.length).toBe(1)
        }
        {
          const [ts, fs] = firestoreAgt.partitionParticipantsBy([p(false), p(true)], pred)
          expect(ts.length).toBe(1)
          expect(fs.length).toBe(1)
        }
        {
          const [ts, fs] = firestoreAgt.partitionParticipantsBy([p(false), p(false)], pred)
          expect(ts.length).toBe(0)
          expect(fs.length).toBe(2)
        }
      })

      it("should handle 3-item list", () => {
        {
          const [ts, fs] = firestoreAgt.partitionParticipantsBy([p(true), p(true), p(false)], pred)
          expect(ts.length).toBe(2)
          expect(fs.length).toBe(1)
        }
        {
          const [ts, fs] = firestoreAgt.partitionParticipantsBy([p(true), p(false), p(true)], pred)
          expect(ts.length).toBe(2)
          expect(fs.length).toBe(1)
        }
        {
          const [ts, fs] = firestoreAgt.partitionParticipantsBy([p(false), p(false), p(true)], pred)
          expect(ts.length).toBe(1)
          expect(fs.length).toBe(2)
        }
        {
          const [ts, fs] = firestoreAgt.partitionParticipantsBy([p(false), p(true), p(false)], pred)
          expect(ts.length).toBe(1)
          expect(fs.length).toBe(2)
        }
      })
    })

    describe("Merging", () => {
      const p = (index: number): Participant => {
        return {
          index,
          zKeyIndex: 0,
          user: "user",
          hash: "hash",
          zKeyURL: "",
          contribSigURL: "",
          createdAt: dayjs(),
          startTime: dayjs(),
          endTime: dayjs(),
          isFailed: false,
          failureReason: "",
        }
      }

      it("should merge empty lists", () => {
        const c = firestoreAgt.mergeParticipantLists([], [])
        expect(c.length).toBe(0)
      })

      it("should merge empty and 1-item lists", () => {
        {
          const c = firestoreAgt.mergeParticipantLists([p(1)], [])
          expect(c.length).toBe(1)
          expect(c[0].index).toBe(1)
        }
        {
          const c = firestoreAgt.mergeParticipantLists([], [p(1)])
          expect(c.length).toBe(1)
          expect(c[0].index).toBe(1)
        }
      })

      it("should merge empty and 2-item lists", () => {
        {
          const c = firestoreAgt.mergeParticipantLists([p(1), p(2)], [])
          expect(c.length).toBe(2)
          expect(c[0].index).toBe(1)
          expect(c[1].index).toBe(2)
        }
        {
          const c = firestoreAgt.mergeParticipantLists([], [p(1), p(2)])
          expect(c.length).toBe(2)
          expect(c[0].index).toBe(1)
          expect(c[1].index).toBe(2)
        }
      })

      it("should merge two 1-item lists", () => {
        {
          const c = firestoreAgt.mergeParticipantLists([p(1)], [p(2)])
          expect(c.length).toBe(2)
          expect(c[0].index).toBe(1)
          expect(c[1].index).toBe(2)
        }
        {
          const c = firestoreAgt.mergeParticipantLists([p(2)], [p(1)])
          expect(c.length).toBe(2)
          expect(c[0].index).toBe(1)
          expect(c[1].index).toBe(2)
        }
      })
    })
  })

  const addDone = async (user: string, hash: string, zKeyIndex?: number, startTime?: dayjs.Dayjs, endTime?: dayjs.Dayjs, createdAt?: dayjs.Dayjs) => {
    zKeyIndex = zKeyIndex === undefined ? 0 : zKeyIndex
    startTime = startTime === undefined ? dayjs() : startTime
    endTime = endTime === undefined ? dayjs() : endTime
    createdAt = createdAt === undefined ? dayjs() : createdAt
    const p: Participant = {
      index: 0,
      zKeyIndex,
      user: user,
      hash: hash,
      zKeyURL: "",
      contribSigURL: "",
      createdAt,
      startTime,
      endTime,
      isFailed: false,
      failureReason: "",
    }
    await firestoreAgt.addParticipant(ceremonyId, circuitId, user, hash, maxContrib, p)
  }
  const addFailed = async (user: string, hash: string, startTime?: dayjs.Dayjs, endTime?: dayjs.Dayjs, createdAt?: dayjs.Dayjs) => {
    createdAt = createdAt === undefined ? dayjs() : createdAt
    const p: Participant = {
      index: 0,
      zKeyIndex: 0,
      user: user,
      hash: hash,
      zKeyURL: "",
      contribSigURL: "",
      createdAt,
      startTime,
      endTime,
      isFailed: true,
      failureReason: "",
    }
    await firestoreAgt.addParticipant(ceremonyId, circuitId, user, hash, maxContrib, p)
  }
  const addWaiting = async (user: string, hash: string, createdAt?: dayjs.Dayjs) => {
    const p: Participant = {
      index: 0,
      zKeyIndex: 0,
      user: user,
      hash: hash,
      zKeyURL: "",
      contribSigURL: "",
      createdAt: createdAt === undefined ? dayjs() : createdAt,
      startTime: undefined,
      endTime: undefined,
      isFailed: false,
      failureReason: "",
    }
    await firestoreAgt.addParticipant(ceremonyId, circuitId, user, hash, maxContrib, p)
  }
  const addStarted = async (user: string, hash: string, startTime?: dayjs.Dayjs, createdAt?: dayjs.Dayjs) => {
    const p: Participant = {
      index: 0,
      zKeyIndex: 0,
      user: user,
      hash: hash,
      zKeyURL: "",
      contribSigURL: "",
      createdAt: createdAt === undefined ? dayjs() : createdAt,
      startTime: startTime === undefined ? dayjs() : startTime,
      endTime: undefined,
      isFailed: false,
      failureReason: "",
    }
    await firestoreAgt.addParticipant(ceremonyId, circuitId, user, hash, maxContrib, p)
  }

  describe("Timeout processing", () => {
    beforeEach(async () => {
      await clearList()
    })

    const addParticipant = async (p: Participant) => {
      await firestoreAgt.addParticipant(ceremonyId, circuitId, p.user, p.hash, maxContrib, p)
    }

    describe("Contrbution timeout", () => {
      describe("When there is no calculating participant", () => {
        it("should do nothing if the list is empty", async () => {
          const orgPs = await firestoreAgt.getParticipants(ceremonyId, circuitId)
          await firestoreAgt.processTimeouts(ceremonyEnv, circuitId, console)
          const ps = await firestoreAgt.getParticipants(ceremonyId, circuitId)
          expect(orgPs.length).toBe(0)
          expect(ps.length).toBe(0)
        })

        it("should do nothing if all participants on the list are not calculating", async () => {
          const [user1, hash1] = getUser(1)
          const [user2, hash2] = getUser(2)

          await addDone(user1, hash1)
          await addDone(user2, hash2)

          const orgPs = await firestoreAgt.getParticipants(ceremonyId, circuitId)
          await firestoreAgt.processTimeouts(ceremonyEnv, circuitId, console)
          const ps = await firestoreAgt.getParticipants(ceremonyId, circuitId)
          expect(orgPs.length).toBe(2)
          expect(ps.length).toBe(2)
          expect(ps[0].isFailed).toBeFalsy()
          expect(ps[1].isFailed).toBeFalsy()
        })
      })

      describe("When there is calculating participant", () => {
        it("should time out if calculating outside contrib timeout range", async () => {
          const [user1, hash1] = getUser(1)
          const [user2, hash2] = getUser(2)
          const [user3, hash3] = getUser(3)

          await addDone(user1, hash1)
          await addDone(user2, hash2)
          const computingP: Participant = {
            index: 0,
            zKeyIndex: 0,
            user: user3,
            hash: hash3,
            zKeyURL: "",
            contribSigURL: "",
            createdAt: dayjs(),
            startTime: dayjs.unix(dayjs().unix() - (ceremonyEnv.contribTimeout + 1)),
            endTime: undefined,
            isFailed: false,
            failureReason: "",
          }
          await addParticipant(computingP)

          const orgPs = await firestoreAgt.getParticipants(ceremonyId, circuitId)
          await firestoreAgt.processTimeouts(ceremonyEnv, circuitId, console)
          const ps = await firestoreAgt.getParticipants(ceremonyId, circuitId)
          console.log(JSON.stringify(ps))

          expect(orgPs.length).toBe(3)
          expect(orgPs[2].isFailed).toBeFalsy()

          expect(ps.length).toBe(3)
          expect(ps[2].isFailed).toBeTruthy()
        })

        it("should not time out if calculating within contrib timeout range", async () => {
          for (let delta of [0, 1]) {  // representing the case == and <=
            const [user1, hash1] = getUser(1)
            const [user2, hash2] = getUser(2)
            const [user3, hash3] = getUser(3)

            await addDone(user1, hash1)
            await addDone(user2, hash2)
            const computingP: Participant = {
              index: 0,
              zKeyIndex: 0,
              user: user3,
              hash: hash3,
              zKeyURL: "",
              contribSigURL: "",
              createdAt: dayjs(),
              startTime: dayjs.unix(dayjs().unix() - (ceremonyEnv.contribTimeout - 1)),
              endTime: undefined,
              isFailed: false,
              failureReason: "",
            }
            await addParticipant(computingP)

            const orgPs = await firestoreAgt.getParticipants(ceremonyId, circuitId)
            await firestoreAgt.processTimeouts(ceremonyEnv, circuitId, console)
            const ps = await firestoreAgt.getParticipants(ceremonyId, circuitId)
            console.log(JSON.stringify(ps))

            expect(stringify(ps)).toEqual(stringify(orgPs))
          }
        })
      })
    })

    describe("Start timeout", () => {
      describe("when the next participant is the first participant", () => {
        it("should not timeout before start timeout is reached", async () => {
          const [user1, hash1] = getUser(1)
          const createdAt = dayjs.unix(dayjs().unix() - (ceremonyEnv.startTimeout - 1))
          await addWaiting(user1, hash1, createdAt)

          const orgPs = await firestoreAgt.getParticipants(ceremonyId, circuitId)
          await firestoreAgt.processTimeouts(ceremonyEnv, circuitId, console)
          const ps = await firestoreAgt.getParticipants(ceremonyId, circuitId)

          expect(orgPs.length).toBe(1)
          expect(ps.length).toBe(1)
          expect(ps[0].isFailed).toBeFalsy()
        })

        it("should timeout after start timeout is reached", async () => {
          const [user1, hash1] = getUser(1)
          const createdAt = dayjs.unix(dayjs().unix() - (ceremonyEnv.startTimeout + 1))
          await addWaiting(user1, hash1, createdAt)

          const orgPs = await firestoreAgt.getParticipants(ceremonyId, circuitId)
          await firestoreAgt.processTimeouts(ceremonyEnv, circuitId, console)
          const ps = await firestoreAgt.getParticipants(ceremonyId, circuitId)

          expect(orgPs.length).toBe(1)
          expect(ps.length).toBe(1)
          expect(ps[0].isFailed).toBeTruthy()
        })
      })

      describe("when the next participant is not the first participant", () => {
        describe("when next participant is calculating", () => {
          it("should do nothing", async () => {
            const [user1, hash1] = getUser(1)
            const [user2, hash2] = getUser(2)

            await addDone(user1, hash1)
            await addDone(user2, hash2)

            const orgPs = await firestoreAgt.getParticipants(ceremonyId, circuitId)
            await firestoreAgt.processTimeouts(ceremonyEnv, circuitId, console)
            const ps = await firestoreAgt.getParticipants(ceremonyId, circuitId)
            expect(orgPs.length).toBe(2)
            expect(ps.length).toBe(2)
            expect(ps[0].isFailed).toBeFalsy()
            expect(ps[1].isFailed).toBeFalsy()
          })
        })

        describe("when next participant is not calculating", () => {
          describe("when previous participant recorded endTime", () => {
            describe("when prev.endTime <= next.createdAt", () => {
              it("should timeout if 'now <-> next.createdAt' > timeout period", async () => {
                const [user1, hash1] = getUser(1)
                const [user2, hash2] = getUser(2)
                await addFailed(user1, hash1)

                //                       v- next.createdAt
                //  now -------------o-- +1 -- +2 <- prev.endTime
                //       +---------------+
                //         start timeout
                const endTime = dayjs.unix(dayjs().unix() - ceremonyEnv.startTimeout - 2)
                await addDone(user2, hash2, 0, dayjs(), endTime)

                const [user3, hash3] = getUser(3)
                await addWaiting(user3, hash3, dayjs.unix(endTime.unix() + 1))

                const orgPs = await firestoreAgt.getParticipants(ceremonyId, circuitId)
                await firestoreAgt.processTimeouts(ceremonyEnv, circuitId, console)
                const ps = await firestoreAgt.getParticipants(ceremonyId, circuitId)

                expect(orgPs.length).toBe(3)
                expect(ps.length).toBe(3)
                expect(ps[2].isFailed).toBeTruthy()
              })

              it("should not timeout if 'now <-> next.createdAt' < timeout period", async () => {
                const [user1, hash1] = getUser(1)
                const [user2, hash2] = getUser(2)
                await addFailed(user1, hash1)

                //                    v- next.createdAt
                //        now ------- -1 ---o <- prev.endTime
                //  +-----------------+
                //     start timeout
                const endTime = dayjs.unix(dayjs().unix() - ceremonyEnv.startTimeout)
                await addDone(user2, hash2, 0, dayjs(), endTime)

                const [user3, hash3] = getUser(3)
                await addWaiting(user3, hash3, dayjs.unix(endTime.unix() + 1))

                const orgPs = await firestoreAgt.getParticipants(ceremonyId, circuitId)
                await firestoreAgt.processTimeouts(ceremonyEnv, circuitId, console)
                const ps = await firestoreAgt.getParticipants(ceremonyId, circuitId)

                expect(orgPs.length).toBe(3)
                expect(ps.length).toBe(3)
                expect(ps[2].isFailed).toBeFalsy()
              })
            })
            describe("when prev.endTime > next.createdAt", () => {
              it("should timeout if 'now <-> prev.endTime' > timeout period", async () => {
                const [user1, hash1] = getUser(1)
                const [user2, hash2] = getUser(2)
                await addFailed(user1, hash1)

                //                       v- prev.endTime
                //  now -------------o-- +1 -- +2 <- next.createdAt
                //       +---------------+
                //         start timeout
                const endTime = dayjs.unix(dayjs().unix() - ceremonyEnv.startTimeout - 1)
                await addDone(user2, hash2, 0, dayjs(), endTime)

                const [user3, hash3] = getUser(3)
                await addWaiting(user3, hash3, dayjs.unix(endTime.unix() - 1))

                const orgPs = await firestoreAgt.getParticipants(ceremonyId, circuitId)
                await firestoreAgt.processTimeouts(ceremonyEnv, circuitId, console)
                const ps = await firestoreAgt.getParticipants(ceremonyId, circuitId)

                expect(orgPs.length).toBe(3)
                expect(ps.length).toBe(3)
                expect(ps[2].isFailed).toBeTruthy()
              })

              it("should not timeout if 'now <-> prev.endTime' < timeout period", async () => {
                const [user1, hash1] = getUser(1)
                const [user2, hash2] = getUser(2)
                await addFailed(user1, hash1)

                //                    v- prev.endTime
                //        now ------- -1 ---o <- next.createdAt
                //  +-----------------+
                //     start timeout
                const endTime = dayjs.unix(dayjs().unix() - ceremonyEnv.startTimeout + 1)
                await addDone(user2, hash2, 0, dayjs(), endTime)

                const [user3, hash3] = getUser(3)
                await addWaiting(user3, hash3, dayjs.unix(endTime.unix() - 1))

                const orgPs = await firestoreAgt.getParticipants(ceremonyId, circuitId)
                await firestoreAgt.processTimeouts(ceremonyEnv, circuitId, console)
                const ps = await firestoreAgt.getParticipants(ceremonyId, circuitId)

                expect(orgPs.length).toBe(3)
                expect(ps.length).toBe(3)
                expect(ps[2].isFailed).toBeFalsy()
              })
            })
          })

          describe("when previous participant recorded startTime, but not endTime", () => {
            describe("when prev.startTime <= next.createdAt", () => {
              // same as "when previous participant recorded endTime" case
            })
            describe("when prev.startTime > next.createdAt", () => {
              it("should timeout if 'now <-> prev.startTime' > timeout period", async () => {
                const [user1, hash1] = getUser(1)
                const [user2, hash2] = getUser(2)
                await addFailed(user1, hash1)

                //                       v- prev.startTime
                //  now -------------o-- +1 -- +2 <- next.createdAt
                //       +---------------+
                //         start timeout
                const startTime = dayjs.unix(dayjs().unix() - ceremonyEnv.startTimeout - 1)
                await addFailed(user2, hash2, startTime)

                const [user3, hash3] = getUser(3)
                await addWaiting(user3, hash3, dayjs.unix(startTime.unix() - 1))

                const orgPs = await firestoreAgt.getParticipants(ceremonyId, circuitId)
                await firestoreAgt.processTimeouts(ceremonyEnv, circuitId, console)
                const ps = await firestoreAgt.getParticipants(ceremonyId, circuitId)

                expect(orgPs.length).toBe(3)
                expect(ps.length).toBe(3)
                expect(ps[2].isFailed).toBeTruthy()
              })

              it("should not timeout if 'now <-> prev.startTime' < timeout period", async () => {
                const [user1, hash1] = getUser(1)
                const [user2, hash2] = getUser(2)
                await addFailed(user1, hash1)

                //                    v- prev.endTime
                //        now ------- -1 ---o <- next.createdAt
                //  +-----------------+
                //     start timeout
                const startTime = dayjs.unix(dayjs().unix() - ceremonyEnv.startTimeout + 1)
                await addFailed(user2, hash2, startTime)

                const [user3, hash3] = getUser(3)
                await addWaiting(user3, hash3, dayjs.unix(startTime.unix() - 1))

                const orgPs = await firestoreAgt.getParticipants(ceremonyId, circuitId)
                await firestoreAgt.processTimeouts(ceremonyEnv, circuitId, console)
                const ps = await firestoreAgt.getParticipants(ceremonyId, circuitId)

                expect(orgPs.length).toBe(3)
                expect(ps.length).toBe(3)
                expect(ps[2].isFailed).toBeFalsy()
              })
            })
          })

          describe("when previous participant recorded neither startTime nor endTime", () => {
            describe("when prev.createdAt <= next.createdAt", () => {
              // same as "when previous participant recorded endTime" case
            })
            describe("when prev.createdAt > next.createdAt", () => {
              it("should timeout if 'now <-> prev.createdAt' > timeout period", async () => {
                const [user1, hash1] = getUser(1)
                const [user2, hash2] = getUser(2)
                await addFailed(user1, hash1)

                //                       v- prev.createdAt
                //  now -------------o-- +1 -- +2 <- next.createdAt
                //       +---------------+
                //         start timeout
                const createdAt = dayjs.unix(dayjs().unix() - ceremonyEnv.startTimeout - 1)
                await addFailed(user2, hash2, undefined, undefined, createdAt)

                const [user3, hash3] = getUser(3)
                await addWaiting(user3, hash3, dayjs.unix(createdAt.unix() - 1))

                const orgPs = await firestoreAgt.getParticipants(ceremonyId, circuitId)
                await firestoreAgt.processTimeouts(ceremonyEnv, circuitId, console)
                const ps = await firestoreAgt.getParticipants(ceremonyId, circuitId)

                expect(orgPs.length).toBe(3)
                expect(ps.length).toBe(3)
                expect(ps[2].isFailed).toBeTruthy()
              })

              it("should not timeout if 'now <-> prev.createdAt' < timeout period", async () => {
                const [user1, hash1] = getUser(1)
                const [user2, hash2] = getUser(2)
                await addFailed(user1, hash1)

                //                    v- prev.endTime
                //        now ------- -1 ---o <- next.createdAt
                //  +-----------------+
                //     start timeout
                const createdAt = dayjs.unix(dayjs().unix() - ceremonyEnv.startTimeout + 1)
                await addFailed(user2, hash2, undefined, undefined, createdAt)

                const [user3, hash3] = getUser(3)
                await addWaiting(user3, hash3, dayjs.unix(createdAt.unix() - 1))

                const orgPs = await firestoreAgt.getParticipants(ceremonyId, circuitId)
                await firestoreAgt.processTimeouts(ceremonyEnv, circuitId, console)
                const ps = await firestoreAgt.getParticipants(ceremonyId, circuitId)

                expect(orgPs.length).toBe(3)
                expect(ps.length).toBe(3)
                expect(ps[2].isFailed).toBeFalsy()
              })
            })
          })
        })
      })
    })
  })

  // https://gist.github.com/kazuakiishiguro/c38d6de8df6c20ea6dc83a4eea9d8e7d
  describe("Getting calculation lock", () => {
    beforeEach(async () => {
      await clearList()
    })

    describe("When list is empty", () => {
      it("should not get the lock if the list is empty", async () => {
        const res = await firestoreAgt.try2GetCalculationLock(ceremonyEnv, circuitId, "bar", "bar-hash")
        expect(res).toEqual({ type: "ListEmpty" })
      })
    })

    describe("When list is not empty", () => {
      describe("When the participant is not listed", () => {
        it("should not get the lock", async () => {
          const [user1, hash1] = getUser(1)
          const [user2, hash2] = getUser(2)
          await addDone(user1, hash1)
          await addFailed(user2, hash2)

          const res = await firestoreAgt.try2GetCalculationLock(ceremonyEnv, circuitId, "bar", "bar-hash")
          expect(res).toEqual({ type: "AllDone" })
        })
      })

      describe("When the participant is listed", () => {
        describe("When the participant is done", () => {
          it("should not get the lock", async () => {
            const [user1, hash1] = getUser(1)
            const [user2, hash2] = getUser(2)
            await addFailed(user1, hash1)
            await addDone(user2, hash2)

            const res = await firestoreAgt.try2GetCalculationLock(ceremonyEnv, circuitId, user2, hash2)
            expect(res).toEqual({ type: "AllDone" })
          })
        })

        describe("When the participant is failed", () => {
          it("should not get the lock", async () => {
            const [user1, hash1] = getUser(1)
            const [user2, hash2] = getUser(2)
            await addDone(user1, hash1)
            await addFailed(user2, hash2)

            const res = await firestoreAgt.try2GetCalculationLock(ceremonyEnv, circuitId, user2, hash2)
            expect(res).toEqual({ type: "AllDone" })
          })
        })

        describe("When the participant is waiting", () => {
          describe("When the list has no other participant", () => {
            it("should get the lock", async () => {
              const [user1, hash1] = getUser(1)
              await addWaiting(user1, hash1)

              const res = await firestoreAgt.try2GetCalculationLock(ceremonyEnv, circuitId, user1, hash1)
              expect(res).toEqual({
                type: "GotLock",
                participantIndex: 1,  // index is 1-based
                zKeyIndex: 1,  // index is 1-based
              })
            })
          })

          describe("When the list has other participants", () => {
            describe("When there is waiting participants", () => {
              describe("When there are previous contribution attempts", () => {
                it("should not get the lock", async () => {
                  const [user1, hash1] = getUser(1)
                  const [user2, hash2] = getUser(2)
                  const [user3, hash3] = getUser(3)
                  await addDone(user1, hash1)
                  await addFailed(user2, hash2)
                  await addWaiting(user3, hash3)

                  const res = await firestoreAgt.try2GetCalculationLock(ceremonyEnv, circuitId, "bar", "barHash")
                  expect(res).toEqual({ type: "Need2Wait" })
                })
              })
              describe("When there are no previous contribution attempts", () => {
                it("should not get the lock", async () => {
                  const [user1, hash1] = getUser(1)
                  const [user2, hash2] = getUser(2)
                  await addWaiting(user1, hash1)
                  await addWaiting(user2, hash2)

                  const res = await firestoreAgt.try2GetCalculationLock(ceremonyEnv, circuitId, user2, hash2)
                  expect(res).toEqual({ type: "Need2Wait" })
                })
              })
            })

            describe("When there is no waiting partipants", () => {
              describe("When there is no previous contribution attempt", () => {
                it("should get the lock", async () => {
                  const [user1, hash1] = getUser(1)
                  await addWaiting(user1, hash1)

                  const res = await firestoreAgt.try2GetCalculationLock(ceremonyEnv, circuitId, user1, hash1)
                  expect(res).toEqual({
                    type: "GotLock",
                    participantIndex: 1,  // index is 1-based
                    zKeyIndex: 1,  // index is 1-based
                  })
                })
              })

              describe("When there are previous contribution attempts", () => {
                it("should get the lock if there are done/failed participants", async () => {
                  const [user1, hash1] = getUser(1)
                  const [user2, hash2] = getUser(2)
                  await addDone(user1, hash1, 1)
                  await addFailed(user2, hash2)

                  const [user3, hash3] = getUser(3)
                  await addWaiting(user3, hash3)

                  const res = await firestoreAgt.try2GetCalculationLock(ceremonyEnv, circuitId, user3, hash3)
                  expect(res).toEqual({
                    type: "GotLock",
                    participantIndex: 3,  // index is 1-based
                    zKeyIndex: 2,  // index is 1-based
                  })
                })

                it("should get the lock if there are failed participants", async () => {
                  const [user1, hash1] = getUser(1)
                  const [user2, hash2] = getUser(2)
                  await addFailed(user1, hash1)
                  await addFailed(user2, hash2)

                  const [user3, hash3] = getUser(3)
                  await addWaiting(user3, hash3)

                  const res = await firestoreAgt.try2GetCalculationLock(ceremonyEnv, circuitId, user3, hash3)
                  expect(res).toEqual({
                    type: "GotLock",
                    participantIndex: 3,  // index is 1-based
                    zKeyIndex: 1,  // index is 1-based
                  })
                })
              })
            })
          })
        })
      })
    })
  })

  describe("Releasing calculation lock", () => {
    beforeEach(async () => {
      await clearList()
    })

    describe("There is no calculating participant", () => {
      it("should not release if the list is empty", async () => {
        const [user1, hash1] = getUser(1)
        const res = await firestoreAgt.releaseCalculationLock(ceremonyEnv, circuitId, user1, hash1)
        expect(res).toEqual({ type: "NoParticipant"})
      })

      it("should not release if the list only has non-calculating participants", async () => {
        const [user1, hash1] = getUser(1)
        const [user2, hash2] = getUser(2)
        await addDone(user1, hash1)
        await addFailed(user2, hash2)

        const [user3, hash3] = getUser(3)
        const res = await firestoreAgt.releaseCalculationLock(ceremonyEnv, circuitId, user3, hash3)
        expect(res).toEqual({ type: "NoParticipant"})
      })

      it("should not release if the participant is already finished", async () => {
        const [user1, hash1] = getUser(1)
        const [user2, hash2] = getUser(2)
        await addDone(user1, hash1)
        await addDone(user2, hash2)

        const [user3, hash3] = getUser(3)
        const res = await firestoreAgt.releaseCalculationLock(ceremonyEnv, circuitId, user2, hash2)
        expect(res).toEqual({ type: "NoParticipant"})
      })

      it("should not release if the participant is already failed", async () => {
        const [user1, hash1] = getUser(1)
        const [user2, hash2] = getUser(2)
        await addDone(user1, hash1)
        await addFailed(user2, hash2)

        const [user3, hash3] = getUser(3)
        const res = await firestoreAgt.releaseCalculationLock(ceremonyEnv, circuitId, user2, hash2)
        expect(res).toEqual({ type: "NoParticipant"})
      })
    })

    describe("There is calculating participant", () => {
      it("should release the lock if the participant is the lock owner", async () => {
        const [user1, hash1] = getUser(1)
        await addWaiting(user1, hash1)

        const act1 = await firestoreAgt.try2GetCalculationLock(ceremonyEnv, circuitId, user1, hash1)
        expect(act1).toEqual({
          type: "GotLock",
          participantIndex: 1,  // index is 1-based
          zKeyIndex: 1,  // index is 1-based
        })
        const act2 = await firestoreAgt.releaseCalculationLock(ceremonyEnv, circuitId, user1, hash1)
        expect(act2).toEqual({ type: "Released"})
      })

      it("should not release the lock if the participant is not the lock owner", async () => {
        const [user1, hash1] = ["foo1", "fooHash1"]
        await addWaiting(user1, hash1)

        const act1 = await firestoreAgt.try2GetCalculationLock(ceremonyEnv, circuitId, user1, hash1)
        expect(act1).toEqual({
          type: "GotLock",
          participantIndex: 1,  // index is 1-based
          zKeyIndex: 1,  // index is 1-based
        })

        const act2 = await firestoreAgt.releaseCalculationLock(ceremonyEnv, circuitId, "bar", "bar-hash")
        expect(act2).toEqual({ type: "AnotherParticipantOwnsLock"})
      })
    })
  })

  describe("Listen2CircuitEvents", () => {
    beforeEach(async () => {
      await clearList()
    })

    it("should call callback, when circuit doc is changed", async () => {
      await new Promise<void>((resolve, reject) => {
        const f = async (doc: firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>) => {
          console.log("Callback called!")
          resolve()
        }
        firestoreAgt.listen2CircuitDocChanges(f, ceremonyEnv, circuitId)

        const g = async () => {
          await addWaiting("user", "hash")
        }
        g()
        setTimeout(() => reject(), 500)
      })
    })

    it("should not call callback, when circuit doc is changed after subscribe is called", async () => {
      await new Promise<void>((resolve, reject) => {
        const f = async (doc: firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>) => {
          console.log("Shuld not be called!")
          reject()
        }
        const unsubscribe = firestoreAgt.listen2CircuitDocChanges(f, ceremonyEnv, circuitId)
        unsubscribe()

        const g = async () => {
          await addWaiting("user", "hash")
        }
        g()
        setTimeout(() => resolve(), 500)
      })
    })
  })
})