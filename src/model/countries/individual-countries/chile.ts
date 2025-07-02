import CountryWithUnits from "../country-with-units.js";

import { Partnership } from "../../partnership.js";
import { Countries, Country } from "../../countries.js";
import { Battleship, Destroyer, LightCruiser } from "../../units.js";

export default class Chile extends CountryWithUnits {
    constructor(){
        super(Partnership.Allies);
        this.availableUnits = new Set([
            new Destroyer("Serrano", 1, 1, 50, this),
            new LightCruiser("Blanco Encalada", 1, 1, 33, this),
            new LightCruiser("Chacabuco", 1, 1, 33, this),
            new Battleship("Almirante Latorre", 4, 4, 32, this)
        ]);
    }

    override additionalInvadedCountries(partnership: Partnership): Array<Country> {
        return [Countries.unitedStates].filter(it => it.canBeInvadedBy(partnership));
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.unitedStates].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Chile";
    }

    override color(): string {
        return "#22ec87";
    }
}
