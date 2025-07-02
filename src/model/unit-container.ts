import { AirUnit, AliveUnit, LandUnit, NavalUnit, SupplyUnit, Unit } from "./units.js";

/**
 * Abstract base class for anything that can own or contain units (hexes, partnerships, countries). Exists to avoid duplicating logic for filtering different kinds of units.
 */
export default abstract class UnitContainer {
    abstract units(): IteratorObject<AliveUnit & Unit>;

    landUnits(): IteratorObject<AliveUnit & LandUnit> {
        return this.units().filter(it => it instanceof LandUnit);
    }

    supplyUnits(): IteratorObject<AliveUnit & SupplyUnit> {
        return this.units().filter(it => it instanceof SupplyUnit);
    }

    airUnits(): IteratorObject<AliveUnit & AirUnit> {
        return this.units().filter(it => it instanceof AirUnit);
    }

    basedAirUnits(): IteratorObject<AliveUnit & AirUnit> {
        return this.airUnits().filter(it => it.based);
    }

    unbasedAirUnits(): IteratorObject<AliveUnit & AirUnit> {
        return this.airUnits().filter(it => !it.based);
    }

    navalUnits(): IteratorObject<AliveUnit & NavalUnit> {
        return this.units().filter(it => it instanceof NavalUnit);
    }
}
