import { Partnership } from "../model/partnership.js";
import { Countries, Country } from "../model/countries.js";
import { Armor, Convoy, LandUnit, Unit } from "../model/units.js";
import { date, dateToString, Month } from "../model/date.js";
import { Phase } from "../model/phase.js";
import { SavedGames } from "../model/saved-games.js";

import PhaseMarker from "../view/markers/phase-marker.js";

import ComputerPlayer from "./player/computer-player.js";
import HumanPlayer from "./player/human-player.js";
import InfoBubble from "../view/info/info-bubble.js";
import LeftPanel from "../view/left-panel.js";
import PanZoom from "../view/pan-zoom.js";
import Player from "./player/player.js";
import UnitMarker from "../view/markers/unit-marker.js";

/**
 * Autosaves the current game state to local storage and enables the save button.
 *
 * @param humanPartnership  The partnership of the human player.
 */
function autosaveGame(humanPartnership: Partnership): void {
    const [x, y] = PanZoom.clientPixelToSvgPixel(PanZoom.instance().getPan().x, PanZoom.instance().getPan().y);
    const json = {
        ...SavedGames.gameToJson(humanPartnership),
        panX: x,
        panY: y,
        zoom: PanZoom.getAbsoluteZoom()
    };
    const jsonString = JSON.stringify(json);
    try{
        localStorage?.setItem("autosave", jsonString);
    }
    catch{
        //Ignore, if local storage is disabled it's not possible to autosave
    }

    //Enable the save button since what it does is it just takes the autosaved game and allows the user to save it as a file
    const saveButton = document.querySelector<HTMLButtonElement>("button#saveButton")!!;
    saveButton.disabled = false;
    saveButton.onclick = () => {
        const link = document.createElement("a");
        link.href = `data:application/json;charset=utf-8,${jsonString}`;
        link.download = "Saved World War 2 Game.ww2";
        link.click();
    };
}

/**
 * Make sure no unit is marked as having attacked.
 */
function clearHasAttacked(): void {
    for(let unit of Unit.allAliveUnits()){
        if(unit.hasAttacked){
            unit.hasAttacked = false;
            UnitMarker.get(unit).update();
        }
        if(unit instanceof LandUnit){
            unit.hasMoved = false;
        }
        if(unit instanceof Armor){
            unit.hasDoneSuccessfulOverrun = false;
        }
    }
}

/**
 * Debarks the money from all convoys that have reached their destination.
 */
function debarkConvoyMoney(): void {
    for(let convoy of Unit.allAliveUnits().filter(it => it instanceof Convoy)){
        if(convoy.inPort && convoy.destination !== null && convoy.hex().country === convoy.destination && !convoy.hex().isColony){
            convoy.destination.money += convoy.money;
            convoy.destination.gotMoneyFromConvoys = true;
            convoy.money = 0;
            convoy.destination = null;
        }
    }
}

/**
 * Creates an HTML list containing the given countries.
 *
 * @param countries The countries to include in the list.
 *
 * @returns An HTML list that can be appended to the DOM.
 */
function createCountryList(countries: ReadonlyArray<Country>): HTMLUListElement {
    const list = document.createElement("ul");
    for(let country of countries){
        const item = document.createElement("li");
        item.appendChild(InfoBubble.clickableCountryInfoLink(country));
        list.appendChild(item);
    }
    return list;
}

/**
 * Runs the game. This is an async function that does not return until a player wins the game.
 *
 * @param humanPlayer       The human player.
 * @param computerPlayer    The computer player.
 */
export default async function runGame(humanPlayer: HumanPlayer, computerPlayer: ComputerPlayer): Promise<void> {
    const alliedPlayer = Player.fromPartnership(Partnership.Allies);
    const axisPlayer = Player.fromPartnership(Partnership.Axis);

    //Needed to enable the save button
    autosaveGame(humanPlayer.partnership);

    while(!humanPlayer.won() && !computerPlayer.won()){
        //Check the current phase at each phase because the first turn Phase.current will be set to the starting phase, so the phases before that should be skipped
        if(Phase.current === Phase.Deployment){
            PhaseMarker.update();
            await computerPlayer.deploymentPhase(humanPlayer.deploymentPhase());
            Phase.current++;
            Countries.china.updateController();
            autosaveGame(humanPlayer.partnership);
        }
        if(Phase.current === Phase.Income){
            PhaseMarker.update();
            await Promise.all([axisPlayer.incomePhase(), alliedPlayer.incomePhase()]);
            Phase.current++;
            autosaveGame(humanPlayer.partnership);
        }
        if(Phase.current === Phase.UnitBuild){
            PhaseMarker.update();
            //They're supposed to be simultaneous, but run the human player's unit build phase first because the computer player's algorithm doesn't care about what the human player does, but the human player can see which units the computer player bought
            //The computer player's method doesn't contain any awaits so this isn't a problem for performance
            await humanPlayer.unitBuildPhase();
            await computerPlayer.unitBuildPhase();
            Phase.current++;
            autosaveGame(humanPlayer.partnership);
        }

        if(Phase.current === Phase.AxisOverrun){
            PhaseMarker.update();
            await axisPlayer.overrunPhase();
            Phase.current++;
            Countries.china.updateController();
            autosaveGame(humanPlayer.partnership);
        }
        if(Phase.current === Phase.AxisFirstMovement){
            PhaseMarker.update();
            const passedHexes = await axisPlayer.firstMovementPhase();
            Phase.current++;
            Countries.china.updateController();

            PhaseMarker.update();
            await alliedPlayer.interceptionPhase(passedHexes, null);
            Phase.current++;
            autosaveGame(humanPlayer.partnership);
        }
        if(Phase.current === Phase.AxisAmphibiousParadrop){
            PhaseMarker.update();
            await axisPlayer.amphibiousParadropPhase();
            Phase.current++;
            Countries.china.updateController();
            autosaveGame(humanPlayer.partnership);
        }
        if(Phase.current === Phase.AxisCombat){
            PhaseMarker.update();
            await axisPlayer.combatPhase();
            Phase.current++;
            Countries.china.updateController();
            autosaveGame(humanPlayer.partnership);
        }
        if(Phase.current === Phase.AxisSecondMovement){
            PhaseMarker.update();
            await axisPlayer.secondMovementPhase();
            await alliedPlayer.secondMovementPhase();    //To land air units
            Phase.current++;
            Countries.china.updateController();
            for(let unit of Partnership.Axis.landUnits()){
                if(unit.movingByRail){
                    unit.movingByRail = false;
                    UnitMarker.get(unit).update();
                }
            }
            autosaveGame(humanPlayer.partnership);
        }
        clearHasAttacked();

        if(Phase.current === Phase.AlliedOverrun){
            PhaseMarker.update();
            await alliedPlayer.overrunPhase();
            Phase.current++;
            Countries.china.updateController();
            autosaveGame(humanPlayer.partnership);
        }
        if(Phase.current === Phase.AlliedFirstMovement){
            PhaseMarker.update();
            const passedHexes = await alliedPlayer.firstMovementPhase();
            Phase.current++;
            Countries.china.updateController();

            PhaseMarker.update();
            await axisPlayer.interceptionPhase(passedHexes, null);
            Phase.current++;
            debarkConvoyMoney();
            autosaveGame(humanPlayer.partnership);
        }
        if(Phase.current === Phase.AlliedAmphibiousParadrop){
            PhaseMarker.update();
            await alliedPlayer.amphibiousParadropPhase();
            Phase.current++;
            Countries.china.updateController();
            autosaveGame(humanPlayer.partnership);
        }
        if(Phase.current === Phase.AlliedCombat){
            PhaseMarker.update();
            await alliedPlayer.combatPhase();
            Phase.current++;
            Countries.china.updateController();
            autosaveGame(humanPlayer.partnership);
        }
        if(Phase.current === Phase.AlliedSecondMovement){
            PhaseMarker.update();
            await alliedPlayer.secondMovementPhase();
            await axisPlayer.secondMovementPhase();    //To land air units
            Phase.current++;
            Countries.china.updateController();
            for(let unit of Partnership.Allies.landUnits()){
                if(unit.movingByRail){
                    unit.movingByRail = false;
                    UnitMarker.get(unit).update();
                }
            }
            debarkConvoyMoney();
            autosaveGame(humanPlayer.partnership);
        }
        clearHasAttacked();

        if(Phase.current === Phase.Supply){
            PhaseMarker.update();
            Phase.current++;
            date.current++;
            await Player.supplyPhase();
            Countries.china.updateController();
            for(let country of Countries.all()){
                country.hasUsedAtomicBombThisTurn = false;
            }
            autosaveGame(humanPlayer.partnership);
        }

        //Put this at the end of the loop instead of the beginning so that the game is finished if a player won at the end of this phase
        if(Phase.current === Phase.WarDeclaration){
            const oldAxisCountries: ReadonlyArray<Country> = Partnership.Axis.countries();
            const oldAlliedCountries: ReadonlyArray<Country> = Partnership.Allies.countries();
            const oldConqueredCountries: ReadonlyArray<Country> = Countries.all().filter(it => it.conquered());

            if(date.current === date(1939, Month.September)){
                Countries.germany.joinPartnership(Partnership.Axis);
            }
            for(let country of Countries.all()){
                const units: ReadonlyArray<Unit> = [...country.units()];
                country.conquerOrLiberate();
                country.addNewAvailableUnits();
                if(country.conquered()){
                    for(let unit of units){
                        UnitMarker.get(unit).update();
                    }
                }
            }
            document.getElementById("dateLabel")!!.textContent = dateToString(date.current);
            const spainPreviouslyActivated = Countries.spain.hasAttemptedActivation;

            PhaseMarker.update();
            await axisPlayer.warDeclarationPhase();
            await alliedPlayer.warDeclarationPhase();

            LeftPanel.clear();
            const newAxisCountries: ReadonlyArray<Country> = Partnership.Axis.countries().filter(it => !oldAxisCountries.includes(it));
            const newAlliedCountries: ReadonlyArray<Country> = Partnership.Allies.countries().filter(it => !oldAlliedCountries.includes(it));
            const newConqueredCountries: ReadonlyArray<Country> = Countries.all().filter(it => it.conquered() && !oldConqueredCountries.includes(it));
            const newLiberatedCountries: ReadonlyArray<Country> = Countries.all().filter(it => !it.conquered() && oldConqueredCountries.includes(it));
            if(newAxisCountries.length === 0){
                LeftPanel.appendParagraph("No country has entered the war on the side of the Axis this turn.");
            }
            else{
                LeftPanel.appendParagraph("The following countries have entered the war on the side of the Axis this turn:");
                LeftPanel.appendElement(createCountryList(newAxisCountries));
            }
            if(!spainPreviouslyActivated && Countries.spain.hasAttemptedActivation && Countries.spain.partnership() === Partnership.Neutral){
                LeftPanel.appendParagraph("The Axis attempted to activate Spain and failed.");
            }
            if(newAlliedCountries.length === 0){
                LeftPanel.appendParagraph("No country has entered the war on the side of the Allies this turn.");
            }
            else{
                LeftPanel.appendParagraph("The following countries have entered the war on the side of the Allies this turn:");
                LeftPanel.appendElement(createCountryList(newAlliedCountries));
            }
            if(newConqueredCountries.length === 0){
                LeftPanel.appendParagraph("No country has been conquered this turn.");
            }
            else{
                LeftPanel.appendParagraph("The following countries have been conquered this turn:");
                LeftPanel.appendElement(createCountryList(newConqueredCountries));
            }
            if(newLiberatedCountries.length === 0){
                LeftPanel.appendParagraph("No country has been liberated this turn.");
            }
            else{
                LeftPanel.appendParagraph("The following countries have been liberated this turn:");
                LeftPanel.appendElement(createCountryList(newLiberatedCountries));
            }
            await LeftPanel.waitForNextButtonPressed("To deployment phase");
        }

        Phase.current = Phase.Deployment;
        autosaveGame(humanPlayer.partnership);
    }
}
