import lodash from "https://cdn.jsdelivr.net/npm/lodash@4.17.21/+esm";
import { xdialogConfirm } from "../../utils.js";

import { Hex, SupplyLines } from "../../model/mapsheet.js";
import { Partnership } from "../../model/partnership.js";
import { Countries, Country } from "../../model/countries.js";
import { AirUnit, LandUnit, NavalUnit, Unit } from "../../model/units.js";
import { date, year } from "../../model/date.js";

import HexMarker from "../../view/markers/hex-marker.js";
import LeftPanel from "../../view/left-panel.js";
import MoveUnitListener from "../../view/markers/move-unit-listener.js";
import PlaceLandUnitsBubble from "../../view/place-land-units-bubble.js";
import UnitMarker from "../../view/markers/unit-marker.js";

import AirNavalAutoplacement from "../computer-player-algorithms/autoplace/air-naval-unit-autoplacement.js";
import LandAutoplacement from "../computer-player-algorithms/autoplace/land-unit-autoplacement.js";

export default class HumanDeploymentPhase {
    readonly #partnership: Partnership;

    readonly #autoplaceLandUnitsButton = document.createElement("button");
    readonly #autoplaceNavalUnitsButton = document.createElement("button");
    readonly #autoplaceAirUnitsButton = document.createElement("button");

    readonly #placementText = "You must place new units in their home country or in colonies of their home country on hexes that you control.";
    readonly #exceptionTexts: ReadonlyMap<Country, string>;

    readonly #navalAirBox = document.createElement("div");
    readonly #navalAirHelpText = document.createElement("p");
    readonly #navalAirContainer = document.createElement("div");
    readonly #landBox = document.createElement("div");
    readonly #landHelpText = document.createElement("p");
    readonly #landContainer = document.createElement("div");

    #moveUnitListeners = new Set<MoveUnitListener>();

    availableLandUnits: Array<LandUnit>;
    availableNavalUnits: Array<NavalUnit>;
    availableAirUnits: Array<AirUnit>;
    initialUnitsAtHex = new Map<Hex, ReadonlyArray<LandUnit>>();

    /**
     * Constructs a HumanDeploymentPhase object. Does not run it, use run() for that.
     *
     * @param partnership   The partnership that the human player is playing as.
     */
    constructor(partnership: Partnership){
        this.#partnership = partnership;

        this.availableLandUnits = this.#partnership.currentDelayedUnits().filter(it => it instanceof LandUnit);
        this.availableNavalUnits = this.#partnership.currentDelayedUnits().filter(it => it instanceof NavalUnit);
        this.availableAirUnits = this.#partnership.currentDelayedUnits().filter(it => it instanceof AirUnit);

        this.#autoplaceLandUnitsButton.textContent = "Auto-place land units";
        this.#autoplaceNavalUnitsButton.textContent = "Auto-place naval units";
        this.#autoplaceAirUnitsButton.textContent = "Auto-place air units";
        this.#updateAutoplaceDisabled();

        this.#exceptionTexts = new Map([
            [Countries.poland,
                this.availableNavalUnits.some(it => it.owner === Countries.poland)
                ? " Polish naval units may also be placed in the United Kingdom (not its colonies)."
                : ""
            ],
            [Countries.japan,
                Countries.japan.partnership() === this.#partnership && date.current === Countries.japan.enteredWar && year(Countries.japan.enteredWar) === 1939
                ? " This turn only, Japanese units may also be placed in hexes in China within the temporary border (China will gain control of any such hex where Japanese land units are not placed this way)."
                : ""
            ],
            [Countries.sovietUnion,
                Countries.sovietUnion.partnership() === this.#partnership && date.current === Countries.sovietUnion.enteredWar
                ? " This turn only, Soviet units may also be placed in the Baltic states, in Poland or Romania east of the temporary border, and in Finland east of the southern temporary border."
                : ""
            ],
            [Countries.unitedStates,
                Countries.unitedStates.partnership() === this.#partnership && this.availableAirUnits.some(it => it.owner === Countries.unitedStates)
                ? " American air units may also be placed in any port hex controlled by the United States or the United Kingdom that is not in an enemy naval control zone."
                : ""
            ]
        ]);

        this.#navalAirBox.className = "box";
        const navalAirTitle = document.createElement("h3");
        navalAirTitle.textContent = "Naval and air units";
        this.#navalAirBox.appendChild(navalAirTitle);
        this.#navalAirHelpText.style.marginTop = "0px";
        this.#navalAirBox.appendChild(this.#navalAirHelpText);
        this.#navalAirBox.appendChild(this.#autoplaceAirUnitsButton);
        this.#navalAirBox.appendChild(this.#autoplaceNavalUnitsButton);
        this.#navalAirBox.appendChild(this.#navalAirContainer);

        this.#landBox.className = "box";
        const landTitle = document.createElement("h3");
        landTitle.textContent = "Land units";
        this.#landBox.appendChild(landTitle);
        this.#landHelpText.style.marginTop = "0px";
        this.#landBox.appendChild(this.#landHelpText);
        this.#landBox.appendChild(this.#autoplaceLandUnitsButton);
        this.#landBox.appendChild(this.#landContainer);

        HexMarker.onhexclick = (hex: Hex) => new PlaceLandUnitsBubble(hex, this.#partnership, this);
        this.#autoplaceLandUnitsButton.onclick = this.#autoplaceAirUnitsButton.onclick = this.#autoplaceNavalUnitsButton.onclick = (event) => this.#autoplaceUnits(event.currentTarget as HTMLButtonElement);
    }

    /**
     * Runs the deployment phase. Returns when the deployment phase is finished.
     */
    async run(): Promise<void> {
        for(let country of this.#partnership.countries()){
            country.delayedUnits.delete(date.current);
        }

        LeftPanel.clear();
        if(this.availableLandUnits.length > 0 || this.availableNavalUnits.length > 0 || this.availableAirUnits.length > 0){
            LeftPanel.appendParagraph("These are your available units.");
            LeftPanel.appendParagraph(this.#placementText + [...this.#exceptionTexts.values()].join(""));
            LeftPanel.appendParagraph("Your opponent is placing their units at the same time as you are, but neither player may see the other's units until both are done placing theirs.");
            LeftPanel.appendParagraph("You can also click on a hex to repair a damaged naval or air unit in it, to repair a damaged installation, or to build a new installation.");

            //Naval and air units
            if(this.availableNavalUnits.length > 0 || this.availableAirUnits.length > 0){
                LeftPanel.appendElement(this.#navalAirBox);
            }

            //Land units
            if(this.availableLandUnits.length > 0){
                LeftPanel.appendElement(this.#landBox);
            }

            //Initialize the units in the left panel
            this.updateUnitsInLeftPanel();
        }
        else{
            LeftPanel.appendParagraph("You haven't bought any units last turn. Click Next to continue, or click on a hex you control to build an installation in it or to transfer strength points between land units in it.");
        }

        await LeftPanel.waitForNextButtonPressed("To income phase", () => {
            if(this.availableLandUnits.length > 0 || this.availableNavalUnits.length > 0 || this.availableAirUnits.length > 0){
                return xdialogConfirm(
                    "Lose remaining units?",
                        this.availableLandUnits.length > 0
                        ? "You haven't placed all your land units on the map. To place them on the map, click on where you want to place it and then either click on \"Create new unit\" or increase the strength of an existing unit.<br/><br/>Units that you don't place on the map will be lost. Do you want to continue?"
                        : "You haven't placed all your naval or air units on the map. To place them on the map, drag the unit to where you want to place it.<br/><br/>Units that you don't place on the map will be lost. Do you want to continue?"
                );
            }
            else{
                return true;
            }
        });

        for(let unit of [...this.availableLandUnits, ...this.availableNavalUnits, ...this.availableAirUnits]){
            unit.owner.availableUnits.add(unit);
        }

        for(let listener of this.#moveUnitListeners){
            listener.delete();
        }

        HexMarker.onhexclick = null;
    }

    /**
     * Updates which units are visible in the left panel.
     */
    updateUnitsInLeftPanel(): void {
        const landHelpString = "To place a land unit on the map, click on the hex on which you want to place it and choose how many strength points of each type you want to put there.";

        this.#updateAutoplaceDisabled();

        if(this.availableNavalUnits.length > 0 || this.availableAirUnits.length > 0){
            this.#navalAirHelpText.textContent = "Drag a naval or air unit to the hex on which you want to place it.";
            this.#navalAirHelpText.style.marginBottom = "8px";
        }
        else{
            this.#navalAirHelpText.textContent = "No more naval or air units available";
            this.#navalAirHelpText.style.marginBottom = "0px";
        }
        if(this.availableLandUnits.length > 0){
            this.#landHelpText.textContent = landHelpString;
            this.#landHelpText.style.marginBottom = "8px";
        }
        else{
            this.#landHelpText.textContent = "No more land units available";
            this.#landHelpText.style.marginBottom = "0px";
        }

        this.#navalAirContainer.replaceChildren();
        for(let unit of [...this.availableAirUnits, ...this.availableNavalUnits]){
            const copyImage = UnitMarker.get(unit).createCopyImage(true);
            this.#navalAirContainer.appendChild(copyImage);

            const listener = new MoveUnitListener(unit, copyImage, false);
            listener.ondragfinished = hex => this.#placeNavalOrAirUnit(unit, hex);
        }

        this.#landContainer.replaceChildren();
        for(let [unit, numberOfUnits] of Unit.groupByType(this.availableLandUnits)){
            const wrapper = document.createElement("span");
            wrapper.style.whiteSpace = "nowrap";
            wrapper.style.margin = "4px";
            wrapper.style.display = "inline-block";    //Needed for it to work on Firefox, Chromium-based browsers work fine without this

            const image = UnitMarker.get(unit).createCopyImage(true);
            image.style.verticalAlign = "middle";
            image.onclick = () => Toastify({text: landHelpString}).showToast();
            wrapper.appendChild(image);

            if(numberOfUnits > 1){
                wrapper.appendChild(document.createTextNode("(x" + numberOfUnits  + ") "));
            }
            this.#landContainer.appendChild(wrapper);
        }
    }

    /**
     * Updates which autoplace buttons are disabled.
     */
    #updateAutoplaceDisabled(): void {
        this.#autoplaceLandUnitsButton.disabled = this.availableLandUnits.length === 0;
        this.#autoplaceNavalUnitsButton.disabled = this.availableNavalUnits.length === 0;
        this.#autoplaceAirUnitsButton.disabled = this.availableAirUnits.length === 0;
    }

    /**
     * Attempts to place a naval or air unit in a hex.
     *
     * @param unit  The unit to place.
     * @param hex   The hex to place it in, or null to return it to the available units.
     */
    #placeNavalOrAirUnit(unit: AirUnit | NavalUnit, hex: Hex | null): void {
        if(hex === unit.hex()){
            return;
        }
        else if(hex === null){
            if(unit instanceof AirUnit && !this.availableAirUnits.includes(unit)){
                this.availableAirUnits.push(unit);
            }
            if(unit instanceof NavalUnit && !this.availableNavalUnits.includes(unit)){
                this.availableNavalUnits.push(unit);
            }
            unit.delete();
            UnitMarker.get(unit).update();
            this.updateUnitsInLeftPanel();
            return;
        }
        else if(!hex.unitCanBePlacedHere(unit)){
            Toastify({text: this.#placementText + (this.#exceptionTexts.get(unit.owner) ?? "")}).showToast();
            return;
        }
        else if(!unit.canEnterHexWithinStackingLimits(hex, true)){
            if(unit instanceof AirUnit && hex.airbaseCapacity() === 0){
                Toastify({text: "Air units must be placed on airbases (this includes cities, resource hexes, and airbase installations)."}).showToast();
            }
            else if(unit instanceof NavalUnit && !hex.isPort()){
                Toastify({text: "Naval units must be placed in ports (this includes any city in a coastal hex)."}).showToast();
            }
            else{
                Toastify({text: "There isn't room for this unit in this hex."}).showToast();
            }
            return;
        }
        else if(!SupplyLines.canTraceSupplyLine(hex, unit.owner)){
            Toastify({text: "New units can't be placed in hexes that are out of supply."}).showToast();
            return;
        }

        unit.setHex(hex);
        if(unit instanceof AirUnit){
            lodash.pull(this.availableAirUnits, unit);
            unit.based = true;
        }
        else{
            lodash.pull(this.availableNavalUnits, unit);
            unit.inPort = true;
        }
        UnitMarker.get(unit).update();
        this.updateUnitsInLeftPanel();
        const listener = UnitMarker.get(unit).createMoveUnitListener(false);
        listener.ondragfinished = it => this.#placeNavalOrAirUnit(unit, it);
        this.#moveUnitListeners.add(listener);
    }

    /**
     * Autoplaces the units of a specific type. Which type is determined by the button passed as parameter.
     *
     * @param button    The button clicked on. Used to determine which type of units should be autoplaced.
     */
    async #autoplaceUnits(button: HTMLButtonElement): Promise<void> {
        const text = button.textContent;
        button.textContent = "Auto-placing units...";
        button.disabled = true;
        let nextButtonLockReason = "";
        switch(button){
        case this.#autoplaceLandUnitsButton:
            nextButtonLockReason = "Auto-placing land units...";
            LeftPanel.addNextButtonLock(nextButtonLockReason);
            const oldAvailableLandUnits = this.availableLandUnits;    //Move this to a temporary array so that it's not possible to place new land units while autoplacing is in progress
            this.availableLandUnits = [];
            this.updateUnitsInLeftPanel();
            const landPlacements = await LandAutoplacement.getLandUnitAutoplacement(this.#partnership, oldAvailableLandUnits);
            for(let hex of landPlacements.values().filter(it => it instanceof Hex)){
                if(!this.initialUnitsAtHex.has(hex)){
                    this.initialUnitsAtHex.set(hex, [...hex.landUnits().map(it => it.clone())]);
                }
            }
            LandAutoplacement.placeLandUnits(landPlacements);
            this.availableLandUnits = oldAvailableLandUnits.filter(it => !landPlacements.has(it));
            break;
        case this.#autoplaceAirUnitsButton:
            nextButtonLockReason = "Auto-placing air units...";
            LeftPanel.addNextButtonLock(nextButtonLockReason);
            const oldAvailableAirUnits = this.availableAirUnits;
            this.availableAirUnits = [];
            this.updateUnitsInLeftPanel();
            const airPlacements = await AirNavalAutoplacement.getAirUnitAutoplacement(this.#partnership, oldAvailableAirUnits);
            AirNavalAutoplacement.placeAirNavalUnits(airPlacements);
            this.availableAirUnits = oldAvailableAirUnits.filter(it => !airPlacements.has(it));
            for(let unit of airPlacements.keys()){
                const listener = UnitMarker.get(unit).createMoveUnitListener(false);
                listener.ondragfinished = it => this.#placeNavalOrAirUnit(unit, it);
                this.#moveUnitListeners.add(listener);
            }
            break;
        case this.#autoplaceNavalUnitsButton:
            nextButtonLockReason = "Auto-placing naval units...";
            LeftPanel.addNextButtonLock(nextButtonLockReason);
            const oldAvailableNavalUnits = this.availableNavalUnits;
            this.availableNavalUnits = [];
            this.updateUnitsInLeftPanel();
            const navalPlacements = await AirNavalAutoplacement.getNavalUnitAutoplacement(this.#partnership, oldAvailableNavalUnits);
            AirNavalAutoplacement.placeAirNavalUnits(navalPlacements);
            this.availableNavalUnits = oldAvailableNavalUnits.filter(it => !navalPlacements.has(it));
            for(let unit of navalPlacements.keys()){
                const listener = UnitMarker.get(unit).createMoveUnitListener(false);
                listener.ondragfinished = it => this.#placeNavalOrAirUnit(unit, it);
                this.#moveUnitListeners.add(listener);
            }
            break;
        }
        button.textContent = text;
        button.disabled = false;
        this.updateUnitsInLeftPanel();
        LeftPanel.releaseNextButtonLock(nextButtonLockReason);
    }
}
