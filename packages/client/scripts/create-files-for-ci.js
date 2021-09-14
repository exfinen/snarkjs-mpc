const fs = require("fs")

const CFG_FILE = "./src/config-firebase/firebaseConfig.ts"
if (fs.existsSync(CFG_FILE)) {
  return
}
console.log("Config file missing. Creating...")

const body = process.env.FIREBASE_CONFIG
if (body === undefined) {
  return
}

fs.writeFileSync(CFG_FILE, body)
console.log(`Created ${CFG_FILE}`)
