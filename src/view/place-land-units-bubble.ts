import lodash from "https://cdn.jsdelivr.net/npm/lodash@4.17.21/+esm";

import { Hex, SupplyLines } from "../model/mapsheet.js";
import { Partnership } from "../model/partnership.js";
import { Armor, LandUnit, SupplyUnit } from "../model/units.js";

import ErrorMessages from "./error-messages.js";
import HexMarker from "./markers/hex-marker.js";
import InfoBubble from "./info/info-bubble.js";
import UnitMarker from "./markers/unit-marker.js";

import HumanDeploymentPhase from "../controller/human-phases/human-deployment-phase.js";

/**
 * Represents a tippy bubble that allows to place land units and build installations.
 */
export default class PlaceLandUnitsBubble {
    readonly #humanDeploymentPhase: HumanDeploymentPhase;
    readonly #hex: Hex;

    #rows: Map<LandUnit, HTMLElement> = new Map();
    #newLandUnitBubble: Tippy.Tippy | null = null;    //The secondary bubble that gets opened when the "Place land unit" button is clicked

    /**
     * Creates and opens a tippy bubble over a hex that allows to place land units and build/repair installations.
     *
     * @param hex                   The hex to show the bubble for.
     * @param partnerhsip           The partnership of the player placing the units.
     * @param humanDeploymentPhase  The HumanDeploymentPhase object containing information about which land units are available.
     */
    constructor(hex: Hex, partnerhsip: Partnership, humanDeploymentPhase: HumanDeploymentPhase){
        this.#hex = hex;
        this.#humanDeploymentPhase = humanDeploymentPhase;

        const controller = this.#hex.controller();
        if(controller === null){
            Toastify({text: "You can only place land units and build installations in land hexes."}).showToast();
            return;
        }
        else if(controller.partnership() !== partnerhsip){
            Toastify({text: "You can only place land units and build installations in hexes that you control."}).showToast();
            return;
        }

        let content = `
            <button id="PlaceLandUnitsBubble.placeLandUnits">Place land unit</button>
            <div id="PlaceLandUnitsBubble.existingLandUnits"></div>`;
        if(!this.#hex.fortified() && !this.#hex.fortUnderConstruction()){
            content += `<button id="PlaceLandUnitsBubble.buildFortification" title="Cost: $500B, construction finished in 2 months">Build fortification</button>`;
        }
        else if(this.#hex.fortRecentlyBuilt()){
            content += `<button id="PlaceLandUnitsBubble.buildFortification">Undo build fortification</button>`;
        }
        if(!this.#hex.hasAirfield() && !this.#hex.airfieldUnderConstruction()){
            content += `<button id="PlaceLandUnitsBubble.buildAirfield" title="Cost: $400B, construction finished in 2 months">Build airfield</button>`;
        }
        else if(this.#hex.airfieldRecentlyBuilt()){
            content += `<button id="PlaceLandUnitsBubble.buildAirfield">Undo build airfield</button>`;
        }
        if(this.#hex.installationsDestroyed || this.#hex.resourceHexDestroyed){
            content += `<button id="PlaceLandUnitsBubble.repairInstallations" title="Cost: $200B">Repair installations</button>`;
        }
        const bubble = InfoBubble.hexTippy(this.#hex, {
            content: content,
            hideOnClick: false
        });
        document.body.addEventListener("mousedown", (event: MouseEvent) => {
            if(event.button !== 0){    //If it's not the left mouse button that was pressed
                return;
            }
            const target = event.target as Node;
            if(!bubble.popper.contains(target) && !this.#newLandUnitBubble?.popper.contains(target)){
                bubble.destroy();
            }
        });

        const placeLandUnitsButton = document.getElementById("PlaceLandUnitsBubble.placeLandUnits");
        if(placeLandUnitsButton !== null){
            placeLandUnitsButton.onclick = () => {
                const country = this.#hex.country!!;
                let eligibleUnits: Array<LandUnit> = [];    //Contains one strength point of each eligible unit type
                for(let unit of this.#humanDeploymentPhase.availableLandUnits){
                    if(this.#hex.unitCanBePlacedHere(unit) && !eligibleUnits.some(it => it.sameType(unit))){
                        eligibleUnits.push(unit);
                    }
                }
                if(eligibleUnits.length === 0){
                    if(country.partnership() === partnerhsip){
                        Toastify({text: `${country.name()} doesn't have any land units that can be placed.`}).showToast();
                    }
                    else{
                        Toastify({text: "You can only place new land units in their home country."}).showToast();
                    }
                }
                else if(eligibleUnits.length === 1){
                    this.#placeLandUnit(eligibleUnits[0]);
                }
                else{
                    this.#newLandUnitBubble = tippy(placeLandUnitsButton, {content: `<div id="PlaceLandUnitsBubble.newLandUnits"></div>`});
                    const newLandUnitsDiv = document.getElementById("PlaceLandUnitsBubble.newLandUnits")!!;
                    for(let unit of eligibleUnits){
                        const copyImage = UnitMarker.get(unit).createCopyImage(false);
                        copyImage.onclick = () => this.#placeLandUnit(unit);
                        newLandUnitsDiv.appendChild(copyImage);
                    }
                }
            };
        }

        const buildFortificationButton = document.getElementById("PlaceLandUnitsBubble.buildFortification");
        if(buildFortificationButton !== null){
            buildFortificationButton.onclick = () => {
                if(this.#hex.fortUnderConstruction()){
                    this.#hex.destroyFortification();
                    controller.money += 500;
                    buildFortificationButton.textContent = "Build fortification";
                }
                else if(controller.money < 500){
                    ErrorMessages.showNotEnoughMoneyError(controller, 500);
                }
                else{
                    this.#hex.startBuildingFortification();
                    controller.money -= 500;
                    buildFortificationButton.textContent = "Undo build fortification";
                }
                HexMarker.updateMarkers(this.#hex);
            };
        }

        const buildAirfieldButton = document.getElementById("PlaceLandUnitsBubble.buildAirfield");
        if(buildAirfieldButton !== null){
            buildAirfieldButton.onclick = () => {
                if(this.#hex.airfieldUnderConstruction()){
                    this.#hex.destroyAirfield();
                    controller.money += 400;
                    buildAirfieldButton.textContent = "Build airfield"
                }
                else if(controller.money < 400){
                    ErrorMessages.showNotEnoughMoneyError(controller, 400);
                }
                else{
                    this.#hex.startBuildingAirfield();
                    controller.money -= 400;
                    buildAirfieldButton.textContent = "Undo build airfield";
                }
                HexMarker.updateMarkers(this.#hex);
            };
        }

        const repairInstallationsButton = document.getElementById("PlaceLandUnitsBubble.repairInstallations");
        if(repairInstallationsButton !== null){
            repairInstallationsButton.onclick = () => {
                if(controller.money < 200){
                    ErrorMessages.showNotEnoughMoneyError(controller, 200);
                }
                else{
                    this.#hex.repairInstallations();
                    controller.money -= 200;
                    repairInstallationsButton.remove();
                }
                HexMarker.updateMarkers(this.#hex);
            };
        }

        for(let unit of this.#hex.landUnits()){
            this.#addUnitToExistingLandUnitsList(unit);
        }
    }

    /**
     * Increases the strength of the unit by one strength point if possible.
     *
     * @param unit                      The unit whose strength to increase.
     * @param showErrors                If true, shows an error message in case of failure, otherwise fails silently.
     * @param changeAvailableLandUnits  If true, removes strength points from availableLandUnits.
     *
     * @returns True if the unit's strength was increased, false if it's not possible.
     */
    #increaseUnitStrength(unit: LandUnit, showErrors: boolean = true, changeAvailableLandUnits: boolean = true): boolean {
        if(unit.strength >= unit.maxStrength()){
            if(showErrors){
                Toastify({text: `This type of unit can't be stronger than ${unit.maxStrength()} strength points.`}).showToast();
            }
            return false;
        }
        if(changeAvailableLandUnits){
            const unitToRemove = this.#humanDeploymentPhase.availableLandUnits.find(it => it.sameType(unit));
            if(unitToRemove === undefined){
                if(showErrors){
                    Toastify({text: `${unit.owner.name()} doesn't have any more available strength points of the same type as this unit.`}).showToast();
                }
                return false;
            }
            lodash.pull(this.#humanDeploymentPhase.availableLandUnits, unitToRemove);
            this.#humanDeploymentPhase.updateUnitsInLeftPanel();
        }
        unit.strength++;
        UnitMarker.get(unit).update();

        this.#rows.get(unit)!!.querySelector(".imageContainer")!!.replaceChildren(UnitMarker.get(unit).createCopyImage());
        return true;
    }

    /**
     * Decreases the strength of the unit by one strength point if possible.
     *
     * @param unit                      The unit whose strength to decrease.
     * @param showErrors                If true, shows an error message in case of failure, otherwise fails silently.
     * @param changeAvailableLandUnits  If true, removes strength points from availableLandUnits.
     *
     * @returns True if the unit's strength was decreased, false if it's not possible.
     */
    #decreaseUnitStrength(unit: LandUnit, showErrors: boolean = true, changeAvailableLandUnits: boolean = true): boolean {
        const reduceCallback = (a: number, b: LandUnit) =>
            a + (b instanceof SupplyUnit ? 1 : b.strength);    //For regular units count the strength points, but for supply units count the number of units, otherwise everything will always be zero
        const initialStrength = this.#humanDeploymentPhase.initialUnitsAtHex.get(this.#hex)!!
            .filter(it => it.sameType(unit))
            .reduce(reduceCallback, 0);
        const newStrength = this.#hex.landUnits()
            .filter(it => it.sameType(unit))
            .reduce(reduceCallback, 0);
        if(!unit.isAlive()){
            return false;
        }
        else if(newStrength <= initialStrength && changeAvailableLandUnits){
            if(showErrors){
                Toastify({text: "You can't remove units that were already in this hex before."}).showToast();
            }
            return false;
        }
        else if(unit.strength <= 1){
            unit.delete();
            UnitMarker.get(unit).update();
            if(changeAvailableLandUnits){
                this.#humanDeploymentPhase.availableLandUnits.push(unit);
                this.#humanDeploymentPhase.updateUnitsInLeftPanel();
            }
            this.#rows.get(unit)!!.remove();
            this.#rows.delete(unit);
            return true;
        }
        else{
            const clone = unit.clone();
            if(!(clone instanceof SupplyUnit)){
                clone.strength = 1;
            }
            if(changeAvailableLandUnits){
                this.#humanDeploymentPhase.availableLandUnits.push(clone);
                this.#humanDeploymentPhase.updateUnitsInLeftPanel();
            }
            unit.strength--;
            UnitMarker.get(unit).update();
            this.#rows.get(unit)!!.querySelector(".imageContainer")!!.replaceChildren(UnitMarker.get(unit).createCopyImage());
            return true;
        }
    }

    /**
     * Adds a land unit to the existing land units list in the tippy bubble. Assumes that the tippy bubble is opened.
     *
     * @param unit  The unit to add.
     */
    #addUnitToExistingLandUnitsList(unit: LandUnit): void {
        if(!this.#humanDeploymentPhase.initialUnitsAtHex.has(this.#hex)){
            this.#humanDeploymentPhase.initialUnitsAtHex.set(this.#hex, [...this.#hex.landUnits().map(it => it.clone())]);
        }

        const row = document.createElement("p");
        const imageContainer = document.createElement("span");
        imageContainer.className = "imageContainer";
        imageContainer.appendChild(UnitMarker.get(unit).createCopyImage(false));
        row.appendChild(imageContainer);

        //\u2b71, \u2b61, \u2b63 and \u2b73 would look nicer but aren't supported on Android
        const maximizeStrengthButton = document.createElement("button");
        maximizeStrengthButton.textContent = "\u2912";
        maximizeStrengthButton.title = "Increase strength as much as possible";
        const increaseStrengthButton = document.createElement("button");
        increaseStrengthButton.textContent = "\u2191";
        increaseStrengthButton.title = "Increase strength by one strength point";
        const decreaseStrengthButton = document.createElement("button");
        decreaseStrengthButton.textContent = "\u2193";
        decreaseStrengthButton.title = "Decrease strength by one strength point";
        const minimizeStrengthButton = document.createElement("button");
        minimizeStrengthButton.textContent = "\u2913";
        minimizeStrengthButton.title = "Decrease strength as much as possible";
        const transferStrengthButton = document.createElement("button");
        transferStrengthButton.textContent = "Transfer strength";

        if(unit.maxStrength() > 1){
            row.appendChild(maximizeStrengthButton);
        }
        row.appendChild(increaseStrengthButton);
        row.appendChild(decreaseStrengthButton);
        if(unit.maxStrength() > 1){
            row.appendChild(minimizeStrengthButton);
            row.appendChild(transferStrengthButton);
        }

        const existingLandUnitsDiv = document.getElementById("PlaceLandUnitsBubble.existingLandUnits")!!;
        existingLandUnitsDiv.appendChild(row);
        this.#rows.set(unit, row);

        maximizeStrengthButton.onclick = () => {
            let showErrors = true;
            while(this.#increaseUnitStrength(unit, showErrors)){
                showErrors = false;
            }
        };
        increaseStrengthButton.onclick = () => {
            this.#increaseUnitStrength(unit);
        };
        decreaseStrengthButton.onclick = () => {
            this.#decreaseUnitStrength(unit);
        };
        minimizeStrengthButton.onclick = () => {
            let showErrors = true;
            while(this.#decreaseUnitStrength(unit, showErrors)){
                showErrors = false;
            }
        };
        transferStrengthButton.onclick = () => {
            const otherUnit = this.#hex.landUnits().find(it => it !== unit && it.sameType(unit));
            if(otherUnit === undefined){
                const clone = unit.clone();
                clone.strength = 1;
                if(clone.canEnterHexWithinStackingLimits(this.#hex)){
                    this.#decreaseUnitStrength(unit, true, false);
                    this.#placeLandUnit(clone);
                }
                else{
                    Toastify({text: "This unit can't be split up because of stacking limits."}).showToast();
                }
            }
            else{
                this.#increaseUnitStrength(otherUnit, true, false) && this.#decreaseUnitStrength(unit, false, false);
            }
        };
    }

    /**
     * Places a new land unit in the given hex if there is room, otherwise shows an error message. The hex is assumed to be in a country where the unit can be placed.
     *
     * @param unit  The unit to place.
     * @param hex   The hex to place it in.
     */
    #placeLandUnit(unit: LandUnit): void {
        if(!unit.canEnterHexWithinStackingLimits(this.#hex)){
            Toastify({text: "This unit can't be placed here because of stacking limits. If possible, try increasing the strength of an existing unit in this hex, otherwise place this unit somewhere else."}).showToast();
            return;
        }
        else if(unit instanceof Armor && (this.#hex.isDesert() || this.#hex.isIcecap())){
            Toastify({text: "Armor units can't be placed in desert or icecap hexes."}).showToast();
            return;
        }
        else if(!SupplyLines.canTraceSupplyLine(this.#hex, unit.owner, !(unit instanceof SupplyUnit))){
            Toastify({text: "New units can't be placed in hexes that are out of supply."}).showToast();
            return;
        }

        this.#addUnitToExistingLandUnitsList(unit);
        unit.setHex(this.#hex);
        UnitMarker.get(unit).update();
        lodash.pull(this.#humanDeploymentPhase.availableLandUnits, unit);
        this.#humanDeploymentPhase.updateUnitsInLeftPanel();
    }
}
