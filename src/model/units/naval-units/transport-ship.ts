import NavalUnit from "../naval-unit.js";

import { CountryWithUnits } from "../../countries.js";
import { Unit } from "../../units.js";

export default class TransportShip extends NavalUnit {
    /**
     * Constructs a transport ship.
     *
     * @param owner The owner.
     */
    constructor(owner: CountryWithUnits){
        super("Transport", 0, 0, 2, 50, owner);
    }

    override die(): void {
        for(let unit of this.embarkedUnits()){
            unit.die();
        }
        this.owner.availableUnits.add(this);
        this.delete();
    }

    override type(): string {
        return "Naval unit (Transport)";
    }

    override price(): number {
        return 400;
    }

    override delay(): number {
        return 2;
    }

    override sameTypeAndStrength(other: Unit): boolean {
        return this.owner === other.owner && other instanceof TransportShip;
    }
}
