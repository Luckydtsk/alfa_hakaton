export type Product = "working_capital" | "equipment";

export type Industry = { code: string; label: string; naics: string };
export type Age = { code: string; label: string };
export type Goal = { code: string; label: string; product: Product };
export type ProductInfo = {
  code: Product;
  label: string;
  maxAmountRub: number;
  maxTermMonths: number;
  collateralRequired: boolean;
};

export const INDUSTRIES: Industry[] = [
  { code: "cafe", label: "Кафе и гостиницы", naics: "72" },
  { code: "retail", label: "Розница", naics: "44" },
  { code: "wholesale", label: "Опт", naics: "42" },
  { code: "construction", label: "Строительство", naics: "23" },
  { code: "manufacturing", label: "Производство", naics: "31" },
  { code: "transport", label: "Транспорт", naics: "48" },
  { code: "professional", label: "Профессиональные услуги и IT", naics: "54" },
  { code: "health", label: "Медицина", naics: "62" },
  { code: "education", label: "Образование", naics: "61" },
  { code: "agriculture", label: "Сельское хозяйство", naics: "11" },
  { code: "other", label: "Прочие услуги", naics: "81" },
];

export const AGES: Age[] = [
  { code: "startup", label: "Бизнес откроется на эти деньги" },
  { code: "under_2y", label: "Младше 2 лет" },
  { code: "age_2_to_5", label: "От 2 до 5 лет" },
  { code: "existing_5y_plus", label: "Старше 5 лет" },
];

export const GOALS: Goal[] = [
  { code: "cash_gap", label: "Закрыть кассовый разрыв", product: "working_capital" },
  { code: "stock", label: "Закупить товар", product: "working_capital" },
  { code: "equipment", label: "Купить оборудование", product: "equipment" },
];

export const PRODUCTS: ProductInfo[] = [
  {
    code: "working_capital",
    label: "Оборотный кредит",
    maxAmountRub: 5_000_000,
    maxTermMonths: 12,
    collateralRequired: false,
  },
  {
    code: "equipment",
    label: "Кредит на оборудование",
    maxAmountRub: 20_000_000,
    maxTermMonths: 36,
    collateralRequired: true,
  },
];

export const TERMS = [12, 24, 36];

export function industryByCode(code: string | null | undefined): Industry | undefined {
  return INDUSTRIES.find((item) => item.code === code);
}

export function productByCode(code: string | null | undefined): ProductInfo | undefined {
  return PRODUCTS.find((item) => item.code === code);
}

export function goalByCode(code: string | null | undefined): Goal | undefined {
  return GOALS.find((item) => item.code === code);
}

export function ageByCode(code: string | null | undefined): Age | undefined {
  return AGES.find((item) => item.code === code);
}

export function suggestProduct(goal: string | null | undefined): Product {
  return goalByCode(goal)?.product ?? "working_capital";
}
