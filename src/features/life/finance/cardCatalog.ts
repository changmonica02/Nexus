import type { OptionalFinanceSection } from "./model";
export const financeCards = {
  financeIncome: { module: "finance", title: "收入", period: "month" },
  financeExpense: { module: "finance", title: "支出", period: "month" },
  financeBudget: { module: "finance", title: "剩餘預算", period: "month" },
  financeSummary: { module: "finance", title: "財務摘要", period: "month" },
  financeNet: { module: "finance", title: "淨資產", period: "month" },
  financeUpcoming: { module: "finance", title: "即將扣款", period: "week" },
  financeRecurring: { module: "finance", title: "訂閱支出", period: "month" },
  financeGoals: { module: "finance", title: "財務目標", period: "all" },
  financeInvest: { module: "finance", title: "投資摘要", period: "all" },
} as const;
export type FinanceCardType = keyof typeof financeCards;
export const isFinanceCard = (key: string): key is FinanceCardType => Object.hasOwn(financeCards,key);



export const financeCardSection: Partial<Record<FinanceCardType, OptionalFinanceSection>> = {
  financeBudget:"budget",financeUpcoming:"subscription",financeRecurring:"subscription",
  financeGoals:"goal",financeInvest:"instrument",financeNet:"asset",
};
