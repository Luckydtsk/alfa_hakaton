export type Role = "client" | "bank";

export type User = {
  id: number;
  login: string;
  role: Role;
  fullName: string;
  company: { id: number; name: string; inn: string } | null;
};

export type Offer = {
  amountRub: number;
  termMonths: number;
  product: string;
  productLabel: string;
  collateral: boolean;
  revolver: boolean;
};

export type Application = {
  id: number;
  status: string;
  goal: string | null;
  goalLabel: string | null;
  amountRub: number | null;
  termMonths: number | null;
  product: string | null;
  productLabel: string | null;
  businessType: string | null;
  businessAge: string | null;
  ageLabel: string | null;
  jobsSupported: number | null;
  industryCode: string | null;
  industryLabel: string | null;
  collateral: boolean | null;
  franchise: boolean | null;
  revolver: boolean | null;
  pdChargeoff: number | null;
  riskScore: number | null;
  rules: string[];
  mocks: {
    registry: {
      exists: boolean;
      status: string;
      registeredAt: string;
      name: string;
    };
    bureau: {
      openLoans: number;
      hasDelinquency: boolean;
      monthlyPaymentRub: number;
    };
    transparent: { director: string; okved: string };
  } | null;
  offer: Offer | null;
  decisionComment: string | null;
  companyName: string;
  inn: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
};

export type Meta = {
  fxRubPerUsd: number;
  industries: { code: string; label: string; naics: string }[];
  ages: { code: string; label: string }[];
  goals: { code: string; label: string; product: string }[];
  products: {
    code: string;
    label: string;
    maxAmountRub: number;
    maxTermMonths: number;
    collateralRequired: boolean;
  }[];
  terms: number[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new ApiError(
      body.error || "Не удалось выполнить запрос",
      response.status,
    );
  }
  return response.json() as Promise<T>;
}

export const STATUS_LABEL: Record<string, string> = {
  draft: "Черновик",
  submitted: "Отправлена",
  need_info: "Нужны данные",
  enriched: "Проверки собраны",
  scored: "Оценка готова",
  approved: "Одобрена",
  counteroffer: "Другие условия",
  manual_review: "На рассмотрении",
  rejected: "Отказ",
  documents_ready: "Документы готовы",
  funded: "Выдача смоделирована",
};

export function rub(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export function pct(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}
