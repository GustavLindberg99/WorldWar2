import CountryWithoutUnits from "../country-without-units.js";

import { Countries, Country } from "../../countries.js";
import { Partnership } from "../../partnership.js";

export default class BalticCountry extends CountryWithoutUnits {
    override canBeInvadedBy(partnership: Partnership): boolean {
        if(this.hexes.every(it => it.controller() === Countries.sovietUnion)){
            return false;
        }
        return super.canBeInvadedBy(partnership);
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.germany, Countries.unitedKingdom].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }
}
