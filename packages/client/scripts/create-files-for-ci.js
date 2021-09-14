const fs = require("fs")

const CFG_FILE = "./src/config-firebase/firebaseConfig.ts"
const body = process.ENV.FIREBASE_CONFIG

if (body !== undefined && !fs.existsSync(CFG_FILE)) {
  fs.writeFileSync(CONFIG_FILE, body)
}
