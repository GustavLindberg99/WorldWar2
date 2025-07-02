import CountryWithUnits from "../country-with-units.js";

import { Partnership } from "../../partnership.js";
import { Countries, Country } from "../../countries.js";
import { LightCruiser } from "../../units.js";

export default class Venezuela extends CountryWithUnits {
    constructor(){
        super(Partnership.Allies);
        this.availableUnits = new Set([new LightCruiser("Mariscal Sucre", 1, 2, 16, this)]);
    }

    override additionalInvadedCountries(partnership: Partnership): Array<Country> {
        return [Countries.unitedStates].filter(it => it.canBeInvadedBy(partnership));
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.unitedStates].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Venezuela";
    }

    override color(): string {
        return "#b1ea87";
    }
}
