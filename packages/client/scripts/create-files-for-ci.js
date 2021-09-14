const fs = require("fs")

const CFG_FILE = "./src/config-firebase/firebaseConfig.ts"
const body = process.env.FIREBASE_CONFIG

if (body !== undefined && !fs.existsSync(CFG_FILE)) {
  fs.writeFileSync(CFG_FILE, body)
  console.log(`Created ${CFG_FILE}`)
}
