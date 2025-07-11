import CountryWithUnits from "../country-with-units.js";

import { Countries, Country } from "../../countries.js";
import { Partnership } from "../../partnership.js";
import { AirUnit, Destroyer, Infantry, LightCruiser } from "../../units.js";

export default class Yugoslavia extends CountryWithUnits {
    constructor(){
        super(Partnership.Neutral);
        this.availableUnits = new Set([
            ...(new Array(25)).fill(null).map(() => new Infantry(1, 3, this)),
            new AirUnit("IK-2", this),
            new Destroyer("Beograd", 1, 1, 50, this),
            new LightCruiser("Dalmacija", 1, 1, 31, this)
        ]);
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.germany, Countries.unitedKingdom].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Yugoslavia";
    }

    override color(): string {
        return "#8e00f2";
    }
}
