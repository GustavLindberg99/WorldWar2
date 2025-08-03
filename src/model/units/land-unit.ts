import Unit from "./unit.js";

import { Hex, SupplyLines, WeatherCondition } from "../mapsheet.js";
import { Countries, CountryWithUnits } from "../countries.js";
import { AirUnit, AliveUnit, Armor, NavalUnit, Paratrooper, SupplyUnit, TransportShip } from "../units.js";
import { Phase } from "../phase.js";
import { date } from "../date.js";

export default abstract class LandUnit extends Unit {
    movingByRail: boolean = false;
    hasMoved: boolean = false;

    #strength: number;

    /**
     * Constructs a land unit.
     *
     * @param strength          The unit's strength.
     * @param movementAllowance The unit's movement allowance.
     * @param owner             The unit's owner.
     */
    constructor(strength: number, movementAllowance: number, owner: CountryWithUnits){
        super(movementAllowance, owner);
        this.strength = this.#strength = strength;
    }

    get strength(): number {
        return this.#strength;
    }

    set strength(strength: number){
        if(strength % 1 !== 0 || strength < 0 || (strength === 0 && this.maxStrength() > 0)){
            throw new RangeError(`The strength of a land unit must be a strictly positive integer, got ${strength}`);
        }
        if(strength > this.maxStrength()){
            throw new RangeError(`Trying to set unit strength to ${strength} strength points, but max strength is ${this.maxStrength()}`);
        }
        this.#strength = strength;
    }

    override die(): void {
        this.delete();
        for(let i = 0; i < this.strength; i++){
            const newUnit = this.clone();
            newUnit.strength = 1;
            this.owner.availableUnits.add(newUnit);
        }
    }

    override outOfSupply(): boolean {
        if(!this.isAlive()){
            return false;
        }
        const hex = this.hex();
        if(hex === null){
            return false;
        }
        const embarkedOn = this.embarkedOn();
        if(embarkedOn !== null){
            return embarkedOn.outOfSupply();
        }
        const controller = hex.controller();
        if(controller !== null && controller.partnership() !== this.owner.partnership()){
            //Units that are doing an amphibious assault aren't out of supply
            return false;
        }
        return !SupplyLines.canTraceSupplyLine(hex, this.owner, !(this instanceof SupplyUnit));
    }

    override updateSupply(): boolean {
        if(!this.isAlive()){
            return false;
        }
        if(this.outOfSupply()){
            if(this.strength < 2){
                this.die();
            }
            else{
                for(let i = 0; i < Math.ceil(this.strength / 2); i++){
                    const unitToBeBoughtBack = this.clone();
                    unitToBeBoughtBack.strength = 1;
                    this.owner.availableUnits.add(unitToBeBoughtBack);
                }

                this.strength = Math.floor(this.strength / 2);
            }
            return true;
        }
        return false;
    }

    override canAttack(unit: Unit | null = null): boolean {
        return super.canAttack(unit) && (unit === null || unit instanceof LandUnit);
    }

    override canAttackInHex(unit: AliveUnit & Unit): boolean {
        const hex = this.hex();
        if(hex === null || this.embarkedOn() !== null || unit.embarkedOn() !== null || !super.canAttackInHex(unit)){
            return false;
        }
        if(hex.controller()!!.partnership() === this.owner.partnership()){
            //Normal attacks
            return hex.adjacentLandHexes().includes(unit.hex());
        }
        else{
            //Amphibious assaults
            return hex === unit.hex();
        }
    }

    override modifiedLandAttack(): number {
        if(Countries.sovietUnion.enteredWar !== null && date.current <= Countries.sovietUnion.enteredWar + 12 && (this.owner === Countries.sovietUnion || this.owner === Countries.finland) && this.hex()?.weatherCondition() === WeatherCondition.SevereWinter){
            return this.strength * 2;
        }
        else{
            return this.strength;
        }
    }

    override canEnterHexWithinStackingLimits(hex: Hex, otherUnits: IteratorObject<Unit> = hex.units()): boolean {
        const landUnits = [...otherUnits.filter(it => it !== this && it instanceof LandUnit)];
        return landUnits.length - (landUnits.some(it => it instanceof SupplyUnit) ? 1 : 0) - (landUnits.some(it => it instanceof Paratrooper) ? 1 : 0) < 2
    }

    override validateMovement(passedHexes: ReadonlyArray<Hex>, movingByRail: boolean): boolean {
        const opponent = this.owner.partnership()!!.opponent();
        return passedHexes.every((it, i) => i === 0 || it.adjacentLandHexes().includes(passedHexes[i - 1]))
            && this.validateMovementThroughNeutralCountries(passedHexes)
            && !passedHexes.values().flatMap(it => it.landUnits()).some(it => it.owner.partnership() !== this.owner.partnership())
            && (!movingByRail || (passedHexes.every(it => it.canUseRail && it.controller()?.partnership() === this.owner.partnership()) && !this.hasAttacked))
            && this.validateMovementThroughControlZones(passedHexes, new Set(passedHexes.filter(it => it.isInLandControlZone(opponent))), (passedHexes.at(-1)?.isForest() && passedHexes.at(-2)?.isForest()) ?? false, movingByRail)
            && (
                movingByRail
                || passedHexes.reduce(
                    (a, b) => a + b.landMovementPointCost(),
                    -passedHexes[0].landMovementPointCost()
                ) <= this.movementAllowance
            );
    }

    override canEmbarkOnto(unit: Unit): boolean {
        if(unit.owner.partnership() !== this.owner.partnership() || !(unit instanceof TransportShip || unit instanceof AirUnit) || unit.damaged()){
            return false;
        }
        return unit instanceof TransportShip || (this.strength <= 1 && unit instanceof AirUnit && unit.isTransportUnit() && unit.based);
    }

    override sameTypeAndStrength(other: Unit): boolean {
        return other instanceof LandUnit && this.sameType(other) && this.strength === other.strength;
    }

    override sameBasicType(other: Unit): boolean {
        return other instanceof LandUnit && other.owner.partnership() === this.owner.partnership();
    }

    /**
     * Gets the unit's modified defense strength.
     *
     * @returns The unit's modified defense strength.
     */
    modifiedDefense(): number {
        const hex = this.hex();
        let result = this.strength;
        if(hex === null){
            return result;
        }
        if(hex.isTallMountain()){
            result *= 2;
        }
        else if(hex.isMountain() || hex.isForest()){
            result *= 1.5;
        }
        if(hex.fortified()){
            result *= 2;
        }
        if(hex.weatherCondition() === WeatherCondition.Spring || hex.weatherCondition() === WeatherCondition.Monsoon){
            result *= 2;
        }
        if(Countries.sovietUnion.enteredWar !== null && date.current <= Countries.sovietUnion.enteredWar + 24 && (this.owner === Countries.sovietUnion || this.owner === Countries.finland) && hex.weatherCondition() === WeatherCondition.SevereWinter){
            result *= 2;
        }
        if(this.outOfSupply()){
            result /= 2;
        }
        return result;
    }

    /**
     * Checks whether this unit and other unit have the same type and owner.
     *
     * @param other The unit to compare to.
     *
     * @returns True if they have the same type and owner, false otherwise.
     */
    sameType(other: LandUnit): boolean {
        return this.owner === other.owner && this.constructor === other.constructor && this.movementAllowance === other.movementAllowance;
    }

    /**
     * Gets the maximal strength that this unit can have.
     *
     * @returns The maximal strength that this unit can have.
     */
    maxStrength(): number {
        if(this.movementAllowance < 3){    //German 5-2 infantry should always have max strength 5. No other country has such slow land units.
            return 5;
        }
        else{
            return this.owner.maxLandUnitStrength();
        }
    }

    /**
     * Checks if this unit can move by rail, taking into account current phase and rail capacity. Doesn't take into account its current location, use validateMovement for that.
     *
     * @param otherUnits    Other units that also want to move by rail at the same time. Used for when the human player does Ctrl+drag. Makes no difference whether or not this array includes this unit.
     *
     * @returns True if it can move by rail, false if it can't.
     */
    canUseRail(otherUnits: ReadonlyArray<AliveUnit & LandUnit> = []): boolean {
        return (Phase.current === Phase.AxisSecondMovement || Phase.current === Phase.AlliedSecondMovement)
            && [...this.owner.landUnits().filter(it => it !== this && (it.movingByRail || otherUnits.includes(it)))].length < this.owner.railCapacity()
    }

    /**
     * Clones the unit.
     *
     * @returns A clone of the unit.
     */
    abstract clone(): LandUnit;

    override toJson(): Unit.Json {
        let json = super.toJson();
        json.strength = this.strength;
        json.movementAllowance = this.movementAllowance;
        json.hasMoved = this.hasMoved || undefined;
        return json;
    }

    /**
     * Checks if the given JSON contains a valid land unit, assuming it's a valid unit.
     *
     * @param json  The JSON object to validate.
     * @param type  The type of unit.
     * @param owner The unit's owner.
     *
     * @returns True if it does, false if it doesn't.
     */
    static validateLandUnitJson(json: object, type: string, owner: CountryWithUnits): json is Unit.Json {
        if(!("movementAllowance" in json) || typeof(json.movementAllowance) !== "number" || json.movementAllowance <= 0){
            console.warn("Invalid land unit: invalid movement allowance.");
            return false;
        }
        if(!("strength" in json) || typeof(json.strength) !== "number"){
            console.warn("Invalid land unit: invalid strength.");
            return false;
        }
        if("hasMoved" in json && typeof(json.hasMoved) !== "boolean"){
            console.warn("Invalid land unit: invalid hasMoved.");
            return false;
        }
        switch(type){
        case "Armor":
            if(json.strength > 0 && json.strength <= owner.maxArmorStrength()){
                return Armor.validateArmorJson(json);
            }
            else{
                console.warn("Invalid armor: invalid strength: " + json.strength);
                return false;
            }
        case "Infantry":
        case "Marine":
            if(json.strength > 0 && json.strength <= owner.maxLandUnitStrength()){
                return true;
            }
            else{
                console.warn("Invalid land unit: invalid strength: " + json.strength);
                return false;
            }
        case "Paratrooper":
            if(json.strength === 1){
                return true;
            }
            else{
                console.warn("Invalid paratrooper: invalid strength: " + json.strength);
                return false;
            }
        case "SupplyUnit":
            if(json.strength === 0){
                return true;
            }
            else{
                console.warn("Invalid supply unit: invalid strength: " + json.strength);
                return false;
            }
        default:
            console.warn("Invalid unit: invalid type.");
            return false;
        }
    }
}
