import CountryWithUnits from "../country-with-units.js";

import { Partnership } from "../../partnership.js";
import { Countries, Country } from "../../countries.js";
import { AirUnit, Battlecruiser, Destroyer, Infantry, LightCruiser } from "../../units.js";

export default class Turkey extends CountryWithUnits {
    constructor(){
        super(Partnership.Neutral);
        this.availableUnits = new Set([
            ...(new Array(35)).fill(null).map(() => new Infantry(1, 3, this)),
            new AirUnit("S-16", this),
            new Destroyer("Demirhisar", 1, 1, 51, this),
            new LightCruiser("Berk-i Satvet", 1, 1, 30, this),
            new LightCruiser("Peyk-i Şevket", 1, 1, 30, this),
            new Battlecruiser("Yavuz", 4, 5, 36, this)
        ]);
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.germany, Countries.unitedKingdom].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Turkey";
    }

    override color(): string {
        return "#0eebeb";
    }
}
