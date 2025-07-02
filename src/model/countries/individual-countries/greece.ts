import CountryWithUnits from "../country-with-units.js";

import { Countries, Country } from "../../countries.js";
import { Partnership } from "../../partnership.js";
import { AirUnit, Destroyer, Infantry, LightCruiser } from "../../units.js";

export default class Greece extends CountryWithUnits {
    constructor(){
        super(Partnership.Neutral);
        this.availableUnits = new Set([
            ...(new Array(30)).fill(null).map(() => new Infantry(1, 3, this)),
            new AirUnit("Gladiator", this),
            new Destroyer("Aetos", 1, 2, 46, this),
            new Destroyer("Kountouriotis", 1, 1, 56, this),
            new LightCruiser("Georgios Averof", 1, 1, 34, this),
            new LightCruiser("Elli", 1, 1, 37, this)
        ]);
    }

    override additionalInvadedCountries(partnership: Partnership): Array<Country> {
        return [Countries.unitedKingdom].filter(it => it.canBeInvadedBy(partnership));
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.germany, Countries.unitedKingdom].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Greece";
    }

    override color(): string {
        return "#f2abf2";
    }
}
