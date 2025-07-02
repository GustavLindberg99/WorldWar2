export enum Month {
    January = 0,
    February = 1,
    March = 2,
    April = 3,
    May = 4,
    June = 5,
    July = 6,
    August = 7,
    September = 8,
    October = 9,
    November = 10,
    December = 11
}

/**
 * Gets the numeric code for the given year and month.
 *
 * @param year  The year.
 * @param month The month.
 *
 * @returns The numeric code of the given date so that arithmetic can be done on it.
 */
export function date(year: number, month: Month): number {
    return year * 12 + month;
}

date.current = date(1937, Month.June);

/**
 * Gets the year of the given date.
 *
 * @param date The numeric code of the date.
 *
 * @returns The year of the given date.
 */
export function year(date: number): number {
    return Math.floor(date / 12);
}

/**
 * Gets the month of the given date.
 *
 * @param date The numeric code of the date.
 *
 * @returns The month of the given date.
 */
export function month(date: number): Month {
    return date % 12;
}

/**
 * Converts the given date to a string.
 *
 * @param date The numeric code of the date.
 *
 * @returns A human-readable string.
 */
export function dateToString(date: number): string {
    return Month[month(date)] + " " + year(date).toString();
}

/**
 * Gets the current year.
 *
 * @returns The current year.
 */
export function currentYear(): number {
    return year(date.current);
}

/**
 * Gets the current month.
 *
 * @returns The current month.
 */
export function currentMonth(): Month {
    return month(date.current);
}
