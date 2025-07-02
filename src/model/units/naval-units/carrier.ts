import NavalUnit from "../naval-unit.js";

import { CountryWithUnits } from "../../countries.js";
import { AirUnit } from "../../units.js";

export default class Carrier extends NavalUnit {
    /**
     * Constructs a carrier.
     *
     * @param name              The name of the ship.
     * @param defense           The defense strength.
     * @param movementAllowance The movement allowance.
     * @param owner             The owner.
     * @param airUnit           The air unit that should begin embarked on this carrier.
     */
    constructor(name: string, defense: number, movementAllowance: number, owner: CountryWithUnits, airUnit: AirUnit | null){
        super(name, 0, 0, defense, movementAllowance, owner);

        if(airUnit !== null){
            airUnit.embarkOnto(this);
            airUnit.based = true;
        }
    }

    override die(): void {
        for(let unit of this.embarkedUnits()){
            unit.owner.availableUnits.add(unit);
        }
        super.die();
    }

    override type(): string {
        return "Naval unit (Carrier)";
    }

    override price(): number {
        return 1400;
    }

    override delay(): number {
        return 12;
    }
}
