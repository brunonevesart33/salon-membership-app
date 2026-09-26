export function priceForHairLength(
  product: { monthlyPriceCentsShort: number; monthlyPriceCentsLong: number },
  storeOverride: { monthlyPriceCentsShort: number | null; monthlyPriceCentsLong: number | null } | undefined,
  hairLength: "SHORT" | "LONG"
) {
  if (hairLength === "LONG") return storeOverride?.monthlyPriceCentsLong ?? product.monthlyPriceCentsLong;
  return storeOverride?.monthlyPriceCentsShort ?? product.monthlyPriceCentsShort;
}
