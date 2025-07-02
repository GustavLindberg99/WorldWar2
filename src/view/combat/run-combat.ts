import lodash from "https://cdn.jsdelivr.net/npm/lodash@4.17.21/+esm";
import { refreshUI, wait } from "../../utils.js";

import { Hex } from "../../model/mapsheet.js";
import { AirUnit, AliveUnit, Armor, LandUnit, NavalUnit, Unit } from "../../model/units.js";
import { Phase } from "../../model/phase.js";
import { AirNavalCombat, Bombing, Combat, LandCombat, UnitCombat } from "../../model/combat.js";

import CombatTables from "./combat-tables.js";
import HexMarker from "../markers/hex-marker.js";
import LeftPanel from "../left-panel.js";
import UnitMarker from "../markers/unit-marker.js";

namespace RunCombat {
    /**
     * Runs the combat, including visual effects. Returns when the combat is finished and the results are displayed.
     *
     * @param combat            The combat to run.
     * @param passedHexesByUnit During the interception phase, the hexes each unit has passed, of both partnerships. Can be left empty during any other phase.
     * @param interceptions     During the interception phase, the remaining interceptions after this one (not including this one). If the defender's mission is canceled, removes all other interceptions involving the defender, otherwise is used to determine where the defender should go next. Can be left empty during any other phase.
     *
     * @returns An HTML element displaying the combat results.
     */
    export async function runCombat(combat: Combat, passedHexesByUnit: ReadonlyMap<Unit, ReadonlyArray<Hex>> = new Map(), interceptions: Array<[AirUnit, AirUnit | NavalUnit]> = []): Promise<HTMLElement> {
        const result = document.createElement("div");

        const unmodifiedAttackStrength = combat.unmodifiedAttackStrength();
        const unmodifiedDefenseStrength = combat instanceof LandCombat ? combat.unmodifiedDefenseStrength() : 0;
        const ableToRetreat = combat instanceof LandCombat ? combat.retreatableHexes().length > 0 : true;

        const losses = combat.inflictDamages();

        await showExplosionAnimation(combat.combatHex);

        if(combat instanceof LandCombat && losses.attackerLosses !== undefined){
            const attackerLosses = document.createElement("p");
            attackerLosses.textContent = `Attacker losses: ${losses.attackerLosses} strength points`;
            if(losses.attackerLosses >= unmodifiedAttackStrength){
                attackerLosses.textContent += " (eliminated because losses greater than strength)";
            }
            result.appendChild(attackerLosses);
            if(combat.isAmphibious && combat.defenders.some(it => it.hex() === combat.combatHex)){
                const amphibiousLosses = document.createElement("p");
                amphibiousLosses.textContent = "Amphibious/paradrop attackers eliminated since enemy land units remain in combat hex";
                result.appendChild(amphibiousLosses);
            }
        }
        if(combat instanceof LandCombat && losses.defenderLosses !== undefined){
            const defenderLosses = document.createElement("p");
            if(losses.defenderLosses >= unmodifiedDefenseStrength){
                defenderLosses.textContent += "Defender eliminated";
            }
            else{
                defenderLosses.textContent = `Defender losses: ${losses.defenderLosses} strength points`;
                if(!ableToRetreat){
                    defenderLosses.textContent += " (doubled because unable to retreat)";
                }
                else if(!combat.willingToRetreat){
                    defenderLosses.textContent += " (doubled because unwilling to retreat)";
                }
            }
            result.appendChild(defenderLosses);
        }
        if(losses.damagedUnits !== undefined){
            const damagedUnitsLabel = document.createElement("p");
            damagedUnitsLabel.textContent = "Damaged units:";
            result.appendChild(damagedUnitsLabel);

            if(losses.damagedUnits.size === 0){
                damagedUnitsLabel.textContent += " None";
            }
            else{
                const damagedUnitsContainer = document.createElement("p");
                for(let unit of losses.damagedUnits){
                    const unitMarker = UnitMarker.get(unit);
                    unitMarker.update();
                    const copyImage = unitMarker.createCopyImage(true);
                    damagedUnitsContainer.appendChild(copyImage);
                }
                result.appendChild(damagedUnitsContainer);
            }
        }
        if(losses.eliminatedUnits !== undefined){
            const eliminatedUnitsLabel = document.createElement("p");
            eliminatedUnitsLabel.textContent = "Eliminated units:";
            result.appendChild(eliminatedUnitsLabel);

            if(losses.eliminatedUnits.size === 0){
                eliminatedUnitsLabel.textContent += " None";
            }
            else{
                const eliminatedUnitsContainer = document.createElement("p");
                for(let unit of losses.eliminatedUnits){
                    const unitMarker = UnitMarker.get(unit);
                    unitMarker.update();
                    const copyImage = unitMarker.createCopyImage(true);
                    eliminatedUnitsContainer.appendChild(copyImage);
                }
                result.appendChild(eliminatedUnitsContainer);
            }
        }

        const isInterception = combat instanceof AirNavalCombat && (Phase.current === Phase.AxisInterception || Phase.current === Phase.AlliedInterception);
        const goToNextHex = (unit: AliveUnit & Unit) => {
            const passedHexes = passedHexesByUnit.get(unit)!!;
            const nextInterceptor = interceptions.findLast(it => it[1] === unit)?.[0];
            const destination = (passedHexesByUnit.get(nextInterceptor!!) ?? passedHexes).at(-1)!!;
            goToHex(unit, destination, passedHexes);
        };
        if(losses.success){
            const successLabel = document.createElement("p");
            result.appendChild(successLabel);
            if(isInterception){
                successLabel.textContent = "Defender mission canceled";
                for(let defender of combat.defenders){
                    if(defender.isAlive()){
                        const passedHexes = passedHexesByUnit.get(defender)!!;
                        goToHex(defender, passedHexes[0], passedHexes);
                    }
                    const canceledInterceptions = lodash.remove(interceptions, it => it[0] === defender || it[1] === defender);
                    for(let interception of canceledInterceptions){
                        if(interception[1] !== defender && interception[1]){
                            goToNextHex(interception[1] as AliveUnit & Unit);
                        }
                    }
                }
            }
            else if(combat instanceof Bombing){
                successLabel.textContent = "Bombing succeeded";
            }
            else if(combat.attackers.some(it => it instanceof NavalUnit)){
                successLabel.textContent = "Defender retreat";
            }
        }
        else if(isInterception){
            for(let defender of combat.defenders.filter(it => it.isAlive())){
                goToNextHex(defender);
            }
        }
        else if(combat instanceof Bombing){
            const bombingFailedLabel = document.createElement("p");
            bombingFailedLabel.textContent = "Bombing failed";
            result.appendChild(bombingFailedLabel);
        }

        for(let unit of [...combat.attackers, ...combat.combatHex.units()]){
            UnitMarker.get(unit).update();
        }
        if(combat instanceof UnitCombat){
            for(let defender of combat.defenders){
                UnitMarker.get(defender).update();
                const hex = defender.hex();
                if(hex !== combat.combatHex && hex !== null){
                    HexMarker.colorHex(hex, "red");
                }
            }
        }
        HexMarker.updateMarkers(combat.combatHex);
        for(let unit of combat.attackers.filter(it => it.isAlive())){
            unit.hasAttacked = true;
            if(combat instanceof LandCombat && (Phase.current === Phase.AxisOverrun || Phase.current === Phase.AlliedOverrun) && unit instanceof Armor && (combat.defenders.some(it => !it.isAlive()) || combat.unmodifiedDefenseStrength() < unmodifiedDefenseStrength)){
                unit.hasDoneSuccessfulOverrun = true;
            }
            UnitMarker.get(unit).update();
        }

        return result;
    }

    /**
     * Shows the explosion animation. Returns when the combat results should be shown, before the explosion animation is finished.
     *
     * @param hex   The hex to show the explosion animation on.
     */
    function showExplosionAnimation(hex: Hex): Promise<void> {
        const explosion = document.getElementById("explosion")!!;
        explosion.style.display = "inline";
        const x = hex.centerX() - Hex.hexWidth / 2;
        const y = hex.centerY() - Hex.hexHeight / 2;
        const size = Hex.hexHeight;
        explosion.setAttribute("x", x.toString());
        explosion.setAttribute("y", y.toString());
        explosion.setAttribute("width", size.toString());
        explosion.setAttribute("height", size.toString());
        explosion.setAttribute("transform-origin", `${x + size / 2} ${y + size / 2}`);
        explosion.setAttribute("transform", "scale(0)");
        explosion.setAttribute("opacity", "1");

        let i = 0;
        const finalSize = 4;
        const speed = 1 / 500;    //One size unit per 500 milliseconds, so total duration 2 seconds
        const start = performance.now();

        return new Promise(async resolvePromise => {
            while((i = speed * (performance.now() - start)) < finalSize){
                explosion.setAttribute("transform", `scale(${i})`);
                explosion.setAttribute("opacity", (1 - (i / finalSize)**4).toString());

                //Inflict damages
                if(i >= 1){
                    resolvePromise();
                }

                await refreshUI();
            }
            explosion.style.display = "none";
        });
    }

    /**
     * Dynamically moves the given unit to the given hex in passedHexes.
     *
     * @param unit          The unit to move.
     * @param destination   The hex to move to.
     * @param passedHexes   The hexes to move through. Assumed to contain `destination` as well as `unit.hex()`.
     */
    async function goToHex(unit: AliveUnit & Unit, destination: Hex, passedHexes: ReadonlyArray<Hex>): Promise<void> {
        const currentIndex = passedHexes.indexOf(unit.hex());
        const destinationIndex = passedHexes.indexOf(destination);
        const backwards = destinationIndex < currentIndex;
        const hexes = backwards ? passedHexes.slice(destinationIndex, currentIndex + 1).reverse() : passedHexes.slice(currentIndex, destinationIndex + 1);
        for(let hex of hexes){
            await wait(200);
            unit.setHex(hex);
            UnitMarker.get(unit).update();
        }
        if(backwards && unit instanceof AirUnit && unit.hex().controller()?.partnership() === unit.owner.partnership()){
            unit.based = true;
        }
    }

    /**
     * Runs all combats for the interceptions starting at `startIndex`.
     *
     * @param interceptions     The interceptions to run combat for. Removes interceptions as they're done.
     * @param startIndex        The start index in `interceptions` for the interceptions to run (inclusive).
     * @param passedHexesByUnit The hexes each unit has passed, of both partnerships.
     */
    export async function runInterceptions(interceptions: Array<[AirUnit, AirUnit | NavalUnit]>, startIndex: number, passedHexesByUnit: ReadonlyMap<Unit, ReadonlyArray<Hex>>): Promise<void> {
        while(interceptions.length > startIndex){
            const [attacker, defender] = interceptions.pop()!!;
            const combat = new AirNavalCombat([attacker] as [AliveUnit & AirUnit], [defender] as [AliveUnit & AirUnit] | [AliveUnit & NavalUnit]);

            HexMarker.scrollToHex(combat.combatHex);
            HexMarker.colorHex(combat.combatHex, "purple");

            LeftPanel.clear();
            LeftPanel.appendElement(CombatTables.createCombatTable(combat));
            await LeftPanel.waitForNextButtonPressed("To combat results");

            const nextButtonLockReason = "Attack is ongoing...";
            LeftPanel.addNextButtonLock(nextButtonLockReason);
            const combatResults = await RunCombat.runCombat(combat, passedHexesByUnit, interceptions);

            HexMarker.uncolorHex(combat.combatHex);
            LeftPanel.clear();
            LeftPanel.appendElement(combatResults);
            LeftPanel.releaseNextButtonLock(nextButtonLockReason);

            await LeftPanel.waitForNextButtonPressed(interceptions.length > 0 ? "To next interception" : "To amphibious and paradrop phase");
        }
    }
}
export default RunCombat;
