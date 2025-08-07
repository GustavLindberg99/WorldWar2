import NavalUnit from "../naval-unit.js";

import { Countries, Country, CountryWithUnits } from "../../countries.js";
import { Unit } from "../../units.js";

export default class Convoy extends NavalUnit {
    money: number = 0;
    destination: Country | null = null;

    static readonly maxMoney = 1000;

    /**
     * Constructs a convoy.
     *
     * @param owner The owner.
     */
    constructor(owner: CountryWithUnits){
        super("Transport", 0, 0, 2, 50, owner);
    }

    override die(): void {
        this.owner.availableUnits.add(this);
        this.delete();
    }

    override canTakeDamage(): boolean {
        return false;
    }

    override type(): string {
        return "Naval unit (Convoy)";
    }

    override price(): number {
        return 50;
    }

    override delay(): number {
        return 2;
    }

    override sameTypeAndStrength(other: Unit): boolean {
        return this.owner === other.owner && other instanceof Convoy;
    }

    override sameBasicType(other: Unit): boolean {
        return other instanceof Convoy && other.owner.partnership() === this.owner.partnership();
    }

    override toJson(): Unit.Json {
        let json = super.toJson();
        json.money = this.money || undefined;
        json.destination = this.destination?.name();
        return json;
    }

    /**
     * Checks if the given JSON contains a valid convoy unit, assuming it's a valid naval unit.
     *
     * @param json  The JSON object to validate.
     *
     * @returns True if it does, false if it doesn't.
     */
    static validateConvoyJson(json: object): json is Unit.Json {
        if("money" in json && (typeof(json.money) !== "number" || json.money < 0)){
            console.warn("Invalid convoy: invalid money.");
            return false;
        }
        else if("destination" in json && Countries.fromName(json.destination) === null){
            console.warn("Invalid convoy: invalid destination.");
            return false;
        }
        else{
            return true;
        }
    }
}
