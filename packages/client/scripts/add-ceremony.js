const Admin = require("firebase-admin")
const serviceAccountPrvkey = require("../../../config/serviceAccountPrvkey.json")
const firebaseConfig = require( "../../../config/firebaseConfig.js")

Admin.initializeApp({
  credential: Admin.credential.cert(serviceAccountPrvkey),
  databaseURL: firebaseConfig.databaseURL,
});

const formatDate = d => d.toISOString().replace('Z', '');

const ceremonyConv = {
  toFirestore: (c) => {
    var ceremonyData = c;

    try {
      if (c.startTime) {
        var start =
          (typeof c.startTime === 'string') ?
            Admin.firestore.Timestamp.fromMillis(Date.parse(c.startTime)) :
            Admin.firestore.Timestamp.fromDate(c.startTime);
        ceremonyData = { ...ceremonyData, startTime: start };
      }
      if (c.endTime) {
        var end =
          (typeof c.endTime === 'string') ?
            Admin.firestore.Timestamp.fromMillis(Date.parse(c.endTime)) :
            Admin.firestore.Timestamp.fromDate(c.endTime);
        ceremonyData = { ...ceremonyData, endTime: end };
      }
    } catch (err) {
      console.error(`Unexpected error parsing dates: ${err.message}`);
    };
    return {
      ...ceremonyData,
      lastSummaryUpdate: Admin.firestore.Timestamp.now(),
    };
  },
  fromFirestore: (snapshot, options) => {
    return { ...snapshot.data(options) };
  }
}

const circuitConv = {
  toFirestore: (x) => x,
  fromFirestore: (snapshot, options) => {
    return { ...snapshot.data(options) };
  }
}

const db = Admin.firestore()

const main = async () => {
  const s = new Date(2021, 10, 1);
  const e = new Date(2021, 10, 30);

  const ceremony = {
    id: "shimoburo",
    projectId: "zkcream",
    startTime: formatDate(s),
    endTime: formatDate(e),
    timeout: 60,
  }

  await db.collection("ceremonies")
    .withConverter(ceremonyConv)
    .doc(ceremony.id)
    .set(ceremony);

  console.log(`new circuit added with id ${ceremony.id}`);

  const circuitVote = {
    id: "vote",
    participants: [],
  }

  await db
    .collection("ceremonies")
    .doc(ceremony.id)
    .collection("circuits")
    .withConverter(circuitConv)
    .doc(circuitVote.id)
    .set(circuitVote)

  const x = await db.collection("ceremonies").doc(ceremony.id).get();
  console.log(x.data())
}

main()