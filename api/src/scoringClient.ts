import { industryByCode } from "./catalog";

export type ScoreResult = { pd_chargeoff: number; risk_score: number };

export async function scoreLoan(input: {
  amountRub: number;
  termMonths: number;
  industryCode: string;
  businessType: string;
  businessAge: string;
  jobsSupported: number;
  collateral: boolean;
  revolver: boolean;
  franchise: boolean;
}): Promise<ScoreResult> {
  const industry = industryByCode(input.industryCode);
  if (!industry) throw new Error("Неизвестная отрасль");
  const fx = Number(process.env.FX_RUB_PER_USD ?? 90);
  const body = {
    loan_amount: input.amountRub / fx,
    term_months: input.termMonths,
    naics_code: industry.naics,
    business_type: input.businessType,
    business_age: input.businessAge,
    jobs_supported: input.jobsSupported,
    collateral: input.collateral ? "yes" : "no",
    revolver: input.revolver ? "yes" : "no",
    franchise: input.franchise ? "yes" : "no",
  };
  const base = process.env.SCORING_URL ?? "http://127.0.0.1:8000";
  const response = await fetch(`${base}/score`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Скоринг недоступен");
  }
  return (await response.json()) as ScoreResult;
}
