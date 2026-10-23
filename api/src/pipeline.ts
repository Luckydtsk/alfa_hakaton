import { decide, missingFields } from "./policy";
import { mocksForInn } from "./mocks";
import { scoreLoan } from "./scoringClient";
import { Draft } from "./store";

export async function evaluate(draft: Draft, inn: string) {
  const mocks = mocksForInn(inn);
  const flags = {
    liquidated: mocks.registry.status === "liquidated",
    delinquent: mocks.bureau.hasDelinquency,
  };
  if (missingFields(draft).length > 0 || flags.liquidated) {
    return {
      decision: decide(draft, null, flags),
      mocks,
      pd: null as number | null,
      riskScore: null as number | null,
    };
  }
  const scored = await scoreLoan({
    amountRub: draft.amountRub ?? 0,
    termMonths: draft.termMonths ?? 0,
    industryCode: draft.industryCode ?? "",
    businessType: draft.businessType ?? "",
    businessAge: draft.businessAge ?? "",
    jobsSupported: draft.jobsSupported ?? 0,
    collateral: draft.collateral,
    revolver: draft.product === "working_capital",
    franchise: draft.franchise,
  });
  const decision = decide({ ...draft, revolver: draft.product === "working_capital" }, scored.pd_chargeoff, flags);
  return { decision, mocks, pd: scored.pd_chargeoff, riskScore: scored.risk_score };
}
