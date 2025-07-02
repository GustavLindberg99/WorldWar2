import NavalUnit from "../naval-unit.js";

import { CountryWithUnits } from "../../countries.js";

/**
 * Represents 5 individual ships.
 */
export default class Destroyer extends NavalUnit {
    /**
     * Constructs a destroyer.
     *
     * @param name              The name of the ship.
     * @param attack            The attack strength.
     * @param defense           The defense strength.
     * @param movementAllowance The movement allowance.
     * @param owner             The owner.
     */
    constructor(name: string, attack: number, defense: number, movementAllowance: number, owner: CountryWithUnits){
        super(name, attack, attack, defense, movementAllowance, owner);
    }

    override type(): string {
        return "Naval unit (Destroyer)";
    }

    override price(): number {
        return 500;
    }

    override delay(): number {
        return 6;
    }
}
