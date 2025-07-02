import LandUnit from "../land-unit.js";
import Unit from "../unit.js";

import { Hex, WeatherCondition } from "../../mapsheet.js";
import { CountryWithUnits } from "../../countries.js";
import { Phase } from "../../phase.js";

export default class Armor extends LandUnit {
    hasDoneSuccessfulOverrun: boolean = false;

    #outOfSupply: boolean = false;

    override type(): string {
        return "Land unit (Armor)";
    }

    override price(): number {
        return this.strength * 200;
    }

    override delay(): number {
        return 3;
    }

    override outOfSupply(): boolean {
        return this.#outOfSupply && super.outOfSupply();
    }

    override updateSupply(): boolean {
        const result = super.updateSupply();
        this.#outOfSupply = super.outOfSupply();
        return result;
    }

    override maxStrength(): number {
        return this.owner.maxArmorStrength();
    }

    override canDoOverrun(): boolean {
        const hex = this.hex();
        return hex !== null && hex.weatherCondition() !== WeatherCondition.Spring && hex.weatherCondition() !== WeatherCondition.Monsoon;
    }

    override clone(): Armor {
        return new Armor(this.strength, this.movementAllowance, this.owner);
    }

    override validateMovement(passedHexes: ReadonlyArray<Hex>, movingByRail: boolean): boolean {
        return passedHexes.every(it => !it.isDesert() && !it.isIcecap())
            && super.validateMovement(passedHexes, movingByRail);
    }

    protected override validateMovementThroughControlZones(passedHexes: ReadonlyArray<Hex>, controlZones: ReadonlySet<Hex>, _canMoveOneExtraHex: boolean, movingByRail: boolean): boolean {
        if(this.hasDoneSuccessfulOverrun && (Phase.current === Phase.AxisFirstMovement || Phase.current === Phase.AlliedFirstMovement) && !movingByRail){
            return true;
        }
        return super.validateMovementThroughControlZones(passedHexes, controlZones, true, movingByRail);
    }

    override toJson(): Unit.Json {
        let json = super.toJson();
        json.outOfSupply = this.#outOfSupply || undefined;
        json.hasDoneSuccessfulOverrun = this.hasDoneSuccessfulOverrun || undefined;
        return json;
    }

    /**
     * Checks if the given JSON contains a valid armor unit, assuming it's a valid land unit.
     *
     * @param json  The JSON object to validate.
     *
     * @returns True if it does, false if it doesn't.
     */
    static validateArmorJson(json: object): json is Unit.Json {
        if("outOfSupply" in json && typeof(json.outOfSupply) !== "boolean"){
            console.warn("Invalid armor: invalid outOfSupply.");
            return false;
        }
        else if("hasDoneSuccessfulOverrun" in json && typeof(json.hasDoneSuccessfulOverrun) !== "boolean"){
            console.warn("Invalid armor: invalid hasDoneSuccessfulOverrun.");
            return false;
        }
        else{
            return true;
        }
    }

    /**
     * Parses the given JSON object as an armor unit.
     *
     * @param json  The JSON object to parse.
     * @param owner The unit's owner.
     *
     * @returns The unit.
     */
    static armorFromJson(json: Unit.Json, owner: CountryWithUnits): Armor {
        const unit = new Armor(json.strength!!, json.movementAllowance!!, owner);
        unit.#outOfSupply = json.outOfSupply ?? false;
        unit.hasDoneSuccessfulOverrun = json.hasDoneSuccessfulOverrun ?? false;
        return unit;
    }
}
