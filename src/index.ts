import createCac from "cac"
import { version } from "../package.json"
import { envAction } from "./libs/env"

const cac = createCac()

cac.command("env", "Node Related Environment").action(envAction)

cac.help()

cac.version(version)

cac.parse()
