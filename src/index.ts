import createCac from "cac"
import { envAction, cloneAction } from "@/libs"

const cac = createCac("venti")

cac.command("env", "environment variables").action(envAction)

cac
  .command("clone [repo]", "wrapper of git clone")
  .option("-p, --platform [platform]", "github or gitlab")
  .action(cloneAction)

cac.help()

cac.version(require("../package.json").version)

cac.parse()
