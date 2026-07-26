import {
  buildCloneArgs,
  ensureDotGit,
  isFullRepoUrl,
  resolveRepoPath,
  resolveTargetDirname,
  validateRepo,
} from "@/utils/clone"

describe("command clone", () => {
  it("validateRepo", () => {
    expect(validateRepo("user/repo")).toBe(true)

    expect(validateRepo("a-b/c-d")).toBe(true)
    expect(validateRepo("a-b/c--d")).toBe(true)
    expect(validateRepo("a-b/-c--d-")).toBe(true)
    expect(validateRepo("a-b/--c--d--")).toBe(true)

    expect(validateRepo("a-b/c_d")).toBe(true)
    expect(validateRepo("a-b/c__d")).toBe(true)
    expect(validateRepo("a-b/_c__d_")).toBe(true)
    expect(validateRepo("a-b/__c__d__")).toBe(true)

    expect(validateRepo("a-b/c.d")).toBe(true)
    expect(validateRepo("a-b/c..d")).toBe(true)
    expect(validateRepo("a-b/.c..d.")).toBe(true)
    expect(validateRepo("a-b/..c..d..")).toBe(true)
  })

  it("ensureDotGit", () => {
    expect(ensureDotGit("https://github.com/lotwt/venti")).toBe(
      "https://github.com/lotwt/venti.git",
    )
    expect(ensureDotGit("https://github.com/lotwt/venti.git")).toBe(
      "https://github.com/lotwt/venti.git",
    )
  })

  it("isFullRepoUrl", () => {
    expect(isFullRepoUrl("https://github.com/user/repo")).toBe(true)
    expect(isFullRepoUrl("https://github.com/user/repo.git")).toBe(true)
    expect(isFullRepoUrl("git@github.com:user/repo.git")).toBe(true)

    expect(isFullRepoUrl("user/repo")).toBe(false)
  })

  it("resolveRepoPath", () => {
    expect(resolveRepoPath("user/repo", "github")).toBe(
      "https://github.com/user/repo.git",
    )
    expect(resolveRepoPath("user/repo", "gitlab")).toBe(
      "https://gitlab.com/user/repo.git",
    )

    // full URLs pass through untouched
    expect(resolveRepoPath("https://github.com/user/repo", "github")).toBe(
      "https://github.com/user/repo",
    )
    expect(resolveRepoPath("git@github.com:user/repo.git", "github")).toBe(
      "git@github.com:user/repo.git",
    )

    expect(() => resolveRepoPath("not a repo", "github")).toThrow(
      "Invalid repository: not a repo",
    )
  })

  it("resolveTargetDirname", () => {
    expect(resolveTargetDirname("user/repo")).toBe("repo")
    expect(resolveTargetDirname("user/repo", "custom")).toBe("custom")
    expect(resolveTargetDirname("https://github.com/user/repo.git")).toBe(
      "repo",
    )
    expect(resolveTargetDirname("git@github.com:user/repo.git")).toBe("repo")
  })

  it("buildCloneArgs", () => {
    expect(buildCloneArgs("https://x.com/u/r.git", "r")).toEqual([
      "clone",
      "https://x.com/u/r.git",
      "r",
    ])
    expect(buildCloneArgs("https://x.com/u/r.git", "r", 1)).toEqual([
      "clone",
      "--depth",
      "1",
      "https://x.com/u/r.git",
      "r",
    ])
    expect(buildCloneArgs("https://x.com/u/r.git", "r", 0)).toEqual([
      "clone",
      "https://x.com/u/r.git",
      "r",
    ])
  })
})
