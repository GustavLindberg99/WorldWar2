import Unit from "./unit.js";

import { Hex, SupplyLines } from "../mapsheet.js";
import { Countries, CountryWithUnits } from "../countries.js";
import { AliveUnit, Battlecruiser, Battleship, Carrier, Convoy, Destroyer, DestroyerEscort, HeavyCruiser, Kaibokan, LandUnit, LightCruiser, Submarine, TransportShip } from "../units.js";

export default abstract class NavalUnit extends Unit {
    readonly name: string;
    readonly attack: number;
    readonly submarineAttack: number;
    readonly defense: number;

    inPort: boolean = false;
    #remainingSupply: number = 3;
    #damaged: boolean = false;

    /**
     * Constructs a naval unit.
     *
     * @param name              The name of the ship.
     * @param attack            The attack strength against anything except submarines.
     * @param submarineAttack   The attack strength against submarines.
     * @param defense           The defense strength.
     * @param movementAllowance The movement allowance.
     * @param owner             The owner.
     */
    constructor(name: string, attack: number, submarineAttack: number, defense: number, movementAllowance: number, owner: CountryWithUnits){
        super(movementAllowance, owner);

        this.name = name;
        this.attack = attack;
        this.submarineAttack = submarineAttack;
        this.defense = defense;
    }

    override setHex(hex: Hex): void {
        super.setHex(hex);
        this.inPort = false;
    }

    override delete(): void {
        super.delete();
        this.#damaged = false;
    }

    override die(): void {
        if(this.inPort){
            this.owner.availableUnits.add(this);
        }
        this.delete();
    }

    override outOfSupply(): boolean {
        if(this.#remainingSupply > 0){
            return false;
        }
        const hex = this.hex();
        if(hex === null || (this.inPort && SupplyLines.canTraceSupplyLine(hex, this.owner))){
            this.#remainingSupply = 3;
        }
        return this.#remainingSupply <= 0;
    }

    override updateSupply(): boolean {
        const hex = this.hex();
        if(hex === null || (this.inPort && SupplyLines.canTraceSupplyLine(hex, this.owner))){
            this.#remainingSupply = 3;
        }
        else{
            this.#remainingSupply--;
        }
        return this.embarkedUnits().values().some(it => it.updateSupply());
    }

    override canAttack(unit: Unit | null = null): boolean {
        let result = false;
        if(this.attack > 0){
            result ||= unit === null
                || (unit instanceof NavalUnit && !(unit instanceof Submarine))
                || unit instanceof LandUnit;
        }
        if(this.submarineAttack > 0){
            result ||= unit === null || unit instanceof Submarine;
        }
        return super.canAttack(unit) && result;
    }

    override canAttackInHex(unit: AliveUnit & Unit): boolean {
        const hex = this.hex();
        if(hex === null || unit.embarkedOn() !== null || !super.canAttackInHex(unit)){
            return false;
        }
        else if(unit instanceof LandUnit){
            return hex === unit.hex();
        }
        else if(unit instanceof NavalUnit){
            return hex.adjacentSeaHexes().includes(unit.hex()) && (!unit.inPort || !unit.hex().isMajorPort());
        }
        else{
            return false;
        }
    }

    override modifiedLandAttack(): number {
        return this.attack / (this.damaged() ? 10 : 5);
    }

    override canEnterHexWithinStackingLimits(hex: Hex, willBeBased: boolean = false, otherUnits: IteratorObject<Unit> = hex.units()): boolean {
        if(willBeBased && hex.isMajorPort()){
            return true;
        }
        if(willBeBased && !hex.isPort()){
            return false;
        }
        return [...otherUnits.filter(it => it !== this && it instanceof NavalUnit)].length < 5;
    }

    override validateMovement(passedHexes: ReadonlyArray<Hex>, _movingByRail: boolean): boolean {
        const opponent = this.owner.partnership()!!.opponent();
        return passedHexes.every((it, i) => i === 0 || it.adjacentSeaHexes(this.owner.partnership()).includes(passedHexes[i - 1]))
            && this.validateMovementThroughNeutralCountries(passedHexes)
            && !passedHexes.values().flatMap(it => it.navalUnits()).some(it => it.owner.partnership() !== this.owner.partnership())
            && passedHexes.length <= this.movementAllowance
            && this.validateMovementThroughControlZones(
                passedHexes,
                new Set(passedHexes.filter(it => it.isInNavalControlZone(opponent, this instanceof Submarine))),
                false,
                false
            );
    }

    override canEmbarkOnto(_unit: Unit): boolean {
        return false;
    }

    override sameTypeAndStrength(_other: Unit): boolean {
        return false;
    }

    override sameBasicType(other: Unit): boolean {
        return other instanceof NavalUnit && !(other instanceof Submarine) && other.owner.partnership() === this.owner.partnership();
    }

    /**
     * Checks if the air unit is damaged.
     *
     * @returns True if it's damaged, false if it isn't.
     */
    damaged(): boolean {
        return this.#damaged;
    }

    /**
     * Damages the air unit, or eliminates it if it can't take damage.
     */
    damage(): void {
        if(!this.canTakeDamage()){
            this.die();
        }
        else{
            this.#damaged = true;
        }
    }

    /**
     * Checks whether this type of naval unit can take damage without being eliminated. Does not take into account current damaged state.
     *
     * @returns True if it can take damage, false if it can't and would be eliminated directly if damaged.
     */
    canTakeDamage(): boolean {
        return !this.damaged();
    }

    /**
     * Repairs the unit if damaged, otherwise does nothing.
     */
    repair(): void {
        this.#damaged = false;
    }

    /**
     * Gets the amount of months remaining for the unit's supply.
     *
     * @returns The amount of monts the unit can go without entering a supplied port.
     */
    remainingSupply(): number {
        return this.#remainingSupply;
    }

    override toJson(): Unit.Json {
        let json = super.toJson();
        json.name = this.name;
        json.attack = this.attack || undefined;
        json.submarineAttack = this.submarineAttack || undefined;
        json.defense = this.defense;
        json.movementAllowance = this.movementAllowance;
        json.inPort = this.inPort;
        json.remainingSupply = this.#remainingSupply;
        json.damaged = this.#damaged;
        return json;
    }

    /**
     * Checks if the given JSON contains a valid naval unit, assuming it's a valid unit.
     *
     * @param json  The JSON object to validate.
     * @param type  The type of unit.
     *
     * @returns True if it does, false if it doesn't.
     */
    static validateNavalUnitJson(json: object, type: string): json is Unit.Json {
        if(!("name" in json) || typeof(json.name) !== "string" || /["&<>]/.test(json.name)){
            console.warn("Invalid naval unit: invalid name.");
            return false;
        }
        else if("attack" in json && !(typeof(json.attack) === "number" && json.attack > 0)){
            console.warn(`Invalid naval unit ${json.name}: invalid attack.`);
            return false;
        }
        else if("submarineAttack" in json && !(typeof(json.submarineAttack) === "number" && json.submarineAttack > 0)){
            console.warn(`Invalid naval unit ${json.name}: invalid submarineAttack.`);
            return false;
        }
        else if(!("defense" in json) || typeof(json.defense) !== "number" || json.defense <= 0){
            console.warn(`Invalid naval unit ${json.name}: invalid defense.`);
            return false;
        }
        else if(!("movementAllowance" in json) || typeof(json.movementAllowance) !== "number" || json.movementAllowance <= 0){
            console.warn(`Invalid naval unit ${json.name}: invalid movement allowance.`);
            return false;
        }
        else if(!("inPort" in json) || typeof(json.inPort) !== "boolean"){
            console.warn(`Invalid naval unit ${json.name}: invalid inPort.`);
            return false;
        }
        else if(!("remainingSupply" in json) || typeof(json.remainingSupply) !== "number"){
            console.warn(`Invalid naval unit ${json.name}: invalid remainingSupply.`);
            return false;
        }
        else{
            return type !== "Convoy" || Convoy.validateConvoyJson(json)
        }
    }

    /**
     * Parses the given JSON object as a naval unit.
     *
     * @param json  The JSON object to parse.
     * @param owner The unit's owner.
     *
     * @returns The unit.
     */
    static navalUnitFromJson(json: Unit.Json, owner: CountryWithUnits): NavalUnit {
        const name = json.name!!;
        const attack = json.attack!!;
        const submarineAttack = json.submarineAttack!!;
        const defense = json.defense!!;
        const movementAllowance = json.movementAllowance!!;
        let unit: NavalUnit;
        switch(json.type){
        case "Battlecruiser":
            unit = new Battlecruiser(name, attack, defense, movementAllowance, owner);
            break;
        case "Battleship":
            unit = new Battleship(name, attack, defense, movementAllowance, owner);
            break;
        case "Carrier":
            unit = new Carrier(name, defense, movementAllowance, owner, null);
            break;
        case "Convoy":
            const convoy = new Convoy(owner);
            convoy.money = json.money ?? 0;
            convoy.destination = Countries.fromName(json.destination);
            unit = convoy;
            break;
        case "DestroyerEscort":
            unit = new DestroyerEscort(name, submarineAttack, defense, movementAllowance, owner);
            break;
        case "Destroyer":
            unit = new Destroyer(name, attack, defense, movementAllowance, owner);
            break;
        case "HeavyCruiser":
            unit = new HeavyCruiser(name, attack, defense, movementAllowance, owner);
            break;
        case "Kaibokan":
            unit = new Kaibokan(name, submarineAttack, defense, movementAllowance, owner);
            break;
        case "LightCruiser":
            unit = new LightCruiser(name, attack, defense, movementAllowance, owner);
            break;
        case "Submarine":
            unit = new Submarine(name, attack, defense, movementAllowance, owner);
            break;
        case "TransportShip":
            unit = new TransportShip(owner);
            break;
        default:
            throw new TypeError("Unknown unit type");
        }
        unit.#remainingSupply = json.remainingSupply!!;
        unit.#damaged = json.damaged ?? false;
        return unit;
    }
}
