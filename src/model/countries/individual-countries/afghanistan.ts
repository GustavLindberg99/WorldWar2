import CountryWithUnits from "../country-with-units.js";

import { Countries } from "../../countries.js";
import { Hex } from "../../mapsheet.js";
import { Partnership } from "../../partnership.js";
import { Infantry } from "../../units.js";

export default class Afghanistan extends CountryWithUnits {
    constructor(){
        super(Partnership.Neutral);
        this.availableUnits = new Set(new Array(5).fill(null).map(() => new Infantry(1, 3, this)));
    }

    override canBeActivated(partnership: Partnership): boolean {
        return this.partnership() === Partnership.Neutral
            && partnership === Partnership.Axis
            && (Countries.sovietUnion.partnership() !== Partnership.Axis || Countries.sovietUnion.conquered())
            && Hex.allCityHexes.some(it =>
                it.controller()!!.partnership() === Partnership.Axis &&
                (it.city === "Karachi" || it.city === "Urumchi" || it.city === "Ashkhabad" || it.city === "Tashkent")
            )
    }

    override name(): string {
        return "Afghanistan";
    }

    override color(): string {
        return "#601950";
    }
}
