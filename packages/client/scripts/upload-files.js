const Admin = require("firebase-admin");
const serviceAccountPrvkey = require("../../../config/serviceAccountPrvkey.json");
const firebaseConfig = require( "../../../config/firebaseConfig.js");
const fs = require("fs")

Admin.initializeApp({
  credential: Admin.credential.cert(serviceAccountPrvkey),
  databaseURL: firebaseConfig.databaseURL,
  storageBucket: firebaseConfig.storageBucket
});

const bucket = Admin.storage().bucket()

const saveR1cs = async (ceremony, circuit, srcFile) => {
  const buf = fs.readFileSync(`../resource/${srcFile}`)
  const file = bucket.file(`${ceremony}/circuits/${circuit}/r1cs`)
  await file.save(buf)
}
const savePtau = async (ceremony, srcFile) => {
  const buf = fs.readFileSync(`../resource/${srcFile}`)
  const file = bucket.file(`${ceremony}/ptau`)
  await file.save(buf)
}

const main = async () => {
  const ceremony = "shimoburo"

  // await saveR1cs(ceremony, "snarkjs-tutorial", "zkcream/circuit.r1cs")
  await saveR1cs(ceremony, "vote", "zkcream/vote.r1cs")
  //await savePtau(ceremony, "zkcream/pot19_final.ptau")

  // const fileName = "pot12_final.ptau"
  // const file = bucket.file(`${ceremony}/${fileName}`)
  // const res = await file.download()
  // console.log("Size", res[0].length)
}

main()