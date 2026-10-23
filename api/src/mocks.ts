export type Mocks = {
  registry: {
    exists: boolean;
    status: "active" | "liquidated";
    registeredAt: string;
    name: string;
  };
  bureau: {
    openLoans: number;
    hasDelinquency: boolean;
    monthlyPaymentRub: number;
  };
  transparent: {
    director: string;
    okved: string;
  };
};

const BY_INN: Record<string, Mocks> = {
  "7701000001": {
    registry: { exists: true, status: "active", registeredAt: "2014-03-12", name: "ООО «Северная практика»" },
    bureau: { openLoans: 0, hasDelinquency: false, monthlyPaymentRub: 0 },
    transparent: { director: "Соколова Марина", okved: "69.10 Деятельность в области права" },
  },
  "7701000002": {
    registry: { exists: true, status: "active", registeredAt: "2026-09-01", name: "ИП Орлов" },
    bureau: { openLoans: 0, hasDelinquency: false, monthlyPaymentRub: 0 },
    transparent: { director: "Орлов Илья", okved: "56.10 Рестораны и кафе" },
  },
  "7701000003": {
    registry: { exists: true, status: "active", registeredAt: "2024-11-02", name: "ООО «Чистый лист»" },
    bureau: { openLoans: 0, hasDelinquency: false, monthlyPaymentRub: 0 },
    transparent: { director: "Лебедева Анна", okved: "47.19 Розничная торговля" },
  },
  "7701000004": {
    registry: { exists: true, status: "active", registeredAt: "2022-06-18", name: "ООО «Ряд и полка»" },
    bureau: { openLoans: 2, hasDelinquency: false, monthlyPaymentRub: 120000 },
    transparent: { director: "Рядов Павел", okved: "47.11 Розничная торговля продуктами" },
  },
  "7701000005": {
    registry: { exists: true, status: "liquidated", registeredAt: "2016-01-20", name: "ООО «Архив»" },
    bureau: { openLoans: 1, hasDelinquency: false, monthlyPaymentRub: 0 },
    transparent: { director: "Архипов Олег", okved: "46.90 Оптовая торговля" },
  },
  "7701000006": {
    registry: { exists: true, status: "active", registeredAt: "2023-04-07", name: "ООО «Тихая мастерская»" },
    bureau: { openLoans: 1, hasDelinquency: false, monthlyPaymentRub: 45000 },
    transparent: { director: "Мохов Кирилл", okved: "31.01 Производство мебели" },
  },
};

export function mocksForInn(inn: string): Mocks {
  return (
    BY_INN[inn] ?? {
      registry: { exists: true, status: "active", registeredAt: "2020-01-01", name: "Компания" },
      bureau: { openLoans: 0, hasDelinquency: false, monthlyPaymentRub: 0 },
      transparent: { director: "Не указан", okved: "Не указан" },
    }
  );
}
