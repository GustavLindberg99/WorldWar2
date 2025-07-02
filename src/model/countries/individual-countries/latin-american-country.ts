import CountryWithoutUnits from "../country-without-units.js";

import { Countries, Country } from "../../countries.js";

export default class LatinAmericanCountry extends CountryWithoutUnits {
    override canSendMoneyWithoutConvoys(): Array<Country> {
        if(this.money > 0){
            return [Countries.unitedStates].filter(it => it.partnership() === this.partnership() && !it.conquered());
        }
        else{
            return [];
        }
    }
}
