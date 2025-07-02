import NavalUnit from "../naval-unit.js";

import { CountryWithUnits } from "../../countries.js";

export default abstract class HeavyShip extends NavalUnit {
    /**
     * Constructs a heavy ship.
     *
     * @param name              The name of the ship.
     * @param attack            The attack strength.
     * @param defense           The defense strength.
     * @param movementAllowance The movement allowance.
     * @param owner             The owner.
     */
    constructor(name: string, attack: number, defense: number, movementAllowance: number, owner: CountryWithUnits){
        super(name, attack, 0, defense, movementAllowance, owner);
    }

    override price(): number {
        return 1400;
    }

    override delay(): number {
        return 12;
    }
}
