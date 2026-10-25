import type { Application, Meta, User } from "../api";
import type { ApplicationInput } from "../domain/models";
import type { CabinetGateway } from "./gateway";
import { readStored, writeStored } from "./storage";

const DEMO_KEY = "alfa-buziness:react-demo-applications:v1";
export const demoUser: User = {
  id: 1,
  login: "demo.client",
  fullName: "Марина Соколова",
  role: "client",
  company: { id: 1, name: "ООО «Тихая мастерская»", inn: "7701000006" },
};
export const demoBankUser: User = {
  id: 2,
  login: "demo.bank",
  fullName: "Елена Крылова",
  role: "bank",
  company: null,
};
export const demoMeta: Meta = {
  fxRubPerUsd: 90,
  industries: [
    ["cafe", "Кафе и гостиницы", "72"],
    ["retail", "Розница", "44"],
    ["wholesale", "Опт", "42"],
    ["construction", "Строительство", "23"],
    ["manufacturing", "Производство", "31"],
    ["transport", "Транспорт", "48"],
    ["professional", "Профессиональные услуги и IT", "54"],
    ["health", "Медицина", "62"],
    ["education", "Образование", "61"],
    ["agriculture", "Сельское хозяйство", "11"],
    ["other", "Прочие услуги", "81"],
  ].map(([code, label, naics]) => ({ code, label, naics })),
  ages: [
    { code: "startup", label: "Бизнес откроется на эти деньги" },
    { code: "under_2y", label: "Младше 2 лет" },
    { code: "age_2_to_5", label: "От 2 до 5 лет" },
    { code: "existing_5y_plus", label: "Старше 5 лет" },
  ],
  goals: [
    {
      code: "cash_gap",
      label: "Закрыть кассовый разрыв",
      product: "working_capital",
    },
    { code: "stock", label: "Закупить товар", product: "working_capital" },
    { code: "equipment", label: "Купить оборудование", product: "equipment" },
  ],
  products: [
    {
      code: "working_capital",
      label: "Оборотный кредит",
      maxAmountRub: 5000000,
      maxTermMonths: 12,
      collateralRequired: false,
    },
    {
      code: "equipment",
      label: "Кредит на оборудование",
      maxAmountRub: 20000000,
      maxTermMonths: 36,
      collateralRequired: true,
    },
  ],
  terms: [12, 24, 36],
};

function baseApplication(
  id: number,
  status: string,
  user = demoUser,
): Application {
  return {
    id,
    status,
    goal: "Купить оборудование",
    goalLabel: null,
    amountRub: 3000000,
    termMonths: 36,
    product: "equipment",
    productLabel: "Кредит на оборудование",
    businessType: "ООО",
    businessAge: "existing_5y_plus",
    ageLabel: "Старше 5 лет",
    jobsSupported: 8,
    industryCode: "manufacturing",
    industryLabel: "Производство",
    collateral: true,
    franchise: false,
    revolver: false,
    pdChargeoff: null,
    riskScore: null,
    rules: ["Демонстрационное решение. Реальная модель не вызывалась."],
    mocks: null,
    offer: null,
    decisionComment: null,
    companyName: user.company?.name ?? demoUser.company!.name,
    inn: user.company?.inn ?? demoUser.company!.inn,
    ownerName: user.fullName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function load(): Application[] {
  return readStored<Application[]>(DEMO_KEY, [
    baseApplication(1042, "approved"),
    {
      ...baseApplication(1041, "need_info"),
      goal: "Закупить материалы",
      product: "working_capital",
      productLabel: "Оборотный кредит",
      amountRub: 850000,
      termMonths: 12,
      jobsSupported: null,
      businessAge: null,
      rules: ["Укажите возраст бизнеса и число сотрудников."],
    },
    {
      ...baseApplication(1040, "manual_review"),
      goal: "Обновить производственную линию",
      rules: ["Заявка ожидает решения сотрудника."],
    },
  ]);
}

export function createDemoGateway(user: User): CabinetGateway {
  const list = () =>
    load().filter((a) => user.role === "bank" || a.inn === user.company?.inn);
  const persist = (item: Application) => {
    writeStored(DEMO_KEY, [item, ...load().filter((a) => a.id !== item.id)]);
    return item;
  };
  return {
    getMeta: async () => demoMeta,
    listApplications: async () => list(),
    createApplication: async (input: ApplicationInput) => {
      const product = demoMeta.products.find((p) => p.code === input.product)!;
      const missing =
        !input.businessAge ||
        input.jobsSupported == null ||
        !input.industryCode;
      const exceeds =
        input.amountRub > product.maxAmountRub ||
        input.termMonths > product.maxTermMonths;
      const status = missing
        ? "need_info"
        : exceeds
          ? "counteroffer"
          : input.industryCode === "cafe" ||
              (product.collateralRequired && !input.collateral)
            ? "manual_review"
            : "approved";
      const item: Application = {
        ...baseApplication(
          Math.max(1042, ...load().map((a) => a.id)) + 1,
          status,
          user,
        ),
        ...input,
        goalLabel: null,
        productLabel: product.label,
        industryLabel:
          demoMeta.industries.find((i) => i.code === input.industryCode)
            ?.label ?? null,
        ageLabel:
          demoMeta.ages.find((a) => a.code === input.businessAge)?.label ??
          null,
        rules: [
          missing
            ? "Дополните сведения компании."
            : exceeds
              ? "Запрошенные условия превышают лимиты продукта."
              : "Демонстрационное решение. Реальная модель не вызывалась.",
        ],
      };
      if (status === "counteroffer")
        item.offer = {
          amountRub: Math.min(input.amountRub, product.maxAmountRub),
          termMonths: Math.min(input.termMonths, product.maxTermMonths),
          product: product.code,
          productLabel: product.label,
          collateral: input.collateral,
          revolver: product.code === "working_capital",
        };
      return persist(item);
    },
    act: async (id, action, body = {}) => {
      const current = list().find((a) => a.id === id);
      if (!current) throw new Error("Заявка не найдена.");
      const item = structuredClone(current);
      const expected = {
        supplement: "need_info",
        "accept-offer": "counteroffer",
        "decline-offer": "counteroffer",
        "prepare-documents": "approved",
        fund: "documents_ready",
        decide: "manual_review",
      }[action];
      if (item.status !== expected)
        throw new Error("Состояние заявки изменилось. Обновите страницу.");
      if (action === "decide" && user.role !== "bank")
        throw new Error("Доступно только сотруднику.");
      if (action !== "decide" && user.role !== "client")
        throw new Error("Действие доступно клиенту.");
      if (action === "prepare-documents") item.status = "documents_ready";
      if (action === "fund") item.status = "funded";
      if (action === "decline-offer") {
        item.status = "rejected";
        item.rules.push("Клиент отказался от предложенных условий.");
      }
      if (action === "accept-offer" && item.offer) {
        item.amountRub = item.offer.amountRub;
        item.termMonths = item.offer.termMonths;
        item.product = item.offer.product;
        item.productLabel = item.offer.productLabel;
        item.collateral = item.offer.collateral;
        item.offer = null;
        item.status = "approved";
      }
      if (action === "supplement") {
        item.businessAge = String(body.businessAge ?? "");
        item.jobsSupported = Number(body.jobsSupported);
        item.ageLabel =
          demoMeta.ages.find((a) => a.code === item.businessAge)?.label ?? null;
        if (
          !item.businessAge ||
          !Number.isInteger(item.jobsSupported) ||
          item.jobsSupported < 0
        )
          throw new Error("Укажите возраст бизнеса и число сотрудников.");
        item.status = "manual_review";
        item.rules.push("Дополнительные сведения получены.");
      }
      if (action === "decide") {
        const comment = String(body.comment ?? "").trim();
        if (!comment) throw new Error("Комментарий обязателен.");
        item.decisionComment = comment;
        const decision = String(body.action);
        item.status = (
          {
            approve: "approved",
            reject: "rejected",
            need_info: "need_info",
            counteroffer: "counteroffer",
          } as Record<string, string>
        )[decision];
        if (!item.status) throw new Error("Неизвестное решение.");
        if (decision === "counteroffer") {
          const amountRub = Number(body.amountRub),
            termMonths = Number(body.termMonths),
            product = demoMeta.products.find((p) => p.code === body.product);
          if (
            !Number.isFinite(amountRub) ||
            amountRub <= 0 ||
            ![12, 24, 36].includes(termMonths) ||
            !product
          )
            throw new Error("Проверьте сумму, продукт и срок.");
          item.offer = {
            amountRub,
            termMonths,
            product: product.code,
            productLabel: product.label,
            collateral: product.collateralRequired,
            revolver: product.code === "working_capital",
          };
        }
        item.rules.push(comment);
      }
      item.updatedAt = new Date().toISOString();
      return persist(item);
    },
  };
}
