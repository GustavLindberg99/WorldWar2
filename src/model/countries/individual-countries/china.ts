import CountryWithUnits from "../country-with-units.js";

import { Countries } from "../../countries.js";
import { currentYear, date, Month, year } from "../../date.js";
import { Partnership } from "../../partnership.js";
import { AirUnit, Infantry, LightCruiser, NavalUnit } from "../../units.js";

export default class China extends CountryWithUnits {
    constructor(){
        super(Partnership.Allies);
        this.availableUnits = new Set([
            ...(new Array(105)).fill(null).map(() => new Infantry(1, 3, this)),
            new AirUnit("I-16", this),
            new AirUnit("HE-111", this),
            new LightCruiser("Ning Hai", 1, 1, 33, this),
            new LightCruiser("Ying Swei", 1, 1, 29, this),
            new LightCruiser("Chao Ho", 1, 1, 29, this)
        ]);
    }

    override joinPartnership(partnership: Partnership): void {
        super.joinPartnership(partnership);

        //China shouldn't get any naval units in the 1939 scenario because in real life they were sunk in 1937
        if(currentYear() >= 1938){
            const delayedUnits = this.delayedUnits.get(date.current) ?? new Set();
            for(let unit of delayedUnits.values().filter(it => it instanceof NavalUnit)){
                delayedUnits.delete(unit);
            }
        }
    }

    override addNewAvailableUnits(): void {
        if(this.conquered()){
            return;
        }
        if(date.current === this.enteredWar){
            for(let i = 0; i < 10; i++){
                this.availableUnits.add(new Infantry(1, 3, this));
            }
        }
        if(date.current <= date(1938, Month.December) || year(date.current) === 1943){
            for(let i = 0; i < 2; i++){
                this.availableUnits.add(new Infantry(1, 3, this));
            }
        }
        if(Countries.unitedStates.enteredWar !== null && date.current === Countries.unitedStates.enteredWar + 12){
            this.availableUnits.add(new AirUnit("B-25 Mitchell", this));
        }
        else if(Countries.unitedStates.enteredWar !== null && date.current === Countries.unitedStates.enteredWar + 24){
            this.availableUnits.add(new AirUnit("B-25 Mitchell", this));
        }
    }

    protected override shouldBeLiberated(): boolean {
        //Japan leaving one Chinese city empty is enough to liberate China
        return !this.shouldBeConquered();
    }

    override income(): number {
        if(this.conquered()){
            return 0;
        }
        return super.income() + 600;
    }

    override name(): string {
        return "China";
    }

    override maxLandUnitStrength(): number {
        return 3;
    }

    override railCapacity(): number {
        return 1;
    }

    override color(): string {
        return "#f2f27e";
    }

    /**
     * Checks if China can receive money from the United Kingdom or the United States.
     *
     * @returns True if it can, false if it can't.
     */
    canReceiveMoney(): boolean {
        return this.hexes.some(chineseHex =>
            chineseHex.controller()!!.partnership() === Partnership.Allies
            && !chineseHex.isTallMountain()
            && chineseHex.adjacentLandHexes().some(burmeseHex =>
                burmeseHex.country === Countries.unitedKingdom
                && burmeseHex.controller()!!.partnership() === Partnership.Allies
                && !burmeseHex.isTallMountain()
            )
        );
    }

    /**
     * Gives the hexes to the correct controller depending on which land units are in them (this can only be done for China because for other countries passing through a hex gains control of it).
     *
     * This needs to be done separately from moving the units so that if the human player plays as the Axis they can undo movements in China while it's their turn.
     */
    updateController(): void {
        for(let hex of this.hexes){
            const enemyUnit = hex.landUnits().find(it => it.owner.partnership() !== this.partnership());
            if(enemyUnit === undefined){
                hex.setController(this);
            }
        }
    }
}
