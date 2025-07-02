import lodash from "https://cdn.jsdelivr.net/npm/lodash@4.17.21/+esm";
import { joinIterables, refreshUI, sortNumber } from "../../../utils.js";

import { Hex, SupplyLines } from "../../../model/mapsheet.js";
import { Partnership } from "../../../model/partnership.js";
import { AirUnit, AliveUnit, LandUnit, NavalUnit, Unit } from "../../../model/units.js";

import UnitMarker from "../../../view/markers/unit-marker.js";

import FrontLine from "../front-line.js";

namespace AirNavalAutoplacement {
    /**
     * Guesses where the opponent will place their new units. Also takes into account existing units and gives them higher priority.
     *
     * @param opponent  The opponent to the player who is guessing.
     * @param frontLine The hexes controlled by the player who is guessing adjacent to hexes controlled by the opponent.
     *
     * @returns A map with hexes as keys and the units that are guessed to be in each hex as values. If we know for sure that units are there because they already exist, the same unit will appear twice in the array for that hex.
     */
    function guessOpponentUnitPlacement(opponent: Partnership, frontLine: ReadonlyArray<Hex>): Map<Hex, Array<Unit>> {
        const opponentDelayedUnits: ReadonlyArray<Unit> = [...opponent.currentDelayedUnits()];    //Copy this here so that it doesn't matter if the opponent places his units first
        const opponentUnits: ReadonlyArray<AliveUnit & Unit> = [...opponent.units()];    //Copy this here so that it doesn't matter if the opponent places his units first

        const opponentUnitsGuess: Map<Hex, Array<Unit>> = new Map();
        const addToMap = (hex: Hex, ...units: ReadonlyArray<Unit>) => {
            const allUnits = opponentUnitsGuess.get(hex) ?? [];
            allUnits.push(...units);
            opponentUnitsGuess.set(hex, allUnits);
        };
        for(let unit of opponentUnits){
            if(unit.isAlive()){    //Check if the unit is alive in case it merged with another unit while transferring strength
                addToMap(unit.hex(), unit, unit);    //Add the unit twice to prioritize existing units over guessing where he's going to put new units
            }
        }
        const allAirbases = Hex.allHexes.filter(it => it.airbaseCapacity() >= 1 && it.controller()!!.partnership() === opponent && it.country!!.partnership() === opponent);    //Only check if it has the capacity to base air units at all, not if it has the capacity to base more air units, otherwise it might count units that have just been placed this turn and are still in the opponentDelayedUnits array
        const allPorts = Hex.allHexes.filter(it => it.isPort() && it.controller()!!.partnership() === opponent && it.country!!.partnership() === opponent);
        for(let unit of opponentDelayedUnits){
            let hex: Hex | undefined;
            if(unit instanceof LandUnit){
                hex = lodash.sample(frontLine.filter(it => [it, ...it.adjacentHexes()].some(adjacentHex => adjacentHex.country === unit.owner)));
            }
            else{
                const possibleHexes: ReadonlyArray<Hex> = (unit instanceof AirUnit ? allAirbases : allPorts).filter(it => it.controller() === unit.owner && it.country === unit.owner);
                const sortedPossibleHexes: ReadonlyArray<Hex> = lodash.shuffle(possibleHexes).sort((a, b) => a.distanceFromHexGroup(frontLine) - b.distanceFromHexGroup(frontLine));
                hex = sortedPossibleHexes[Math.floor(Math.random()**4 * possibleHexes.length)];
            }
            if(hex !== undefined){
                addToMap(hex, unit);
            }
        }
        return opponentUnitsGuess;
    }

    /**
     * Determines where the computer thinks it's best to place air units. Does not actually place anything, instead returns the hexes where the units should be placed.
     *
     * @param partnership       The partnership whose units to place.
     * @param availableAirUnits The air units to place.
     * @param updateProgress    A callback to update progress. Whenever progress is made, this will be called with a number as parameter, where 0 means no progress has been made and 1 means it's done.
     *
     * @returns Map<AirUnit, Hex where that unit should be placed>. All the keys are guaranteed to be in the availableLandUnits parameter, but the reverse isn't necessarily true if it's not possible to place all air units.
     */
    export async function getAirUnitAutoplacement(partnership: Partnership, availableAirUnits: ReadonlyArray<AirUnit>, updateProgress: ((it: number) => void) | null = null): Promise<Map<AirUnit, Hex>> {
        let result = new Map<AirUnit, Hex>();

        const unitsToBePlacedInHex = (hex: Hex) => result.entries().filter(it => it[1] === hex).map(it => it[0]);
        const totalUnitsToBeInHex = (hex: Hex) => joinIterables(hex.airUnits(), unitsToBePlacedInHex(hex));

        const opponentUnitsGuess: ReadonlyMap<Hex, ReadonlyArray<Unit>> = guessOpponentUnitPlacement(partnership.opponent(), await FrontLine.get(partnership));

        let cachedNearbyUnits = new Map<string, number>();
        const numberOfNearbyUnits = (hex: Hex, isFighter: boolean, isBomber: boolean) => {
            const cachedResult = cachedNearbyUnits.get([hex.x, hex.y, isFighter, isBomber].toString());
            if(cachedResult !== undefined){
                return cachedResult;
            }
            let numberOfUnitsAtHex: (it: Hex) => number;
            if(isFighter && isBomber){
                numberOfUnitsAtHex = it => (opponentUnitsGuess.get(it) ?? []).length;
            }
            else if(isFighter){
                numberOfUnitsAtHex = hex => (opponentUnitsGuess.get(hex) ?? []).filter(it => it instanceof AirUnit).length;
            }
            else if(isBomber){
                numberOfUnitsAtHex = hex => (opponentUnitsGuess.get(hex) ?? []).filter(it => !(it instanceof AirUnit)).length;
            }
            else{
                numberOfUnitsAtHex = hex => [...hex.landUnits().filter(it => it.owner.partnership() === partnership && !it.outOfSupply() && SupplyLines.canTraceSupplyLine(hex, it.owner, false))].length;
            }
            let result = 0;
            for(let otherHex of Hex.allHexes){
                if(otherHex.distanceFromHex(hex) > 15){
                    continue;
                }
                else if(otherHex.distanceFromHex(hex) > 10){
                    result += numberOfUnitsAtHex(otherHex);
                }
                else if(otherHex.distanceFromHex(hex) > 5){
                    result += numberOfUnitsAtHex(otherHex) * 2;
                }
                else{
                    result += numberOfUnitsAtHex(otherHex) * 3;
                }
            }
            cachedNearbyUnits.set([hex.x, hex.y, isFighter, isBomber].toString(), result);
            return result;
        };

        const airbases: ReadonlyArray<Hex> = lodash.shuffle(Hex.allHexes.filter(it =>
            it.airbaseCapacity() - [...it.basedAirUnits()].length >= 1
            && it.controller()!!.partnership() === partnership)
        );
        let progress = 0;
        for(let unit of availableAirUnits.toSorted((a, b) => a.movementAllowance - b.movementAllowance)){    //Give higher priority to air units with low movement allowance because it's more imporant for them to be close to where they want to go
            await refreshUI();
            progress++;
            updateProgress?.(progress / availableAirUnits.length);
            const possibleHexes = airbases.filter(it =>
                unit.canEnterHexWithinStackingLimits(it, true, totalUnitsToBeInHex(it))
                && it.unitCanBePlacedHere(unit)
                && SupplyLines.canTraceSupplyLine(it, unit.owner)
            );
            const hex = lodash.shuffle(possibleHexes).sort((a, b) =>
                sortNumber(b, a, it => numberOfNearbyUnits(it, unit.isFighter(), unit.isBomber()))
            )[0];
            if(hex !== undefined){
                result.set(unit, hex);
            }
        }

        return result;
    }

    /**
     * Determines where the computer thinks it's best to place naval units. Does not actually place anything, instead returns the hexes where the units should be placed.
     *
     * @param partnership           The partnership whose units to place.
     * @param availableNavalUnits   The naval units to place.
     * @param updateProgress        A callback to update progress. Whenever progress is made, this will be called with a number as parameter, where 0 means no progress has been made and 1 means it's done.
     *
     * @returns Map<NavalUnit, Hex where that unit should be placed>. All the keys are guaranteed to be in the availableLandUnits parameter, but the reverse isn't necessarily true if it's not possible to place all naval units.
     */
    export async function getNavalUnitAutoplacement(partnership: Partnership, availableNavalUnits: ReadonlyArray<NavalUnit>, updateProgress: ((it: number) => void) | null = null): Promise<Map<NavalUnit, Hex>> {
        let result = new Map<NavalUnit, Hex>();
        const frontLine = await FrontLine.get(partnership);

        const unitsToBePlacedInHex = (hex: Hex) => result.entries().filter(it => it[1] === hex).map(it => it[0]);
        const totalUnitsToBeInHex = (hex: Hex) => joinIterables(hex.navalUnits(), unitsToBePlacedInHex(hex));

        const friendlyNavalUnitsInHex = (hex: Hex) => [...hex.navalUnits().filter(it => it.owner.partnership() === partnership)].length;
        const ports = Hex.allHexes.filter(hex =>
            hex.isPort()
            && hex.controller()!!.partnership() === partnership
            && !hex.navalUnits().some(it => it.owner.partnership() !== partnership)
            && hex.city !== "Vladivostok"
        ).sort((a, b) =>
            sortNumber(b, a, it => it.city === "Halifax")    //Prioritize Halifax for Canadian convoys so that Canada can send money to the UK (otherwise they will be placed in Vancouver and have trouble reaching the UK)
            || sortNumber(b, a, it => friendlyNavalUnitsInHex(it))
            || sortNumber(b, a, it => it.isMajorPort())
            || sortNumber(b, a, it => !it.isColony)
            || sortNumber(a, b, it => it.distanceFromHexGroup(frontLine))
        );
        let progress = 0;
        for(let unit of availableNavalUnits){
            await refreshUI();
            progress++;
            updateProgress?.(progress / availableNavalUnits.length);
            const port = ports.find(it =>
                unit.canEnterHexWithinStackingLimits(it, true, totalUnitsToBeInHex(it))
                && it.unitCanBePlacedHere(unit)
                && SupplyLines.canTraceSupplyLine(it, unit.owner)
            );
            if(port !== undefined){
                result.set(unit, port);
            }
        }

        return result;
    }

    /**
     * Places the air or naval units as determined by the map passed as parameter.
     *
     * @param placements    A map returned by getAirUnitAutoplacement or getNavalUnitAutoplacement.
     */
    export function placeAirNavalUnits(placements: ReadonlyMap<AirUnit | NavalUnit, Hex>): void {
        for(let [unit, hex] of placements){
            unit.setHex(hex);
            if(unit instanceof AirUnit){
                unit.based = true;
            }
            else{
                unit.inPort = true;
            }
            UnitMarker.get(unit).update();
        }
    }
}
export default AirNavalAutoplacement;
