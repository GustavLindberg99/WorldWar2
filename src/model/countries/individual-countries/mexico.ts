import LatinAmericanCountry from "./latin-american-country.js";

import { Partnership } from "../../partnership.js";
import { Countries, Country } from "../../countries.js";

export default class Mexico extends LatinAmericanCountry {
    readonly #nominal = undefined;

    constructor(){
        super("Mexico");
    }

    override additionalInvadedCountries(partnership: Partnership): Array<Country> {
        //Panama is needed for transitivity
        return [Countries.unitedStates, Countries.panama].filter(it => it.canBeInvadedBy(partnership));
    }
}
