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

    /**
     * Gets the total unmodified strength points of the attackers. For land attacks, only includes land unit strength points.
     *
     * @returns The total unmodified strength points of the attackers.
     */
    unmodifiedAttackStrength(): number;
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
