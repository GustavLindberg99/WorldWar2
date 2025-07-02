import UnitCombat from "./unit-combat.js";

import { Hex } from "../mapsheet.js";
import { Partnership } from "../partnership.js";
import { Countries } from "../countries.js";
import { AliveUnit, LandUnit, SupplyUnit, Unit } from "../units.js";
import { Combat } from "../combat.js";

export default class LandCombat extends UnitCombat {
    override readonly attackers: ReadonlyArray<Unit>;
    override readonly defenders: ReadonlyArray<LandUnit>;
    override readonly combatHex: Hex;

    readonly isAmphibious: boolean;
    willingToRetreat: boolean = true;

    /**
     * Constructs a new LandCombat object.
     *
     * @param attackers The attackers.
     * @param defenders The defenders.
     */
    constructor(attackers: ReadonlyArray<AliveUnit & Unit>, defenders: ReadonlyArray<AliveUnit & LandUnit>){
        super();
        this.attackers = attackers;
        this.defenders = defenders;
        this.combatHex = defenders[0].hex();
        this.isAmphibious = this.attackers.some(it => it instanceof LandUnit && it.hex() === this.combatHex);
    }

    override modifiedAttackStrength(): number {
        return this.attackers.reduce((a, b) => a + b.modifiedLandAttack(), 0);
    }

    override modifiedDefenseStrength(): number {
        return this.defenders.reduce((a, b) => a + b.modifiedDefense(), 0);
    }

    override unmodifiedAttackStrength(): number {
        return this.attackers.filter(it => it instanceof LandUnit).reduce((a, b) => a + b.strength, 0);
    }

    override unmodifiedDefenseStrength(): number {
        return this.defenders.reduce((a, b) => a + b.strength, 0);
    }

    /**
     * The probability for the defender to lose at least the given amount of strength points. This gets larger as the combat ratio increases. Does not take into account ability to retreat.
     *
     * @param strengthPoints    The amount of strength points to calculate the probability that the defender will lose.
     *
     * @returns The probability for the defender to lose at least the given amount of strength points.
     */
    defenderLossProbability(strengthPoints: number): number {
        /*
         * We want a function p(r), where p is the probability and r is the ratio, such that for any r > 0:
         *  1) 0 <= p(r) <= 1 (it's a valid probability)
         *  2) p(0) = 0 (supply units can't attack)
         *  3) p(Infinity) = 1 (attacking supply units always results in damage)
         *  4) p(2r) = unionProbability(p(r), p(r)) = 2p(r) - p(r)**2 (attacking in two separate attacks gives the same probability as attacking in one attack)
         *
         * (4) is a functional equation and according to https://www.wolframalpha.com/input?i2d=true&i=f%5C%2840%292x%5C%2841%29%3D2f%5C%2840%29x%5C%2841%29-Power%5Bf%5C%2840%29x%5C%2841%29%2C2%5D the general solution is p(r) = 1 - e**(dr). If d < 0 it satisfies (1), (2) and (3) as well, so the general solution that satisfies all these conditions is p(r) = 1 - c**-r where c >= 1.
         *
         * We have one free parameter, c, which can be a function of s (the number of strength points to lose). We want p(r, s) to be decrease as s increases. p(r, c) increases as c increases, so we want c(s) to be decreasing. If c=1 then p(r)=0, which is suitable for s=Infinity. If c=Infinity then p(r)=1, which is suitable for s=0. So we want:
         *  1) c(s) >= 1
         *  2) c(s) decreasing
         *  3) c(Infinity) = 1
         *  4) c(0) = Infinity
         *
         * c(s) = a/s + 1 satisfies this for any a. a=2 gives good probabilities in practice (for example for a combat ratio of 1, the probability of losing something is about 2/3 and the probability of 10 strength points being eliminated is about 1/6).
         *
         * This means that p(r, s) = 1 - (2/s + 1)**-r.
         *
         * JavaScript handles divisions by 0 correctly here. When attacking a supply unit, ratio becomes Infinity, and (something positive)**(-Infinity) = 0 => 1 - 0 = 1.
         */
        const ratio = this.modifiedAttackStrength() / this.modifiedDefenseStrength();
        return 1 - (2 / strengthPoints + 1) ** -ratio;
    }

    /**
     * The probability for the defender to be completely eliminated. This is just the probability that the defender will lose more strength points than they have.
     *
     * @returns The probability for the defender to be completely eliminated.
     */
    defenderEliminationProbability(): number {
        const canRetreat = this.willingToRetreat && this.retreatableHexes().length > 0;
        return this.defenderLossProbability(Math.ceil(this.unmodifiedDefenseStrength() / (canRetreat ? 1 : 2)));
    }

    /**
     * The probability for the attacker to lose at least the given amount of strength points. This doesn't depend on the combat ratio and the attacker can never lose more than 3 strength points (so this returns 0 if strengthPoints is greater than 3).
     *
     * @param strengthPoints    The amount of strength points to calculate the probability that the attacker will lose.
     *
     * @returns The probability for the attacker to lose at least the given amount of strength points.
     */
    attackerLossProbability(strengthPoints: number): number {
        if(strengthPoints > 3 || this.modifiedDefenseStrength() === 0){
            return 0;
        }
        const unclampedProbability = 1 / (1 + strengthPoints);
        return Math.max(0, Math.min(unclampedProbability, 1));
    }

    /**
     * The probability for the attacker to be completely eliminated. If the attacker is stronger than the defender, this is always 0. If the defender is stronger than the attacker, this probability increases as the combat ratio decreases.
     *
     * Does not take into account eliminations due to losses being greater than strength.
     *
     * @returns The probability for the attacker to be completely eliminated.
     */
    attackerEliminationProbability(): number {
        const defenseStrength = this.modifiedDefenseStrength();
        if(defenseStrength === 0){
            return 0;
        }
        const ratio = this.modifiedAttackStrength() / defenseStrength;
        return Math.max(0, Math.min(1 - ratio, 1));
    }

    override inflictDamages(): Combat.Result {
        //Calculate losses
        const landAttackers = this.attackers.filter(it => it instanceof LandUnit);
        const attackerLossesRandomNumber = Math.random();
        const defenderLossesRandomNumber = Math.random();
        let attackerLosses = 0;
        let defenderLosses = 0;
        if(attackerLossesRandomNumber < this.attackerEliminationProbability()){
            attackerLosses = this.unmodifiedAttackStrength();
        }
        else for(let i = this.unmodifiedAttackStrength(); i > 0; i--){
            if(attackerLossesRandomNumber < this.attackerLossProbability(i)){
                attackerLosses = i;
                break;
            }
        }
        for(let i = this.unmodifiedDefenseStrength(); i > 0; i--){
            if(defenderLossesRandomNumber < this.defenderLossProbability(i)){
                defenderLosses = i;
                break;
            }
        }

        //Calculate retreat
        const possibleRetreats = this.retreatableHexes();
        const retreat = (defenderLosses > 0 && this.willingToRetreat) ? possibleRetreats[Math.floor(Math.random() * possibleRetreats.length)] : undefined;
        if(retreat === undefined){
            defenderLosses *= 2;
        }

        //Distribute losses
        this.#distributeLosses(attackerLosses, landAttackers);
        this.#distributeLosses(defenderLosses, this.defenders);

        //If all defenders are eliminated, eliminate any remaining supply units
        if(this.defenders.every(it => it instanceof SupplyUnit || !it.isAlive())){
            for(let unit of this.defenders){
                if(unit.isAlive()){
                    unit.die();
                }
            }
        }

        //Retreat
        for(let [unit, hex] of retreat ?? []){
            if(unit.isAlive()){
                unit.setHex(hex);
                hex.setController(unit.owner, false);
            }
        }

        //Handle amphibious/paradrop combats
        const amphibiousAttackers: ReadonlyArray<LandUnit> = this.attackers.filter(it => it instanceof LandUnit).filter(it => it.isAlive() && it.hex() === this.combatHex);
        if(amphibiousAttackers.length > 0){
            if(this.defenders.some(it => it.hex() === this.combatHex)){
                for(let unit of this.combatHex.landUnits().filter(it => it.owner.partnership() === this.attackers[0].owner.partnership())){
                    attackerLosses += unit.strength;
                    unit.die();
                }
            }
            else{
                this.combatHex.setController(amphibiousAttackers[0].owner, false);
            }
        }

        //Update controller of Chinese hexes
        Countries.china.updateController();

        //Return information about the losses so that the view can use it
        return {
            attackerLosses: attackerLosses,
            defenderLosses: defenderLosses
        };
    }

    /**
     * Distributes losses among land units.
     *
     * @param losses    The number of strength points to lose.
     * @param units     The units that can lose strength points.
     */
    #distributeLosses(losses: number, units: ReadonlyArray<LandUnit>): void {
        for(let i = 0; i < losses; i++){
            const eligibleUnits = units.filter(it => it.isAlive() && it.strength > 0);

            //If there are no more alive non-supply units, kill any remaining supply units then finish
            if(eligibleUnits.length === 0){
                for(let unit of units){
                    if(unit.isAlive()){
                        unit.die();
                    }
                }
                break;
            }

            //If there are more units, pick one at random and make it lose a strength point
            const unit = eligibleUnits[Math.floor(Math.random() * eligibleUnits.length)];
            if(unit.strength === 1){
                unit.die();
            }
            else{
                unit.strength--;
                const clone = unit.clone();
                clone.strength = 1;
                unit.owner.availableUnits.add(clone);
            }
        }
    }

    protected override adjacentHexes(hex: Hex): Array<Hex> {
        return hex.adjacentLandHexes();
    }

    protected override relevantUnitsInHex(hex: Hex): IteratorObject<LandUnit> {
        return hex.landUnits();
    }

    protected override isInControlZone(hex: Hex, partnerhsip: Partnership): boolean {
        return hex.isInLandControlZone(partnerhsip);
    }
}
