import NavalUnit from "../naval-unit.js";

import { Hex } from "../../mapsheet.js";
import { CountryWithUnits } from "../../countries.js";
import { LandUnit, Unit } from "../../units.js";

export default class Submarine extends NavalUnit {
    /**
     * Constructs a submarine.
     *
     * @param name              The name of the ship.
     * @param attack            The attack strength.
     * @param defense           The defense strength.
     * @param movementAllowance The movement allowance.
     * @param owner             The owner.
     */
    constructor(name: string, attack: number, defense: number, movementAllowance: number, owner: CountryWithUnits){
        super(name, attack, 3, defense, movementAllowance, owner);
    }

    override type(): string {
        return "Naval unit (Submarine)";
    }

    override price(): number {
        return 500;
    }

    override delay(): number {
        return 6;
    }

    override canAttack(unit?: Unit | null): boolean {
        return !(unit instanceof LandUnit) && super.canAttack(unit);
    }

    override modifiedLandAttack(): number {
        return 0;
    }

    protected override validateMovementThroughControlZones(passedHexes: ReadonlyArray<Hex>, controlZones: ReadonlySet<Hex>, _canMoveOneExtraHex: boolean, movingByRail: boolean): boolean {
        return super.validateMovementThroughControlZones(passedHexes, controlZones, true, movingByRail);
    }
}
