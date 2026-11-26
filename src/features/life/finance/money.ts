/** Monetary values are JSON strings of integer minor units. Rates are decimal ratios. */
export const currencies = ["TWD", "USD", "JPY", "EUR", "SGD", "GBP", "HKD", "KRW", "CAD", "AUD", "CHF", "CNY", "KWD"];
export const currencyDigits = (code: string) => new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2;

export function decimalUnits(input: string, digits: number): bigint {
  const match = /^(-?)(\d{1,18})(?:\.(\d+))?$/.exec(input.trim());
  if (!match || (match[3]?.length ?? 0) > digits) throw Error(`請輸入有效數值，最多 ${digits} 位小數`);
  const amount = BigInt(match[2] + (match[3] ?? "").padEnd(digits, "0"));
  return match[1] ? -amount : amount;
}

export const minorUnits = (input: string, currency: string) => decimalUnits(input, currencyDigits(currency));
export function decimalText(amount: bigint, digits: number) {
  const raw = (amount < BigInt(0) ? -amount : amount).toString().padStart(digits + 1, "0");
  return (amount < BigInt(0) ? "-" : "") + (digits ? raw.slice(0, -digits) + "." + raw.slice(-digits) : raw);
}
export const money = (amount: bigint, currency: string) => currency + " " + decimalText(amount, currencyDigits(currency));

export function roundRatio(numerator: bigint, denominator: bigint) {
  if (denominator <= BigInt(0)) throw Error("除數必須大於零");
  const magnitude = numerator < BigInt(0) ? -numerator : numerator;
  const result = (magnitude * BigInt(2) + denominator) / (denominator * BigInt(2));
  return numerator < BigInt(0) ? -result : result;
}

export function exchange(amount: bigint, from: string, to: string, rate: string): bigint {
  if (from === to) return amount;
  const ratio = decimalUnits(rate, 8);
  if (ratio <= BigInt(0)) throw Error("匯率必須大於零");
  return roundRatio(amount * ratio * BigInt(10) ** BigInt(currencyDigits(to)), BigInt(100000000) * BigInt(10) ** BigInt(currencyDigits(from)));
}

export const isUnits = (value: unknown): value is string => typeof value === "string" && /^-?\d{1,24}$/.test(value);
