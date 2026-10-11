import { describe, it, expect } from "vitest"; import { flowConfigurado, portaFlow } from "@/lib/configuracao";
describe("flowConfigurado", () => {
  it("false sem projeto ou com lixo", () => { expect(flowConfigurado({})).toBe(false); expect(flowConfigurado({ FLOW_PROJETO: "" })).toBe(false); expect(flowConfigurado({ FLOW_PROJETO: "abc" })).toBe(false); });
  it("true com UUID", () => { expect(flowConfigurado({ FLOW_PROJETO: "0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b" })).toBe(true); });
});
describe("portaFlow", () => {
  it("usa FLOW_PORTA e cai em 9231 sem valor válido", () => {
    expect(portaFlow({ FLOW_PORTA: "9333" })).toBe(9333); expect(portaFlow({})).toBe(9231); expect(portaFlow({ FLOW_PORTA: "" })).toBe(9231); expect(portaFlow({ FLOW_PORTA: "abc" })).toBe(9231);
  });
});
