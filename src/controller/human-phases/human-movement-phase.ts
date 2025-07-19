import { joinIterables, sortNumber, xdialogConfirm } from "../../utils.js";

import { Hex } from "../../model/mapsheet.js";
import { Partnership } from "../../model/partnership.js";
import { Countries } from "../../model/countries.js";
import { AirUnit, AliveUnit, Armor, Carrier, LandUnit, NavalUnit, Unit } from "../../model/units.js";
import { Phase } from "../../model/phase.js";

import HexMarker from "../../view/markers/hex-marker.js";
import InfoBubble from "../../view/info/info-bubble.js";
import LeftPanel from "../../view/left-panel.js";
import MoveUnitListener from "../../view/markers/move-unit-listener.js";
import UnitMarker from "../../view/markers/unit-marker.js";

export default class HumanMovementPhase {
    passedHexes = new Map<Unit, Array<Hex>>();

    readonly partnership: Partnership;

    readonly #opponentTurn: boolean;
    readonly #initiallyBasedUnits: ReadonlySet<Unit>;
    readonly #unbasedAirUnitBox = document.createElement("div");
    readonly #initiallyEmbarkedUnits: ReadonlyMap<AliveUnit & Unit, ReadonlySet<AliveUnit & Unit>>;

    protected bubbleHoveredOver: boolean = false;

    #landingBubble: Tippy.Tippy | null = null;
    #embarkingBubble: Tippy.Tippy | null = null;
    #unitToBeEmbarkedOn: (AliveUnit & Unit) | null = null;
    #moveUnitListeners = new Map<UnitMarker, MoveUnitListener>();
    #selectedUnits: Array<AliveUnit & Unit> = [];

    /**
     * Constructs a HumanMovementPhase object. Does not run it, use run() for that.
     *
     * @param partnership   The partnership that the human player is playing as.
     */
    constructor(partnership: Partnership){
        this.partnership = partnership;
        this.#opponentTurn = (this.partnership === Partnership.Allies && Phase.current === Phase.AxisSecondMovement) || (this.partnership === Partnership.Axis && Phase.current === Phase.AlliedSecondMovement);
        this.#initiallyBasedUnits = new Set(this.partnership.units().filter(it => (it instanceof AirUnit && it.based) || (it instanceof NavalUnit && it.inPort)));
        this.#initiallyEmbarkedUnits = new Map(
            this.partnership.units()
            .filter(it => it.embarkedUnits().size > 0)
            .map(it => [it, new Set(it.embarkedUnits())])
        );
    }

    /**
     * Runs the movement phase. Returns when the movement phase is finished.
     *
     * @param nextPhase The next phase to display on the Next button.
     */
    async run(nextPhase: string): Promise<void> {
        switch(Phase.current){
        case Phase.AxisFirstMovement:
        case Phase.AlliedFirstMovement:
            LeftPanel.appendParagraph("During this phase, air units may move up to their full movement allowance, but if they don't end this phase based, movement points used during this phase can't be used during the second movement phase. If they can't reach a friendly base with the remaining movement points during the second movement phase they will be eliminated.");
            LeftPanel.appendParagraph("Land units may move their full movement allowance. Armor units that have done a successful overrun may ignore enemy control zones when moving.");
            LeftPanel.appendParagraph("Naval units may move their full movement allowance.");
            break;
        case Phase.AxisSecondMovement:
        case Phase.AlliedSecondMovement:
            LeftPanel.appendParagraph("During this phase, unbased air units may use any movement points that they haven't used during your first movement phase. Based air units may move their full movement allowance regardless of whether they have moved previously this turn. Any air unit that does not end this movement phase on a friendly base will be eliminated.");
            if([...this.#unbasedAirUnits()].length > 0){
                LeftPanel.appendBox("Unbased air units", ["These units will be eliminated if they don't return to a base.", this.#unbasedAirUnitBox]);
                this.#updateUnbasedAirUnits();
            }
            if(!this.#opponentTurn){
                LeftPanel.appendParagraph("Land units that have not moved during the first movement phase or attacked this turn may either move their full movement allowance or move by rail. Armor units that attacked during the combat phase may move their full movement allowance regardless of whether they have moved previously this turn.");
                LeftPanel.appendParagraph("Naval units may move their full movement allowance regardless of whether they have moved or attacked previously this turn.");
            }
            break;
        case Phase.AxisInterception:
        case Phase.AlliedInterception:
            break;
        default:
            throw new Error("The current phase is not a movement phase.");
        }

        for(let unit of this.partnership.units()){
            const unitMarker = UnitMarker.get(unit);
            const listener = unitMarker.createMoveUnitListener(true);
            this.#initializeMoveUnitListener(unit, listener);
            this.#moveUnitListeners.set(unitMarker, listener);
        }
        InfoBubble.onshowembarkedunit = (embarkedUnit: Unit, copyImage: HTMLElement | SVGElement) => {
            const listener = new MoveUnitListener(embarkedUnit, copyImage, true);
            this.#initializeMoveUnitListener(embarkedUnit as AliveUnit & Unit, listener);
        };

        const secondMovement = Phase.current === Phase.AxisSecondMovement || Phase.current === Phase.AlliedSecondMovement;
        await LeftPanel.waitForNextButtonPressed(nextPhase, () => {
            if(secondMovement){
                if([...this.#unbasedAirUnits()].length > 0){
                    return xdialogConfirm("Lose unbased air units?", "You still have unbased air units. If they don't return to a friendly base, they will be eliminated.<br/><br/>Do you really want to continue?");
                }
                else{
                    return true;
                }
            }
            else{
                return true;
            }
        });

        //Gain control of hexes
        for(let [unit, passedHexes] of this.passedHexes){
            if(unit instanceof LandUnit){
                for(let hex of passedHexes){
                    hex.setController(unit.owner, false);
                    HexMarker.updateMarkers(hex);
                    for(let otherUnit of hex.units()){
                        UnitMarker.get(otherUnit).update();
                    }
                }
            }
            else if(unit instanceof AirUnit){
                if(unit.based){
                    unit.usedMovementPoints = 0;
                }
                else{
                    unit.usedMovementPoints = passedHexes.length - 1;
                }
            }
        }
        Countries.china.updateController();

        //Clean up listeners
        for(let listener of this.#moveUnitListeners.values()){
            listener.delete();
        }
        InfoBubble.onshowembarkedunit = null;

        //Eliminate unbased air units after the second movement phase
        if(secondMovement){
            for(let unit of this.#unbasedAirUnits()){
                unit.die();
                UnitMarker.get(unit).update();
            }
            for(let unit of this.partnership.airUnits().filter(it => !it.based)){
                unit.based = true;
                unit.usedMovementPoints = 0;
                UnitMarker.get(unit).update();
            }
        }
    }

    /**
     * Initializes a MoveUnitListener so that it move the unit.
     *
     * @param unit      The unit associated to the listener.
     * @param listener  The listener.
     */
    #initializeMoveUnitListener(unit: AliveUnit & Unit, listener: MoveUnitListener): void {
        listener.ondragstart = (event: Event) => {
            const canMove = this.unitCanMove(unit);
            if(canMove){
                this.#selectedUnits.push(unit);
                if(event instanceof MouseEvent && event.ctrlKey){
                    let offset = 0;
                    for(let otherUnit of unit.hex().units().filter(it => it !== unit && it.sameBasicType(unit) && this.unitCanMove(unit)).take(4)){
                        offset += 5;
                        this.#selectedUnits.push(otherUnit);
                        this.#moveUnitListeners.get(UnitMarker.get(otherUnit))!!.simulateDragStart(event, offset);
                    }
                }
            }
            return canMove;
        };
        listener.ondragmove = (hex) => {
            if(!this.bubbleHoveredOver && this.#unitToBeEmbarkedOn === null){
                this.#onUnitMove(this.#selectedUnits, hex);
            }
        };
        listener.ondragfinished = () => {
            this.#onUnitDrop(this.#selectedUnits);
            this.#selectedUnits = [];
        };
        listener.onunitbubblecreate = (hoveredUnit, tippy) => {
            if(unit instanceof NavalUnit || hoveredUnit instanceof LandUnit || (unit instanceof AirUnit && hoveredUnit instanceof AirUnit)){
                //If it's obviously not possible to embark, show no bubble at all. Only do this when it's obvious though, otherwise it's easy to for example try to embark onto a destroyer and not understand why the bubble isn't showing.
                return null;
            }
            const canEmbark = unit.canEmbarkOnto(hoveredUnit);
            const hasCapacity = !hoveredUnit.embarkedUnits().values().some(it => it !== unit);
            let text: string;
            if(!hasCapacity){
                text = "Embarking capacity reached";
            }
            else if(canEmbark){
                text = "Embark onto this unit";
            }
            else if((hoveredUnit instanceof NavalUnit || hoveredUnit instanceof AirUnit) && hoveredUnit.damaged()){
                text = "Can't embark onto damaged units";
            }
            else{
                text = "Can't embark onto this type of unit";
            }
            if(canEmbark && hasCapacity){
                listener.onunitbubblemouseover = () => {
                    this.#unitToBeEmbarkedOn = hoveredUnit as AliveUnit & Unit;
                    tippy.popper.style.setProperty("--background-color-light", "#99d1ff");
                };
                listener.onunitbubblemouseout = () => {
                    this.#unitToBeEmbarkedOn = null;
                    tippy.popper.style.removeProperty("--background-color-light");
                };
            }
            else{
                tippy.popper.style.setProperty("--background-color-light", "#cccccc");
            }
            this.#embarkingBubble = tippy;
            return `<img class="inline" src="images/inside.svg"/> ${text}`;
        };
    }

    /**
     * Gets the human player's unbased air units.
     *
     * @returns The human player's unbased air units.
     */
    #unbasedAirUnits(): IteratorObject<AliveUnit & AirUnit> {
        return this.partnership.airUnits().filter(airUnit =>
            !airUnit.based
            && (
                airUnit.hex().controller()?.partnership() !== this.partnership
                || airUnit.hex().remainingAirbaseCapacity() < [...airUnit.hex().airUnits().filter(it => it.owner.partnership() === this.partnership && !it.based)].length
            )
        );
    }

    /**
     * Updates the unbased air unit box with the unbased air units.
     */
    #updateUnbasedAirUnits(): void {
        this.#unbasedAirUnitBox.replaceChildren();
        for(let unit of this.#unbasedAirUnits()){
            this.#unbasedAirUnitBox.appendChild(UnitMarker.get(unit).createCopyImage(true));
        }
    }

    /**
     * Removes loops from a given array of passed hexes so that a unit doesn't pass the same hex twice.
     *
     * @param passedHexes   The array to remove the loops from.
     *
     * @returns A reference to the mutated array.
     */
    #removeLoopsFromPassedHexes(passedHexes: Array<Hex>): Array<Hex> {
        const lastIndex = passedHexes.findIndex((it, i) => it === passedHexes.at(-1) || passedHexes.lastIndexOf(it) !== i);
        if(lastIndex !== -1){
            passedHexes.length = lastIndex + 1;
        }
        return passedHexes;
    }

    /**
     * Checks if a unit can move during this phase, and shows an error message if it can't.
     *
     * @param unit  The unit to be dragged.
     *
     * @returns True if the unit can be moved, false otherwise.
     */
    protected unitCanMove(unit: AliveUnit & Unit): boolean {
        const embarkedOn = unit.embarkedOn();
        const passedHexes = this.passedHexes.get(unit);
        if(unit.owner.partnership() !== this.partnership){
            Toastify({text: "You can only move your own units."}).showToast();
            return false;
        }
        else if(this.#opponentTurn && (!(unit instanceof AirUnit) || unit.based)){
            Toastify({text: "You can only return unbased air units to their bases during this phase."}).showToast()
            return false;
        }
        else if(unit instanceof AirUnit && unit.hex().airUnitsGrounded()){
            Toastify({text: "Air units in this weather zone are grounded."}).showToast()
            return false;
        }
        else if(unit instanceof LandUnit && unit.hasMoved && (Phase.current === Phase.AxisSecondMovement || Phase.current === Phase.AlliedSecondMovement)){
            Toastify({text: "You can't move land units that have moved during the first movement phase."}).showToast()
            return false;
        }
        else if(embarkedOn instanceof AirUnit && !embarkedOn.based){
            Toastify({text: "You can only disembark units from air units if the air unit is based."}).showToast();
            return false;
        }
        else if(embarkedOn !== null && unit instanceof LandUnit && !embarkedOn.hex().isLand()){
            Toastify({text: "You can't disembark land units in all sea hexes."}).showToast();
            return false;
        }
        else if(embarkedOn !== null && unit instanceof LandUnit && embarkedOn.hex().controller()?.partnership() !== this.partnership){
            Toastify({text: "To disembark land units into enemy controlled hexes, you must do an amphibious assault during the amphibious and paradrop phase."}).showToast();
            return false;
        }
        else if(Phase.current !== Phase.AxisInterception && Phase.current !== Phase.AlliedInterception && embarkedOn !== null && passedHexes !== undefined && passedHexes.length > 1 && passedHexes.at(-1) !== embarkedOn.hex()){
            Toastify({text: "You can't embark and disembark the same unit during the same phase."}).showToast();
            return false;
        }
        else if(unit.hasAttacked && unit instanceof LandUnit && !(unit instanceof Armor)){
            Toastify({text: "Units that have attacked can't move."}).showToast();
            return false;
        }
        else if(passedHexes !== undefined && unit.embarkedUnits().values().some(it =>
            !this.#initiallyEmbarkedUnits.get(unit)?.has(it)
            && (this.passedHexes.get(it)?.at(-1) ?? passedHexes[0]) !== passedHexes[0]
        )){
            Toastify({text: "This unit can't move any more this turn since a unit embarked onto it after it has started moving."}).showToast();
            return false;
        }
        else if(passedHexes !== undefined && this.#initiallyEmbarkedUnits.get(unit)?.values().some(it =>
            it.embarkedOn() !== unit
            && (this.passedHexes.get(it)?.[0] ?? this.passedHexes.get(it.embarkedOn())?.[0] ?? it.hex()) !== passedHexes[0]
        )){
            Toastify({text: "This unit can't move any more this turn since a unit disembarked from it after it has started moving."}).showToast();
            return false;
        }
        else{
            return true;
        }
    }

    /**
     * Checks if a unit can be dropped onto the given hex. Shows an error message if it can't, and shows a confirmation dialog if it can but might be a bad idea.
     *
     * @param unit  The unit to drop.
     * @param hex   The hex to drop it onto.
     *
     * @returns True if it can be dropped, false if it can't. If it can but is a bad idea, returns the result of the confirmation dialog.
     */
    protected async unitsCanBeDroppedHere(units: ReadonlyArray<AliveUnit & Unit>, hex: Hex): Promise<boolean> {
        if(this.#unitToBeEmbarkedOn === null && units.some(it => it.hex() !== hex && !it.canEnterHexWithinStackingLimits(hex, this.bubbleHoveredOver, joinIterables(hex.units(), units.values())))){
            Toastify({text: "This unit can't enter this hex because of stacking limits."}).showToast();
            return false;
        }
        else if(units.some(it => it instanceof AirUnit) && !this.bubbleHoveredOver && this.#unitToBeEmbarkedOn === null && (Phase.current === Phase.AxisSecondMovement || Phase.current === Phase.AlliedSecondMovement)){
            Toastify({text: "Air units must finish this phase based."}).showToast();
            return false;
        }
        else{
            return units.every(it =>
                Phase.current === Phase.AxisSecondMovement || Phase.current === Phase.AlliedSecondMovement
                || !(it instanceof AirUnit)
                || this.bubbleHoveredOver
                || this.passedHexes.get(it)!!.length - 1 <= it.movementAllowance / 2
            ) || await xdialogConfirm("Move air unit more than half its movement allowance?", "If you move your air unit here, it won't be able to make it back to its original airbase at the end of this offensive. If it doesn't make it to any other friendly airbase either, it will be eliminated.<br/><br/>Do you really want to use more than half its movement points in this phase?");
        }
    }

    /**
     * Function to be called when a unit is moved over a hex without being dropped.
     *
     * @param units The units being moved.
     * @param hex   The hex it's moved over.
     */
    #onUnitMove(units: ReadonlyArray<AliveUnit & Unit>, hex: Hex | null): void {
        if(hex === null || (units.length === 1 && UnitMarker.expandedStack()?.some(it => units[0].canEmbarkOnto(it)))){
            return;
        }

        //Set the passed hexes if it doesn't exist yet
        let isNewHex = false;
        for(let unit of units){
            let passedHexes = this.passedHexes.get(unit);
            isNewHex ||= hex !== passedHexes?.at(-1);
            if(passedHexes === undefined){
                passedHexes = [unit.hex()];
                this.passedHexes.set(unit, passedHexes);
            }
        }

        //Uncolor previous hexes in case hexes were removed
        this.clearPassedHexesColors(units);

        //Check if rail movement is needed and add the current hex
        if(units.every(it => it.validateMovement(this.#removeLoopsFromPassedHexes([...this.passedHexes.get(it)!!, hex]), false))){
            for(let unit of units){
                this.passedHexes.get(unit)!!.push(hex);
                if(unit instanceof LandUnit){
                    unit.movingByRail = false;
                }
            }
        }
        else if(units.every(it => it instanceof LandUnit) && units.every(it => it instanceof LandUnit) && units.every(it => it.canUseRail(units) && it.validateMovement(this.#removeLoopsFromPassedHexes([...this.passedHexes.get(it)!!, hex]), true))){
            for(let unit of units){
                this.passedHexes.get(unit)!!.push(hex);
                unit.movingByRail = true;
            }
        }

        //Remove loops
        for(let unit of units){
            this.#removeLoopsFromPassedHexes(this.passedHexes.get(unit)!!);
        }

        //Color hexes
        this.colorHexes(units);

        //Show bubble for placing unit in port/airbase
        if(isNewHex){
            this.#landingBubble?.destroy();
            this.#landingBubble = null;
            this.#embarkingBubble?.destroy();
            this.#embarkingBubble = null;
            this.bubbleHoveredOver = false;
            if(((units.every(it => it instanceof AirUnit) && hex.airbaseCapacity() > 0) || (units.every(it => it instanceof NavalUnit) && hex.isPort())) && hex.controller()?.partnership() === this.partnership){
                const canEnterWithinStackingLimits = units.every(unit =>
                    unit.canEnterHexWithinStackingLimits(hex, true, joinIterables(units, hex.units()).filter(it => it !== unit))
                );
                const text = canEnterWithinStackingLimits
                    ? units.every(it => it instanceof AirUnit) ? "Base air unit here" : "Place naval unit in port"
                    : units.every(it => it instanceof AirUnit) ? "Airbase capacity reached" : "Port capacity reached";
                const imageFilename = units.every(it => it instanceof AirUnit) ? "landing-plane.svg" : "port.svg";
                this.#landingBubble = InfoBubble.hexTippy(hex, {
                    content: `<img class="inline" src="images/${imageFilename}"/> ${text}`
                });
                if(canEnterWithinStackingLimits){
                    this.#landingBubble.popper.addEventListener("mouseover", () => {
                        this.bubbleHoveredOver = true;
                        this.#landingBubble?.popper.style.setProperty("--background-color-light", "#99d1ff");
                    });
                    this.#landingBubble.popper.addEventListener("mouseout", () => {
                        this.bubbleHoveredOver = false;
                        this.#landingBubble?.popper.style.removeProperty("--background-color-light");
                    });
                }
                else{
                    this.#landingBubble.popper.style.setProperty("--background-color-light", "#cccccc");
                }
            }
        }
    }

    /**
     * Function to be called when a unit is dropped on a hex.
     *
     * @param units The units being dropped.
     */
    async #onUnitDrop(units: ReadonlyArray<AliveUnit & Unit>): Promise<void> {
        const hex = this.passedHexes.get(units[0])?.at(-1);
        if(hex === undefined && this.#unitToBeEmbarkedOn === null){
            return;
        }

        //Land air units in second movement phase
        if(
            units.every(it => it instanceof AirUnit)
            && (Phase.current === Phase.AxisSecondMovement || Phase.current === Phase.AlliedSecondMovement)
            && hex?.controller()?.partnership() === this.partnership
            && hex?.airbaseCapacity() > 0
        ){
            this.bubbleHoveredOver = true;
        }

        //Check if the unit can be dropped here
        const canBeDropped = hex === undefined || await this.unitsCanBeDroppedHere(units, this.#unitToBeEmbarkedOn?.hex() ?? hex);

        //Clear colors
        this.clearPassedHexesColors(units);
        this.#landingBubble?.destroy();
        this.#landingBubble = null;
        this.#embarkingBubble?.destroy();
        this.#embarkingBubble = null;

        if(!canBeDropped){
            this.bubbleHoveredOver = false;
            this.#unitToBeEmbarkedOn = null;
            return;
        }

        //Set hex
        for(let unit of units){
            const passedHexes = this.passedHexes.get(unit);
            const oldEmbarkedOn = unit.embarkedOn();
            if(hex !== undefined){
                unit.setHex(hex);
            }
            if(unit instanceof AirUnit){
                unit.based = this.bubbleHoveredOver;
            }
            else if(unit instanceof NavalUnit){
                unit.inPort = this.bubbleHoveredOver;
            }
            else if(unit instanceof LandUnit && (Phase.current === Phase.AxisFirstMovement || Phase.current === Phase.AlliedFirstMovement)){
                unit.hasMoved = passedHexes !== undefined && passedHexes.length > 1;
            }

            //Update unit markers
            if(this.#unitToBeEmbarkedOn !== null){
                unit.embarkOnto(this.#unitToBeEmbarkedOn);
                if(hex !== this.#unitToBeEmbarkedOn.hex() && passedHexes !== undefined){
                    passedHexes.push(this.#unitToBeEmbarkedOn.hex());
                    this.#removeLoopsFromPassedHexes(passedHexes);
                    if(passedHexes.length === 1 && this.#initiallyEmbarkedUnits.get(this.#unitToBeEmbarkedOn)?.has(unit)){
                        this.passedHexes.delete(unit);
                    }
                }
                UnitMarker.get(this.#unitToBeEmbarkedOn).update();
            }
            if(oldEmbarkedOn !== null){
                UnitMarker.get(oldEmbarkedOn).update();
            }
            const unitMarker = UnitMarker.get(unit);
            unitMarker.update();
            if(!this.#moveUnitListeners.has(unitMarker)){
                const listener = unitMarker.createMoveUnitListener(true);
                this.#initializeMoveUnitListener(unit, listener);
                this.#moveUnitListeners.set(unitMarker, listener);
            }
        }
        this.#updateUnbasedAirUnits();
        this.bubbleHoveredOver = false;
        this.#unitToBeEmbarkedOn = null;

        //If the unit hasn't moved, clear the passed hexes to avoid problems with units disembarking, embarking back onto the same unit again, and the transport unit moving
        for(let unit of units){
            if(this.passedHexes.get(unit)?.length === 1 && this.#initiallyBasedUnits.has(unit) === this.bubbleHoveredOver){
                this.passedHexes.delete(unit);
            }
        }
    }

    /**
     * Colors the hexes that the given units have passed.
     *
     * @param units The units that are moving.
     */
    protected colorHexes(units: ReadonlyArray<AliveUnit & Unit>): void {
        //Color available airbases purple
        const secondMovement = Phase.current === Phase.AxisSecondMovement || Phase.current === Phase.AlliedSecondMovement;
        if(secondMovement && units.every(it => it instanceof AirUnit)){
            for(let hex of this.#possibleAirbases()){
                if(units.some(it => hex.distanceFromHex(it.hex()) > it.movementAllowance - it.usedMovementPoints)){
                    continue;
                }
                if(
                    (
                        hex.controller()?.partnership() === this.partnership
                        && units.every(it => it.canEnterHexWithinStackingLimits(hex, true, joinIterables(hex.units(), units)))
                    )
                    || units.every(airUnit =>
                        [...hex.navalUnits().filter(
                            navalUnit => airUnit.canEmbarkOnto(navalUnit) && navalUnit.embarkedUnits().size === 0
                        )].length >= units.length
                    )
                ){
                    HexMarker.colorHex(hex, "purple");
                }
            }
        }

        //Color passed hexes yellow
        for(let hex of units.flatMap(it => this.passedHexes.get(it)!!)){
            HexMarker.colorHex(hex, "yellow");
        }

        //Color air units' half way hexes orange
        const slowestAirUnit: AirUnit | undefined = units
            .filter(it => it instanceof AirUnit)
            .sort((a, b) => sortNumber(a, b, it => it.movementAllowance))[0];
        if(slowestAirUnit !== undefined && !secondMovement){
            const halfwayHex = this.passedHexes.get(slowestAirUnit)!![Math.floor(slowestAirUnit.movementAllowance / 2)];
            if(halfwayHex !== undefined){
                HexMarker.colorHex(halfwayHex, "orange");
            }
        }

        //Color start hexes green
        for(let unit of units){
            HexMarker.colorHex(this.passedHexes.get(unit)!![0], "green");
        }

        //Color next possible hexes blue, or current hex red if there are no next possible hexes
        const lastHex = this.passedHexes.get(units[0])!!.at(-1)!!;
        const nextPossibleHexes = lastHex.adjacentHexes().filter(adjacentHex =>
            !units.flatMap(it => this.passedHexes.get(it)).includes(adjacentHex)
            && units.every(unit =>
                unit.validateMovement([...this.passedHexes.get(unit)!!, adjacentHex], unit instanceof NavalUnit)
                || (
                    unit instanceof LandUnit
                    && unit.canUseRail()
                    && unit.validateMovement([...this.passedHexes.get(unit)!!, adjacentHex], true)
                )
            )
        );
        if(nextPossibleHexes.length === 0){
            HexMarker.colorHex(lastHex, "red");
        }
        else for(let nextPossibleHex of nextPossibleHexes){
            HexMarker.colorHex(nextPossibleHex, "blue");
        }
    }

    /**
     * Uncolors all the hexes that the given units have passed.
     *
     * @param units The units whose passed hexes to clear.
     */
    protected clearPassedHexesColors(units: ReadonlyArray<AliveUnit & Unit>): void {
        for(let unit of units){
            for(let hex of this.passedHexes.get(unit)?.flatMap(it => [it, ...it.adjacentHexes()]) ?? []){
                HexMarker.uncolorHex(hex);
            }
        }
        for(let hex of this.#possibleAirbases()){
            HexMarker.uncolorHex(hex);
        }
    }

    /**
     * Gets all hexes that could be used as airbases by this partnership.
     *
     * @returns All hexes that could be used as airbases by this partnership. Not all hexes are guaranteed to be useable airbases, but all hexes not returned are guaranteed not to be useable airbases.
     */
    #possibleAirbases(): Generator<Hex> {
        return joinIterables(
            Hex.allCityHexes,
            Hex.allResourceHexes,
            this.partnership.navalUnits().filter(it => it instanceof Carrier).map(it => it.hex())
        );
    }
}
