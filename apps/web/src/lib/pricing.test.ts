import { describe, expect, it } from "vitest";

import { formatPrice, TIERS } from "./pricing";

// Intl separates French amounts with narrow no-break spaces; compare with
// plain spaces.
const plain = (text: string) => text.replace(/\s/g, " ");

describe("formatPrice", () => {
  it("formats CAD cents for English", () => {
    expect(formatPrice(1199, "en")).toBe("$11.99");
    expect(formatPrice(24999, "en")).toBe("$249.99");
  });

  it("formats CAD cents for French", () => {
    expect(plain(formatPrice(1199, "fr"))).toBe("11,99 $");
    expect(plain(formatPrice(24999, "fr"))).toBe("249,99 $");
  });
});

describe("TIERS", () => {
  it("lists basic, standard, and premium in price order", () => {
    expect(TIERS.map((tier) => tier.id)).toEqual(["basic", "standard", "premium"]);
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].price.month).toBeGreaterThan(TIERS[i - 1].price.month);
    }
  });

  it("makes a year cheaper than twelve months", () => {
    for (const tier of TIERS) expect(tier.price.year).toBeLessThan(tier.price.month * 12);
  });

  it("features exactly one tier", () => {
    expect(TIERS.filter((tier) => tier.featured)).toHaveLength(1);
  });
});
