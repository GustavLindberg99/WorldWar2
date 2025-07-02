import CountryWithUnits from "../country-with-units.js";

import { Countries, Country } from "../../countries.js";
import { Hex } from "../../mapsheet.js";
import { Partnership } from "../../partnership.js";
import { AirUnit, Destroyer, Infantry } from "../../units.js";

export default class Poland extends CountryWithUnits {
    constructor(){
        super(Partnership.Allies);
        this.availableUnits = new Set([
            ...(new Array(50)).fill(null).map(() => new Infantry(1, 3, this)),
            new AirUnit("PZL P-11", this),
            new Destroyer("Grom", 1, 2, 56, this)
        ]);
    }

    override joinPartnership(partnership: Partnership): void {
        super.joinPartnership(partnership);

        //When Germany invades Poland, the Soviet Union gains control of eastern Poland and stuff
        if(partnership === Partnership.Allies && Countries.germany.partnership() === Partnership.Axis && Countries.sovietUnion.partnership() === Partnership.Neutral){
            for(let hex of Hex.allHexes){
                if(hex.secondaryController === Countries.sovietUnion && hex.y > 164 /*Exclude hexes in northern Finland*/ && (hex.country === this || hex.country?.partnership() === Partnership.Neutral)){
                    hex.setController(Countries.sovietUnion);
                }
            }
        }
    }

    protected override shouldBeConquered(): boolean {
        return super.shouldBeConquered() || this.cities.every(it => it.controller() === Countries.sovietUnion || it.controller()!!.partnership() !== this.partnership());
    }

    protected override shouldBeLiberated(): boolean {
        return super.shouldBeLiberated() && this.cities.some(it => it.controller() !== Countries.sovietUnion && it.controller()!!.partnership() === this.partnership());
    }

    override additionalInvadedCountries(partnership: Partnership): Array<Country> {
        return [Countries.unitedKingdom].filter(it => it.canBeInvadedBy(partnership));
    }

    override name(): string {
        return "Poland";
    }

    override color(): string {
        return "#9bb400";
    }
}
