import LandUnit from "../land-unit.js";

import { CountryWithUnits } from "../../countries.js";
import { Hex } from "../../mapsheet.js";
import { Paratrooper, Unit } from "../../units.js";

export default class SupplyUnit extends LandUnit {
    #outOfSupply: boolean = false;

    constructor(movementAllowance: number, owner: CountryWithUnits){
        super(0, movementAllowance, owner);
    }

    override type(): string {
        return "Land unit (Supply Unit)";
    }

    override price(): number {
        return 0;
    }

    override delay(): number {
        return 1;
    }

    override die(): void {
        this.delete();
        this.owner.availableUnits.add(this);
    }

    override outOfSupply(): boolean {
        return this.#outOfSupply;
    }

    override updateSupply(): boolean {
        const result = super.updateSupply();
        this.#outOfSupply = super.outOfSupply();
        return result;
    }

    override canAttack(_unit: Unit | null = null): boolean {
        return false;
    }

    override canEnterHexWithinStackingLimits(hex: Hex, _willBeBased: boolean = false, otherUnits: IteratorObject<Unit> = hex.units()): boolean {
        const landUnits = [...otherUnits.filter(it => it !== this && it instanceof LandUnit)];
        return landUnits.length - (landUnits.some(it => it instanceof Paratrooper) ? 1 : 0) < 3;
    }

    override maxStrength(): number {
        return 0;
    }

    override clone(): SupplyUnit {
        return new SupplyUnit(this.movementAllowance, this.owner);
    }

    override toJson(): Unit.Json {
        let json = super.toJson();
        json.outOfSupply = this.#outOfSupply || undefined;
        return json;
    }

    /**
     * Checks if the given JSON contains a valid supply unit, assuming it's a valid land unit.
     *
     * @param json  The JSON object to validate.
     *
     * @returns True if it does, false if it doesn't.
     */
    static validateSupplyJson(json: object): json is Unit.Json {
        if("outOfSupply" in json && typeof(json.outOfSupply) !== "boolean"){
            console.warn("Invalid supply unit: invalid outOfSupply.");
            return false;
        }
        else{
            return true;
        }
    }

    /**
     * Parses the given JSON object as an supply unit.
     *
     * @param json  The JSON object to parse.
     * @param owner The unit's owner.
     *
     * @returns The unit.
     */
    static supplyUnitFromJson(json: Unit.Json, owner: CountryWithUnits): SupplyUnit {
        const unit = new SupplyUnit(json.movementAllowance!!, owner);
        unit.#outOfSupply = json.outOfSupply ?? false;
        return unit;
    }
}
