import createCac from "cac"
import { addAction, cloneAction, envAction } from "@/utils"
import pkgJson from "~/package.json"

const cac = createCac("venti")

cac.command("env", "environment variables").action(envAction)

cac
  .command("clone <repo> [dirname]", "wrapper of git clone")
  .option("-p, --platform [platform]", "github or gitlab")
  .option("-c, --clean", "clean clone without .git")
  .action(cloneAction)

cac.command("add", "add dependencies").action(addAction)

cac.help()

cac.version(pkgJson.version)

cac.parse()
