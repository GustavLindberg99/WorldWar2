import Country from "./country.js";

import { date } from "../date.js";
import { AliveUnit, Infantry, Unit } from "../units.js";
import { Partnership } from "../partnership.js";
import { Countries } from "../countries.js";

export default abstract class CountryWithUnits extends Country {
    #liberatedForces: Set<Infantry> = new Set();

    override units(): IteratorObject<AliveUnit & Unit> {
        return Unit.allAliveUnits().filter(it => it.owner === this as Country);
    }

    override joinPartnership(partnership: Partnership): void {
        if(this.partnership() === Partnership.Neutral && partnership === Partnership.Axis){
            //Vichy France gets no Axis-friendly liberated forces.
            //This is only relevant to Vichy France since other countries don't have any liberated forces yet anyway when they first enter the war (checking that the partnership is initially neutral is important otherwise calling joinPartnership() on a non-neutral conquered country might have unwanted side effects).
            this.#liberatedForces = new Set();
        }
        super.joinPartnership(partnership);
    }

    protected override conquer(): void {
        for(let unit of [...this.units(), ...this.availableUnits, ...this.delayedUnits.values().reduce((a, b) => [...a, ...b], new Array<Unit>())]){
            if(unit instanceof Infantry){
                for(let i = 0; i < unit.strength; i++){
                    const china: Country = Countries.china;
                    if(this.#liberatedForces.size < 5 || this === china){
                        this.#liberatedForces.add(new Infantry(1, unit.movementAllowance, this));
                    }
                }
            }
            unit.delete();
        }

        this.availableUnits = new Set();
        this.delayedUnits = new Map();

        super.conquer();
    }

    protected override liberate(): void {
        super.liberate();

        if(this.#liberatedForces !== null){
            this.delayedUnits.set(date.current, this.#liberatedForces);
            this.#liberatedForces = new Set();
        }
    }

    /**
     * Gets the maximum strength an infantry or marine unit belonging to this country can have.
     */
    maxLandUnitStrength(): number {
        return 5;
    }

    /**
     * Gets the maximum strength an armor unit belonging to this country can have.
     */
    maxArmorStrength(): number {
        return 8;
    }

    /**
     * Gets the color that this country's units should have as a hex string (example `#ffffff`).
     */
    abstract color(): string;

    override toJson(): Country.Json {
        let json = super.toJson();
        if(this.#liberatedForces.size > 0){
            json.liberatedForces = [...this.#liberatedForces.values().map(it => it.toJson())];
        }
        return json;
    }

    override loadFromJson(json: Country.Json): void {
        super.loadFromJson(json);
        this.#liberatedForces = new Set(json.liberatedForces?.map(it => Unit.fromJson(it) as Infantry));
    }
}
