import { Product, productByCode, PRODUCTS } from "./catalog";

export type DecisionStatus = "need_info" | "rejected" | "counteroffer" | "manual_review" | "approved";

export type Offer = {
  amountRub: number;
  termMonths: number;
  product: Product;
  collateral: boolean;
  revolver: boolean;
};

export type DecisionInput = {
  goal?: string | null;
  amountRub?: number | null;
  termMonths?: number | null;
  businessType?: string | null;
  businessAge?: string | null;
  jobsSupported?: number | null;
  industryCode?: string | null;
  product?: string | null;
  collateral?: boolean | null;
  revolver?: boolean | null;
};

export type Decision = {
  status: DecisionStatus;
  rules: string[];
  offer: Offer | null;
  skipScore: boolean;
};

const FIELD_LABELS: Record<string, string> = {
  goal: "цель",
  amountRub: "сумма",
  termMonths: "срок",
  businessType: "тип бизнеса",
  businessAge: "возраст бизнеса",
  jobsSupported: "число сотрудников",
  industryCode: "отрасль",
  product: "продукт",
};

function percent(value: number): string {
  return new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 1 }).format(value);
}

function rubles(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export function thresholds(): { approve: number; review: number } {
  return {
    approve: Number(process.env.PD_APPROVE ?? 0.03),
    review: Number(process.env.PD_REVIEW ?? 0.12),
  };
}

export function missingFields(input: DecisionInput): string[] {
  const missing: string[] = [];
  if (!input.goal) missing.push("goal");
  if (input.amountRub == null || input.amountRub <= 0) missing.push("amountRub");
  if (input.termMonths == null) missing.push("termMonths");
  if (!input.businessType) missing.push("businessType");
  if (!input.businessAge) missing.push("businessAge");
  if (input.jobsSupported == null || input.jobsSupported < 0) missing.push("jobsSupported");
  if (!input.industryCode) missing.push("industryCode");
  if (!input.product) missing.push("product");
  return missing;
}

function snapTerm(term: number, maxTerm: number): number {
  const options = [12, 24, 36].filter((item) => item <= maxTerm);
  const target = Math.min(term, maxTerm);
  return options.reduce((best, item) =>
    Math.abs(item - target) < Math.abs(best - target) ? item : best,
  );
}

function productLabel(code: string): string {
  return productByCode(code)?.label ?? code;
}

export function decide(input: DecisionInput, pd: number | null, flags: { liquidated: boolean; delinquent: boolean }): Decision {
  const { approve, review } = thresholds();
  const missing = missingFields(input);
  if (missing.length > 0) {
    return {
      status: "need_info",
      rules: [`Не заполнено: ${missing.map((field) => FIELD_LABELS[field] ?? field).join(", ")}.`],
      offer: null,
      skipScore: true,
    };
  }
  if (flags.liquidated) {
    return {
      status: "rejected",
      rules: ["ЕГРЮЛ: компания ликвидирована. Модель не вызывалась."],
      offer: null,
      skipScore: true,
    };
  }
  if (pd == null) {
    throw new Error("Для решения нужна вероятность списания");
  }

  const product = productByCode(input.product);
  if (!product) {
    return {
      status: "need_info",
      rules: ["Не выбран кредитный продукт."],
      offer: null,
      skipScore: true,
    };
  }

  if (pd >= review) {
    return {
      status: "rejected",
      rules: [`Вероятность списания ${percent(pd)} не ниже порога отказа ${percent(review)}.`],
      offer: null,
      skipScore: false,
    };
  }

  const violations: string[] = [];
  if ((input.amountRub ?? 0) > product.maxAmountRub) {
    violations.push(
      `Сумма ${rubles(input.amountRub ?? 0)} выше лимита «${product.label}» ${rubles(product.maxAmountRub)}.`,
    );
  }
  if ((input.termMonths ?? 0) > product.maxTermMonths) {
    violations.push(`Срок ${input.termMonths} мес. больше лимита «${product.label}» ${product.maxTermMonths} мес.`);
  }
  if (product.collateralRequired && !input.collateral) {
    violations.push("Для кредита на оборудование нужен залог.");
  }

  if (violations.length > 0) {
    const offer = buildOffer(input);
    return {
      status: "counteroffer",
      rules: [
        ...violations,
        `Вместо запрошенных условий предлагаем «${productLabel(offer.product)}»: ${rubles(offer.amountRub)} на ${offer.termMonths} мес.`,
      ],
      offer,
      skipScore: false,
    };
  }

  if (flags.delinquent || pd >= approve) {
    const rules = [
      flags.delinquent
        ? "В кредитной истории есть просрочка. Заявку смотрит сотрудник, даже при невысокой вероятности списания."
        : `Вероятность списания ${percent(pd)} в серой зоне между ${percent(approve)} и ${percent(review)}. Решение принимает сотрудник.`,
    ];
    return { status: "manual_review", rules, offer: null, skipScore: false };
  }

  return {
    status: "approved",
    rules: [
      `Вероятность списания ${percent(pd)} ниже порога автоодобрения ${percent(approve)}.`,
      `Заявка внутри лимитов «${product.label}».`,
    ],
    offer: null,
    skipScore: false,
  };
}

function buildOffer(input: DecisionInput): Offer {
  let product: Product = input.product === "equipment" ? "equipment" : "working_capital";
  let collateral = Boolean(input.collateral);
  let revolver = product === "working_capital";
  let amount = input.amountRub ?? 0;
  let term = input.termMonths ?? 12;

  if (product === "equipment" && !collateral) {
    product = "working_capital";
    collateral = false;
    revolver = true;
  }

  const limits = PRODUCTS.find((item) => item.code === product)!;
  if (amount > limits.maxAmountRub) {
    amount = Math.min(limits.maxAmountRub, Math.round((input.amountRub ?? 0) * 0.7));
  }
  if (term > limits.maxTermMonths) term = limits.maxTermMonths;
  term = snapTerm(term, limits.maxTermMonths);

  return { amountRub: amount, termMonths: term, product, collateral, revolver };
}
