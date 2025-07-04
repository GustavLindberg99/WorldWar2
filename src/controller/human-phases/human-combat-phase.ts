import lodash from "https://cdn.jsdelivr.net/npm/lodash@4.17.21/+esm";
import { xdialogConfirm } from "../../utils.js";

import { Hex } from "../../model/mapsheet.js";
import { Partnership } from "../../model/partnership.js";
import { Countries } from "../../model/countries.js";
import { AirUnit, AliveUnit, Armor, LandUnit, NavalUnit, Submarine, Unit } from "../../model/units.js";
import { AirNavalCombat, AtomicBombing, Bombing, Combat, InstallationBombing, LandCombat, StrategicBombing } from "../../model/combat.js";

import CombatTables from "../../view/combat/combat-tables.js";
import HexMarker from "../../view/markers/hex-marker.js";
import LeftPanel from "../../view/left-panel.js";
import RunCombat from "../../view/combat/run-combat.js";
import UnitMarker from "../../view/markers/unit-marker.js";

export default class HumanCombatPhase {
    readonly #partnership: Partnership;
    readonly #overrun: boolean;

    readonly #combatTableContainer = document.createElement("div");

    #attackers: Array<AliveUnit & Unit> = [];
    #defenders: Array<AliveUnit & LandUnit> | Array<AliveUnit & NavalUnit> | [AliveUnit & AirUnit] = [];
    #combat: Combat | null = null;

    #endCombatPhase: () => void = () => {};

    /**
     * Constructs a HumanCombatPhase object. Does not run it, use run() for that.
     *
     * @param partnership   The partnership that the human player is playing as.
     * @param overrun       True if this is the overrun phase, false if it's the main combat phase.
     */
    constructor(partnership: Partnership, overrun: boolean){
        this.#partnership = partnership;
        this.#overrun = overrun;
    }

    /**
     * Runs the combat phase. Returns when the combat phase is finished.
     */
    async run(): Promise<void> {
        LeftPanel.clear();
        if(this.#overrun){
            LeftPanel.appendParagraph("During this phase, your armor units may attack enemy land units. Only armor units may attack, and armor units that attacked successfully may ignore control zones when moving during the next movement phase.");
        }
        else{
            LeftPanel.appendParagraph("During this phase, your units may attack enemy units.");
        }
        LeftPanel.appendParagraph("Click on a friendly unit to attack with it, then click on an enemy unit to attack it.");
        LeftPanel.appendParagraph("Stacks of enemy land units can be attacked by friendly land units in hexes adjacent to them. Friendly naval and bomber units in the same hex as the enemy land unit can give support to the friendly land units, but can't attack enemy land units alone. Enemy land units must always be attacked by stack.");
        if(!this.#overrun){
            LeftPanel.appendParagraph("Stacks of enemy naval units can be attacked by friendly naval units in hexes adjacent to them, or by friendly bombers in the same hex. Unlike enemy land units, enemy naval units can (but don't have to) be attacked by bombers alone. Enemy naval units must always be attacked by stack.");
            LeftPanel.appendParagraph("Enemy air units can be attacked by friendly fighters in the same hex.");
        }
        LeftPanel.appendBox("Combat information", [this.#combatTableContainer]);

        this.#resetUnitClickEvents()
        this.#updateLeftPanel();

        await new Promise<void>(resolvePromise => this.#endCombatPhase = resolvePromise);

        for(let unit of Unit.allAliveUnits()){
            UnitMarker.get(unit).deselect();
            UnitMarker.get(unit).onclick = null;
        }
    }

    /**
     * Attempts to select or deselect a friendly unit to attack with it, and shows an error message if this is not possible.
     *
     * @param attacker  The unit to select or deselect.
     */
    #selectFriendlyUnit(attacker: AliveUnit & Unit): void {
        if(attacker.hasAttacked){
            Toastify({text: "This unit has already attacked this turn."}).showToast();
        }
        else if(this.#overrun && !attacker.canDoOverrun()){
            if(attacker instanceof Armor){
                Toastify({text: "This unit can't do overrun because of the weather."}).showToast();
            }
            else{
                Toastify({text: "Only armor units may attack during the overrun phase. Other units must wait until the combat phase."}).showToast();
            }
        }
        else if([attacker, ...this.#attackers].some(it => it instanceof AirUnit && it.model === "MXY-7 Ohka") && [attacker, ...this.#attackers].some(it => !(it instanceof AirUnit) || !it.canDoKamikaze())){
            Toastify({text: "MXY-7 Ohka units can only do kamikaze attacks, but you have selected one or more units that can't do kamikaze attacks."}).showToast();
        }
        else if(attacker.outOfSupply()){
            Toastify({text: "Units that are out of supply can't attack."}).showToast();
        }
        else if(!attacker.canAttack()){
            Toastify({text: "This type of unit can't attack."}).showToast();
        }
        else if(attacker instanceof AirUnit && this.#attackers.some(it => it instanceof AirUnit && it.hex() !== attacker.hex())){
            Toastify({text: "Air units must be in the same hex to be able to attack at the same time."}).showToast();
        }
        else{
            if(this.#attackers.includes(attacker)){
                lodash.pull(this.#attackers, attacker);
                UnitMarker.get(attacker).deselect();
            }
            else{
                this.#attackers.push(attacker);
                UnitMarker.get(attacker).select();
            }
            for(let oldDefender of this.#defenders){
                UnitMarker.get(oldDefender).deselect();
            }
            this.#defenders = [];
            this.#combat = null;
            this.#updateLeftPanel();
        }
    }

    /**
     * Attempts to select an enemy unit to attack it, and shows an error message if this is not possible.
     *
     * @param defender  The unit to attack.
     */
    #selectEnemyUnit(defender: AliveUnit & Unit): void {
        const hex = defender.hex();
        if(this.#attackers.length === 0){
            const surroundingHexes: ReadonlyArray<Hex> = [hex, ...hex.adjacentHexes()];
            this.#attackers = surroundingHexes
                .flatMap(it => [...it.units()])
                .filter(it => it.canAttackInHex(defender) && (!this.#overrun || it.canDoOverrun()));
            if(this.#attackers.length === 0){
                Toastify({text: "You don't have any units that can attack this unit."}).showToast();
                return;
            }
            if(this.#attackers[0] instanceof AirUnit && this.#attackers[0].model === "MXY-7 Ohka"){
                this.#attackers = this.#attackers.filter(it => it instanceof AirUnit && it.canDoKamikaze());
            }
            else{
                this.#attackers = this.#attackers.filter(it => !(it instanceof AirUnit) || it.model !== "MXY-7 Ohka");
            }
            for(let attacker of this.#attackers){
                UnitMarker.get(attacker).select();
            }
        }
        if(defender instanceof LandUnit){
            for(let amphibiousAttacker of hex.landUnits().filter(it => it.owner.partnership() === this.#partnership)){
                if(!this.#attackers.includes(amphibiousAttacker)){
                    this.#attackers.push(amphibiousAttacker);
                    UnitMarker.get(amphibiousAttacker).select();
                }
            }
        }

        for(let oldDefender of this.#defenders){
            UnitMarker.get(oldDefender).deselect();
        }
        this.#defenders = [];
        this.#combat = null;
        if(defender instanceof LandUnit && !this.#attackers.some(it => it instanceof LandUnit)){
            Toastify({text: "Naval and air units can't attack enemy land units alone, though they may support friendly land units attacking the enemy land units."}).showToast();
            return;
        }
        else if(defender instanceof NavalUnit && defender.inPort && defender.hex().isMajorPort() && this.#attackers.some(it => it instanceof NavalUnit)){
            Toastify({text: "Naval units can't attack units that are in a major port."}).showToast();
            return;
        }
        else if(this.#attackers.every(it => it.canAttackInHex(defender))){
            if(defender instanceof LandUnit){
                this.#defenders = [...hex.landUnits().filter(it => it.owner.partnership() !== this.#partnership)];
                this.#combat = new LandCombat(this.#attackers, this.#defenders);
            }
            else if(defender instanceof NavalUnit && this.#attackers.every(it => it instanceof AirUnit || it instanceof NavalUnit)){
                this.#defenders = [...hex.navalUnits().filter(it => defender instanceof Submarine ? it instanceof Submarine : !(it instanceof Submarine))];
                const combat = new AirNavalCombat(this.#attackers, this.#defenders);
                combat.kamikaze = this.#attackers.some(it => it instanceof AirUnit && it.model === "MXY-7 Ohka");
                this.#combat = combat;
            }
            else if(defender instanceof AirUnit && this.#attackers.every(it => it instanceof AirUnit)){
                this.#defenders = [defender];
                this.#combat = new AirNavalCombat(this.#attackers, this.#defenders);
            }
        }
        if(this.#combat === null){
            Toastify({text: "You have selected one or more units that can't attack this unit."}).showToast();
        }
        else{
            for(let newDefender of this.#defenders){
                UnitMarker.get(newDefender).select();
            }
            HexMarker.colorHex(hex, "purple");
        }

        this.#updateLeftPanel();
    }

    /**
     * Sets the click events on the units so that clicking on a unit selects or deselects it for combat.
     */
    #resetUnitClickEvents(): void {
        for(let unit of this.#partnership.units()){
            UnitMarker.get(unit).onclick = () => this.#selectFriendlyUnit(unit);
        }
        for(let unit of this.#partnership.opponent().units()){
            UnitMarker.get(unit).onclick = () => this.#selectEnemyUnit(unit);
        }
    }

    /**
     * Updates the attackers and defenders listed in the left panel, as well as whether or not the attack button is enabled.
     */
    #updateLeftPanel(): void {
        if(this.#defenders.length === 0 && this.#attackers.length > 0 && this.#attackers.every(it => it instanceof AirUnit) && this.#attackers.every(it => it.bomberStrength > 0)){
            const helpText = document.createElement("p");
            helpText.textContent = "Choose a type of bombing in the list below. To attack enemy units instead, select those units.";
            this.#combatTableContainer.replaceChildren(helpText);
            this.#createBombingForm(this.#attackers);
        }
        else if(this.#combat === null){
            this.#combatTableContainer.textContent = "Select attackers or defenders to display probabilities for combat results.";
        }
        else{
            this.#combatTableContainer.replaceChildren(CombatTables.createCombatTable(this.#combat));
            const combat = this.#combat;
            if(combat instanceof AirNavalCombat && combat.attackers.every(it => it instanceof AirUnit) && combat.defenders.every(it => it instanceof NavalUnit)){
                const kamikazeLabel = document.createElement("label");

                const kamikazeCheckbox = document.createElement("input");
                kamikazeCheckbox.type = "checkbox";
                kamikazeCheckbox.checked = combat.kamikaze;
                kamikazeCheckbox.disabled = combat.attackers.some(it => !it.canDoKamikaze() || it.model === "MXY-7 Ohka");
                kamikazeCheckbox.onchange = () => {
                    combat.kamikaze = kamikazeCheckbox.checked;
                    this.#updateLeftPanel();
                };
                kamikazeLabel.appendChild(kamikazeCheckbox);

                const kamikazeSpan = document.createElement("span");
                kamikazeSpan.textContent = " Kamikaze attack";
                kamikazeLabel.appendChild(kamikazeSpan);

                if(combat.attackers.some(it => !it.canDoKamikaze())){
                    kamikazeCheckbox.disabled = true;
                    kamikazeSpan.style.color = "gray";
                    kamikazeLabel.appendChild(document.createTextNode(" Only Japanese air units can do kamikaze attacks, and they can do so only if the United States controls at least one city hex in Japan or its colonies."));
                }
                else if(combat.attackers.some(it => it.model === "MXY-7 Ohka")){
                    kamikazeCheckbox.disabled = true;
                    kamikazeSpan.style.color = "gray";
                    kamikazeLabel.appendChild(document.createTextNode(" MXY-7 Ohka can only do kamikaze attacks."));
                }

                this.#combatTableContainer.appendChild(kamikazeLabel);
            }
        }

        if(this.#attackers.length === 0 && this.#defenders.length === 0){
            LeftPanel.waitForNextButtonPressed("To movement phase", () =>
                !this.#partnership.units().some(it => it.canAttack() && (!this.#overrun || it.canDoOverrun()))
                || xdialogConfirm("End combat phase?", "Do you really want to end the combat phase?")
            ).then(() => this.#endCombatPhase());
            LeftPanel.hideCancelButton();
        }
        else{
            LeftPanel.setNextButtonClick("To combat results", () => this.#attack());
            LeftPanel.showCancelButton("Cancel attacks", () => this.#cancelAttack());
        }
    }

    /**
     * Creates a form allowing to select the type of bombing and appends it to the left panel.
     *
     * @param attackers The units that will do the bombing.
     */
    #createBombingForm(attackers: ReadonlyArray<AliveUnit & AirUnit>): void {
        const bombings: ReadonlyMap<string, Bombing | string> = new Map<string, Bombing | string>([
            ["Installation bombing", attackers.map(it => it.canDoInstallationBombing(it.hex())).find(it => it !== null) ?? new InstallationBombing(attackers)],
            ["Strategic bombing", attackers.map(it => it.canDoStrategicBombing(it.hex())).find(it => it !== null) ?? new StrategicBombing(attackers)],
            ["Atomic bombing", attackers.map(it => it.canDoAtomicBombing(it.hex())).find(it => it !== null) ?? new AtomicBombing(attackers)]
        ]);

        const bombingForm = document.createElement("form");
        const bombingTableContainer = document.createElement("div");

        for(let [text, bombing] of bombings){
            const label = document.createElement("label");
            label.style.display = "block";
            const radioButton = document.createElement("input");
            radioButton.type = "radio";
            radioButton.name = "HumanCombatPhase.bombing";
            label.appendChild(radioButton);
            const bombingTypeLabel = document.createElement("span");
            bombingTypeLabel.textContent = text;
            label.appendChild(bombingTypeLabel);
            if(typeof(bombing) === "string"){
                //If the bombing isn't possible, display the reason
                radioButton.disabled = true;
                bombingTypeLabel.style.color = "gray";
                label.appendChild(document.createTextNode(" " + bombing));
            }
            else{
                //If the bombing is possible, allow selecting it
                label.onclick = () => {
                    this.#combat = bombing;
                    bombingTableContainer.replaceChildren(CombatTables.createCombatTable(bombing));
                    LeftPanel.setNextButtonClick("To combat results", () => this.#attack());
                };
            }
            bombingForm.appendChild(label);
        }

        this.#combatTableContainer.appendChild(bombingForm);
        this.#combatTableContainer.appendChild(bombingTableContainer);
    }

    /**
     * Launches the attack and gives the option to advance after combat. Returns once the combat is finished and any units that want to have advanced after combat.
     */
    async #attack(): Promise<void> {
        if(this.#combat === null){
            Toastify({text: "You must select which units should participate in the combat."}).showToast();
        }
        else{
            const nextButtonLockReason = "Attack is ongoing...";
            LeftPanel.addNextButtonLock(nextButtonLockReason);
            LeftPanel.hideCancelButton();

            const combatResults = await RunCombat.runCombat(this.#combat);
            const advanceText = document.createElement("p");
            combatResults.appendChild(advanceText);
            this.#combatTableContainer.replaceChildren(combatResults);

            LeftPanel.releaseNextButtonLock(nextButtonLockReason);

            for(let unit of [...this.#attackers, ...this.#defenders].filter(it => it.isAlive())){
                UnitMarker.get(unit).deselect();
            }

            const defendersRemainingInHex: ReadonlyArray<Unit> = [...this.#combat instanceof LandCombat ? this.#combat.combatHex.landUnits().filter(it => it.owner.partnership() !== this.#partnership) : this.#combat.combatHex.navalUnits()];
            if(this.#attackers.every(it => it instanceof AirUnit)){
                advanceText.textContent = "Click Next to continue.";
                await LeftPanel.waitForNextButtonPressed("Continue combat phase");
            }
            else if(defendersRemainingInHex.length > 0){
                advanceText.textContent = "You can't advance after combat since there are still defenders in the combat hex. Click Next to continue.";
                await LeftPanel.waitForNextButtonPressed("Continue combat phase");
            }
            else if(this.#combat instanceof LandCombat && this.#combat.isAmphibious){
                advanceText.textContent = "In an amphibious or paradrop combat, the assaulting units automatically advance after combat.";
                await LeftPanel.waitForNextButtonPressed("Continue combat phase");
            }
            else{
                advanceText.textContent = "Click on the units you want to advance after combat with, then click Next. If you don't want to advance after combat, click Next.";
                const attackersBox = document.createElement("div");
                combatResults.appendChild(attackersBox);
                await this.#advanceAfterCombat(this.#combat.combatHex, attackersBox);
            }

            for(let hex of [this.#combat.combatHex, ...this.#defenders.map(it => it.hex())]){
                if(hex !== null){
                    HexMarker.uncolorHex(hex);
                }
            }

            this.#attackers = [];
            this.#defenders = [];
            this.#combat = null;
            this.#resetUnitClickEvents();
            this.#updateLeftPanel();
            Countries.china.updateController();    //In case Japanese units in China advance after combat
        }
    }

    /**
     * Lets the user select which units to advance after combat, then advances after combat. Returns once the combat is finished and any units that want to have advanced after combat.
     *
     * @param combatHex     The combat hex. Must be fetched before combat in case the defender is eliminated.
     * @param attackersBox  An HTML element to put copy images of the attackers in to make it easier for them to advance after combat.
     */
    async #advanceAfterCombat(combatHex: Hex, attackersBox: HTMLElement): Promise<void> {
        const attackers = this.#attackers.filter(it => it.isAlive() && it.hex() !== combatHex);    //Check that the hex isn't the combat hex to exclude naval and air units in case of land combat, and air units in case of naval combat
        let unitsToAdvanceAfterCombat = new Set<Unit>;
        for(let unit of Unit.allAliveUnits()){
            UnitMarker.get(unit).onclick = () => {
                if(unit.owner.partnership() !== this.#partnership){
                    Toastify({text: "You can only advance after combat with your own units."}).showToast();
                }
                else if(!this.#attackers.includes(unit)){
                    Toastify({text: "This unit can't advance after combat because it didn't attack."}).showToast();
                }
                else if(unit instanceof AirUnit){
                    Toastify({text: "Air units can't advance after combat."}).showToast();
                }
                else{
                    Toastify({text: "Naval units can't advance after land combat."}).showToast();
                }
            };
        }
        for(let unit of attackers){
            const unitMarker = UnitMarker.get(unit);
            const copyImage = unitMarker.createCopyImage(true);
            attackersBox.appendChild(copyImage);
            unitMarker.onclick = copyImage.onclick = () => {
                if(unitsToAdvanceAfterCombat.has(unit)){
                    unitsToAdvanceAfterCombat.delete(unit);
                    unitMarker.deselect();
                    copyImage.classList.remove("selected");
                    if(unitsToAdvanceAfterCombat.size === 0){
                        LeftPanel.setNextButtonText("Don't advance after combat");
                    }
                }
                else{
                    unitsToAdvanceAfterCombat.add(unit);
                    unitMarker.select();
                    copyImage.classList.add("selected");
                    LeftPanel.setNextButtonText("Advance after combat");
                }
            };
        }

        await LeftPanel.waitForNextButtonPressed("Don't advance after combat", () => {
            for(let unit of unitsToAdvanceAfterCombat){
                if(!unit.canEnterHexWithinStackingLimits(combatHex, false, unitsToAdvanceAfterCombat.values().filter(it => it !== unit))){
                    Toastify({text: "Not all these units can advance after combat due to stacking limits. Deselect one or more units by clicking on them."}).showToast();
                    return false;
                }
                else if(unit instanceof Armor && (combatHex.isDesert() || combatHex.isIcecap())){
                    Toastify({text: "Armor units can't enter desert or icecap hexes."}).showToast();
                    return false;
                }
            }
            return true;
        });

        for(let unit of unitsToAdvanceAfterCombat){
            unit.setHex(combatHex);
            UnitMarker.get(unit).update();
            UnitMarker.get(unit).deselect();
            if(unit instanceof LandUnit){
                combatHex.setController(unit.owner, false);
            }
        }

        for(let unit of combatHex.units()){
            UnitMarker.get(unit).update();
        }
        HexMarker.updateMarkers(combatHex);
    }

    /**
     * Cancels the attack by deselecting all attackers and defenders.
     */
    #cancelAttack(): void {
        for(let unit of [...this.#attackers, ...this.#defenders]){
            UnitMarker.get(unit).deselect();
        }
        const hex = this.#defenders[0]?.hex() ?? null;
        if(hex !== null){
            HexMarker.uncolorHex(hex);
        }
        this.#attackers = [];
        this.#defenders = [];
        this.#combat = null;
        this.#updateLeftPanel();
    }
}
