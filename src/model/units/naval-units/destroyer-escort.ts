import NavalUnit from "../naval-unit.js";

import { CountryWithUnits } from "../../countries.js";

export default class DestroyerEscort extends NavalUnit {
    /**
     * Constructs a destroyer escort.
     *
     * @param name              The name of the ship.
     * @param attack            The attack strength.
     * @param defense           The defense strength.
     * @param movementAllowance The movement allowance.
     * @param owner             The owner.
     */
    constructor(name: string, attack: number, defense: number, movementAllowance: number, owner: CountryWithUnits){
        super(name, 0, attack, defense, movementAllowance, owner);
    }

    override type(): string {
        return "Naval unit (Destroyer Escort)";
    }

    override price(): number {
        return 400;
    }

    override delay(): number {
        return 3;
    }
}
