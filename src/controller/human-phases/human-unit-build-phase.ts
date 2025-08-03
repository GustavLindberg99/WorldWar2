import { addToMapOfSets, joinIterables } from "../../utils.js";

import { Partnership } from "../../model/partnership.js";
import { AirUnit, AliveUnit, NavalUnit, Unit } from "../../model/units.js";
import { date } from "../../model/date.js";

import ErrorMessages from "../../view/error-messages.js";
import LeftPanel from "../../view/left-panel.js";
import UnitMarker from "../../view/markers/unit-marker.js";

export default class HumanUnitBuildPhase {
    readonly #partnership: Partnership;

    #availableUnits: Set<Unit>;
    #boughtUnits = new Set<Unit>();

    readonly #availableUnitsContainer = document.createElement("div");
    readonly #boughtUnitsContainer = document.createElement("div");

    /**
     * Constructs a HumanUnitBuildPhase object. Does not run it, use run() for that.
     *
     * @param partnership   The partnership that the human player is playing as.
     */
    constructor(partnership: Partnership){
        this.#partnership = partnership;
        this.#availableUnits = new Set(partnership.availableUnits());
    }

    /**
     * Runs the unit build phase. Returns when the unit build phase is finished.
     */
    async run(): Promise<void> {
        LeftPanel.clear();
        LeftPanel.appendParagraph("Click on the \"buy\" button next to the units you want to buy.");
        LeftPanel.appendBox("Units that you can buy", [this.#availableUnitsContainer]);
        LeftPanel.appendBox("Units that you have bought this turn", [
            "These units will be available for use in a future turn. Exactly how long it takes before they're available [depends on the type of unit](README.md#buying-units).",
            this.#boughtUnitsContainer
        ]);
        this.#updateUnits();

        //Damaged units
        if(this.#partnership.airUnits().some(it => it.damaged()) || this.#partnership.navalUnits().some(it => it.damaged() && it.inPort())){
            const unitContainer = document.createElement("p");
            for(let unit of joinIterables<AliveUnit & (AirUnit | NavalUnit)>(this.#partnership.airUnits(), this.#partnership.navalUnits().filter(it => it.inPort()))){
                if(unit.damaged()){
                    const image = UnitMarker.get(unit).createCopyImage(true);
                    image.style.verticalAlign = "middle";
                    image.style.cursor = "pointer";
                    image.onclick = () => {
                        if(unit.owner.money < 200){
                            ErrorMessages.showNotEnoughMoneyError(unit.owner, 200);
                            return;
                        }

                        unit.owner.money -= 200;
                        unit.repair();
                        UnitMarker.get(unit).update();
                        unitContainer.removeChild(image);
                        if(!this.#partnership.airUnits().some(it => it.damaged()) && !this.#partnership.navalUnits().some(it => it.inPort() && it.damaged())){
                            unitContainer.textContent = "All damaged units have been repaired.";
                        }
                    };
                    unitContainer.appendChild(image);
                }
            }
            LeftPanel.appendBox("Damaged units", [
                "The following air and naval units are damaged. Click on them to repair them (cost: $200B per air unit).",
                unitContainer
            ]);
        }

        await LeftPanel.waitForNextButtonPressed("To main phase");

        for(let unit of this.#boughtUnits){
            addToMapOfSets(unit.owner.delayedUnits, date.current + unit.delay(), unit);
            unit.owner.availableUnits.delete(unit);
        }
    }

    /**
     * Updates which units are visible in the left panel.
     */
    #updateUnits(): void {
        const leftPanelContent = document.getElementById("leftPanelContent")!!;
        const scrollTop = leftPanelContent.scrollTop;

        this.#availableUnitsContainer.replaceChildren();
        if(this.#availableUnits.size === 0){
            this.#availableUnitsContainer.textContent = "There aren't any units available for you to buy. Click Next to continue to the next phase.";
        }
        else for(let [unit, amount] of Unit.groupByType(this.#availableUnits)){
            const row = this.#createUnitRow(unit, amount, "Buy", (unit, showErrorMessages) => this.#buyUnit(unit, showErrorMessages));
            this.#availableUnitsContainer.appendChild(row);
        }

        this.#boughtUnitsContainer.replaceChildren();
        if(this.#boughtUnits.size === 0){
            this.#boughtUnitsContainer.textContent = "You haven't bought any units yet. Click on the \"buy\" button next to a unit above to buy it.";
        }
        else for(let [unit, amount] of Unit.groupByType(this.#boughtUnits)){
            const row = this.#createUnitRow(unit, amount, "Undo buy", (unit) => this.#undoBuyUnit(unit));
            this.#boughtUnitsContainer.appendChild(row);
        }

        leftPanelContent.scrollTop = scrollTop;
    }

    /**
     * Creates a row with buttons to buy/undo buy a unit.
     *
     * @param unit          The unit to create the row for.
     * @param amount        The amount of other units of the same type.
     * @param buttonText    The button text.
     * @param callback      The callback to buy or undo buying the unit.
     */
    #createUnitRow(unit: Unit, amount: number, buttonText: "Buy" | "Undo buy", callback: (unit: Unit, showErrorMessages: boolean) => boolean): HTMLElement {
        const row = document.createElement("p");
        const copyImage = UnitMarker.get(unit).createCopyImage(true);
        row.appendChild(copyImage);
        const buyButton = document.createElement("button");
        buyButton.onclick = () => callback(unit, true);
        if(amount === 1){
            buyButton.textContent = buttonText;
            row.appendChild(buyButton);
        }
        else{
            row.appendChild(document.createTextNode(`(x${amount}) `));
            buyButton.textContent = `${buttonText} one`;
            row.appendChild(buyButton);

            const buyAllButton = document.createElement("button");
            buyAllButton.textContent = `${buttonText} all`;
            buyAllButton.onclick = () => {
                let showErrorMessages = true;
                const units = buttonText === "Buy" ? this.#availableUnits : this.#boughtUnits;
                for(let otherUnit of units.values().filter(it => it.sameTypeAndStrength(unit))){
                    if(!callback(otherUnit, showErrorMessages)){
                        break;
                    }
                    showErrorMessages = false;
                }
            };
            row.appendChild(buyAllButton);
        }
        return row;
    }

    /**
     * Buys a unit if the player can afford it, otherwise shows an error message.
     *
     * @param unit              The unit to buy.
     * @param showErrorMessages True to show an error message if the country can't afford to buy the unit, false to silently fail.
     *
     * @returns True if buying the unit succeeded, false if the country can't afford it.
     */
    #buyUnit(unit: Unit, showErrorMessages: boolean): boolean {
        if(unit.owner.money < unit.price()){
            if(showErrorMessages){
                ErrorMessages.showNotEnoughMoneyError(unit.owner, unit.price());
            }
            return false;
        }
        unit.owner.money -= unit.price();
        this.#availableUnits.delete(unit);
        this.#boughtUnits.add(unit);
        this.#updateUnits();
        return true;
    }

    /**
     * Undoes buying a unit.
     *
     * @param unit  The unit to undo buying.
     *
     * @returns Always returns true to have a compatible signature with #buyUnit.
     */
    #undoBuyUnit(unit: Unit): boolean {
        unit.owner.money += unit.price();
        this.#boughtUnits.delete(unit);
        this.#availableUnits.add(unit);
        this.#updateUnits();
        return true;
    }
}
