import LatinAmericanCountry from "./latin-american-country.js";

import { Countries, Country } from "../../countries.js";
import { Partnership } from "../../partnership.js";

export default class Panama extends LatinAmericanCountry {
    override additionalInvadedCountries(partnership: Partnership): Array<Country> {
        return [Countries.unitedStates].filter(it => it.canBeInvadedBy(partnership));
    }
}
