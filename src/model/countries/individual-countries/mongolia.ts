import CountryWithoutUnits from "../country-without-units.js";

import { Countries, Country } from "../../countries.js";
import { date } from "../../date.js";
import { Partnership } from "../../partnership.js";

export default class Mongolia extends CountryWithoutUnits {
    constructor(){
        super("Mongolia");
    }

    override canBeInvadedBy(partnership: Partnership): boolean {
        return partnership !== Countries.sovietUnion.partnership() && super.canBeInvadedBy(partnership);
    }

    override additionalInvadedCountries(partnership: Partnership): Array<Country> {
        return [Countries.sovietUnion].filter(it => it.canBeInvadedBy(partnership));
    }

    override canBeActivated(partnership: Partnership): boolean {
        return this.partnership() === Partnership.Neutral
            && partnership === Countries.sovietUnion.partnership()
            && date.current !== Countries.sovietUnion.enteredWar
            && !Countries.sovietUnion.conquered()
            && (partnership === Countries.japan.partnership() || Countries.germany.conquered());
    }
}
