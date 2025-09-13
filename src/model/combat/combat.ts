import { Hex } from "../mapsheet.js";
import { AirUnit, NavalUnit, Unit } from "../units.js";

interface Combat {
    readonly attackers: ReadonlyArray<Unit>;
    readonly combatHex: Hex;

    /**
     * Inflicts combat damage. Not deterministic, so not suitable to be unit tested.
     */
    inflictDamages(): Combat.Result;

    /**
     * Gets the total modified strength points of the attackers.
     *
     * @returns The total modified strength points of the attackers.
     */
    modifiedAttackStrength(): number;
}

namespace Combat {
    export type Result = {
        attackerLosses?: number,
        defenderLosses?: number,
        damagedUnits?: Set<AirUnit | NavalUnit>,
        eliminatedUnits?: Set<Unit>,
        success?: boolean
    };
}

export default Combat;
