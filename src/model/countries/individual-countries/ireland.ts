import CountryWithUnits from "../country-with-units.js";

import { Partnership } from "../../partnership.js";
import { Countries, Country } from "../../countries.js";
import { Infantry } from "../../units.js";

export default class Ireland extends CountryWithUnits {
    constructor(){
        super(Partnership.Neutral);
        this.availableUnits = new Set(new Array(10).fill(null).map(() => new Infantry(1, 3, this)));
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.germany, Countries.unitedKingdom].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Ireland";
    }

    override color(): string {
        return "#2ec0c0";
    }
}