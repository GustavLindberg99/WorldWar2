import lodash from "https://cdn.jsdelivr.net/npm/lodash@4.17.21/+esm";
import { joinIterables, refreshUI, sortNumber } from "../../../utils.js";

import { Hex, SupplyLines } from "../../../model/mapsheet.js";
import { Partnership } from "../../../model/partnership.js";
import { Countries, Country } from "../../../model/countries.js";
import { LandUnit, SupplyUnit } from "../../../model/units.js";
import { date, Month } from "../../../model/date.js";

import UnitMarker from "../../../view/markers/unit-marker.js";

import FrontLine from "../front-line.js";

class LandAutoplacer {
    placements = new Map<LandUnit, Hex | LandUnit>();

    readonly #partnership: Partnership;
    readonly #frontLine: ReadonlyArray<Hex>;
    readonly #updateProgress: ((it: number) => void) | null;

    #availableSupplyUnits: Set<SupplyUnit>;
    #availableNonSupplyUnits: Set<LandUnit>;

    /**
     * Constructs as LandAutoplacer object.
     *
     * @param partnership           The partnership whose units to place.
     * @param availableLandUnits    The land units to place.
     * @param frontLine             The hexes belonging to the given partnership that are adjacent to the opposing partnership.
     * @param updateProgress        A callback to update progress. Whenever progress is made, this will be called with a number as parameter, where 0 means no progress has been made and 1 means it's done.
     */
    constructor(partnership: Partnership, availableLandUnits: ReadonlyArray<LandUnit>, frontLine: ReadonlyArray<Hex>, updateProgress: ((it: number) => void) | null){
        this.#partnership = partnership;
        this.#frontLine = frontLine;
        this.#updateProgress = updateProgress;

        //These get emptied as the units are placed
        this.#availableSupplyUnits = new Set(availableLandUnits.filter(it => it instanceof SupplyUnit));
        this.#availableNonSupplyUnits = new Set(availableLandUnits.filter(it => !(it instanceof SupplyUnit)));
    }

    /**
     * Decides where to place Japanese land units in China in the beginning of the 1939 scenario. Assumes this is the beginning of the 1939 scenario, doesn't check for that.
     */
    placeJapaneseUnitsInChina(): void {
        //Place supply units in isolated cities where supply needs to be transported by sea
        const shantou = Hex.allCityHexes.find(it => it.city === "Shantou")!!;
        const guangzhou = Hex.allCityHexes.find(it => it.city === "Guangzhou")!!;
        const guangzhouResourceHex = guangzhou.adjacentLandHexes().find(it => it.isResourceHex)!!;
        const haikou = Hex.allCityHexes.find(it => it.city === "Haikou")!!;
        for(let hex of [shantou, guangzhou, haikou, guangzhouResourceHex]){
            const supplyUnit = this.#availableSupplyUnits.values().find(it => hex.unitCanBePlacedHere(it));
            if(supplyUnit !== undefined && !hex.landUnits().some(it => it instanceof SupplyUnit) && supplyUnit.canEnterHexWithinStackingLimits(hex, this.#totalUnitsToBeInHex(hex))){
                this.placements.set(supplyUnit, hex);
                this.#availableSupplyUnits.delete(supplyUnit);
            }
        }

        //Start by placing Japanese units in cities
        for(let hex of [...Countries.china.cities, ...Hex.allResourceHexes.filter(h => h.country === Countries.china)]){
            if(hex.controller() === Countries.japan && hex.landUnits().every(it => it instanceof SupplyUnit)){
                const newUnit = this.#availableNonSupplyUnits.values().find(it => hex.unitCanBePlacedHere(it));
                if(newUnit === undefined){
                    break;
                }
                this.placements.set(newUnit, hex);
                this.#availableNonSupplyUnits.delete(newUnit);
            }
        }

        //Make sure Japanese units can trace supply lines to Manchukuo if possible
        let suppliedHexes = Countries.china.hexes.filter(it =>
            it.adjacentLandHexes().some(adjacent => adjacent.country === Countries.japan)
        );
        const hexesToSupply: ReadonlyArray<Hex> = [...this.placements.values().filter(it => it instanceof Hex).filter(it => ![shantou, guangzhou, guangzhouResourceHex, haikou].includes(it))].sort((a, b) =>
            a.distanceFromHexGroup(suppliedHexes) - b.distanceFromHexGroup(suppliedHexes)
        );
        for(let hexToSupply of hexesToSupply){
            const supplyLine: ReadonlyArray<Hex> | null = SupplyLines.simplifiedPathBetweenHexes(hexToSupply, it => suppliedHexes.includes(it), it => it.controller()?.partnership() === Partnership.Axis);
            if(supplyLine === null){
                continue;
            }
            for(let hex of supplyLine){
                if(this.#totalUnitsToBeInHex(hex).every(it => it instanceof SupplyUnit)){
                    const unit = this.#availableNonSupplyUnits.values().find(it => hex.unitCanBePlacedHere(it));
                    if(unit === undefined){
                        break;
                    }
                    this.placements.set(unit, hex);
                    this.#availableNonSupplyUnits.delete(unit);
                }
            }
            suppliedHexes.push(...supplyLine);
        }
    }

    /**
     * Decides where to place non-supply units.
     */
    async placeNonSupplyUnits(): Promise<void> {
        let progress = 0;
        const maxProgress = this.#availableNonSupplyUnits.size;
        let hexesByCountry = new Map<Country, Array<Hex>>();
        for(let newUnit of this.#availableNonSupplyUnits){
            await refreshUI();
            progress++;
            this.#updateProgress?.(progress / maxProgress);

            //First try to find a city or front line hex where it's possible to place the unit
            let hexes = hexesByCountry.get(newUnit.owner) ?? this.#sortHexesByPreferred(newUnit.owner, newUnit, [...newUnit.owner.cities, ...this.#frontLine]);
            let hex = await this.#findSuppliedHex(hexes, newUnit);

            //If that's not possible, find any hex where it's possible to place the unit.
            if(hex === undefined){
                hexes = this.#sortHexesByPreferred(newUnit.owner, newUnit, newUnit.owner.hexes);
                hex = await this.#findSuppliedHex(hexes, newUnit);
            }

            //Cache the hexes where it's possible to place this country's units for performance reasons.
            hexesByCountry.set(newUnit.owner, hexes);

            //If a hex was found, place the unit.
            if(hex !== undefined){
                const existingUnit = this.#increaseableUnit(hex, newUnit);
                if(existingUnit !== undefined && this.#expectedStrength(existingUnit) < existingUnit.maxStrength()){
                    this.placements.set(newUnit, existingUnit);
                    this.#availableNonSupplyUnits.delete(newUnit);
                }
                else{
                    this.placements.set(newUnit, hex);
                    this.#availableNonSupplyUnits.delete(newUnit);
                }
            }
        }
    }

    /**
     * Decides where to place supply units.
     */
    placeSupplyUnits(): void {
        let allowedHexesByCountry = new Map<Country, Array<Hex>>();
        for(let newUnit of this.#availableSupplyUnits){
            const allowedHexes = allowedHexesByCountry.get(newUnit.owner) ?? newUnit.owner.hexes.filter(it =>
                it.unitCanBePlacedHere(newUnit)
                && newUnit.canEnterHexWithinStackingLimits(it, this.#totalUnitsToBeInHex(it))
            );
            let hex: Hex | undefined;
            do{
                lodash.pull(allowedHexes, hex);    //During the first iteration, hex will always be undefined, so this won't do anything. During subsequent iterations, this will remove out of supply hexes and hexes where there isn't room for more units.
                hex = allowedHexes.find(it => it.isMajorPort()) ?? allowedHexes.find(it => it.isPort()) ?? lodash.sample(allowedHexes);
            } while(
                hex !== undefined
                && (
                    !newUnit.canEnterHexWithinStackingLimits(hex, this.#totalUnitsToBeInHex(hex))
                    || !SupplyLines.canTraceSupplyLine(hex, newUnit.owner, false)
                )
            );
            allowedHexesByCountry.set(newUnit.owner, allowedHexes);
            if(hex !== undefined){
                this.placements.set(newUnit, hex);
                this.#availableSupplyUnits.delete(newUnit);
            }
        }
    }

    /**
     * Gets the units that will be placed in the given hex.
     *
     * @param hex   The hex to check.
     *
     * @returns The units that will be placed in the given hex.
     */
    #unitsToBePlacedInHex(hex: Hex): IteratorObject<LandUnit> {
        return this.placements.entries().filter(it => it[1] === hex).map(it => it[0]);
    }

    /**
     * Gets all the units that will be in the given hex when the autoplacement is finished.
     *
     * @param hex   The hex to check.
     *
     * @returns All the land units that will be in the hex.
     */
    #totalUnitsToBeInHex(hex: Hex): IteratorObject<LandUnit> {
        return joinIterables(hex.landUnits(), this.#unitsToBePlacedInHex(hex));
    }

    /**
     * Gets the strength that the given land unit will have when the autoplacement is finished.
     *
     * @param unit  The unit to check.
     *
     * @returns The strength that the unit will have.
     */
    #expectedStrength(unit: LandUnit): number {
        return this.placements.entries().filter(it => it[1] === unit).reduce((a, b) => a + b[0].strength, unit.strength);
    }

    /**
     * Gets the unit in the given hex that can be merged with the given unit, if any.
     *
     * @param hex   The hex to find a unit in.
     * @param unit  The unit to merge with.
     *
     * @returns The unit that can be merged with the given unit, or undefined if there is no such unit in the given hex.
     */
    #increaseableUnit(hex: Hex, unit: LandUnit): LandUnit | undefined {
        return hex.landUnits().find(
            it => it.sameType(unit) && this.#expectedStrength(it) < it.maxStrength()
        ) ?? this.placements.entries().find(
            it => it[1] === hex && it[0].sameType(unit) && this.#expectedStrength(it[0]) < it[0].maxStrength()
        )?.[0];
    }

    /**
     * Sorts the given hexes so that the hexes where it's better to place non-supply units come first.
     *
     * @param country       The country to place the units in.
     * @param unit          The unit to place.
     * @param unsortedHexes The hexes to sort.
     *
     * @returns The sorted array.
     */
    #sortHexesByPreferred(country: Country, unit: LandUnit, unsortedHexes: ReadonlyArray<Hex>): Array<Hex> {
        let hexes = unsortedHexes.filter(hex => hex.unitCanBePlacedHere(unit));
        if(country === Countries.japan && date.current === date(1939, Month.September)){
            hexes.push(...this.placements.values().filter(it => it instanceof Hex).filter(it => it.country === Countries.china));
        }
        hexes = lodash.shuffle(hexes).sort((a, b) =>
            sortNumber(b, a, hex => hex.landUnits().some(it => this.#increaseableUnit(hex, it) !== undefined))
            || sortNumber(b, a, hex => hex.adjacentLandHexes().some(it => it.controller()!!.partnership() === this.#partnership.opponent()) && !hex.isColony)
            || sortNumber(b, a, hex => hex.adjacentLandHexes().some(it => it.controller()!!.partnership() === this.#partnership.opponent() && (it.city !== null || hex.city !== null || it.isResourceHex || hex.isResourceHex)))
            || sortNumber(b, a, hex => hex.adjacentLandHexes().some(it => it.controller()!!.partnership() === this.#partnership.opponent()))
            || sortNumber(a, b, hex => hex.distanceFromHexGroup(this.#frontLine) - Number(hex.city !== null) * 3 - Number(hex.isResourceHex) * 3)
        );
        return hexes;
    }

    /**
     * Finds the first supplied hex in the given array where the given unit can be either placed or merged with another unit.
     *
     * @param hexes     The hexes to place the unit in, sorted in order of preference. Gets mutated to filter out hexes that are out of supply.
     * @param newUnit   The unit to place.
     *
     * @returns The hex to place the unit in, or undefined if it's not possible to place it in any of the hexes.
     */
    async #findSuppliedHex(hexes: Array<Hex>, newUnit: LandUnit): Promise<Hex | undefined> {
        let hex;
        do{
            lodash.pull(hexes, hex);    //During the first iteration, hex will always be undefined, so this won't do anything. During subsequent iterations, this will remove out of supply hexes.
            hex = hexes.find(it => this.#increaseableUnit(it, newUnit) !== undefined)
                ?? hexes.find(it => newUnit.canEnterHexWithinStackingLimits(it, this.#totalUnitsToBeInHex(it)));
            await refreshUI();
        } while(hex !== undefined && !SupplyLines.canTraceSupplyLine(hex, newUnit.owner));
        return hex;
    }
}

namespace LandAutoplacement {
    /**
     * Determines where the computer thinks it's best to place land units. Does not actually place anything, instead returns the hexes where the units should be placed.
     *
     * @param partnership           The partnership whose units to place.
     * @param availableLandUnits    The land units to place.
     * @param updateProgress        A callback to update progress. Whenever progress is made, this will be called with a number as parameter, where 0 means no progress has been made and 1 means it's done.
     *
     * @returns Map<LandUnit, Hex where that unit should be placed or LandUnit to be merged with>. All the keys are guaranteed to be in the availableLandUnits parameter, but the reverse isn't necessarily true if it's not possible to place all land units.
     */
    export async function getLandUnitAutoplacement(partnership: Partnership, availableLandUnits: ReadonlyArray<LandUnit>, updateProgress: ((it: number) => void) | null = null): Promise<Map<LandUnit, Hex | LandUnit>> {
        const frontLine = await FrontLine.get(partnership);
        const autoplacer = new LandAutoplacer(partnership, availableLandUnits, frontLine, updateProgress);

        //Use a special algorithm for placing Japanese land units in China
        if(date.current === date(1939, Month.September) && date.current === Countries.japan.enteredWar && partnership === Partnership.Axis){
            autoplacer.placeJapaneseUnitsInChina();
        }

        //Place non-supply units as close to the front line if possible
        await autoplacer.placeNonSupplyUnits();
        autoplacer.placeSupplyUnits();
        return autoplacer.placements;
    }

    /**
     * Places the land units as determined by the map passed as parameter.
     *
     * @param placements    A map returned by getLandUnitAutoplacement.
     */
    export function placeLandUnits(placements: ReadonlyMap<LandUnit, Hex | LandUnit>): void {
        for(let [unit, hexOrExistingUnit] of placements){
            if(hexOrExistingUnit instanceof Hex){
                unit.setHex(hexOrExistingUnit);
                UnitMarker.get(unit).update();
            }
            else{
                if(!hexOrExistingUnit.isAlive()){
                    throw new Error("Units must already be placed to have their strength increased");
                }
                hexOrExistingUnit.strength += unit.strength;
                UnitMarker.get(hexOrExistingUnit).update();
            }
        }
    }
}
export default LandAutoplacement;
