import { addToMapOfSets } from "../../../utils.js";

import CountryWithUnits from "../country-with-units.js";

import { Hex } from "../../mapsheet.js";
import { Partnership } from "../../partnership.js";
import { Countries, Country } from "../../countries.js";
import { Infantry } from "../../units.js";
import { date } from "../../date.js";

export default class Finland extends CountryWithUnits {
    constructor(){
        super(Partnership.Neutral);
        this.availableUnits = new Set(new Array(25).fill(null).map(() => new Infantry(1, 3, this)));
    }

    override canBeInvadedBy(_partnership: Partnership): boolean {
        return false;
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.germany, Countries.unitedKingdom].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Finland";
    }

    override color(): string {
        return "#9e4454";
    }

    /**
     * Checks whether the given partnership can make Finland surrender this turn.
     *
     * @param partnership   The partnership attempting to have Finland surrender.
     *
     * @returns True if Finland can surrender, false if it can't.
     */
    canSurrender(partnership: Partnership): boolean {
        return partnership === Countries.sovietUnion.partnership() && [
            ...Countries.germany.cities,
            ...Countries.poland.cities.filter(it => it.secondaryController !== Countries.sovietUnion)
        ].some(it => it.controller() === Countries.sovietUnion)
        && Countries.sovietUnion.landUnits().filter(it => it.hex()?.country === this).reduce((a, b) => a + b.strength, 0) >= 20;
    }

    /**
     * Makes Finland surrender.
     */
    surrender(): void {
        this.makeNeutral();
        this.availableUnits = new Set();
        this.delayedUnits = new Map();

        for(let hex of Hex.allHexes){
            if(hex.country === this){
                if(hex.secondaryController === Countries.sovietUnion){
                    hex.setController(Countries.sovietUnion);
                }
                else{
                    hex.setController(this);
                    for(let unit of hex.landUnits().filter(it => it.owner !== Countries.sovietUnion)){
                        unit.die();
                    }
                    for(let unit of hex.units()){
                        unit.delete();
                        addToMapOfSets(unit.owner.delayedUnits, date.current, unit);
                    }
                }
            }
            else if(hex.controller() === this){
                hex.setController(Countries.sovietUnion);
            }
        }
    }
}
