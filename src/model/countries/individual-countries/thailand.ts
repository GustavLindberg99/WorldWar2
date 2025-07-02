import CountryWithoutUnits from "../country-without-units.js";

import { Countries, Country } from "../../countries.js";
import { Partnership } from "../../partnership.js";

export default class Thailand extends CountryWithoutUnits {
    constructor(){
        super("Thailand");
    }

    override canBeActivated(partnership: Partnership): boolean {
        return this.partnership() === Partnership.Neutral
            && partnership === Partnership.Axis
            && Countries.japan.landUnits().some(unit => unit.hex().adjacentLandHexes().some(hex => hex.country === this));
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.japan];
    }
}
