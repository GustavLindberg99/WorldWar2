import CountryWithUnits from "../country-with-units.js";

import { Countries, Country } from "../../countries.js";
import { Partnership } from "../../partnership.js";
import { AirUnit, Infantry } from "../../units.js";

export default class Norway extends CountryWithUnits {
    constructor(){
        super(Partnership.Neutral);
        this.availableUnits = new Set([
            ...(new Array(12)).fill(null).map(() => new Infantry(1, 3, this)),
            new AirUnit("Gladiator", this)
        ]);
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.germany, Countries.unitedKingdom].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Norway";
    }

    override color(): string {
        return "#c39df2";
    }
}
