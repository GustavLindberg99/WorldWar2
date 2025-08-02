import { Hex, SupplyLines } from "../mapsheet.js";
import { Partnership } from "../partnership.js";
import { Countries, CountryWithUnits } from "../countries.js";
import { AirUnit, AliveUnit, Armor, Infantry, LandUnit, Marine, NavalUnit, Paratrooper, SupplyUnit } from "../units.js";

abstract class Unit {
    readonly movementAllowance: number;
    readonly owner: CountryWithUnits;

    hasAttacked: boolean = false;

    #embarkedOn: Unit | null = null;
    #hex: Hex | null = null;
    #embarkedUnits = new Set<Unit>();

    static readonly #allUnitsByHex = new Map<Hex, Set<Unit>>();

    constructor(movementAllowance: number, owner: CountryWithUnits){
        this.movementAllowance = movementAllowance;
        this.owner = owner;
    }

    /**
     * Gets all the units in the given hex. Equivalent to hex.units(), but is needed so that the Hex class can access data that should only be modifiable by the Unit class.
     *
     * @param hex The hex to get the units in.
     *
     * @returns The units.
     */
    static unitsInHex(hex: Hex): Set<AliveUnit & Unit> {
        //Copy the set so that it remains valid even if units move. Also if the hex isn't in the map, new Set(undefined) will return an empty set.
        return new Set(Unit.#allUnitsByHex.get(hex)) as Set<AliveUnit & Unit>;
    }

    /**
     * Gets all the units on the map (but not units available for build).
     *
     * @returns All units on the map.
     */
    static allAliveUnits(): IteratorObject<AliveUnit & Unit> {
        //Copy the result so that the iterator remains valid even if units move.
        return [
            ...Unit.#allUnitsByHex.values()
                .flatMap(it => it)
                .flatMap(it => [it, ...it.embarkedUnits()])
        ].values() as IteratorObject<AliveUnit & Unit>;
    }

    /**
     * Groups the units by type using the sameType method.
     *
     * @param units The units to group.
     *
     * @returns Map<Unit, number of units in `units` with the same type as that unit>. `key.sameType(otherKey)` will always return false.
     */
    static groupByType(units: Iterable<Unit>): Map<Unit, number> {
        const result: Map<Unit, number> = new Map();
        for(let unit of units){
            const otherUnit = result.keys().find(it => it.sameTypeAndStrength(unit));
            if(otherUnit === undefined){
                result.set(unit, 1);
            }
            else{
                result.set(otherUnit, result.get(otherUnit)!! + 1);
            }
        }
        return result;
    }

    /**
     * Gets the hex that this unit is in. If the unit is embarked, gets the hex of the unit that it's embarked on.
     *
     * @returns The hex that this unit is in. If this unit is embarked, returns the hex that the unit it's embarked on is in. Returns null if the unit isn't alive.
     */
    hex(): Hex | null {
        return this.embarkedOn()?.hex() ?? this.#hex;
    }

    /**
     * Places the unit in the given hex.
     *
     * @param hex   The hex to place the unit in.
     */
    setHex(hex: Hex): void {
        if(hex === this.#hex){
            return;
        }

        //Disembark if embarked
        const embarkedOn = this.embarkedOn();
        if(embarkedOn !== null){
            embarkedOn.#embarkedUnits.delete(this);
        }
        this.#embarkedOn = null;

        //Add the unit to the new hex and remove it from the old hex
        this.#removeFromHex();
        const newHexUnits = Unit.#allUnitsByHex.get(hex) ?? new Set();
        newHexUnits.add(this);
        Unit.#allUnitsByHex.set(hex, newHexUnits);

        //Update the hex
        this.#hex = hex;

        //Clear the supply line cache
        SupplyLines.clearCache();
    }

    /**
     * Removes the unit from its current hex. If the unit isn't currently in a hex, does nothing.
     */
    #removeFromHex(): void {
        const hex = this.hex();
        if(hex !== null){
            const unitsInHex = Unit.#allUnitsByHex.get(hex)!!;
            unitsInHex.delete(this);
            if(unitsInHex.size === 0){
                Unit.#allUnitsByHex.delete(hex);
            }
        }
    }

    /**
     * Checks if this unit can do overrun.
     *
     * @returns True if it can, false if it can't.
     */
    canDoOverrun(): boolean {
        //Overridden in Armor class
        return false;
    }

    /**
     * Gets the unit that this unit is embarked on.
     *
     * @returns The unit that this unit is embarked on, or null if this unit isn't embarked.
     */
    embarkedOn(): Unit | null {
        return this.#embarkedOn;
    }

    /**
     * Embarks this unit onto the given unit.
     *
     * @param unit  The unit to embark onto.
     */
    embarkOnto(unit: Unit): void {
        if(unit === this.embarkedOn()){
            return;
        }

        if(this.#hex !== null){
            Unit.#allUnitsByHex.get(this.#hex)?.delete(this);
        }
        if(this.#embarkedOn !== null){
            this.#embarkedOn.#embarkedUnits.delete(this);
        }
        unit.#embarkedUnits.add(this);
        this.#hex = null;
        this.#embarkedOn = unit;

        if(this.isAlive()){    //Don't update supply line cache when constructing a carrier with an air unit on it
            SupplyLines.clearCache();
        }
    }

    /**
     * Disembarks this unit and places it in the hex where the unit it's embarked on is. If the unit is already disembarked, does nothing.
     */
    disembark(): void {
        const hex = this.embarkedOn()?.hex() ?? null;
        if(hex !== null){
            this.setHex(hex);
        }
    }

    /**
     * Gets the units that are embarked on this unit.
     *
     * @returns The units that are embarked on this unit.
     */
    embarkedUnits(): ReadonlySet<Unit> {
        return this.#embarkedUnits;
    }

    /**
     * Removes the unit from the map.
     */
    delete(): void {
        if(this.#embarkedOn !== null){
            this.#embarkedOn.#embarkedUnits.delete(this);
        }
        this.#embarkedOn = null;

        this.#removeFromHex();
        this.#hex = null;

        for(let unit of this.#embarkedUnits){
            unit.delete();
        }

        this.updateSupply();
        SupplyLines.clearCache();
    }

    /**
     * Destroys the unit and adds it to its owner's available units.
     */
    abstract die(): void;

    /**
     * Checks if the unit is alive.
     *
     * @returns True if the unit is alive, false if it isn't.
     */
    isAlive(): this is AliveUnit {
        return this.hex() !== null;
    }

    /**
     * Checks if the unit can move along the given array of passed hexes according to control zones, without taking into account anything else.
     *
     * @param passedHexes           The hexes that the unit has passed. Includes both the start and the end hex, not expected to be empty.
     * @param controlZones          The relevant enemy control zones.
     * @param canMoveOneExtraHex    Whether the unit can move one extra hex through control zones (for example armors or submarines).
     * @param movingByRail          Whether the unit is moving by rail. If true, ignores the actual value of canMoveOneExtraHex and treats it as false.
     *
     * @returns True if the movement is valid with respect to control zones, false if it isn't.
     */
    protected validateMovementThroughControlZones(passedHexes: ReadonlyArray<Hex>, controlZones: ReadonlySet<Hex>, canMoveOneExtraHex: boolean, movingByRail: boolean): boolean {
        const passedHexesToValidate = canMoveOneExtraHex && !movingByRail ? passedHexes.slice(0, -1) : passedHexes;
        return passedHexesToValidate.every((it, i) => i === 0 || !controlZones.has(it) || !controlZones.has(passedHexesToValidate[i - 1]))    //No two adjacent hexes should be in control zones
            && passedHexesToValidate.slice(1, -1).every(it => !controlZones.has(it));    //No hex other than the first and last hex should be in control zones
    }

    /**
     * Checks if the unit can move along the given array of passed hexes according to the partnership of the hexes' owners (neutral hexes or Japan vs Soviet Union hexes are disallowed).
     *
     * @param passedHexes   The hexes that the unit has passed. Includes both the start and the end hex, not expected to be empty.
     */
    protected validateMovementThroughNeutralCountries(passedHexes: ReadonlyArray<Hex>): boolean {
        if(passedHexes.some(it => it.controller()?.partnership() === Partnership.Neutral)){
            return false;
        }
        if(Countries.mongolia.partnership() === Partnership.Neutral && Countries.japan.partnership() !== Countries.sovietUnion.partnership()){
            if(this.owner === Countries.sovietUnion){
                return passedHexes.every(it => it.country !== Countries.japan && it.country !== Countries.china);
            }
            else if(this.owner === Countries.japan){
                return passedHexes.every(it => it.country !== Countries.sovietUnion);
            }
        }
        return true;
    }

    /**
     * Gets the type of this unit (infantry, fighter, carrier, etc).
     *
     * @returns A human-readable string with the type of this unit.
     */
    abstract type(): string;

    /**
     * Gets the price of the unit.
     *
     * @returns The price of the unit.
     */
    abstract price(): number;

    /**
     * Gets the time it takes to build the unit.
     *
     * @returns The delay in months.
     */
    abstract delay(): number;

    /**
     * Checks if this unit is out of supply.
     *
     * @returns True if the unit is out of supply, false if it isn't.
     */
    abstract outOfSupply(): boolean;

    /**
     * Updates whether or not the unit is out of supply and inflicts any losses due to being out of supply. Meant to be called during the supply phase.
     *
     * @returns True if the anything changed, false otherwise.
     */
    abstract updateSupply(): boolean;

    /**
     * Checks if this unit can attack. If a unit is passed as a parameter, checks if this unit can attack that specific unit, otherwise checks if it can attack at all. Only takes into account unit types and which unit belongs to whom, not which hexes they're in.
     *
     * @param unit  The unit to be attacked, or null to check if this unit can attack at all.
     *
     * @returns True if this unit can attack, false otherwise.
     */
    canAttack(unit?: Unit | null): boolean {
        if(this.outOfSupply()){
            return false;
        }
        if(unit?.owner.partnership() === this.owner.partnership()){
            return false;
        }
        if(this.hasAttacked){
            return false;
        }
        return true;    //Overridden in subclasses
    }

    /**
     * Checks if this unit can attack the given unit taking into account which hexes they're in (but not which unit belongs to whom).
     *
     * @param unit  The unit to be attacked.
     *
     * @returns True if this unit can attack, false otherwise.
     */
    canAttackInHex(unit: AliveUnit & Unit): boolean {
        if(!this.canAttack(unit)){
            return false;
        }
        if(Countries.mongolia.partnership() === Partnership.Neutral && Countries.japan.partnership() !== Countries.sovietUnion.partnership() && ((this.owner === Countries.japan && unit?.hex().country === Countries.sovietUnion) || (this.owner === Countries.sovietUnion && unit?.hex().country === Countries.japan))){
            return false;
        }
        return true;    //Overridden in subclasses
    }

    /**
     * Gets the unit's modified attack strength against land units.
     *
     * @returns The modified attack strength against land units.
     */
    abstract modifiedLandAttack(): number;

    /**
     * Checks if this unit can enter the given hex within stacking limits.
     *
     * @param hex           The hex that the unit is attempting to enter.
     * @param willBeBased   True if the air unit is trying to base or if the naval unit is trying to enter the port, false otherwise.
     * @param otherUnits    Other units that are also planning on entering this hex. Can but doesn't have to contain this unit.
     *
     * @returns True if this unit can enter the hex within the stacking limits, false otherwise.
     */
    abstract canEnterHexWithinStackingLimits(hex: Hex, willBeBased?: boolean, otherUnits?: IteratorObject<Unit>): boolean;

    /**
     * Checks if the unit can move along the given array of passed hexes. Takes into account both movement allowance and control zones.
     *
     * @param passedHexes   Includes both the start and the end hex, not expected to be empty.
     * @param movingByRail  True if the unit is moving by rail, false otherwise.
     *
     * @returns True if the movement is valid, false if it isn't.
     */
    abstract validateMovement(passedHexes: ReadonlyArray<Hex>, movingByRail: boolean): boolean;

    /**
     * Checks if this unit can embark onto the given unit. Only takes into account unit types, does not take into account the hexes that the units are in or whether the transport capacity is reached.
     *
     * @param unit  The unit to embark onto.
     *
     * @returns True if this unit can embark onto the given unit, false otherwise.
     */
    abstract canEmbarkOnto(unit: Unit): boolean;

    /**
     * Checks whether this unit and other unit can be merged together in unit lists with only one unit marker and a "(xN)".
     *
     * @param other The unit to compare to.
     *
     * @returns True if they have the same type, owner and strength, false otherwise.
     */
    abstract sameTypeAndStrength(other: Unit): boolean;

    /**
     * Checks whether this unit and other unit can be dragged together during the movement phase.
     *
     * @param other The unit to compare to.
     *
     * @returns True if theyhave the same basic type, i.e land unit, naval unit or air unit, false otherwise.
     */
    abstract sameBasicType(other: Unit): boolean;

    /**
     * Serializes the unit to a JSON object.
     *
     * @returns An object containing information about this unit that can be stringified to JSON.
     */
    toJson(): Unit.Json {
        let json: Unit.Json = {
            type: this.constructor.name,
            owner: this.owner.name(),
            hasAttacked: this.hasAttacked || undefined
        };
        const hex = this.hex();
        if(hex !== null){
            json.hex = {x: hex.x, y: hex.y};
        }
        if(this.embarkedUnits().size > 0){
            json.embarkedUnits = [...this.embarkedUnits().values().map(it => it.toJson())];
        }
        return json;
    }

    /**
     * Checks if the given JSON contains a valid unit.
     *
     * @param json  The JSON object to validate.
     *
     * @returns True if it does, false if it doesn't.
     */
    static validateJson(json: unknown): json is Unit.Json {
        if(typeof(json) !== "object" || json === null){
            console.warn("Invalid unit.");
            return false;
        }
        else if(!("type" in json) || typeof(json.type) !== "string"){
            console.warn("Invalid unit: missing type.");
            return false;
        }
        else if(!("owner" in json)){
            console.warn("Invalid unit: owner missing.");
            return false;
        }
        else if("hasAttacked" in json && typeof(json.hasAttacked) !== "boolean"){
            console.warn("Invalid unit: invalid hasAttacked.");
            return false;
        }
        else if("hex" in json && !(typeof(json.hex) === "object" && json.hex !== null && "x" in json.hex && typeof(json.hex.x) === "number" && "y" in json.hex && typeof(json.hex.y) === "number" && Hex.fromCoordinates(json.hex.x, json.hex.y) !== undefined)){
            console.warn("Invalid unit: invalid hex.");
            return false;
        }
        else if("embarkedUnits" in json && !(json.embarkedUnits instanceof Array && json.embarkedUnits.every(it => Unit.validateJson(it)))){
            console.warn("Invalid unit: invalid embarkedUnits.");
            return false;
        }
        else if("outOfSupply" in json && typeof(json.outOfSupply) !== "boolean"){
            console.warn("Invalid unit: invalid outOfSupply.");
            return false;
        }
        else if("damaged" in json && typeof(json.damaged) !== "boolean"){
            console.warn("Invalid unit: invalid damaged.");
            return false;
        }
        const owner = Countries.fromName(json.owner);
        if(!(owner instanceof CountryWithUnits)){
            console.warn("Invalid unit: invalid owner.");
            return false;
        }
        switch(json.type){
        case "AirUnit":
            return AirUnit.validateAirUnitJson(json);
        case "Armor":
        case "Infantry":
        case "Marine":
        case "Paratrooper":
        case "SupplyUnit":
            return LandUnit.validateLandUnitJson(json, json.type, owner);
        case "Battlecruiser":
        case "Battleship":
        case "Carrier":
        case "Convoy":
        case "DestroyerEscort":
        case "Destroyer":
        case "HeavyCruiser":
        case "Kaibokan":
        case "LightCruiser":
        case "Submarine":
        case "TransportShip":
            return NavalUnit.validateNavalUnitJson(json, json.type);
        default:
            console.warn("Invalid unit: invalid type.");
            return false;
        }
    }

    /**
     * Parses the given JSON object as a unit.
     *
     * @param json  The JSON object to parse.
     *
     * @returns The unit.
     */
    static fromJson(json: Unit.Json): Unit {
        const owner = Countries.fromName(json.owner) as CountryWithUnits;
        let unit: Unit;
        let landUnit: LandUnit | undefined = undefined;
        switch(json.type){
        case "AirUnit":
            unit = AirUnit.airUnitFromJson(json, owner);
            break;
        case "Armor":
            unit = landUnit = Armor.armorFromJson(json, owner);
            break;
        case "Infantry":
            unit = landUnit = new Infantry(json.strength!!, json.movementAllowance!!, owner);
            break;
        case "Marine":
            unit = landUnit = new Marine(json.strength!!, json.movementAllowance!!, owner);
            break;
        case "Paratrooper":
            unit = landUnit = new Paratrooper(json.strength!!, json.movementAllowance!!, owner);
            break;
        case "SupplyUnit":
            unit = landUnit = SupplyUnit.supplyUnitFromJson(json, owner);
            break;
        case "Battlecruiser":
        case "Battleship":
        case "Carrier":
        case "Convoy":
        case "DestroyerEscort":
        case "Destroyer":
        case "HeavyCruiser":
        case "Kaibokan":
        case "LightCruiser":
        case "Submarine":
        case "TransportShip":
            unit = NavalUnit.navalUnitFromJson(json, owner);
            break;
        default:
            throw new TypeError("Unknown unit type");
        }
        if(landUnit !== undefined){
            landUnit.hasMoved = json.hasMoved ?? false;
        }
        unit.hasAttacked = json.hasAttacked ?? false;
        if(json.hex !== undefined){
            unit.setHex(Hex.fromCoordinates(json.hex.x, json.hex.y));
        }
        for(let embarkedJson of json.embarkedUnits ?? []){
            const embarkedUnit = Unit.fromJson(embarkedJson);
            embarkedUnit.embarkOnto(unit);
        }
        if(unit instanceof AirUnit && json.hex !== undefined && json.based){
            unit.based = true;
        }
        if(unit instanceof NavalUnit && json.hex !== undefined && json.inPort){
            unit.inPort = true;
        }
        return unit;
    }
}

namespace Unit {
    export type Json = {
        type: string,
        owner: string,
        hasAttacked?: boolean,
        hex?: {
            x: number,
            y: number
        },
        embarkedUnits?: Array<Unit.Json>,

        //Specific to multiple unit types
        movementAllowance?: number, //Not air units
        outOfSupply?: boolean,      //Air units and armor units, optional and defaults to false
        damaged?: boolean,          //Not land units, optional and defaults to false

        //Air unit specific
        model?: AirUnit.Model,
        based?: boolean,
        usedMovementPoints?: number,    //Optional, defaults to 0

        //Land unit specific
        strength?: number,
        hasMoved?: boolean,

        //Armor specific
        hasDoneSuccessfulOverrun?: boolean, //Optional, defaults to false

        //Naval unit specific
        name?: string,
        attack?: number,            //Optional, defaults to 0
        submarineAttack?: number,   //Optional, defaults to 0
        defense?: number,
        inPort?: boolean,
        remainingSupply?: number,

        //Convoy specific
        money?: number,         //Optional, defaults to 0
        destination?: string    //Optional, defaults to null
    };
}

export default Unit;
