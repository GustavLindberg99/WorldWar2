import { joinIterables, refreshUI, sortNumber } from "../../utils.js";

import { Hex, SupplyLines } from "../../model/mapsheet.js";
import { Partnership } from "../../model/partnership.js";
import { Countries, Country } from "../../model/countries.js";
import { AirUnit, AliveUnit, Armor, Convoy, Infantry, LandUnit, NavalUnit, Submarine, SupplyUnit, TransportShip, Unit } from "../../model/units.js";
import { Phase } from "../../model/phase.js";

import HexMarker from "../../view/markers/hex-marker.js";
import LeftPanel from "../../view/left-panel.js";
import UnitMarker from "../../view/markers/unit-marker.js";

import Automovement from "./automovement.js";

export default class ComputerMovementPhase {
    passedHexes = new Map<AliveUnit & Unit, ReadonlyArray<Hex>>();
    #eliminatedAirUnits = new Set<AirUnit>();

    readonly #partnership: Partnership;
    readonly #secondMovement: boolean;

    /**
     * Constructs a ComputerMovementPhase object. Does not run it, use run() for that.
     *
     * @param partnership   The partnership that the computer player is playing as.
     */
    constructor(partnership: Partnership){
        this.#partnership = partnership;
        this.#secondMovement = Phase.current === Phase.AxisSecondMovement || Phase.current === Phase.AlliedSecondMovement;
    }

    /**
     * Runs the movement phase. Returns when the movement phase is finished.
     *
     * @param nextPhase The next phase to display on the Next button.
     */
    async run(nextPhase: string): Promise<void> {
        LeftPanel.clear();
        const nextButtonLockReason = "Your opponent is moving their units...";
        LeftPanel.appendParagraph(nextButtonLockReason);
        LeftPanel.addNextButtonLock(nextButtonLockReason);

        await this.#chooseMovements();

        let selectedUnit: (AliveUnit & Unit) | null = null;
        for(let unit of this.#partnership.units()){
            UnitMarker.get(unit).onclick = () => {
                //Will be overwritten below if the unit has moved
                Toastify({text: "This unit hasn't moved this turn."}).showToast();
            };
        }
        for(let [unit, passedHexes] of this.passedHexes){
            if(unit instanceof LandUnit){
                for(let hex of passedHexes){
                    hex.setController(unit.owner, false);
                    HexMarker.updateMarkers(hex);
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
            const unitMarker = UnitMarker.get(unit);
            unitMarker.onclick = () => {
                if(selectedUnit !== null){
                    UnitMarker.get(selectedUnit).deselect();
                    for(let hex of this.passedHexes.get(selectedUnit) ?? []){
                        HexMarker.uncolorHex(hex);
                    }
                }
                if(unit === selectedUnit){
                    unitMarker.deselect();
                    selectedUnit = null;
                }
                else{
                    unitMarker.select();
                    selectedUnit = unit;
                    for(let hex of passedHexes){
                        HexMarker.colorHex(hex, "yellow");
                    }
                    HexMarker.colorHex(passedHexes[0], "green");
                    HexMarker.colorHex(passedHexes.at(-1)!!, "red");
                }
            };
            unitMarker.update();
        }
        Countries.china.updateController();

        LeftPanel.releaseNextButtonLock(nextButtonLockReason);
        LeftPanel.clear();
        if(this.passedHexes.size === 0){
            LeftPanel.appendParagraph("Your opponent hasn't moved any units. Click Next to continue.");
        }
        else{
            LeftPanel.appendParagraph("Your opponent has moved their units. Click on a unit to see how it moved.");
        }
        if(this.#eliminatedAirUnits.size > 0){
            LeftPanel.appendParagraph("The following units haven't been able to return to their bases and have been eliminated:");
            const eliminatedUnitsContainer = document.createElement("div");
            for(let unit of this.#eliminatedAirUnits){
                eliminatedUnitsContainer.appendChild(UnitMarker.get(unit).createCopyImage(true));
            }
            LeftPanel.appendElement(eliminatedUnitsContainer);
        }
        await LeftPanel.waitForNextButtonPressed(nextPhase);

        if(selectedUnit !== null){
            for(let hex of this.passedHexes.get(selectedUnit) ?? []){
                HexMarker.uncolorHex(hex);
            }
        }
        for(let unit of this.#partnership.units()){
            UnitMarker.get(unit).onclick = null;
        }
    }

    /**
     * Chooses where to move each unit.
     *
     * The order in which he moves the units is important:
     *  - Land units must come before air units so that bombers can reliably determine which hexes can be attacked by land units.
     *  - Land units must come before naval units so that transport ships that transport land units don't move twice.
     */
    async #chooseMovements(): Promise<void> {
        const opponentTurn = (this.#partnership === Partnership.Allies && Phase.current === Phase.AxisSecondMovement) || (this.#partnership === Partnership.Axis && Phase.current === Phase.AlliedSecondMovement);

        let progress = 0;
        const landUnits: ReadonlyArray<AliveUnit & LandUnit> = (opponentTurn ? [] : [...this.#partnership.landUnits()])
            .sort((a, b) => sortNumber(b, a, it => it.embarkedOn() !== null));  //Embarked units should be first so that it's possible to disembark as many units as possible immediately
        const airUnits: ReadonlyArray<AliveUnit & AirUnit> = [...this.#partnership.airUnits()];
        const navalUnits: ReadonlyArray<AliveUnit & NavalUnit> = opponentTurn ? [] : [...this.#partnership.navalUnits()]
            .sort((a, b) => sortNumber(b, a, it => this.#shouldReturnToPort(it)));  //Return to port first so that we know if we need to move units away from the port to respect stacking limits
        LeftPanel.appendProgressBar(() => progress / (landUnits.length + airUnits.length + navalUnits.length));

        //Land units
        if(!opponentTurn){
            const japaneseSupplyLines: ReadonlySet<Hex> = this.#japaneseSupplyLines();
            let supplyUnitDestinations = new Set<Hex>();
            let amphibiousAssaultHexes = new Set<Hex>();
            for(let unit of landUnits){
                progress++;
                await refreshUI(1000);
                if(unit.hasMoved || (unit.hasAttacked && !(unit instanceof Armor))){
                    //If it can't move, do nothing
                    continue;
                }
                else if(japaneseSupplyLines.has(unit.hex()) && !unit.hex().landUnits().some(it => it !== unit)){
                    //If it's needed to maintain Japanese supply lines in China, don't move it
                    continue;
                }
                else if(unit instanceof SupplyUnit){
                    const [transportShip, supplyUnitMovement, transportShipMovement] = this.#moveLandUnitBySea(unit, destination =>
                        destination.landUnits().some(it => it.owner === unit.owner)
                        && !supplyUnitDestinations.has(destination)
                        && !SupplyLines.canTraceSupplyLine(destination, unit.owner)
                    );
                    if(transportShip !== null){
                        const destination = transportShipMovement.at(-1)!!;
                        supplyUnitDestinations.add(destination);
                        transportShip.setHex(destination);
                        if(supplyUnitMovement !== null){
                            unit.embarkOnto(transportShip);
                            this.passedHexes.set(unit, supplyUnitMovement);
                            unit.hasMoved = true;
                        }
                        this.passedHexes.set(transportShip, transportShipMovement);
                    }
                }
                else{
                    const movementToFrontLine = this.#moveLandUnitToSupply(unit) ?? this.#moveLandUnitToFrontLine(unit);
                    const [transportShip, movementToAmphibiousAssault, transportShipMovement] =
                        this.#secondMovement    //Don't prepare for amphibious assaults during the second movment phase
                        || movementToFrontLine?.at(-1)!!.adjacentLandHexes().values().flatMap(it => it.landUnits()).some(it => it.owner.partnership() !== this.#partnership)    //If the unit is occupied on the front line, don't send it to an amphibious assault for performance reasons
                        ? [null, null, null]
                        : this.#moveLandUnitBySea(unit, destination =>
                            (destination.isResourceHex || destination.city !== null)  //Don't bother doing an amphibious assault if there's nothing interesting
                            && destination.isCoastal()  //Not needed for it to work, but helps the algorithm take shorter paths which makes it more likely for it to find a destination
                            && [destination, ...destination.adjacentLandHexes()].every(it => it.controller()?.partnership() === this.#partnership.opponent())   //Don't do an amphibious assault if it's possible to get there through regular movement or combat
                            && destination.landUnits().reduce((a, b) => a + b.modifiedDefense(), 0) < unit.strength
                            && !amphibiousAssaultHexes.has(destination)
                        );
                    if(transportShip !== null && (movementToFrontLine === null || movementToFrontLine.at(-1)!!.adjacentLandHexes().values().flatMap(it => it.landUnits()).some(it => it.owner.partnership() !== this.#partnership))){
                        const destination = transportShipMovement.at(-1)!!;
                        amphibiousAssaultHexes.add(destination);
                        transportShip.setHex(destination);
                        unit.embarkOnto(transportShip);
                        if(movementToAmphibiousAssault !== null){
                            this.passedHexes.set(unit, movementToAmphibiousAssault);
                        }
                        this.passedHexes.set(transportShip, transportShipMovement);
                        unit.hasMoved = true;
                    }
                    else if(movementToFrontLine !== null){
                        unit.setHex(movementToFrontLine.at(-1)!!);
                        this.passedHexes.set(unit, movementToFrontLine);
                        unit.hasMoved = true;
                    }
                }
            }
        }

        //Air units
        for(let unit of airUnits){
            progress++;
            await refreshUI(1000);
            if(this.#secondMovement){
                if(!unit.based){
                    const passedHexes = this.#returnToBase(unit);
                    if(passedHexes === null){
                        unit.die();
                        this.#eliminatedAirUnits.add(unit);
                        UnitMarker.get(unit).update();
                    }
                    else{
                        unit.setHex(passedHexes.at(-1)!!);
                        const carrier = unit.carrierBased() ? unit.hex().navalUnits().find(it => unit.canEmbarkOnto(it) && it.embarkedUnits().size === 0) : undefined;
                        if(carrier !== undefined){
                            unit.embarkOnto(carrier);
                            UnitMarker.get(carrier).update();
                        }
                        unit.based = true;
                        this.passedHexes.set(unit, passedHexes);
                    }
                }
            }
            else if(unit.bomberStrength > 0 && unit.fighterStrength === 0){
                const passedHexes = this.#moveBomberToBombableHex(unit);
                if(passedHexes !== null){
                    unit.setHex(passedHexes.at(-1)!!);
                    this.passedHexes.set(unit, passedHexes);
                }
            }
        }

        //Naval units
        if(!opponentTurn){
            let movementFromHex = new Map<Hex, ReadonlyArray<Hex>>();
            let unitsToMove = new Set<AliveUnit & NavalUnit>();
            outerLoop:
            for(let unit of navalUnits){
                progress++;
                await refreshUI(1000);
                if(this.passedHexes.has(unit)){
                    continue;
                }
                if(this.#shouldReturnToPort(unit)){
                    //If this is run for a transport ship, it should always return to port, otherwise it will have been moved with the land units
                    let destinationCountry: Country | null = null;
                    if(unit instanceof Convoy){
                        if(unit.destination !== null){
                            destinationCountry = unit.destination;
                        }
                        else if(Countries.unitedStates.partnership() !== Partnership.Neutral){
                            destinationCountry = Countries.unitedStates;
                        }
                        else{
                            destinationCountry = Countries.canada;
                        }
                    }
                    else if(unit instanceof TransportShip){
                        destinationCountry = unit.owner;    //Empty transport ships should return to their home country to pick up new units
                    }
                    const passedHexes = this.#returnToPort(unit, destinationCountry);
                    if(passedHexes !== null){
                        const hex = passedHexes.at(-1)!!;
                        while(!unit.canEnterHexWithinStackingLimits(hex, hex.navalUnits().filter(it => !unitsToMove.has(it)))){
                            const unitToMove = hex.navalUnits().find(it => !(it instanceof Convoy) && !unitsToMove.has(it) && !this.passedHexes.has(it));
                            if(unitToMove === undefined){
                                continue outerLoop;
                            }
                            unitsToMove.add(unitToMove);
                        }
                        unit.setHex(hex);
                        this.passedHexes.set(unit, passedHexes);
                        continue;
                    }
                }
                else{
                    let passedHexes = movementFromHex.get(unit.hex()) ?? null;
                    if(passedHexes === null || !unit.canEnterHexWithinStackingLimits(passedHexes.at(-1)!!)){
                        passedHexes = this.#moveNavalUnitToFrontLine(unit);
                    }
                    if(passedHexes !== null){
                        unit.setHex(passedHexes.at(-1)!!);
                        movementFromHex.set(unit.hex(), passedHexes);
                        this.passedHexes.set(unit, passedHexes);
                        continue;
                    }
                }
                if(unitsToMove.has(unit)){
                    const hexToMoveTo = unit.hex().adjacentSeaHexes().find(it =>
                        unit.canEnterHexWithinStackingLimits(it)
                        && unit.validateMovement([unit.hex(), it], false)
                    );
                    if(hexToMoveTo !== undefined){
                        const passedHexes = [unit.hex(), hexToMoveTo];
                        unit.setHex(passedHexes.at(-1)!!);
                        this.passedHexes.set(unit, passedHexes);
                        continue;
                    }
                }
            }
        }

        for(let unit of Automovement.autoDisembarkSupplyUnits(this.#partnership)){
            unit.hasMoved = true;
        }
    }

    /**
     * Gets the movement needed to move a land unit towards the front line, by rail if possible and needed. Doesn't actually move anything.
     *
     * @param unit  The unit to move.
     *
     * @returns The hexes passed by the land unit, or null if no such movement is possible.
     */
    #moveLandUnitToFrontLine(unit: AliveUnit & LandUnit): Array<Hex> | null {
        const passedHexes: ReadonlyArray<Hex> | null = SupplyLines.simplifiedPathBetweenHexes(
            unit.hex(),
            destination =>
                unit.canEnterHexWithinStackingLimits(destination)
                && (
                    //Go to hexes where it's possible to attack enemy units
                    destination.adjacentLandHexes().values().flatMap(it => it.landUnits()).some(it => it.owner.partnership() !== this.#partnership)
                    //Or gain control of enemy cities, installations or resource hexes
                    || (
                        destination.controller()?.partnership() === this.#partnership.opponent()
                        && (destination.isResourceHex || destination.airbaseCapacity() > 0)
                        && !destination.units().some(it => it instanceof LandUnit)
                    )
                )
                && !destination.isDesert() && !destination.isTallMountain(),
            unit.hex().canUseRail && unit.canUseRail()
                ? it => it.canUseRail && it.controller()?.partnership() === this.#partnership
                : it => !it.isDesert() && !it.isTallMountain()
        );
        if(passedHexes === null){
            return null;
        }
        for(let numberOfHexesToKeep = passedHexes.length; numberOfHexesToKeep > 1; numberOfHexesToKeep--){
            const destination = passedHexes[numberOfHexesToKeep - 1];
            //If the unit can't enter because of stacking limits
            if(!unit.canEnterHexWithinStackingLimits(destination)){
                continue;
            }
            //If a Japanese unit in China is trying to move out of supply
            if(this.#partnership === Partnership.Axis && destination.country === Countries.china && !destination.adjacentLandHexes().flatMap(it => it.units()).some(it => it instanceof Infantry || it instanceof Armor)){
                continue;
            }
            const result = passedHexes.slice(0, numberOfHexesToKeep);
            if(unit.validateMovement(result, false)){
                return result;
            }
            else if(unit.canUseRail() && unit.validateMovement(result, true)){
                unit.movingByRail = true;
                return result;
            }
        }
        return null;
    }

    /**
     * Gets the movement needed to move an out of supply land unit so that it's in supply. Doesn't actually move anything.
     *
     * @param unit  The unit to move.
     *
     * @returns The hexes passed by the land unit, or null if no such movement is possible.
     */
    #moveLandUnitToSupply(unit: AliveUnit & LandUnit): Array<Hex> | null {
        if(!unit.outOfSupply()){
            return null;
        }
        const adjacentHexes = unit.hex().adjacentLandHexes().filter(it => SupplyLines.canTraceSupplyLine(it, unit.owner));
        const movements: ReadonlyArray<Array<Hex>> = adjacentHexes.flatMap(destination => [
            [unit.hex(), destination],
            ...unit.hex().adjacentLandHexes().map(it => [unit.hex(), it, destination])
        ]).sort((a, b) => Number(b.at(-1)!!.isInLandControlZone(this.#partnership.opponent())) - Number(a.at(-1)!!.isInLandControlZone(this.#partnership.opponent())));
        return movements.find(it => unit.validateMovement(it, false)) ?? null;
    }

    /**
     * Gets the movement needed to move a land unit and the corresponding naval transport unit for an amphibious assault. Doesn't actually move anything.
     *
     * @param unit          The land unit to move.
     * @param isDestination A callback returning whether a given hex is an allowed destination. Does not need to take into account stacking limits.
     *
     * @returns [Transport ship to use, passed hexes for the land unit, passed hexes for the transport ship].
     */
    #moveLandUnitBySea(unit: AliveUnit & LandUnit, isDestination: (hex: Hex) => boolean): [AliveUnit & TransportShip, Array<Hex> | null, Array<Hex>] | [null, null, null] {
        //Don't move Japanese land units away from China
        if(this.#partnership === Partnership.Axis && unit.hex().country === Countries.china && !unit.hex().landUnits().some(it => it !== unit && it.owner.partnership() === this.#partnership && (it instanceof Infantry || it instanceof Armor))){
            return [null, null, null];
        }

        //If there are no naval transport units to embark onto, skip for performance reasons
        if(!this.#partnership.navalUnits().some(it => unit.canEmbarkOnto(it) && it.embarkedUnits().size === 0 && it.hex().distanceFromHex(unit.hex()) <= unit.movementAllowance)){
            return [null, null, null];
        }

        let movementToTransportShip: Array<Hex> | null = null;
        let transportShip: AliveUnit & TransportShip;
        const embarkedOn = unit.embarkedOn();

        //If the unit is already embarked, don't change transport ships otherwise it won't be possible to disembark the unit this turn
        if(embarkedOn instanceof TransportShip){
            transportShip = embarkedOn;
        }

        //If it's not already embarked, find a transport ship to embark it onto
        else{
            movementToTransportShip = SupplyLines.simplifiedPathBetweenHexes(
                unit.hex(),
                port => port.navalUnits().some(it => unit.canEmbarkOnto(it) && it.embarkedUnits().size === 0),
                passedHex => !passedHex.isInLandControlZone(this.#partnership.opponent()),
                false,
                true,
                unit.movementAllowance
            );
            if(movementToTransportShip === null || !unit.validateMovement(movementToTransportShip, false)){
                return [null, null, null];
            }
            const portHex = movementToTransportShip.at(-1)!!;
            const ship = portHex.navalUnits().find(it => unit.canEmbarkOnto(it) && it.embarkedUnits().size === 0);
            if(ship === undefined){
                return [null, null, null];
            }
            transportShip = ship;
        }

        //Find somewhere to move the transport unit
        const transportShipMovement = SupplyLines.simplifiedPathBetweenHexes(
            transportShip.hex(),
            destination => isDestination(destination) && transportShip.canEnterHexWithinStackingLimits(destination),
            passedHex => !passedHex.isInNavalControlZone(this.#partnership.opponent(), false),
            true,
            false,
            transportShip.movementAllowance,
            this.#partnership
        );

        //If the movement is invalid, skip
        if(transportShipMovement === null || !transportShip.validateMovement(transportShipMovement, false)){
            return [null, null, null];
        }

        return [transportShip, movementToTransportShip, transportShipMovement];
    }

    /**
     * Gets the movement needed to move a naval unit towards the front line. Doesn't actually move anything.
     *
     * @param unit  The unit to move.
     *
     * @returns The hexes passed by the naval unit, or null if no such movement is possible.
     */
    #moveNavalUnitToFrontLine(unit: AliveUnit & NavalUnit): Array<Hex> | null {
        let passedHexes: Array<Hex> | null = null;

        //German naval units prefer attacking convoys
        if(unit.owner === Countries.germany){
            if(this.#hasAttackableEnemyNavalUnit(unit.hex(), unit, true)){
                return null;
            }
            passedHexes = this.#pathToEnemyNavalUnit(unit, true);
        }

        //If no path was found above (either if the friendly unit isn't German or if there are no convoys), look for other naval units to attack
        if(passedHexes === null){
            if(this.#hasAttackableEnemyNavalUnit(unit.hex(), unit, false)){
                return null;
            }
            passedHexes = this.#pathToEnemyNavalUnit(unit, false);
        }

        //If he can't go all the way (most likely because he doesn't have the movement allowance), stop at the farthest port during the second movment phase, or at the farthest hex during the first movement phase
        while(passedHexes !== null && !unit.validateMovement(passedHexes, false)){
            if(this.#secondMovement){
                const lastPortIndex = passedHexes.findLastIndex(it => it.isPort() && it.controller()!!.partnership() === this.#partnership);
                if(lastPortIndex === -1){
                    return null;
                }
                passedHexes.length = lastPortIndex + 1;
            }
            else{
                passedHexes.pop();
            }
        }

        return passedHexes;
    }

    /**
     * Checks if the given hex has an adjacent sea hex with an enemy naval unit that the given friendly naval unit can attack.
     *
     * @param hex           The hex to check the adjacent hexes of.
     * @param friendlyUnit  The friendly unit that wants to attack.
     * @param mustBeConvoy  True if the unit to attack must be a convoy, false if any unit is fine.
     */
    #hasAttackableEnemyNavalUnit(hex: Hex, friendlyUnit: AliveUnit & NavalUnit, mustBeConvoy: boolean): boolean {
        return hex.adjacentSeaHexes().values().flatMap(it => it.navalUnits()).some(it =>
            it.owner.partnership() !== this.#partnership
            && (!mustBeConvoy || it instanceof Convoy)
            && (it instanceof Submarine ? friendlyUnit.submarineAttack > 0 : friendlyUnit.attack > 0)
        );
    }

    /**
     * Gets the path to a hex adjacent to an enemy naval unit.
     *
     * @param friendlyUnit  The friendly naval unit to move.
     * @param mustBeConvoy  True if the unit to attack must be a convoy, false if any unit is fine.
     *
     * @returns The hexes passed by the friendly naval unit, or null if no such movement is possible.
     */
    #pathToEnemyNavalUnit(friendlyUnit: AliveUnit & NavalUnit, mustBeConvoy: boolean): Array<Hex> | null {
        return SupplyLines.simplifiedPathBetweenHexes(
            friendlyUnit.hex(),
            destination => friendlyUnit.canEnterHexWithinStackingLimits(destination) && this.#hasAttackableEnemyNavalUnit(destination, friendlyUnit, mustBeConvoy),
            passedHex => !passedHex.isInNavalControlZone(this.#partnership.opponent(), friendlyUnit instanceof Submarine),
            true,
            false,
            friendlyUnit.movementAllowance,
            this.#partnership
        );
    }

    /**
     * Gets the movement needed to move a naval unit to a port where it can get more supply. Doesn't actually move anything.
     *
     * @param unit      The naval unit to move.
     * @param country   The country to move to, if any.
     *
     * @returns The hexes passed by the naval unit, or null if no such movement is possible.
     */
    #returnToPort(unit: AliveUnit & NavalUnit, country: Country | null): Array<Hex> | null {
        if(unit.inPort() && (country === null || (unit.hex().country === country && !unit.hex().isColony))){
            return null;
        }
        let passedHexes = SupplyLines.simplifiedPathBetweenHexes(
            unit.hex(),
            destination => (country === null || destination.country === country)
                && destination.controller()?.partnership() === this.#partnership
                && destination.isPort()
                && (country !== null || unit.canEnterHexWithinStackingLimits(destination))
                && (!(unit instanceof Convoy) || !destination.isColony)
                && SupplyLines.canTraceSupplyLine(destination, unit.owner),
            passedHex => !passedHex.isInNavalControlZone(this.#partnership.opponent(), unit instanceof Submarine),
            true,
            false,
            Infinity,
            this.#partnership
        );
        if(passedHexes === null || !unit.validateMovement(passedHexes.slice(0, 2), false)){
            return null;
        }
        while(!unit.validateMovement(passedHexes, false)){
            passedHexes.pop();
        }
        return passedHexes;
    }

    /**
     * Checks if the given naval unit needs to return to a port.
     *
     * @param unit  The unit to check.
     *
     * @returns True if it needs to return to a port, false if it doesn't need to.
     */
    #shouldReturnToPort(unit: AliveUnit & NavalUnit): boolean {
        return unit instanceof TransportShip || unit instanceof Convoy || unit.remainingSupply() <= 1 || unit.damaged();
    }

    /**
     * Gets the movement needed to move a bomber to a hex it can bomb. Doesn't actually move anything.
     *
     * @param unit  The bomber to move.
     *
     * @returns The hexes passed by the bomber, or null if no such movement is possible.
     */
    #moveBomberToBombableHex(unit: AliveUnit & AirUnit): Array<Hex> | null {
        const passedHexes = SupplyLines.simplifiedPathBetweenHexes(
            unit.hex(),
            destination => (
                destination.controller()?.partnership() === this.#partnership.opponent() && (
                    destination.fortified()
                    || destination.airbaseCapacity() > 0
                    || (destination.isResourceHex && !destination.resourceHexDestroyed)
                    || (destination.units().some(it => it instanceof LandUnit) && destination.adjacentLandHexes().values().flatMap(it => it.landUnits()).some(it => it.owner.partnership() === this.#partnership))
                )
            ) || destination.navalUnits().some(it => it.owner.partnership() !== this.#partnership),
            passedHex => !passedHex.airUnitsGrounded(),
            true,
            true,
            unit.movementAllowance / 2
        );
        if(passedHexes === null || passedHexes.length - 1 > unit.movementAllowance / 2 || !unit.validateMovement(passedHexes, false)){
            return null;
        }
        return passedHexes;
    }

    /**
     * Returns an air unit to a base. Doesn't actually move anything.
     *
     * @param unit  The air unit to move.
     *
     * @returns The hexes passed by the air unit, or null if no such movement is possible.
     */
    #returnToBase(unit: AliveUnit & AirUnit): Array<Hex> | null {
        const pathToCarrier = unit.carrierBased() ? SupplyLines.simplifiedPathBetweenHexes(
            unit.hex(),
            destination => destination.navalUnits().some(it => unit.canEmbarkOnto(it) && it.embarkedUnits().size === 0),
            passedHex => !passedHex.airUnitsGrounded(),
            true,
            true,
            unit.movementAllowance
        ) : null;
        if(pathToCarrier !== null && unit.validateMovement(pathToCarrier, false)){
            return pathToCarrier;
        }
        const pathToAirbase = SupplyLines.simplifiedPathBetweenHexes(
            unit.hex(),
            destination => destination.controller()?.partnership() === this.#partnership
                && destination.airbaseCapacity() > 0
                && unit.canEnterHexWithinStackingLimits(destination),
            passedHex => !passedHex.airUnitsGrounded(),
            true,
            true,
            unit.movementAllowance
        );
        if(pathToAirbase !== null && unit.validateMovement(pathToAirbase, false)){
            return pathToAirbase;
        }
        return null;
    }

    /**
     * Gets the hexes in China that Japan needs to maintain supply.
     *
     * @returns All hexes in China that Japan needs to maintain supply.
     */
    #japaneseSupplyLines(): Set<Hex> {
        let result = new Set<Hex>();
        const unitsToKeep = this.#partnership.landUnits().filter(unit =>
            unit.hex().country === Countries.china
            && (
                unit.hex().airbaseCapacity() > 0
                || unit.hex().adjacentLandHexes().values()
                    .flatMap(it => it.units())
                    .some(it => it.owner.partnership() !== this.#partnership)
            )
        );
        for(let unit of unitsToKeep){
            const supplyLine = SupplyLines.simplifiedPathBetweenHexes(
                unit.hex(),
                hex => (hex.country !== Countries.china && hex.controller()?.partnership() === unit.owner.partnership()) || hex.landUnits().some(it => it.owner.partnership() === unit.owner.partnership() && it instanceof SupplyUnit),
                hex => hex.landUnits().some(it => it.owner.partnership() === this.#partnership)
            );
            supplyLine?.forEach(result.add, result);
        }
        return result;
    }
}
