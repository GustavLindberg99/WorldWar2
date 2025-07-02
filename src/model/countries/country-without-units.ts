import Country from "./country.js";

import { Partnership } from "../partnership.js";
import { AliveUnit, Unit } from "../units.js";

export default class CountryWithoutUnits extends Country {
    readonly #name: string;

    constructor(name: string, preferredPartnership: Partnership | null = Partnership.Neutral){
        super(preferredPartnership);
        this.#name = name;
    }

    override units(): IteratorObject<AliveUnit & Unit> {
        return [].values();
    }

    override name(): string {
        return this.#name;
    }
}
