import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_INIT_SCRIPT, applyTheme, readPref } from "@/lib/theme";

function mockSystem(dark: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: dark && q.includes("dark"), addEventListener() {}, removeEventListener() {} }));
}

describe("theme preference", () => {
  afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); document.documentElement.className = ""; });
  it("defaults to automatic and ignores invalid stored values", () => {
    expect(readPref()).toBe("system");
    localStorage.setItem("scouthub-theme", "roxo");
    expect(readPref()).toBe("system");
    localStorage.setItem("scouthub-theme", "dark");
    expect(readPref()).toBe("dark");
  });
  it("applies day, night and system (following the OS)", () => {
    mockSystem(true);
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    applyTheme("light"); applyTheme("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    mockSystem(false);
    applyTheme("system");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
  it("ships a pre-paint script that resolves the same keys", () => {
    expect(THEME_INIT_SCRIPT).toContain("scouthub-theme");
    expect(THEME_INIT_SCRIPT).toContain("prefers-color-scheme: dark");
  });
});
