import LandUnit from "../land-unit.js";

import { Hex } from "../../mapsheet.js";
import { SupplyUnit, Unit } from "../../units.js";

export default class Paratrooper extends LandUnit {
    override type(): string {
        return "Land unit (Paratrooper)";
    }

    override price(): number {
        return this.strength * 300;
    }

    override delay(): number {
        return 3;
    }

    override canEnterHexWithinStackingLimits(hex: Hex, _willBeBased: boolean = false, otherUnits: IteratorObject<Unit> = hex.units()): boolean {
        const landUnits = [...otherUnits.filter(it => it !== this && it instanceof LandUnit)];
        return landUnits.length - (landUnits.some(it => it instanceof SupplyUnit) ? 1 : 0) < 3;
    }

    override maxStrength(): number {
        return 1;
    }

    override clone(): Paratrooper {
        return new Paratrooper(this.strength, this.movementAllowance, this.owner);
    }
}
