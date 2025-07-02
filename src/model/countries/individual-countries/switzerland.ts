import CountryWithUnits from "../country-with-units.js";

import { Partnership } from "../../partnership.js";
import { Countries, Country } from "../../countries.js";
import { AirUnit, Infantry } from "../../units.js";

export default class Switzerland extends CountryWithUnits {
    constructor(){
        super(Partnership.Neutral);
        this.availableUnits = new Set([
            ...(new Array(8)).fill(null).map(() => new Infantry(1, 3, this)),
            new AirUnit("ME-109", this)
        ]);
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.germany, Countries.unitedKingdom].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Switzerland";
    }

    override color(): string {
        return "#6fa2f2";
    }
}
