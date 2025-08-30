import { joinIterables } from "../../utils.js";

import { Hex } from "../mapsheet.js";
import { Partnership } from "../partnership.js";
import { AliveUnit, LandUnit, Marine, Paratrooper, Unit } from "../units.js";
import { Combat } from "../combat.js";

export default abstract class UnitCombat implements Combat {
    abstract readonly attackers: ReadonlyArray<Unit>;
    abstract readonly defenders: ReadonlyArray<Unit>;
    abstract readonly combatHex: Hex;

    abstract inflictDamages(): Combat.Result;
    abstract modifiedAttackStrength(): number;
    abstract unmodifiedAttackStrength(): number;

    /**
     * Gets the total modified strength points of the defenders.
     *
     * @returns The total modified strength points of the defenders.
     */
    abstract modifiedDefenseStrength(): number;

    /**
     * Gets the total unmodified strength points of the defenders.
     *
     * @returns The total unmodified strength points of the defenders.
     */
    abstract unmodifiedDefenseStrength(): number;

    /**
     * Gets the adjacent hexes to the given hex for retreat purposes.
     *
     * @param hex   The hex to get the adjacent hexes to.
     *
     * @return The adjacent hexes.
     */
    protected abstract adjacentHexes(hex: Hex): Array<Hex>;

    /**
     * Gets the units in the hex that have the same type as the defender (land or naval).
     *
     * @param hex   The hex to get the units in.
     *
     * @returns The units.
     */
    protected abstract relevantUnitsInHex(hex: Hex): IteratorObject<Unit>;

    /**
     * Checks if the given hex is in the relevant control zone (land or naval) of the given partnership.
     *
     * @param hex           The hex to check if it's in the control zone.
     * @param partnerhsip   The partnership whose control zone to check.
     *
     * @returns True if this hex is in the partnership's control zone, false otherwise.
     */
    protected abstract isInControlZone(hex: Hex, partnerhsip: Partnership): boolean;

    /**
     * Gets the hexes that the defender can retreat to (regardless of whether or not they're willing to retreat).
     *
     * @returns An array containing all the retreat possibilities, where each possibility is a map that maps a defender to the hex it retreats to.
     */
    retreatableHexes(): ReadonlyArray<ReadonlyMap<Unit, Hex>> {
        const [firstDefender, ...otherDefenders] = this.defenders.filter(it => it.isAlive());
        const firstDefenderRetreats = this.#retreatableHexesByUnit(firstDefender)
            .map(it => new Map([[firstDefender, it]]));
        return this.#retreatableHexes(otherDefenders, firstDefenderRetreats);
    }

    /**
     * Recursive function (one recursion per defender) that determines which hexes remaining defenders can retreat to after other defenders have already retreated.
     *
     * @param defenders         The remaing defenders that need to retreat.
     * @param previousRetreats  The possible retreats by other defenders during previous recursions (this is a recursive function that runs one recursion per defender).
     *
     * @returns An array containing all the retreat possibilities, where each possibility is a map that maps a defender to the hex it retreats to.
     */
    #retreatableHexes(defenders: ReadonlyArray<AliveUnit & Unit>, previousRetreats: ReadonlyArray<ReadonlyMap<Unit, Hex>>): ReadonlyArray<ReadonlyMap<Unit, Hex>> {
        if(defenders.length === 0){
            return previousRetreats;
        }
        const [firstDefender, ...otherDefenders] = defenders;
        let result: Array<Map<Unit, Hex>> = [];
        for(let previousRetreat of previousRetreats){
            for(let hex of this.#retreatableHexesByUnit(firstDefender, previousRetreat)){
                let retreat = new Map(previousRetreat);
                retreat.set(firstDefender, hex);
                result.push(retreat);
            }
        }
        return this.#retreatableHexes(otherDefenders, result);
    }

    /**
     * Checks if a unit of the given partnership can retreat into the given hex. Does not take into account stacking limits or whether the defender is willing to retreat.
     *
     * @param hex           The hex to retreat into.
     * @param partnership   The partnership of the defender.
     *
     * @returns True if the defender can retreat into the given hex, false otherwise.
     */
    #hexIsRetreatable(hex: Hex, partnership: Partnership): boolean {
        return !this.relevantUnitsInHex(hex).some(it => it.owner.partnership() !== partnership)
            && hex.controller()?.partnership() !== Partnership.Neutral
            && (
                !this.isInControlZone(hex, partnership.opponent())
                || this.relevantUnitsInHex(hex).some(it => it.owner.partnership() === partnership)
            )
    }

    /**
     * Gets the hexes that the given unit can retreat into, respecting stacking limits, assuming other defenders are retreating to given hexes.
     *
     * @param defender          The defender retreating.
     * @param previousRetreat   Map<other defender, hex we assume that defender retreats to>.
     *
     * @returns The hexes that the given defender can retreat to given the above conditions.
     */
    #retreatableHexesByUnit(defender: AliveUnit & Unit, previousRetreat: ReadonlyMap<Unit, Hex> = new Map()): Array<Hex> {
        //Keep track of which hexes we've already tried retreating to so that we don't get stuck in an infinite loop
        let passedHexes: Array<Hex> = [defender.hex()];

        //Possible hexes that the retreat path can go to after the given hex
        const adjacentRetreatableHexes = (hex: Hex) => this.adjacentHexes(hex)
            .filter(it => this.#hexIsRetreatable(it, defender.owner.partnership()!!));

        //Whether there is room in the given hex
        const filterByStackingLimits = (hex: Hex) => defender.canEnterHexWithinStackingLimits(
            hex, joinIterables(
                this.relevantUnitsInHex(hex),
                previousRetreat.entries().filter(it => it[1] === hex).map(it => it[0])
            )
        );

        //The hexes the unit can retreat to without taking into account stacking limits
        let possibleHexesWithoutStackingLimits: Array<Hex> = adjacentRetreatableHexes(defender.hex());

        //A subset of the above taking into account stacking limits
        let possibleHexes: Array<Hex> = possibleHexesWithoutStackingLimits.filter(filterByStackingLimits);

        //The above arrays are initialized to the adjacent hexes the unit can retreat to obeying all rules except stacking limits. If none of those possibilities obey stacking limits, retreat an additional hex until stacking limits are obeyed.
        while(possibleHexesWithoutStackingLimits.length > 0 && possibleHexes.length === 0){
            passedHexes.push(...possibleHexesWithoutStackingLimits);
            possibleHexesWithoutStackingLimits = possibleHexesWithoutStackingLimits
                .flatMap(it => adjacentRetreatableHexes(it))
                .filter(it => !passedHexes.includes(it));
            possibleHexes = possibleHexesWithoutStackingLimits.filter(filterByStackingLimits);
        }

        return possibleHexes;
    }

    /**
     * Gets the success of an amphibious assault/paradrop succeeding.
     *
     * @param amphibiousUnits   The units that will do an amphibious assault.
     * @param paradropUnits     The units that will do a paradrop.
     *
     * @returns The probability of the assault succeeding.
     */
    static amphibiousParadropSuccessProbability(amphibiousUnits: ReadonlySet<LandUnit>, paradropUnits: ReadonlySet<Paratrooper>): number {
        let successProbability = 0.5;
        if(amphibiousUnits.size > 0 && paradropUnits.size > 0){
            successProbability += 0.25;
        }
        if(amphibiousUnits.values().some(it => it instanceof Marine)){
            successProbability += 0.25;
        }
        return successProbability;
    }

    /**
     * Runs an amphibious assault/paradrop.
     *
     * @param amphibiousUnits   The units that will do an amphibious assault.
     * @param paradropUnits     The units that will do a paradrop.
     *
     * @returns True on success, false on failure.
     */
    static runAmphibiousParadrop(amphibiousUnits: ReadonlySet<AliveUnit & LandUnit>, paradropUnits: ReadonlySet<AliveUnit & Paratrooper>): boolean {
        const selectedUnits = joinIterables<AliveUnit & LandUnit>(amphibiousUnits, paradropUnits);
        if(Math.random() < UnitCombat.amphibiousParadropSuccessProbability(amphibiousUnits, paradropUnits)){
            for(let unit of selectedUnits){
                const hex = unit.hex();
                unit.setHex(hex);
                if(!hex.landUnits().some(it => it.owner.partnership() !== unit.owner.partnership())){
                    hex.setController(unit.owner, false);
                    unit.hasAttacked = true;
                }
            }
            return true;
        }
        else{
            for(let unit of selectedUnits){
                unit.die();
            }
            return false;
        }
    }
}
