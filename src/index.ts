import createCac from "cac"
import { envAction } from "./libs/env"

const cac = createCac()

cac.command("env", "Node Related Environment").action(envAction)

cac.help()

cac.version(require("../package.json").version)

cac.parse()
