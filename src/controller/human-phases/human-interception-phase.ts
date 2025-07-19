import lodash from "https://cdn.jsdelivr.net/npm/lodash@4.17.21/+esm";
import HumanMovementPhase from "./human-movement-phase.js";

import { Hex } from "../../model/mapsheet.js";
import { Partnership } from "../../model/partnership.js";
import { AirUnit, AliveUnit, LandUnit, NavalUnit, Submarine, Unit } from "../../model/units.js";

import HexMarker from "../../view/markers/hex-marker.js";
import UnitMarker from "../../view/markers/unit-marker.js";
import LeftPanel from "../../view/left-panel.js";

/**
 * The movement part of the interception phase.
 */
export default class HumanInterceptionPhase extends HumanMovementPhase {
    readonly #interceptions: Array<[AirUnit, AirUnit | NavalUnit]>;
    readonly #previousPassedHexes: ReadonlyMap<Unit, ReadonlyArray<Hex>>;

    #interceptedUnit: (AliveUnit & (AirUnit | NavalUnit)) | null = null;

    /**
     * Constructs a HumanInterceptionPhase object. Does not run it, use run() for that.
     *
     * @param partnership           The partnership that the human player is playing as.
     * @param previousPassedHexes   The passed hexes from units that moved during the movement phase or a previous part of the interception phase.
     * @param interceptions         A reference to an array containing the existing interceptions. Will be mutated as interceptions are added and removed.
     */
    constructor(partnership: Partnership, previousPassedHexes: ReadonlyMap<Unit, ReadonlyArray<Hex>>, interceptions: Array<[AirUnit, AirUnit | NavalUnit]>){
        super(partnership);
        this.#previousPassedHexes = previousPassedHexes;
        this.#interceptions = interceptions;
    }

    override async run(nextPhase: string): Promise<void> {
        if(this.#previousPassedHexes.keys().every(it => it.owner.partnership() === this.partnership || it instanceof LandUnit)){
            LeftPanel.clear();
            LeftPanel.appendParagraph("There are no units to intercept. Click Next to continue.");
            await LeftPanel.waitForNextButtonPressed("To amphibious and paradrop phase");
            return;
        }

        for(let unit of this.partnership.opponent().units()){
            UnitMarker.get(unit).onclick = () => this.#interceptEnemyUnit(unit);
        }
        this.#updateLeftPanel();

        await super.run(nextPhase);

        for(let hex of this.#previousPassedHexes.get(this.#interceptedUnit!!) ?? []){
            HexMarker.uncolorHex(hex);
        }
    }

    protected override unitCanMove(unit: AliveUnit & Unit): boolean {
        if(!(unit instanceof AirUnit)){
            Toastify({text: "Only air units can intercept other units."}).showToast();
            return false;
        }
        else if(this.#previousPassedHexes.has(unit)){
            Toastify({text: "This unit is already performing another mission."}).showToast();
            return false;
        }
        else if(this.#interceptedUnit === null && unit.based){
            Toastify({text: "You must select an enemy unit to intercept."}).showToast();
            return false;
        }
        else if(unit.outOfSupply()){
            Toastify({text: "Units that are out of supply can't attack."}).showToast();
            return false;
        }
        else if(!unit.canAttack(this.#interceptedUnit)){
            if(this.#interceptedUnit instanceof AirUnit){
                Toastify({text: "Only fighters can intercept air units."}).showToast();
            }
            else{
                Toastify({text: "Only bombers can intercept naval units."}).showToast();
            }
            return false;
        }
        else{
            return super.unitCanMove(unit);
        }
    }

    protected override async unitsCanBeDroppedHere(units: ReadonlyArray<AliveUnit & Unit>, hex: Hex): Promise<boolean> {
        const interceptions: ReadonlyArray<[AirUnit, AirUnit | NavalUnit]> | null =
            (units.every(it => it instanceof AirUnit) && this.#interceptedUnit !== null && !this.bubbleHoveredOver)
            ? units.map(it => [it, this.#interceptedUnit!!]) : null;
        if(interceptions === null && !this.bubbleHoveredOver){
            Toastify({text: "This unit must either intercept an enemy unit or move back to its base."}).showToast();
            return false;
        }
        const interceptedUnitPassedHexes = this.#interceptedUnit === null ? undefined : this.#passedHexesOpenForInterception(this.#interceptedUnit);
        if(interceptedUnitPassedHexes !== undefined && !interceptedUnitPassedHexes.includes(hex)){
            Toastify({text: "To intercept the selected enemy unit, move your unit onto a hex that it passed."}).showToast();
            return false;
        }
        else if(!await super.unitsCanBeDroppedHere(units, hex)){
            return false;
        }
        else{
            //Un-intercept any old intercepted unit
            const oldInterceptedUnit = lodash.remove(this.#interceptions, it => units.includes(it[0] as AliveUnit & Unit))[0]?.[1];
            if(oldInterceptedUnit !== undefined){
                const nextInterceptor = this.#interceptions.findLast(it => it[1] === oldInterceptedUnit)?.[0];
                const hexToMoveBackTo = (
                    //`!!` simply ignores compile time type checking if nextInterceptor is undefined, and that's what we want here because if nextInterceptor is undefined we want get() to return undefined
                    this.passedHexes.get(nextInterceptor!!)
                    ?? this.#previousPassedHexes.get(nextInterceptor!!)
                    ?? this.#previousPassedHexes.get(oldInterceptedUnit)!!
                ).at(-1)!!;
                oldInterceptedUnit.setHex(hexToMoveBackTo);
                UnitMarker.get(oldInterceptedUnit).update();
            }

            //Uncolor the intercepted unit's passed hexes
            for(let hex of interceptedUnitPassedHexes ?? []){
                HexMarker.uncolorHex(hex);
            }

            //Intercept the new unit
            if(interceptions !== null && this.#interceptedUnit !== null){
                this.#interceptions.push(...interceptions);
                this.#interceptedUnit.setHex(hex);
                UnitMarker.get(this.#interceptedUnit).update();
                UnitMarker.get(this.#interceptedUnit).deselect();
                this.#interceptedUnit = null;
            }

            //Update the left panel
            this.#updateLeftPanel();

            return true;
        }
    }

    protected override colorHexes(units: ReadonlyArray<AliveUnit & Unit>): void {
        super.colorHexes(units);
        const lastHex = this.passedHexes.get(units[0])!!.at(-1)!!;
        if(this.#passedHexesOpenForInterception(this.#interceptedUnit!!)?.includes(lastHex)){
            HexMarker.colorHex(lastHex, "purple");
        }
    }

    protected override clearPassedHexesColors(units: ReadonlyArray<AliveUnit & Unit>): void {
        super.clearPassedHexesColors(units);
        for(let hex of this.#passedHexesOpenForInterception(this.#interceptedUnit!!) ?? []){
            HexMarker.colorHex(hex, "#ffff55");
        }
    }

    /**
     * Attempts to select an enemy unit for interception.
     *
     * @param unit  The unit to intercept.
     */
    #interceptEnemyUnit(unit: AliveUnit & Unit): void {
        const passedHexes = this.#passedHexesOpenForInterception(unit);
        if(!(unit instanceof AirUnit) && !(unit instanceof NavalUnit)){
            Toastify({text: "You can't intercept land units."}).showToast();
        }
        else if(unit instanceof Submarine){
            Toastify({text: "You can't intercept submarines."}).showToast();
        }
        else if(passedHexes === undefined){
            Toastify({text: "You can't intercept units that haven't moved."}).showToast();
        }
        else if(unit === this.#interceptedUnit){
            for(let hex of passedHexes){
                HexMarker.uncolorHex(hex);
            }
            UnitMarker.get(unit).deselect();
            this.#interceptedUnit = null;
        }
        else{
            for(let hex of this.#previousPassedHexes.get(this.#interceptedUnit!!) ?? []){
                HexMarker.uncolorHex(hex);
            }
            for(let hex of passedHexes){
                HexMarker.colorHex(hex, "#ffff55");
            }
            if(this.#interceptedUnit !== null){
                UnitMarker.get(this.#interceptedUnit).deselect();
            }
            UnitMarker.get(unit).select();
            this.#interceptedUnit = unit;
        }
    }

    /**
     * Gets the passed hexes where the given unit can be intercepted, i.e. the passed hexes up to and including its current hex.
     *
     * @param enemyUnit The unit to intercept.
     *
     * @returns The hexes where it can be intercepted, or undefined if it hasn't moved.
     */
    #passedHexesOpenForInterception(enemyUnit: AliveUnit & Unit): Array<Hex> | undefined {
        const passedHexes = this.#previousPassedHexes.get(enemyUnit);
        return passedHexes?.slice(0, passedHexes.indexOf(enemyUnit.hex()) + 1);
    }

    /**
     * Updates the left panel to show which units have been intercepted.
     */
    #updateLeftPanel(): void {
        LeftPanel.clear();
        LeftPanel.appendParagraph("The following units have been intercepted so far:");
        for(let [attacker, defender] of this.#interceptions){
            const interception = document.createElement("p");
            interception.appendChild(UnitMarker.get(attacker).createCopyImage(true));
            interception.appendChild(document.createTextNode("\u2794 "));
            interception.appendChild(UnitMarker.get(defender).createCopyImage(true));
            LeftPanel.appendElement(interception);
        }
        LeftPanel.appendParagraph("The following enemy units haven't been intercepted yet:");
        for(let enemyUnit of this.#previousPassedHexes.keys().filter(
            unit => unit.owner.partnership() !== this.partnership
            && !(unit instanceof LandUnit)
            && !(unit instanceof Submarine)
            && this.#previousPassedHexes.get(unit)!!.some(hex => !hex.airUnitsGrounded())
        )){
            if(!this.#interceptions.some(it => it[1] === enemyUnit)){
                LeftPanel.appendElement(UnitMarker.get(enemyUnit).createCopyImage(true));
            }
        }
        LeftPanel.appendParagraph("To intercept an enemy air or naval unit, click on the enemy unit to intercept, then drag a friendly air unit to a hex that it's passed.");
    }
}
