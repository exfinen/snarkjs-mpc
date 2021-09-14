const fs = require("fs")

const CFG_FILE = "./src/config-firebase/firebaseConfig.ts"
if (fs.existsSync(CFG_FILE)) {
  return
}
console.log("Config file missing")

const body = process.env.FIREBASE_CONFIG
if (body === undefined) {
  return
}
console.log(`Config file in env var: ${body}`)

fs.writeFileSync(CFG_FILE, body)
console.log(`Created ${CFG_FILE}`)
