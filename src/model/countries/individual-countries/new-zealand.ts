import CountryWithUnits from "../country-with-units.js";

import { Countries, Country } from "../../countries.js";
import { Partnership } from "../../partnership.js";
import { Infantry, LightCruiser } from "../../units.js";

export default class NewZealand extends CountryWithUnits {
    constructor(){
        super(Partnership.Allies);
        this.availableUnits = new Set([
            ...(new Array(5)).fill(null).map(() => new Infantry(1, 3, this)),
            new LightCruiser("Achilles", 1, 1, 46, this),
            new LightCruiser("Leander", 1, 1, 46, this)
        ]);
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.unitedStates].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "New Zealand";
    }

    override color(): string {
        return "#7b8700";
    }
}
