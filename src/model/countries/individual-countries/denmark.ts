import CountryWithUnits from "../country-with-units.js";

import { Countries, Country } from "../../countries.js";
import { Partnership } from "../../partnership.js";
import { Infantry, LightCruiser } from "../../units.js";

export default class Denmark extends CountryWithUnits {
    constructor(){
        super(Partnership.Neutral);
        this.availableUnits = new Set([
            new Infantry(1, 3, this),
            new Infantry(1, 3, this),
            new Infantry(1, 3, this),
            new LightCruiser("Hekla", 1, 3, 24, this)
        ]);
    }

    override additionalInvadedCountries(partnership: Partnership): Array<Country> {
        return [Countries.unitedKingdom].filter(it => it.canBeInvadedBy(partnership));
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.germany, Countries.unitedKingdom].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Denmark";
    }

    override color(): string {
        return "#f203f2";
    }
}
