import { Hex } from "../mapsheet.js";
import { AirUnit, AliveUnit } from "../units.js";
import { Combat } from "../combat.js";

export default abstract class Bombing implements Combat {
    readonly attackers: ReadonlyArray<AirUnit>;
    readonly combatHex: Hex;

    /**
     * Constructs a new Bombing object.
     *
     * @param attackers The attackers.
     */
    constructor(attackers: ReadonlyArray<AliveUnit & AirUnit>){
        this.attackers = attackers;
        this.combatHex = attackers[0].hex();
    }

    modifiedAttackStrength(): number {
        return this.attackers.reduce((a, b) => a + b.bomberStrength / (b.damaged() ? 2 : 1), 0);
    }

    unmodifiedAttackStrength(): number {
        return this.attackers.reduce((a, b) => a + b.bomberStrength, 0);
    }

    /**
     * The probability for the bombing to succeed.
     *
     * @returns The probability for the bombing to succeed.
     */
    successProbability(): number {
        //Same function as in `LandCombat.defenderLossProbability()`, but with `strengthPoints` adjusted so that strength=5 => probability=0.5.
        return 1 - 2 ** (-this.modifiedAttackStrength() / 5);
    }

    /**
     * The probability for the attacker to be damaged.
     *
     * @returns The probability for the attacker to be damaged.
     */
    attackerDamageProbability(): number {
        return 0.2;
    }

    inflictDamages(): Combat.Result {
        let result: Combat.Result = {
            success: Math.random() < this.successProbability(),
            damagedUnits: new Set()
        };

        if(result.success){
            this.damageOnSuccess();
        }

        if(Math.random() < this.attackerDamageProbability()){
            const damagedAttacker = this.attackers[Math.floor(Math.random() * this.attackers.length)];
            damagedAttacker.damage();
            result.damagedUnits = new Set([damagedAttacker]);
        }

        return result;
    }

    /**
     * Inflicts the damages that should be inflicted in case of success. Deterministic.
     */
    protected abstract damageOnSuccess(): void;
}
