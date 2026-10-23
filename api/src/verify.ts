import { decide } from "./policy";
import { scoreLoan } from "./scoringClient";

const cases = [
  {
    login: "client.good",
    expect: "approved",
    input: {
      goal: "equipment",
      amountRub: 3_000_000,
      termMonths: 36,
      product: "equipment",
      businessType: "ООО",
      businessAge: "existing_5y_plus",
      jobsSupported: 12,
      industryCode: "professional",
      collateral: true,
      revolver: false,
    },
  },
  {
    login: "client.cafe",
    expect: "rejected",
    input: {
      goal: "cash_gap",
      amountRub: 1_500_000,
      termMonths: 24,
      product: "working_capital",
      businessType: "ИП",
      businessAge: "startup",
      jobsSupported: 2,
      industryCode: "cafe",
      collateral: false,
      revolver: true,
    },
  },
  {
    login: "client.thin",
    expect: "need_info",
    input: {
      goal: "stock",
      amountRub: 1_000_000,
      termMonths: 12,
      product: "working_capital",
      businessType: "ООО",
      businessAge: null,
      jobsSupported: null,
      industryCode: "retail",
      collateral: false,
      revolver: true,
    },
  },
  {
    login: "client.border",
    expect: "counteroffer",
    input: {
      goal: "stock",
      amountRub: 8_000_000,
      termMonths: 12,
      product: "working_capital",
      businessType: "ООО",
      businessAge: "age_2_to_5",
      jobsSupported: 6,
      industryCode: "retail",
      collateral: false,
      revolver: true,
    },
  },
  {
    login: "client.closed",
    expect: "rejected",
    input: {
      goal: "equipment",
      amountRub: 2_000_000,
      termMonths: 12,
      product: "equipment",
      businessType: "ООО",
      businessAge: "existing_5y_plus",
      jobsSupported: 4,
      industryCode: "wholesale",
      collateral: false,
      revolver: false,
    },
    liquidated: true,
  },
  {
    login: "client.gray",
    expect: "manual_review",
    input: {
      goal: "equipment",
      amountRub: 4_000_000,
      termMonths: 36,
      product: "equipment",
      businessType: "ООО",
      businessAge: "age_2_to_5",
      jobsSupported: 8,
      industryCode: "manufacturing",
      collateral: true,
      revolver: false,
    },
  },
];

async function main(): Promise<void> {
  let failed = 0;
  for (const item of cases) {
    const liquidated = "liquidated" in item && item.liquidated === true;
    let pd: number | null = null;
    if (!liquidated && item.input.businessAge && item.input.jobsSupported != null && item.input.industryCode) {
      const scored = await scoreLoan({
        amountRub: item.input.amountRub ?? 0,
        termMonths: item.input.termMonths ?? 0,
        industryCode: item.input.industryCode,
        businessType: item.input.businessType ?? "",
        businessAge: item.input.businessAge,
        jobsSupported: item.input.jobsSupported,
        collateral: item.input.collateral,
        revolver: item.input.revolver,
        franchise: false,
      });
      pd = scored.pd_chargeoff;
    }
    const decision = decide(item.input, pd, { liquidated, delinquent: false });
    const ok = decision.status === item.expect;
    if (!ok) failed += 1;
    console.log(
      `${ok ? "ok" : "FAIL"}\t${item.login}\t${decision.status}\tpd=${pd == null ? "—" : pd.toFixed(4)}`,
    );
  }
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
