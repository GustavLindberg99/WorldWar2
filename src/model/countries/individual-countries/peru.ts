import CountryWithUnits from "../country-with-units.js";

import { Partnership } from "../../partnership.js";
import { Countries, Country } from "../../countries.js";
import { LightCruiser } from "../../units.js";

export default class Peru extends CountryWithUnits {
    constructor(){
        super(Partnership.Allies);
        this.availableUnits = new Set([
            new LightCruiser("Almirante Grau", 1, 1, 34, this),
            new LightCruiser("Coronel Bolognesi", 1, 1, 34, this)
        ]);
    }

    override additionalInvadedCountries(partnership: Partnership): Array<Country> {
        return [Countries.unitedStates].filter(it => it.canBeInvadedBy(partnership));
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.unitedStates].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Peru";
    }

    override color(): string {
        return "#47b17d";
    }
}
