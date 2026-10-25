import type { Application } from "../api";

export type CompanyProfile = {
  businessType: string;
  businessAge: string;
  jobsSupported: number | null;
  industryCode: string;
};

export type ApplicationInput = CompanyProfile & {
  goal: string;
  amountRub: number;
  termMonths: number;
  product: string;
  collateral: boolean;
  franchise: boolean;
};

export type ApplicationAction =
  | "supplement"
  | "accept-offer"
  | "decline-offer"
  | "prepare-documents"
  | "fund"
  | "decide";
export type ActionBody = Record<string, unknown>;
export type ReserveEvent = {
  id: string;
  createdAt: string;
  kind: "payment" | "income";
  description: string;
  amount: number;
  principal: number;
};
export type Reserve = {
  active: boolean;
  limit: number;
  ownFunds: number;
  debt: number;
  events: ReserveEvent[];
};

export function titleOf(application: Application): string {
  return (
    application.goalLabel ?? application.goal ?? "Заявка на финансирование"
  );
}

export function estimateLoan(amount: number, months: number) {
  const rate = 0.18 / 12;
  const payment = (amount * rate) / (1 - Math.pow(1 + rate, -months));
  return {
    payment: Math.round(payment),
    interest: Math.round(payment * months - amount),
  };
}

export function applyPayment(
  reserve: Reserve,
  amount: number,
  description: string,
): Reserve {
  if (!reserve.active) throw new Error("Сначала подключите резерв.");
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw new Error("Введите целую положительную сумму.");
  const principal = Math.max(0, amount - reserve.ownFunds);
  if (principal > reserve.limit - reserve.debt)
    throw new Error("Своих средств и доступного резерва недостаточно.");
  return {
    ...reserve,
    ownFunds: Math.max(0, reserve.ownFunds - amount),
    debt: reserve.debt + principal,
    events: [
      {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        kind: "payment",
        description,
        amount,
        principal,
      },
      ...reserve.events,
    ],
  };
}

export function applyIncome(reserve: Reserve, amount: number): Reserve {
  if (!reserve.active) throw new Error("Сначала подключите резерв.");
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100_000_000)
    throw new Error("Введите сумму от 1 до 100 000 000 ₽.");
  const principal = Math.min(amount, reserve.debt);
  return {
    ...reserve,
    debt: reserve.debt - principal,
    ownFunds: reserve.ownFunds + amount - principal,
    events: [
      {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        kind: "income",
        description: "Поступление на счёт",
        amount,
        principal,
      },
      ...reserve.events,
    ],
  };
}
