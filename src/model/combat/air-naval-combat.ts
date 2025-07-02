import UnitCombat from "./unit-combat.js";

import { Hex } from "../mapsheet.js";
import { Partnership } from "../partnership.js";
import { AirUnit, AliveUnit, NavalUnit, Submarine } from "../units.js";
import { Combat } from "../combat.js";

export default class AirNavalCombat extends UnitCombat {
    override readonly attackers: ReadonlyArray<AirUnit | NavalUnit>;
    override readonly defenders: readonly [AirUnit] | ReadonlyArray<NavalUnit>;
    override readonly combatHex: Hex;

    kamikaze: boolean = false;

    /**
     * Constructs a new AirNavalCombat object.
     *
     * @param attackers The attackers.
     * @param defenders The defenders.
     */
    constructor(attackers: ReadonlyArray<AliveUnit & (AirUnit | NavalUnit)>, defenders: readonly [AliveUnit & AirUnit] | ReadonlyArray<AliveUnit & NavalUnit>){
        super();
        this.attackers = attackers;
        this.defenders = defenders;
        this.combatHex = defenders[0].hex();
    }

    override modifiedAttackStrength(): number {
        return this.attackers.reduce((a, b) => a + this.#strengthAgainst(b, this.defenders[0]) / (b.damaged() ? 2 : 1), 0);
    }

    override modifiedDefenseStrength(): number {
        return this.defenders.reduce((a, b) => a + b.defense / (b.damaged() ? 2 : 1), 0);
    }

    override unmodifiedAttackStrength(): number {
        return this.attackers.reduce((a, b) => a + this.#strengthAgainst(b, this.defenders[0]), 0);
    }

    override unmodifiedDefenseStrength(): number {
        return this.defenders.reduce((a, b) => a + b.defense, 0);
    }

    /**
     * Gets the total modified attack strength points of the defenders.
     *
     * @returns The total modified attack strength points of the defenders.
     */
    modifiedCounterAttackStrength(): number {
        return this.defenders.reduce((a, b) => a + this.#strengthAgainst(b, this.attackers[0]) / (b.damaged() ? 2 : 1), 0);
    }

    /**
     * Gets the total modified defense strength points of the attackers.
     *
     * @returns The total modified defense strength points of the attackers.
     */
    modifiedCounterDefenseStrength(): number {
        return this.attackers.reduce((a, b) => a + b.defense / (b.damaged() ? 2 : 1), 0);
    }

    /**
     * Gets the total unmodified attack strength points of the defenders.
     *
     * @returns The total unmodified attack strength points of the defenders.
     */
    unmodifiedCounterAttackStrength(): number {
        return this.defenders.reduce((a, b) => a + this.#strengthAgainst(b, this.attackers[0]), 0);
    }

    /**
     * Gets the total unmodified defense strength points of the attackers.
     *
     * @returns The total unmodified defense strength points of the attackers.
     */
    unmodifiedCounterDefenseStrength(): number {
        return this.attackers.reduce((a, b) => a + b.defense, 0);
    }

    /**
     * Gets the probability for the defender's mission to be canceled (if the attackers are air units) or for the defender to retreat (if the attackers are naval units).
     *
     * @returns The probability for the defender's mission to be canceled or for the defender to retreat.
     */
    defenderCancelOrRetreatProbability(): number {
        //Same function as in `LandCombat.defenderLossProbability()`, but with `strengthPoints` adjusted so that ratio=1 => probability=0.5.
        const ratio = this.modifiedAttackStrength() / this.modifiedDefenseStrength();
        return 1 - 2 ** -ratio;
    }

    /**
     * Gets the probability for the given unit to be damaged.
     *
     * @returns The probability for the given unit to be damaged.
     */
    damageProbability(unit: AirUnit | NavalUnit): number {
        if(this.kamikaze && this.attackers.includes(unit)){
            return 0;    //It will be eliminated, not damaged
        }
        return this.#damageOrEliminationProbability(
            this.attackers.includes(unit) ? this.modifiedCounterAttackStrength() : this.modifiedAttackStrength(),
            unit.defense,
            this.attackers.includes(unit) ? this.attackers.length : this.defenders.length,
            0.5
        );
    }

    /**
     * Gets the probability for the given unit to be eliminated directly (does not count the probability for a damaged unit to be eliminated due to additional damage).
     *
     * @returns The probability for the given unit to be eliminated.
     */
    eliminationProbability(unit: AirUnit | NavalUnit): number {
        if(this.kamikaze && this.attackers.includes(unit)){
            return 1;
        }
        return this.#damageOrEliminationProbability(
            this.attackers.includes(unit) ? this.modifiedCounterAttackStrength() : this.modifiedAttackStrength(),
            unit.defense,
            this.attackers.includes(unit) ? this.attackers.length : this.defenders.length,
            0.05
        );
    }

    override inflictDamages(): Combat.Result {
        //Calculate retreat
        const possibleRetreats = this.retreatableHexes();

        //Inflict damages
        let damagedOrEliminatedUnits = new Set<AirUnit | NavalUnit>();
        for(let unit of [...this.attackers, ...this.defenders]){
            if(Math.random() < this.damageProbability(unit)){
                unit.damage();
                damagedOrEliminatedUnits.add(unit);
            }
            if(Math.random() < this.eliminationProbability(unit)){
                unit.die();
                damagedOrEliminatedUnits.add(unit);
            }
        }

        const result: Combat.Result = {
            damagedUnits: new Set(damagedOrEliminatedUnits.values().filter(it => it.isAlive())),
            eliminatedUnits: new Set(damagedOrEliminatedUnits.values().filter(it => !it.isAlive()))
        };

        //Retreat
        const shouldRetreatOrMissionCanceled = Math.random() < this.defenderCancelOrRetreatProbability();
        if(this.attackers.some(it => it instanceof NavalUnit)){
            const retreat = shouldRetreatOrMissionCanceled ? possibleRetreats[Math.floor(Math.random() * possibleRetreats.length)] : undefined;
            for(let [unit, hex] of retreat ?? []){
                if(unit.isAlive()){
                    unit.setHex(hex);
                }
            }
        }

        //Mission canceled
        else{
            result.success = shouldRetreatOrMissionCanceled || this.defenders.every(it => !it.isAlive());
        }

        return result;
    }

    /**
     * Gets the unmodified attack strength of a given individual attacker against a given type of defender.
     *
     * @param attacker  The attacker.
     * @param defender  A defender. Used only to determine the type of combat.
     *
     * @returns The attacker's unmodified strength.
     */
    #strengthAgainst(attacker: AirUnit | NavalUnit, defender: AirUnit | NavalUnit): number {
        if(defender instanceof AirUnit){
            if(attacker instanceof AirUnit){
                return attacker.fighterStrength;
            }
            else{
                return 0;
            }
        }
        else{
            if(attacker instanceof AirUnit){
                if(this.kamikaze && this.attackers.includes(attacker)){
                    return (attacker.bomberStrength || attacker.kamikazeBaseStrength) * 3;
                }
                else{
                    return attacker.bomberStrength;
                }
            }
            else if(defender instanceof Submarine){
                return attacker.submarineAttack;
            }
            else{
                return attacker.attack;
            }
        }
    }

    /**
     * Helper function to gets the probability for a unit to be damaged/eliminated.
     *
     * For defenders that are alone, this is exactly the same function as for `defenderCancelOrRetreatProbability()` (so the probability to be damaged and to retreat should be the same).
     * If the defender isn't alone, this is the same for `defenderCancelOrRetreatProbability()` for a defender that has strength equal to the average of all defenders. If the strength is smaller than average it has a larger risk of getting damaged and vice-versa.
     * The expectation of the number of defenders that get damaged is the same for any number of defenders, but for a large number of defenders the actual outcome will be much closer to the expectation, whereas for only one defender the actual outcome can only be 0 or 1 and the probability is equal to the expectation.
     *
     * @param enemyStrength             The combined strength of all the enemy units.
     * @param individualDefenseStrength The defense strength of the friendly unit.
     * @param numberOfFriendlyUnits     The number of friendly units.
     * @param probabilityAtRatio1       The probability of the unit being damaged/elimnated if the ratio is 1. Should be 0.5 for damage and 0.05 for elimination.
     *
     * @returns The probability for a unit to be damaged/eliminated.
     */
    #damageOrEliminationProbability(enemyStrength: number, individualDefenseStrength: number, numberOfFriendlyUnits: number, probabilityAtRatio1: number): number {
        const ratio = enemyStrength / (individualDefenseStrength * numberOfFriendlyUnits);
        return 1 - (1 / (1 - probabilityAtRatio1)) ** -ratio;
    }

    protected override adjacentHexes(hex: Hex): Array<Hex> {
        return hex.adjacentSeaHexes();
    }

    protected override relevantUnitsInHex(hex: Hex): IteratorObject<NavalUnit> {
        return hex.navalUnits();
    }

    protected override isInControlZone(hex: Hex, partnerhsip: Partnership): boolean {
        return hex.isInNavalControlZone(partnerhsip, this.defenders[0] instanceof Submarine);
    }
}
