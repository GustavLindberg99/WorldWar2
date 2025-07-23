import { joinIterables, xdialogConfirm } from "../../utils.js";

import { Hex } from "../../model/mapsheet.js";
import { Partnership } from "../../model/partnership.js";
import { AliveUnit, LandUnit, NavalUnit, Paratrooper, SupplyUnit } from "../../model/units.js";
import { UnitCombat } from "../../model/combat.js";

import HexMarker from "../../view/markers/hex-marker.js";
import LeftPanel from "../../view/left-panel.js";
import UnitMarker from "../../view/markers/unit-marker.js";

export default class HumanAmphibiousParadropPhase {
    readonly #partnership: Partnership;

    #selectedHex: Hex | null = null;
    #selectedAmphibiousUnits = new Set<AliveUnit & LandUnit>();
    #selectedParadropUnits = new Set<AliveUnit & Paratrooper>();

    #endAmphibiousParadropPhase: () => void = () => {};

    /**
     * Constructs a HumanAmphibiousParadropPhase object. Does not run it, use run() for that.
     *
     * @param partnership   The partnership that the human player is playing as.
     */
    constructor(partnership: Partnership){
        this.#partnership = partnership;
    }

    /**
     * Runs the amphibious and paradrop phase. Returns when the amphibious and paradrop phase is finished.
     */
    async run(): Promise<void> {
        this.#deselectHex();
        HexMarker.onhexclick = (hex: Hex) => this.#selectHex(hex);

        await new Promise<void>(resolvePromise => this.#endAmphibiousParadropPhase = resolvePromise);

        HexMarker.onhexclick = null;
    }

    /**
     * Selects a hex to do a paradrop or amphibious assault in.
     *
     * @param hex   The hex to select.
     */
    #selectHex(hex: Hex): void {
        const controller = hex.controller();
        if(controller === null){
            Toastify({text: "You can only do amphibious assaults and paradrops in coastal hexes."}).showToast();
            return;
        }
        else if(controller.partnership() === this.#partnership){
            Toastify({text: "You can't do amphibious assaults and paradrops in hexes you already control."}).showToast();
            return;
        }
        else if(hex.landUnits().some(it => it.owner.partnership() === this.#partnership)){
            Toastify({text: "You have already done a successful amphibious assault or paradrop in this hex."}).showToast();
            return;
        }

        const amphibiousUnits = new Set(hex.navalUnits().flatMap(it => it.embarkedUnits().values()).filter(it => it instanceof LandUnit));
        const paradropUnits = new Set(hex.airUnits().flatMap(it => it.embarkedUnits().values()).filter(it => it instanceof Paratrooper));
        if(amphibiousUnits.size === 0 && paradropUnits.size === 0){
            Toastify({text: "You don't have any units that can do amphibious assaults or paradrops in this hex."}).showToast();
            return;
        }

        this.#deselectHex();

        LeftPanel.clear();
        LeftPanel.appendParagraph("Click on the units you want to do an amphibious assault and/or paradrop with.");

        this.#selectedHex = hex;
        HexMarker.colorHex(hex, "purple");

        const probabilityLabel = document.createElement("div");
        if(amphibiousUnits.size > 0){
            LeftPanel.appendParagraph("Units eligible for amphibious assault:");
            LeftPanel.appendElement(this.#createUnitContainer(amphibiousUnits, this.#selectedAmphibiousUnits, probabilityLabel));
        }
        if(paradropUnits.size > 0){
            LeftPanel.appendParagraph("Units eligible for amphibious assault:");
            LeftPanel.appendElement(this.#createUnitContainer(paradropUnits, this.#selectedParadropUnits, probabilityLabel));
        }
        this.#updateProbability(probabilityLabel);
        LeftPanel.appendElement(probabilityLabel);

        LeftPanel.setNextButtonClick("To results", () => this.#runAssault());
        LeftPanel.showCancelButton("Cancel assault", () => this.#deselectHex());
    }

    /**
     * Checks if any units anywhere are eligible for amphibious assault or paradrop. Used to check if a warning should be shown when ending the phase.
     *
     * @return True if a unit of this partnership is eligible, false otherwise.
     */
    #unitsAreEligible(): boolean {
        return [...this.#partnership.landUnits().filter(it =>
            it.embarkedOn() !== null
            && (it.embarkedOn() instanceof NavalUnit || it instanceof Paratrooper)
            && it.hex().controller()?.partnership() === this.#partnership.opponent()
        )].length > 0;
    }

    /**
     * Creates a container with units eligible for amphibious assault or paradrop.
     *
     * @tparam T    The type of unit that can perform the action (LandUnit for amphibious assaults, Paratrooper for paradrops).
     *
     * @param eligibleUnits     The eligible units.
     * @param selectedUnits     A set that will be filled with the selected units as they are selected.
     * @param probabilityLabel  A label to display the success probability on.
     *
     * @returns An HTML element with the eligibile units that can be appended to the DOM.
     */
    #createUnitContainer<T extends LandUnit>(eligibleUnits: ReadonlySet<T>, selectedUnits: Set<T>, probabilityLabel: HTMLElement): HTMLElement {
        const result = document.createElement("div");
        for(let unit of eligibleUnits){
            const copyImage = UnitMarker.get(unit).createCopyImage(true);
            copyImage.onclick = () => {
                if(selectedUnits.has(unit)){
                    selectedUnits.delete(unit);
                    copyImage.classList.remove("selected");
                }
                else if(!unit.canEnterHexWithinStackingLimits(this.#selectedHex!!, false, this.#selectedUnits())){
                    Toastify({text: "This unit can't do an amphibious assault or paradrop in this hex due to stacking limits. If you want to select this unit, deselect another unit first."}).showToast();
                }
                else{
                    selectedUnits.add(unit);
                    copyImage.classList.add("selected");
                }
                this.#updateProbability(probabilityLabel);
            };
            result.appendChild(copyImage);
        }
        return result;
    }

    /**
     * Fills the given label with the probability of success.
     *
     * @param probabilityLabel  The label to display the probability on.
     */
    #updateProbability(probabilityLabel: HTMLElement): void {
        if(this.#selectedAmphibiousUnits.size === 0 && this.#selectedParadropUnits.size === 0){
            probabilityLabel.style.display = "none";
        }
        else{
            probabilityLabel.style.display = "";
            const successProbability = UnitCombat.amphibiousParadropSuccessProbability(this.#selectedAmphibiousUnits, this.#selectedParadropUnits);
            probabilityLabel.textContent = `Probability for succes: ${Math.round(successProbability * 100)}%`;
        }
    }

    /**
     * Resets the left panel so that no hex is selected.
     */
    #deselectHex(): void {
        LeftPanel.clear();
        LeftPanel.appendParagraph("Click on a hex to do an amphibious assault and/or paradrop in that hex.");
        LeftPanel.setNextButtonClick("To combat", async () => {
            if(!this.#unitsAreEligible() || await xdialogConfirm("End amphibious/paradrop phase?", "You still have units that are eligible for amphibious assault or paradrop. Do you really want to skip this phase?")){
                this.#endAmphibiousParadropPhase();
            }
        });
        LeftPanel.hideCancelButton();

        if(this.#selectedHex !== null){
            HexMarker.uncolorHex(this.#selectedHex);
        }
        this.#selectedHex = null;
        this.#selectedAmphibiousUnits = new Set();
        this.#selectedParadropUnits = new Set();
    }

    /**
     * Runs the assault. Returns after the next button is pressed after the results are displayed.
     */
    async #runAssault(): Promise<void> {
        const hex = this.#selectedHex;
        if(hex === null || this.#selectedAmphibiousUnits.size + this.#selectedParadropUnits.size === 0){
            Toastify({text: "You must select units to do an amphibious assault or paradrop."}).showToast();
            return;
        }
        else if(joinIterables(this.#selectedAmphibiousUnits, this.#selectedParadropUnits).every(it => it instanceof SupplyUnit)){
            Toastify({text: "At least one non-supply unit must participate in the assault."}).showToast();
            return;
        }
        else if(joinIterables(this.#selectedAmphibiousUnits, this.#selectedParadropUnits).some(it => it.outOfSupply())){
            Toastify({text: "Units that are out of supply can't do amphibious assaults or paradrops."}).showToast();
            return;
        }

        LeftPanel.clear();
        LeftPanel.hideCancelButton();
        const success = UnitCombat.runAmphibiousParadrop(this.#selectedAmphibiousUnits, this.#selectedParadropUnits);
        if(success){
            LeftPanel.appendParagraph("Assault succeeded.");
        }
        else{
            LeftPanel.appendParagraph("Assault failed.");
        }
        HexMarker.updateMarkers(hex);
        for(let unit of hex.units()){
            UnitMarker.get(unit).update();
        }

        await LeftPanel.waitForNextButtonPressed("Continue amphibious/paradrop phase");
        this.#deselectHex();
    }

    /**
     * Gets all the selected units, both for amphibious assault and paradrop.
     *
     * @returns The selected units.
     */
    #selectedUnits(): IteratorObject<LandUnit> {
        return joinIterables(this.#selectedAmphibiousUnits, this.#selectedParadropUnits);
    }
}
