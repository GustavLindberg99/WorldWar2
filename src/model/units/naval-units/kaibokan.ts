import NavalUnit from "../naval-unit.js";

import { CountryWithUnits } from "../../countries.js";

/**
 * A kaibokan is a Japanese DE, but it gets its own type because it's not at all the same thing as an Allied DE.
 */
export default class Kaibokan extends NavalUnit {
    /**
     * Constructs a kaibokan.
     *
     * @param name              The name of the ship.
     * @param attack            The attack strength.
     * @param defense           The defense strength.
     * @param movementAllowance The movement allowance.
     * @param owner             The owner.
     */
    constructor(name: string, attack: number, defense: number, movementAllowance: number, owner: CountryWithUnits){
        super(name, Math.floor(attack / 2), attack, defense, movementAllowance, owner);
    }

    override type(): string {
        return "Naval unit (Kaibokan)";
    }

    override price(): number {
        return 150;
    }

    override delay(): number {
        return 3;
    }
}
