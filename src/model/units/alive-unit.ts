import { Hex } from "../mapsheet.js";
import { Unit } from "../units.js";

/**
 * Interface representing an alive unit. To be used as an intersection type with the Unit class or its subclasses.
 *
 * This interface represents a dynamic state rather than a static type, so it's not appropriate to store an object of type AliveUnit, it's only intended to be used as a return value from functions.
 *
 * Should be used as `AliveUnit & Unit` in that order so that TypeScript prioritizes the AliveUnit `hex()` method which is more restrictive.
 */
export default interface AliveUnit {
    hex(): Hex;
    embarkedUnits(): ReadonlySet<AliveUnit & Unit>;
    embarkedOn(): AliveUnit & Unit;
}
