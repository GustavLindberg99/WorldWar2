import NavalUnit from "../naval-unit.js";

import { CountryWithUnits } from "../../countries.js";

export default class LightCruiser extends NavalUnit {
    /**
     * Constructs a light cruiser.
     *
     * @param name              The name of the ship.
     * @param attack            The attack strength.
     * @param defense           The defense strength.
     * @param movementAllowance The movement allowance.
     * @param owner             The owner.
     */
    constructor(name: string, attack: number, defense: number, movementAllowance: number, owner: CountryWithUnits){
        super(name, attack, Math.floor(attack / 2), defense, movementAllowance, owner);
    }

    override type(): string {
        return "Naval unit (Light Cruiser)";
    }

    override price(): number {
        return 200;
    }

    override delay(): number {
        return 6;
    }
}
