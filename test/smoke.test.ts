import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";
describe("esqueleto", () => {
  it("cn mescla classes do tailwind", () => { expect(cn("px-2", "px-4")).toBe("px-4"); });
});
