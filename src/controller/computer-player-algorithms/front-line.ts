import lodash from "https://cdn.jsdelivr.net/npm/lodash@4.17.21/+esm";
import { refreshUI } from "../../utils.js";

import { Hex } from "../../model/mapsheet.js";
import { Partnership } from "../../model/partnership.js";
import { Countries } from "../../model/countries.js";

namespace FrontLine {
    let frontLinePromise: Promise<ReadonlyMap<Partnership, ReadonlyArray<Hex>>>;

    /**
     * Calculates the front line. Don't call directly for performance reasons, instead, use alliedFrontLinePromise and axisFrontLinePromise.
     *
     * @param updateProgress    A callback to update progress. Whenever progress is made, this will be called with a number as parameter, where 0 means no progress has been made and 1 means it's done.
     *
     * @returns Map<Partnership, Front Line>, the front lines are arrays containing all hexes controlled by the given partnership that are adjacent by land to hexes controlled by the other partnership.
     */
    async function calculateFrontLine(updateProgress: (it: number) => void): Promise<ReadonlyMap<Partnership, ReadonlyArray<Hex>>> {
        const result: ReadonlyMap<Partnership, Array<Hex>> = new Map([
            [Partnership.Axis, []],
            [Partnership.Allies, []]
        ]);
        let progress = 0;
        for(let hex of Hex.allHexes){
            progress++;
            updateProgress(progress / Hex.allHexes.length);
            const partnership = hex.controller()?.partnership() ?? null;
            if(partnership !== null && !hex.isDesert()){
                if(
                    hex.adjacentLandHexes().some(it =>
                        it.controller() !== null    //Coastal hexes shouldn't be on the front line just because they're coastal
                        && !it.isDesert()           //Don't place the entire French army on Libya's southern border
                        && it.controller()!!.partnership() === partnership.opponent()    //Hexes on the front line should be adjacent to opponent-controlled hexes
                        && (hex.country !== Countries.japan || it.country !== Countries.sovietUnion || Countries.mongolia.partnership() !== Partnership.Neutral)    //Japan shouldn't care about the Soviet Union if Mongolia is neutral
                        && (it.country !== Countries.japan || hex.country !== Countries.sovietUnion || Countries.mongolia.partnership() !== Partnership.Neutral)    //The Soviet Union shouldn't care about Japan if Mongolia is neutral
                    )
                ){
                    result.get(partnership)!!.push(hex);
                }
                await refreshUI();
            }
        }
        return result;
    }

    /**
     * Compares two hexes on the front line to determine which one is better to place units in according to a specific algorithm.
     *
     * @param a The first hex to compare.
     * @param b The second hex to compare.
     *
     * @returns A negative number if it's better to put a land unit in a, a positive number it's better to put a land unit in b, and 0 if none is better than the other.
     */
    function frontLineComparator(a: Hex, b: Hex): number {
        //Make sure France and Italy prioritize defending themselves compared to defending their colonies
        if(a.country === Countries.france || a.country === Countries.italy || b.country === Countries.france || b.country === Countries.italy){
            if(!a.isColony){
                return -1;
            }
            else if(!b.isColony){
                return 1;
            }
        }
        //Prioritize hexes with or adjacent to installations
        const hexIsInteresting = (it: Hex) => it.isResourceHex || it.city !== null;
        if(hexIsInteresting(a) !== hexIsInteresting(b)){
            return Number(hexIsInteresting(b)) - Number(hexIsInteresting(a));
        }
        return Number(b.adjacentLandHexes().some(hexIsInteresting)) - Number(a.adjacentLandHexes().some(hexIsInteresting));
    }

    /**
     * Starts updating the front line. Should be called before the income phase, since the front line can't change between then and the deployment phase.
     *
     * @param updateProgress    A callback to update progress. Whenever progress is made, this will be called with a number as parameter, where 0 means no progress has been made and 1 means it's done.
     */
    export function update(updateProgress: (it: number) => void): void {
        frontLinePromise = calculateFrontLine(updateProgress);
    }

    /**
     * Gets the front line for the given partnership. If the front line isn't done updating, blocks until it is.
     * This function is different from calculate() because if the front line has already been calculated this turn, it returns the cached front line instead of calculating it again.
     *
     * @param partnership   The partnership that controls the returned hexes.
     *
     * @returns All hexes controlled by the given partnership that are adjacent by land to hexes controlled by the other partnership, sorted so thata the hexes where it's best to put land units go first (the relative order between similar hexes is random).
     */
    export async function get(partnership: Partnership): Promise<ReadonlyArray<Hex>> {
        return lodash.shuffle((await frontLinePromise).get(partnership)!!).sort(frontLineComparator);
    }
}
export default FrontLine;
