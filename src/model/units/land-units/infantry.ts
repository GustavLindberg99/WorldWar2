import LandUnit from "../land-unit.js";

export default class Infantry extends LandUnit {
    override type(): string {
        return "Land unit (Infantry)";
    }

    override price(): number {
        return this.strength * 100;
    }

    override delay(): number {
        return 1;
    }

    override clone(): Infantry {
        return new Infantry(this.strength, this.movementAllowance, this.owner);
    }
}
