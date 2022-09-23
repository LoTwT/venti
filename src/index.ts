import createCac from "cac"
import { envAction } from "./libs/env"

const cac = createCac("venti")

cac.command("env", "Environment Variables").action(envAction)

cac.help()

cac.version(require("../package.json").version)

cac.parse()
