import { ensureDotGit, validateRepo } from "@/utils/clone"

describe("command clone", () => {
  test("validateRepo", () => {
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

  test("ensureDotGit", () => {
    expect(ensureDotGit("https://github.com/lotwt/venti")).toBe(
      "https://github.com/lotwt/venti.git",
    )
    expect(ensureDotGit("https://github.com/lotwt/venti.git")).toBe(
      "https://github.com/lotwt/venti.git",
    )
  })
})
