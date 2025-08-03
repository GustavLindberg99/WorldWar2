import { Countries, Country } from "./countries.js";
import { AliveUnit, Convoy, Unit } from "./units.js";
import { date } from "./date.js";

import UnitContainer from "./unit-container.js";

export class Partnership extends UnitContainer {
    static readonly Allies = new Partnership("Allies");
    static readonly Axis = new Partnership("Axis");
    static readonly Neutral = null;

    readonly name: "Axis" | "Allies";

    /**
     * Private constructor to prevent declaring any new partnership outside of the Partnership class.
     */
    private constructor(name: "Axis" | "Allies"){
        super();
        this.name = name;
    }

    override units(): IteratorObject<AliveUnit & Unit> {
        return Countries.all().values().filter(it => it.partnership() === this).flatMap(it => it.units());
    }

    /**
     * Gets the convoys belonging to this partnership that can take money.
     *
     * @param country   The country that the convoy should be in (excluding colonies). Null means any country.
     *
     * @returns The convoys belonging to this partnership that can take money.
     */
    convoys(country: Country | null = null): IteratorObject<AliveUnit & Convoy> {
        return this.units().filter(it => it instanceof Convoy).filter(it => it.inPort() && it.money === 0 && !it.hex().isColony && (country === null || it.hex().country === country));
    }

    /**
     * Gets all the countries that this player controls.
     *
     * @returns An array of countries.
     */
    countries(): Array<Country> {
        return Countries.all().filter(it => it.partnership() === this);
    }

    /**
     * Gets this player's delayed units entering this month.
     *
     * @returns An array of units.
     */
    currentDelayedUnits(): Array<Unit> {
        return Countries.all()
            .filter(it => it.partnership() === this && !it.conquered())
            .flatMap(it => [...it.delayedUnits.get(date.current) ?? new Set()]);
    }

    /**
     * Gets the opponent of this partnership.
     *
     * @returns The opponent of this partnership.
     */
    opponent(): Partnership {
        if(this === Partnership.Allies){
            return Partnership.Axis;
        }
        else{
            return Partnership.Allies;
        }
    }

    /**
     * Gets the partnership's available units.
     *
     * @returns The partnership's available units.
     */
    availableUnits(): IteratorObject<Unit> {
        return this.countries().values().flatMap(it => it.availableUnits);
    }
}
