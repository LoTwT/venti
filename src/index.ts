import createCac from "cac"
import pkgJson from "../package.json"
import { cloneAction, envAction } from "@/libs"

const cac = createCac("venti")

cac.command("env", "environment variables").action(envAction)

cac
  .command("clone <repo> [dirname]", "wrapper of git clone")
  .option("-p, --platform [platform]", "github or gitlab")
  .option("-c, --clean", "clean clone without .git")
  .action(cloneAction)

cac.help()

cac.version(pkgJson.version)

cac.parse()
