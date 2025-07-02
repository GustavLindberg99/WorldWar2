import { refreshUI } from "../../utils.js";

import { Hex } from "../../model/mapsheet.js";
import { Partnership } from "../../model/partnership.js";
import { Countries } from "../../model/countries.js";
import { AirUnit, NavalUnit, SupplyUnit, Unit } from "../../model/units.js";

import LeftPanel from "../../view/left-panel.js";
import UnitMarker from "../../view/markers/unit-marker.js";

export default abstract class Player {
    readonly partnership: Partnership;

    static readonly #instances: Array<Player> = [];

    /**
     * Constructs a player.
     *
     * @param partnership The partnership that the player is playing as.
     */
    constructor(partnership: Partnership){
        this.partnership = partnership;
        Player.#instances.push(this);
    }

    /**
     * Gets the player's opponent.
     *
     * @returns The player's opponent.
     */
    opponent(): Player {
        return Player.#instances.find(it => it !== this)!!;
    }

    /**
     * Gets the player playing as the given partnership.
     *
     * @param partnerhsip   The partnership of the player.
     *
     * @returns The player playing as the given partnership.
     */
    static fromPartnership(partnerhsip: Partnership): Player {
        return Player.#instances.find(it => it.partnership === partnerhsip)!!;
    }

    /**
     * Checks if the player has won the game.
     *
     * @returns True if the player has one, false if they haven't.
     */
    won(): boolean {
        if(!Countries.all().every(it => it.partnership() === Partnership.Neutral || it.partnership() === this.partnership || it.conquered())){
            return false;
        }
        return this.partnership === Partnership.Allies || (Countries.unitedStates.conquered() && (Countries.sovietUnion.partnership() === this.partnership || Countries.sovietUnion.conquered()));
    }

    /**
     * Runs the player's income phase. Async function that does not return until the phase is finished.
     */
    async incomePhase(): Promise<void> {
        for(let country of this.partnership.countries()){
            country.money += country.income();
            country.gotMoneyFromConvoys = false;
        }
    }

    //The deployment phase is intentionally missing since it has different signatures for HumanPlayer and ComputerPlayer.

    /**
     * Runs the player's unit build phase. Async function that does not return until the phase is finished.
     */
    abstract unitBuildPhase(): Promise<void>;

    /**
     * Runs the player's overrun phase. Async function that does not return until the phase is finished.
     */
    abstract overrunPhase(): Promise<void>;

    /**
     * Runs the player's first movement phase. Async function that does not return until the phase is finished.
     *
     * @returns The hexes each unit has passed.
     */
    abstract firstMovementPhase(): Promise<Map<Unit, ReadonlyArray<Hex>>>;

    /**
     * Runs the player's interception phase. Async function that does not return until combat for these interceptions are finished. Intended to be called recursively by each player in order.
     *
     * @param passedHexesByUnit The hexes each unit has passed, of both partnerships. Gets filled with the new passed hexes as new units move to intercept.
     * @param interceptions     The previous interceptions of both partnerships in order. Gets filled with the new interceptions as new units move to intercept. Null if this is the top level interception phase (called by runGame).
     */
    abstract interceptionPhase(passedHexesByUnit: Map<Unit, ReadonlyArray<Hex>>, interceptions: Array<[AirUnit, AirUnit | NavalUnit]> | null): Promise<void>;

    /**
     * Runs the player's amphibious phase. Async function that does not return until the phase is finished.
     */
    abstract amphibiousParadropPhase(): Promise<void>;

    /**
     * Runs the player's combat phase. Async function that does not return until the phase is finished.
     */
    abstract combatPhase(): Promise<void>;

    /**
     * Runs the player's second movement phase. Async function that does not return until the phase is finished.
     */
    abstract secondMovementPhase(): Promise<void>;

    /**
     * Runs the supply phase. Async function that does not return until the phase is finished.
     */
    static async supplyPhase(): Promise<void> {
        const checkingSupplyText = "Checking all units for supply, please wait...";
        LeftPanel.clear();
        LeftPanel.appendParagraph(checkingSupplyText);
        LeftPanel.addNextButtonLock(checkingSupplyText);

        //Sort the array so that supply units come last so that other units can use supply units that were in supply previously to get supply
        const allUnits: ReadonlyArray<Unit> = [...Unit.allAliveUnits()].sort((a, b) => {
            if(!(a instanceof SupplyUnit) && (b instanceof SupplyUnit)){
                return -1;
            }
            else if((a instanceof SupplyUnit) && !(b instanceof SupplyUnit)){
                return 1;
            }
            return 0;
        });

        //Initialize progress bar
        let progress = 0;
        LeftPanel.appendProgressBar(() => progress / allUnits.length);

        //Build fortifications
        for(let hex of Hex.allHexes){
            hex.continueBuilding();
            await refreshUI(1000);
        }

        //Inflict out of supply losses and set out of supply variable to true
        for(let unit of allUnits){
            progress++;
            await refreshUI(1000);

            if(unit.updateSupply()){
                UnitMarker.get(unit).update();
            }
        }

        LeftPanel.releaseNextButtonLock(checkingSupplyText);
        LeftPanel.clear();
        LeftPanel.appendParagraph("All units have been checked to see if they're out of supply, and losses due to units being out of supply for too long have been inflicted.");

        //Choose grounded air units
        Hex.chooseGroundedAirUnits();
        if(Hex.groundedAirUnits.size === 0){
            LeftPanel.appendParagraph("No air units are grounded this turn.");
        }
        else{
            LeftPanel.appendParagraph("Air units are grounded in the following weather zones:");
            const list = document.createElement("ul");
            for(let weatherZone of Hex.groundedAirUnits){
                const item = document.createElement("li");
                item.textContent = weatherZone.toString();
                list.appendChild(item);
            }
            LeftPanel.appendElement(list);
        }

        await LeftPanel.waitForNextButtonPressed("To war declaration");
    }

    /**
     * Runs the player's war declaration phase. Async function that does not return until the phase is finished.
     */
    abstract warDeclarationPhase(): Promise<void>;
}
