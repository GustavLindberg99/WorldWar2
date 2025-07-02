import LandUnit from "../land-unit.js";

export default class Marine extends LandUnit {
    override type(): string {
        return "Land unit (Marine)";
    }

    override price(): number {
        return this.strength * 200;
    }

    override delay(): number {
        return 3;
    }

    override clone(): Marine {
        return new Marine(this.strength, this.movementAllowance, this.owner);
    }
}
