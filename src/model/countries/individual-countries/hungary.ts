import CountryWithUnits from "../country-with-units.js";

import { Countries, Country } from "../../countries.js";
import { Partnership } from "../../partnership.js";
import { Infantry } from "../../units.js";

export default class Hungary extends CountryWithUnits {
    constructor(){
        super(Partnership.Axis);
        this.availableUnits = new Set(new Array(30).fill(null).map(() => new Infantry(1, 3, this)));
    }

    override additionalInvadedCountries(partnership: Partnership): Array<Country> {
        return [Countries.germany].filter(it => it.canBeInvadedBy(partnership));
    }

    override canBeActivated(partnership: Partnership): boolean {
        return this.partnership() === Partnership.Neutral
            && partnership === Partnership.Axis
            && Countries.germany.landUnits().some(it => it.hex()?.country === Countries.yugoslavia);
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.germany].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Hungary";
    }

    override color(): string {
        return "#973800";
    }
}
