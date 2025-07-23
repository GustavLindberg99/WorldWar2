import { joinIterables } from "../../utils.js";

import { Hex } from "../mapsheet.js";
import { Partnership } from "../partnership.js";
import { Countries, Country } from "../countries.js";
import { SupplyUnit } from "../units.js";

namespace SupplyLines {
    let cachedSupplyLines = new Map<
        (it: Hex) => boolean,               //isDestination
        Map<
            (it: Hex) => boolean,           //allowedToPass
            Map<
                Hex,                        //origin
                ReadonlyArray<Hex> | null   //result
            >
        >
    >();

    /**
     * Clears the supply line cache. Should be called when a unit changes hex.
     */
    export function clearCache(): void {
        cachedSupplyLines = new Map();
    }

    /**
     * Gets a path between a given origin hex and a destination hex that satisfies a certain condition, with the requirement that each passed hex satisfies a certain condition.
     *
     * @param origin            The hex to trace a path from.
     * @param isDestination     A callback returning whether a given hex is an allowed destination.
     * @param allowedToPass     A callback returning whether passing through a given hex is allowed. Neutral hexes are always disallowed, no need to specify that explicitly.
     * @param allowSeaHexsides  Whether the path is allowed to cross all-sea hexsides.
     * @param allowLandHexsides Whether the path is allowed to cross all-land hexsides.
     * @param maxDistance       The max distance that the path is allowed to have. Exists only for performance reasons, does not guarentee that the returned path is shorter than maxDistance.
     *
     * @returns A path that meets the above requirements (containing both the origin and the destination), or null if no such path is possible. If several paths are possible, which one is returned is unspecified (so it's not necessarily the shortest one).
     */
    export function pathBetweenHexes(
        origin: Hex,
        isDestination: (it: Hex) => boolean,
        allowedToPass: (it: Hex) => boolean,
        allowSeaHexsides: boolean = false,
        allowLandHexsides: boolean = true,
        maxDistance: number = Infinity
    ): ReadonlyArray<Hex> | null {
        //In practice cache only has a noticeable impact during the supply phase, in which case this condition is true. This fact is used to simplify the structure of the cachedSupplyLines map.
        const useCache = allowLandHexsides && !allowSeaHexsides;

        //The current hex that's being processed.
        let hex = origin;

        //An array containing all the destinations. Saved as a separate array to be able to sort it, see below.
        let destinations: Array<Hex>;

        //Maps a hex to its adjacent hexes that we're allowed to go through.
        let adjacentHexesByHex = new Map<Hex, ReadonlyArray<Hex>>();

        //The thing to return.
        let passedHexes: Array<Hex> = [hex];

        //Paths from this hex to other hexes. Used to update cache. Only contains hexes that weren't passed through.
        let pathsToHex = new Map<Hex, ReadonlyArray<Hex>>();

        //Add necessary elements to cache.
        const outerCacheMap = cachedSupplyLines.get(isDestination) ?? new Map<never, never>();
        cachedSupplyLines.set(isDestination, outerCacheMap);
        const innerCacheMap = outerCacheMap.get(allowedToPass) ?? new Map<never, never>();
        outerCacheMap.set(allowedToPass, innerCacheMap);

        const start = performance.now();
        while(hex !== undefined){
            if(performance.now() - start > 3000){
                console.warn("Timeout calculating pathBetweenHexes.");
                return null;
            }
            if(isDestination(hex)){
                for(let [i, hex] of passedHexes.entries()){
                    innerCacheMap.set(hex, passedHexes.slice(i));
                }
                for(let [hex, firstPassedHexes] of pathsToHex){
                    innerCacheMap.set(hex, [...firstPassedHexes.toReversed(), ...passedHexes.slice(1)]);
                }
                return passedHexes;
            }
            const cachedResult = cachedSupplyLines.get(isDestination)?.get(allowedToPass)?.get(origin);
            if(useCache && cachedResult !== undefined){
                return cachedResult;
            }
            const allowedAdjacentHexes = adjacentHexesByHex.get(hex) ?? (
                allowSeaHexsides
                ? (allowLandHexsides ? hex.adjacentHexes() : hex.adjacentSeaHexes())
                : (allowLandHexsides ? hex.adjacentLandHexes() : [])
            ).filter(it =>
                //Don't check hexes we've already checked
                !passedHexes.includes(it) && !pathsToHex.has(it)
                //Don't go through neutral hexes
                && it.controller()?.partnership() !== Partnership.Neutral
                //Only go through hexes we're allowed to pass
                && (allowedToPass(it) || isDestination(it))
                //Don't go beyond the max distance
                && it.distanceFromHex(origin) <= maxDistance
            );
            adjacentHexesByHex.set(hex, allowedAdjacentHexes);
            if(allowedAdjacentHexes.length === 0){
                pathsToHex.set(hex, [...passedHexes]);
                passedHexes.pop();
                if(passedHexes.length > 0){
                    adjacentHexesByHex.set(passedHexes.at(-1)!!, adjacentHexesByHex.get(passedHexes.at(-1)!!)!!.filter(it => it !== hex));
                }
                hex = passedHexes.at(-1)!!;
            }
            else{
                //Initialize this here for performance reasons so that it doesn't have to be initialized if the cache is used
                destinations ??= Hex.allHexes.filter(isDestination);
                if(!allowLandHexsides && Countries.turkey.partnership() === Partnership.Neutral){
                    destinations = destinations.filter(it => it.isBlackSea() === origin.isBlackSea());
                }
                if(destinations.length === 0){
                    return null;
                }

                //Sort this seperately instead of using movement.destination.closestHex for performance reasons. Sorting an array that's already mostly sorted is faster than sorting a completely random array.
                destinations.sort((a, b) => a.distanceFromHex(hex) - b.distanceFromHex(hex));
                hex = destinations[0].closestHex(allowedAdjacentHexes);
                passedHexes.push(hex);
            }
        }
        for(let hex of joinIterables(passedHexes, pathsToHex.keys())){
            innerCacheMap.set(hex, null);
        }
        return null;
    }

    /**
     * Gets the countries whoses supply sources the given country can use.
     *
     * @param country   The country wanting to use supply sources.
     *
     * @returns The countries whoses supply sources the given country can use.
     */
    export function supplySourcesUseableBy(country: Country): Array<Country> {
        if(country === null || country.hasBeenConquered()){
            return Countries.all().filter(it => it.partnership() === country.partnership());
        }
        else if(country.partnership() === Partnership.Allies && country !== Countries.sovietUnion && country !== Countries.china){
            return Countries.all().filter(it => it.partnership() === Partnership.Allies && it !== Countries.sovietUnion && it !== Countries.china);
        }
        else if(country === Countries.japan || country === Countries.thailand){
            return [Countries.japan, Countries.thailand];
        }
        else if(country.partnership() === Partnership.Axis && country !== Countries.sovietUnion){
            return Countries.all().filter(it => it.partnership() === Partnership.Axis && it !== Countries.japan && it !== Countries.thailand && it !== Countries.sovietUnion);
        }
        else{
            return [country];
        }
    }

    //These need to be statically defined for each non-hex parameter they can take so that their references can be used for caching
    const isSupplySource: ReadonlyMap<boolean, ReadonlyMap<Country, (it: Hex) => boolean>> = new Map([true, false].map(allowSupplyUnits => [allowSupplyUnits, new Map(Countries.all().map(country => [country, (hex: Hex) => {
        return (
            allowSupplyUnits
            && hex.units().some(it => it instanceof SupplyUnit && supplySourcesUseableBy(country).includes(it.owner))
        ) || (
            (hex.isResourceHex || country === Countries.china)
            && hex.city !== null
            && hex.country !== null
            && hex.controller()?.partnership() === country.partnership()
            && supplySourcesUseableBy(country).includes(hex.country)
        );
    }]))]));
    const supplyLinesAllowedToPass: ReadonlyMap<Partnership, (it: Hex) => boolean> = new Map([Partnership.Allies, Partnership.Axis].map(partnership => [partnership, (hex: Hex) => {
        return hex.controller()?.partnership() === partnership    //Only go through friendly controlled hexes
            && (hex.landUnits().some(unit => unit.owner.partnership() === partnership) || !hex.isInLandControlZone(partnership.opponent()))    //Don't trace supply lines through enemy control zones unless there's a friendly land unit
            && (!hex.isDesert() && !hex.isTallMountain())    //Don't trace supply through desert or tall mountain hexes, unless we're checking if it's behind a front
    }]));

    /**
     * Checks if the given hex can trace a supply line to the given destination.
     *
     * @param hex               The hex to check if it's out of supply.
     * @param country           The country whose supply sources to look for.
     * @param allowSupplyUnits  Whether to allow supply units as supply sources.
     *
     * @returns True if a supply line can be traced, false otherwise.
     */
    export function canTraceSupplyLine(hex: Hex, country: Country, allowSupplyUnits: boolean = true): boolean {
        const controller = hex.controller();
        if(controller === null){
            return false;
        }
        const partnership = controller.partnership();
        if(partnership === Partnership.Neutral || country?.partnership() === Partnership.Neutral){
            return false;
        }
        if(hex.fortified()){
            return true;
        }

        return pathBetweenHexes(hex, isSupplySource.get(allowSupplyUnits)!!.get(country)!!, supplyLinesAllowedToPass.get(partnership)!!) !== null;
    }

    /**
     * Gets a path between a given origin hex and a destination hex that satisfies a certain condition, with the requirement that each passed hex satisfies a certain condition. Unlike pathBetweenHexes, removes unnecessary detours by removing all hexes between two adjacent hexes.
     *
     * To simply check if the result is null and discard the array if it isn't, use pathBetweenHexes for performance reasons, as this function is slower if the result is non-null (although it's just as fast if the result is null).
     *
     * @param origin            The hex to trace a path from.
     * @param isDestination     A callback returning whether a given hex is an allowed destination.
     * @param allowedToPass     A callback returning whether passing through a given hex is allowed. Neutral hexes are always disallowed, no need to specify that explicitly.
     * @param allowSeaHexsides  Whether the path is allowed to cross all-sea hexsides.
     * @param allowLandHexsides Whether the path is allowed to cross all-land hexsides.
     * @param maxDistance       The max distance that the path is allowed to have. Exists only for performance reasons, does not guarentee that the returned path is shorter than maxDistance.
     *
     * @returns A path that meets the above requirements (containing both the origin and the destination), or null if no such path is possible. If several paths are possible, which one is returned is unspecified (so it's not necessarily the shortest one).
     */
    export function simplifiedPathBetweenHexes(
        origin: Hex,
        isDestination: (it: Hex) => boolean,
        allowedToPass: (it: Hex) => boolean,
        allowSeaHexsides: boolean = false,
        allowLandHexsides: boolean = true,
        maxDistance: number = Infinity
    ): Array<Hex> | null {
        const nonSimplifiedPath = pathBetweenHexes(origin, isDestination, allowedToPass, allowSeaHexsides, allowLandHexsides, maxDistance);
        if(nonSimplifiedPath === null){
            return null;
        }
        let result: Array<Hex> = [nonSimplifiedPath[0]];
        while(result.at(-1) !== nonSimplifiedPath.at(-1)){
            const hex = result.at(-1)!!;
            const allowedAdjacentHexes = allowSeaHexsides
                ? (allowLandHexsides ? hex.adjacentHexes() : hex.adjacentSeaHexes())
                : (allowLandHexsides ? hex.adjacentLandHexes() : []);
            result.push(nonSimplifiedPath.findLast(it => allowedAdjacentHexes.includes(it))!!)
        }
        return result;
    }
}
export default SupplyLines;
