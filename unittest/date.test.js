import { expect, test } from "vitest";

import { date, Month, month, year } from "../build/model/date.js";

test("Get year from date", () => {
    const d1 = date(1940, Month.April);
    expect(year(d1)).toBe(1940);

    const d2 = date(1944, Month.June);
    expect(year(d2)).toBe(1944);
});

test("Get month from date", () => {
    const d1 = date(1940, Month.April);
    expect(month(d1)).toBe(Month.April);

    const d2 = date(1944, Month.June);
    expect(month(d2)).toBe(Month.June);
});

test("Increment dates", () => {
    let d1 = date(1941, Month.December);
    d1++;
    expect(d1).toBe(date(1942, Month.January));

    let d2 = date(1945, Month.August);
    d2++;
    expect(d2).toBe(date(1945, Month.September));
});

test("Compare dates", () => {
    let d1 = date(1941, Month.December);
    let d2 = date(1945, Month.August);

    expect(d1).toBeLessThan(d2);
});
