import CountryWithUnits from "../country-with-units.js";

import { Countries, Country } from "../../countries.js";
import { Partnership } from "../../partnership.js";
import { AirUnit, Destroyer, Infantry } from "../../units.js";

export default class Romania extends CountryWithUnits {
    constructor(){
        super(Partnership.Neutral);
        this.availableUnits = new Set([
            ...(new Array(35)).fill(null).map(() => new Infantry(1, 3, this)),
            new AirUnit("IAR-80", this),
            new Destroyer("Vifor", 1, 1, 49, this)
        ]);
    }

    override canBeActivated(partnership: Partnership): boolean {
        return this.partnership() === Partnership.Neutral
            && [Countries.sovietUnion, Countries.hungary, Countries.bulgaria].some(romanianEnemy =>
                romanianEnemy.isEnemy(partnership)
                && (partnership === Partnership.Axis ? Countries.germany : Countries.unitedKingdom)
                    .landUnits().some(it => it.hex().country === romanianEnemy)
            );
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.germany, Countries.unitedKingdom].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Romania";
    }

    override color(): string {
        return "#5d2f06";
    }
}
