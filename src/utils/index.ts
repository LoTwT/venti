export { cloneAction } from "./clone"
export {
  doctorAction,
  evaluateNodeMajor,
  getPackageManager,
  isDoctorOk,
  majorOf,
  runDoctorChecks,
} from "./doctor"
export type { DoctorCheck, DoctorStatus } from "./doctor"
export {
  commandExists,
  parseNames,
  resolveTargets,
  runTargets,
  upgradeAction,
  upgradeEntries,
} from "./upgrade"
export type { UpgradeEntry, UpgradeResult, UpgradeStatus } from "./upgrade"
