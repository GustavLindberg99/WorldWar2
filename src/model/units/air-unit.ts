import Unit from "./unit.js";

import { Hex, SupplyLines } from "../mapsheet.js";
import { Partnership } from "../partnership.js";
import { Countries, CountryWithUnits } from "../countries.js";
import { AliveUnit, Carrier, NavalUnit } from "../units.js";

class AirUnit extends Unit {
    readonly fighterStrength: number;
    readonly bomberStrength: number;
    readonly kamikazeBaseStrength: number;    //The strength of the MXY-7 Ohka before tripling. Placed in a separate variable since it can't do regular bombing. Zero for all other air units (even regular Japanese bombers), use bomberStrength for those instead.
    readonly defense: number;
    readonly model: AirUnit.Model;
    readonly imageUrl: string;
    usedMovementPoints: number = 0;

    based: boolean = false;
    #outOfSupply: boolean = false;
    #damaged: boolean = false;

    constructor(model: AirUnit.Model, owner: CountryWithUnits){
        let fighterStrength: number;
        let bomberStrength: number;
        let kamikazeBaseStrength: number = 0;
        let defense: number;
        let movementAllowance: number;
        let imageUrl: string;

        switch(model){
            case "ME-110C":
            case "ME-110D":
                fighterStrength = 1;
                bomberStrength = 3;
                defense = 2;
                movementAllowance = model === "ME-110D" ? 16 : 12;
                imageUrl = "images/airplanes/me110.svg";
                break;
            case "ME-109":
                fighterStrength = 3;
                bomberStrength = 0;
                defense = 4;
                movementAllowance = 8;
                imageUrl = "images/airplanes/me109.svg";
                break;
            case "HE-111":
                fighterStrength = 0;
                bomberStrength = 4;
                defense = 1;
                movementAllowance = 24;
                imageUrl = "images/airplanes/he111.svg";
                break;
            case "HE-177":
                fighterStrength = 0;
                bomberStrength = 5;
                defense = 1;
                movementAllowance = 24;
                imageUrl = "images/airplanes/he177.svg";
                break;
            case "FW-190":
                fighterStrength = 4;
                bomberStrength = 0;
                defense = 5;
                movementAllowance = 8;
                imageUrl = "images/airplanes/fw190.svg";
                break;
            case "ME-262":
                fighterStrength = 6;
                bomberStrength = 0;
                defense = 7;
                movementAllowance = 4;
                imageUrl = "images/airplanes/me262.svg";
                break;
            case "FI-167":
                fighterStrength = 1;
                bomberStrength = 3;
                defense = 2;
                movementAllowance = 8;
                imageUrl = "images/airplanes/fi167.svg";
                break;
            case "JU-52":
                fighterStrength = 0;
                bomberStrength = 0;
                defense = 1;
                movementAllowance = 24;
                imageUrl = "images/airplanes/ju52.svg";
                break;
            case "Hurricane":
                fighterStrength = 2;
                bomberStrength = 0;
                defense = 3;
                movementAllowance = 10;
                imageUrl = "images/airplanes/hurricane.svg";
                break;
            case "Typhoon":
                fighterStrength = 3;
                bomberStrength = 3;
                defense = 4;
                movementAllowance = 8;
                imageUrl = "images/airplanes/typhoon.svg";
                break;
            case "Spitfire":
                fighterStrength = 3;
                bomberStrength = 0;
                defense = 4;
                movementAllowance = 6;
                imageUrl = "images/airplanes/spitfire.svg";
                break;
            case "Anson":
                fighterStrength = 0;
                bomberStrength = 3;
                defense = 1;
                movementAllowance = 24;
                imageUrl = "images/airplanes/anson.svg";
                break;
            case "Blenheim":
                fighterStrength = 0;
                bomberStrength = 4;
                defense = 1;
                movementAllowance = 24;
                imageUrl = "images/airplanes/blenheim.svg";
                break;
            case "Mosquito":
                fighterStrength = 1;
                bomberStrength = 5;
                defense = 1;
                movementAllowance = 32;
                imageUrl = "images/airplanes/mosquito.svg";
                break;
            case "Lancaster":
                fighterStrength = 0;
                bomberStrength = 7;
                defense = 2;
                movementAllowance = 24;
                imageUrl = "images/airplanes/lancaster.svg";
                break;
            case "Swordfish":
                fighterStrength = 1;
                bomberStrength = 3;
                defense = 2;
                movementAllowance = 8;
                imageUrl = "images/airplanes/swordfish.svg";
                break;
            case "Fulmar":
                fighterStrength = 2;
                bomberStrength = 3;
                defense = 3;
                movementAllowance = 8;
                imageUrl = "images/airplanes/fulmar.svg";
                break;
            case "Firefly":
                fighterStrength = 3;
                bomberStrength = 3;
                defense = 3;
                movementAllowance = 8;
                imageUrl = "images/airplanes/firefly.svg";
                break;
            case "Dragon Rapide":
                fighterStrength = 0;
                bomberStrength = 0;
                defense = 1;
                movementAllowance = 24;
                imageUrl = "images/airplanes/dragonrapide.svg";
                break;
            case "B-17 Flying Fortress":
                fighterStrength = 0;
                bomberStrength = 8;
                defense = 1;
                movementAllowance = 32;
                imageUrl = "images/airplanes/b17.svg";
                break;
            case "B-24 Liberator":
                fighterStrength = 0;
                bomberStrength = 10;
                defense = 2;
                movementAllowance = 32;
                imageUrl = "images/airplanes/b24.svg";
                break;
            case "B-25 Mitchell":
                fighterStrength = 0;
                bomberStrength = 5;
                defense = 1;
                movementAllowance = 14;
                imageUrl = "images/airplanes/b25.svg";
                break;
            case "B-26 Marauder":
                fighterStrength = 0;
                bomberStrength = 6;
                defense = 1;
                movementAllowance = 18;
                imageUrl = "images/airplanes/b26.svg";
                break;
            case "B-29 Superfortress":
                fighterStrength = 0;
                bomberStrength = 12;
                defense = 4;
                movementAllowance = 32;
                imageUrl = "images/airplanes/b29.svg";
                break;
            case "P-36 Hawk":
                fighterStrength = 2;
                bomberStrength = 0;
                defense = 3;
                movementAllowance = 6;
                imageUrl = "images/airplanes/p36.svg";
                break;
            case "P-38 Lightning":
                fighterStrength = 2;
                bomberStrength = 3;
                defense = 3;
                movementAllowance = 16;
                imageUrl = "images/airplanes/p38.svg";
                break;
            case "P-40 Warhawk":
                fighterStrength = 3;
                bomberStrength = 3;
                defense = 4;
                movementAllowance = 10;
                imageUrl = "images/airplanes/p40-warhawk.svg";
                break;
            case "P-40 Kittyhawk":
                fighterStrength = 2;
                bomberStrength = 3;
                defense = 2;
                movementAllowance = 6;
                imageUrl = "images/airplanes/p40-kittyhawk.svg";
                break;
            case "P-47 Thunderbolt":
                fighterStrength = 3;
                bomberStrength = 0;
                defense = 4;
                movementAllowance = 8;
                imageUrl = "images/airplanes/p47.svg";
                break;
            case "P-51 Mustang":
                fighterStrength = 4;
                bomberStrength = 0;
                defense = 5;
                movementAllowance = 12;
                imageUrl = "images/airplanes/p51.svg";
                break;
            case "F4F Wildcat":
                fighterStrength = 2;
                bomberStrength = 3;
                defense = 4;
                movementAllowance = 8;
                imageUrl = "images/airplanes/f4f.svg";
                break;
            case "F6F Hellcat":
                fighterStrength = 4;
                bomberStrength = 3;
                defense = 5;
                movementAllowance = 8;
                imageUrl = "images/airplanes/f6f.svg";
                break;
            case "DC-3":
                fighterStrength = 0;
                bomberStrength = 0;
                defense = 1;
                movementAllowance = 24;
                imageUrl = "images/airplanes/dc3.svg";
                break;
            case "MS-406":
                fighterStrength = 2;
                bomberStrength = 0;
                defense = 3;
                movementAllowance = 8;
                imageUrl = "images/airplanes/ms406.svg";
                break;
            case "C-714":
                fighterStrength = 3;
                bomberStrength = 0;
                defense = 4;
                movementAllowance = 6;
                imageUrl = "images/airplanes/c714.svg";
                break;
            case "LeO-451":
                fighterStrength = 0;
                bomberStrength = 3;
                defense = 1;
                movementAllowance = 20;
                imageUrl = "images/airplanes/leo451.svg";
                break;
            case "Latécoère 298":
                fighterStrength = 1;
                bomberStrength = 3;
                defense = 2;
                movementAllowance = 8;
                imageUrl = "images/airplanes/latecoere298.svg";
                break;
            case "C-440 Goéland":
                fighterStrength = 0;
                bomberStrength = 0;
                defense = 1;
                movementAllowance = 24;
                imageUrl = "images/airplanes/c440.svg";
                break;
            case "CR-32":
                fighterStrength = 1;
                bomberStrength = 0;
                defense = 2;
                movementAllowance = 8;
                imageUrl = "images/airplanes/cr32.svg";
                break;
            case "C-202":
                fighterStrength = 2;
                bomberStrength = 0;
                defense = 3;
                movementAllowance = 8;
                imageUrl = "images/airplanes/c202.svg";
                break;
            case "C-205":
                fighterStrength = 3;
                bomberStrength = 0;
                defense = 4;
                movementAllowance = 8;
                imageUrl = "images/airplanes/c205.svg";
                break;
            case "SM-79 Sparveiro":
                fighterStrength = 0;
                bomberStrength = 4;
                defense = 1;
                movementAllowance = 24;
                imageUrl = "images/airplanes/sm79.svg";
                break;
            case "IAR-80":
                fighterStrength = 1;
                bomberStrength = 3;
                defense = 2;
                movementAllowance = 12;
                imageUrl = "images/airplanes/iar80.svg";
                break;
            case "PZL P-11":
                fighterStrength = 1;
                bomberStrength = 0;
                defense = 1;
                movementAllowance = 12;
                imageUrl = "images/airplanes/p11.svg";
                break;
            case "Gladiator":
                fighterStrength = 1;
                bomberStrength = 3;
                defense = 2;
                movementAllowance = 8;
                imageUrl = "images/airplanes/gladiator.svg";
                break;
            case "IK-2":
                fighterStrength = 1;
                bomberStrength = 0;
                defense = 2;
                movementAllowance = 8;
                imageUrl = "images/airplanes/ik2.svg";
                break;
            case "J-22":
                fighterStrength = 2;
                bomberStrength = 3;
                defense = 3;
                movementAllowance = 10;
                imageUrl = "images/airplanes/j22.svg";
                break;
            case "S-16":
                fighterStrength = 1;
                bomberStrength = 3;
                defense = 2;
                movementAllowance = 6;
                imageUrl = "images/airplanes/s16.svg";
                break;
            case "I-16":
                fighterStrength = 1;
                bomberStrength = 0;
                defense = 1;
                movementAllowance = 10;
                imageUrl = "images/airplanes/i16.svg";
                break;
            case "LaGG-3":
                fighterStrength = 1;
                bomberStrength = 0;
                defense = 2;
                movementAllowance = 10;
                imageUrl = "images/airplanes/lagg3.svg";
                break;
            case "Yak-9":
                fighterStrength = 2;
                bomberStrength = 0;
                defense = 3;
                movementAllowance = 10;
                imageUrl = "images/airplanes/yak9.svg";
                break;
            case "Yer-2":
                fighterStrength = 0;
                bomberStrength = 4;
                defense = 1;
                movementAllowance = 20;
                imageUrl = "images/airplanes/yer2.svg";
                break;
            case "Tu-2":
                fighterStrength = 0;
                bomberStrength = 5;
                defense = 1;
                movementAllowance = 20;
                imageUrl = "images/airplanes/tu2.svg";
                break;
            case "Li-2":
                fighterStrength = 0;
                bomberStrength = 0;
                defense = 1;
                movementAllowance = 24;
                imageUrl = "images/airplanes/li2.svg";
                break;
            case "Beaufort":
                fighterStrength = 0;
                bomberStrength = 5;
                defense = 1;
                movementAllowance = 14;
                imageUrl = "images/airplanes/beaufort.svg";
                break;
            case "Boomerang":
                fighterStrength = 2;
                bomberStrength = 0;
                defense = 2;
                movementAllowance = 4;
                imageUrl = "images/airplanes/boomerang.svg";
                break;
            case "D.XXI":
                fighterStrength = 1;
                bomberStrength = 0;
                defense = 1;
                movementAllowance = 6;
                imageUrl = "images/airplanes/dxxi.svg";
                break;
            case "A5M":
                fighterStrength = 2;
                bomberStrength = 3;
                defense = 3;
                movementAllowance = 8;
                imageUrl = "images/airplanes/a5m.svg";
                break;
            case "A6M":
                fighterStrength = 3;
                bomberStrength = 3;
                defense = 4;
                movementAllowance = 8;
                imageUrl = "images/airplanes/a6m.svg";
                break;
            case "A7M":
                fighterStrength = 4;
                bomberStrength = 3;
                defense = 5;
                movementAllowance = 8;
                imageUrl = "images/airplanes/a7m.svg";
                break;
            case "L2D":
                fighterStrength = 0;
                bomberStrength = 0;
                defense = 1;
                movementAllowance = 20;
                imageUrl = "images/airplanes/l2d.svg";
                break;
            case "MXY-7 Ohka":
                fighterStrength = 0;
                bomberStrength = 0;
                kamikazeBaseStrength = 5;
                defense = 6;
                movementAllowance = 2;    //This is the only movement allowance that's not doubled because since he can only do kamikaze he can't come back
                imageUrl = "images/airplanes/mxy7.svg";
                break;
            case "P1Y Ginga":
                fighterStrength = 0;
                bomberStrength = 5;
                defense = 1;
                movementAllowance = 28;
                imageUrl = "images/airplanes/p1y.svg";
                break;
            case "Ki-21":
                fighterStrength = 0;
                bomberStrength = 5;
                defense = 1;
                movementAllowance = 16;
                imageUrl = "images/airplanes/ki21.svg";
                break;
            case "Ki-27":
                fighterStrength = 1;
                bomberStrength = 0;
                defense = 2;
                movementAllowance = 6;
                imageUrl = "images/airplanes/ki27.svg";
                break;
            case "Ki-43 Hayabusa":
                fighterStrength = 2;
                bomberStrength = 0;
                defense = 3;
                movementAllowance = 10;
                imageUrl = "images/airplanes/ki43.svg";
                break;
            case "Ki-46":
                fighterStrength = 3;
                bomberStrength = 0;
                defense = 4;
                movementAllowance = 12;
                imageUrl = "images/airplanes/ki67.svg";
                break;
            case "Ki-48-Ia":
            case "Ki-48-IIa":
            case "Ki-48-IIc":
                fighterStrength = 0;
                bomberStrength = 8;
                defense = model === "Ki-48-IIc" ? 2 : 1;
                movementAllowance = model === "Ki-48-IIa" ? 24 : 20;
                imageUrl = "images/airplanes/ki48.svg";
                break;
            case "Ki-67 Hiryu":
                fighterStrength = 0;
                bomberStrength = 6;
                defense = 2;
                movementAllowance = 16;
                imageUrl = "images/airplanes/ki67.svg";
                break;
            case "Ki-84 Hayate":
                fighterStrength = 4;
                bomberStrength = 0;
                defense = 5;
                movementAllowance = 8;
                imageUrl = "images/airplanes/ki84.svg";
                break;
        }

        super(movementAllowance, owner);

        this.fighterStrength = fighterStrength;
        this.bomberStrength = bomberStrength;
        this.kamikazeBaseStrength = kamikazeBaseStrength;
        this.defense = defense;
        this.model = model;
        this.imageUrl = imageUrl;
    }

    override setHex(hex: Hex): void {
        super.setHex(hex);
        this.based = false;
    }

    override embarkOnto(unit: Unit): void {
        super.embarkOnto(unit);
        this.based = true;
    }

    override delete(): void {
        super.delete();
        this.#damaged = false;
        this.usedMovementPoints = 0;
    }

    override die(): void {
        for(let unit of this.embarkedUnits()){
            unit.die();
        }
        if(this.based){
            this.owner.availableUnits.add(this);
        }
        this.delete();
    }

    override type(): string {
        let types: Array<string> = [];
        if(this.isFighter()){
            types.push("Fighter");
        }
        if(this.isBomber()){
            types.push("Bomber");
        }
        if(this.isTransportUnit()){
            types.push("Transport");
        }
        if(this.model === "MXY-7 Ohka"){
            types = ["Kamikaze only"];
        }
        return `Air unit (${(this.carrierBased() ? "Carrier-based " : "") + types.join("-")})`;
    }

    override price(): number {
        if(this.isFighter()){
            return 800;
        }
        else if(this.isBomber()){
            return 600;
        }
        else{
            return 300;
        }
    }

    override delay(): number {
        if(this.isFighter() || this.isBomber()){
            return 4;
        }
        else{
            return 2;
        }
    }

    override outOfSupply(): boolean {
        if(this.#outOfSupply){
            this.#updateSupply();
        }
        return this.#outOfSupply;
    }

    override updateSupply(): boolean {
        this.#updateSupply();
        return this.embarkedUnits().values().some(it => it.updateSupply());
    }

    /**
     * Updates the supply of this unit without updating the supply of embarked units.
     */
    #updateSupply(): void {
        const hex = this.hex();
        if(hex === null){
            this.#outOfSupply = false;
        }
        else if(this.based){
            this.#outOfSupply = this.embarkedOn()?.outOfSupply() ?? !SupplyLines.canTraceSupplyLine(hex, this.owner);
        }
        else{
            this.#outOfSupply = true;
        }
    }

    override canAttack(unit: Unit | null = null): boolean {
        let result = false;
        if(this.isFighter()){
            result ||= unit === null || unit instanceof AirUnit;
        }
        if(this.isBomber()){
            result ||= unit === null || !(unit instanceof AirUnit);
        }
        if(this.canDoKamikaze()){
            result ||= unit === null || unit instanceof NavalUnit;
        }
        return super.canAttack(unit) && result;
    }

    override canAttackInHex(unit: AliveUnit & Unit): boolean {
        return super.canAttackInHex(unit) && this.isAlive() && !this.based && this.hex() === unit.hex() && this.embarkedOn() === null && unit.embarkedOn() === null;
    }

    override modifiedLandAttack(): number {
        return this.bomberStrength / (this.damaged() ? 2 : 1);
    }

    override canEnterHexWithinStackingLimits(hex: Hex, otherUnits: IteratorObject<Unit> = hex.units()): boolean {
        const otherUnitsArray: ReadonlyArray<Unit> = [...otherUnits];
        return otherUnitsArray.filter(it =>
            it !== this
            && it instanceof AirUnit
            && (it.based || (otherUnitsArray.includes(it) && it.hex() !== hex) || !it.isAlive())
        ).length < hex.airbaseCapacity();
    }

    override validateMovement(passedHexes: ReadonlyArray<Hex>, _movingByRail: boolean): boolean {
        return passedHexes.length + this.usedMovementPoints - 1 <= this.movementAllowance
            && passedHexes.every((it, i) => i === 0 || it.adjacentHexes().includes(passedHexes[i - 1]))
            && this.validateMovementThroughNeutralCountries(passedHexes)
            && passedHexes.every(it => !it.airUnitsGrounded());
    }

    override canEmbarkOnto(unit: Unit): boolean {
        return this.carrierBased() && unit instanceof Carrier && !unit.damaged() && unit.owner.partnership() === this.owner.partnership();
    }

    override sameTypeAndStrength(other: Unit): boolean {
        return this.owner === other.owner && other instanceof AirUnit && this.model === other.model;
    }

    override sameBasicType(other: Unit): boolean {
        return other instanceof AirUnit && other.owner.partnership() === this.owner.partnership() && other.based === this.based;
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
     * Checks whether this type of air unit can take damage without being eliminated. Does not take into account current damaged state.
     *
     * @returns True if it can take damage, false if it can't and would be eliminated directly if damaged.
     */
    canTakeDamage(): boolean {
        return !this.damaged() && this.model !== "ME-262" && this.model !== "MXY-7 Ohka";
    }

    /**
     * Repairs the unit if damaged, otherwise does nothing.
     */
    repair(): void {
        this.#damaged = false;
    }

    /**
     * Checks if this air unit is carrier based.
     *
     * @returns True if this air unit is carrier based, false if it isn't.
     */
    carrierBased(): boolean {
        return /^(FI-167|Swordfish|Fulmar|Firefly|F4F Wildcat|F6F Hellcat|Latécoère 298|A[567]M|MXY-7 Ohka)$/.test(this.model);    //Source that Ohka kamikaze are carrier based: https://en.wikipedia.org/wiki/Japanese_aircraft_carrier_Ry%C5%ABh%C5%8D
    }

    /**
     * Checks if this air unit is a transport unit.
     *
     * @returns True if this air unit is a transport unit, false if it isn't.
     */
    isTransportUnit(): boolean {
        return /^(JU-52|Dragon Rapide|DC-3|Li-2|L2D|C-440 Goéland|SM-79 Sparveiro)$/.test(this.model);
    }

    /**
     * Checks if this air unit is a fighter.
     *
     * @returns True if this air unit is a fighter, false if it isn't.
     */
    isFighter(): boolean {
        return this.fighterStrength > 0;
    }

    /**
     * Checks if this air unit is a bomber.
     *
     * @returns True if this air unit is a bomber, false if it isn't.
     */
    isBomber(): boolean {
        return this.bomberStrength > 0 || this.kamikazeBaseStrength > 0;
    }

    /**
     * Checks if this unit can do a kamikaze attack.
     *
     * @returns True if it can do a kamikaze attack, false if it can't.
     */
    canDoKamikaze(): boolean {
        return this.owner === Countries.japan && (this.isBomber() || this.kamikazeBaseStrength > 0) && Countries.japan.cities.some(it => it.controller()!!.partnership() === Partnership.Allies);
    }

    /**
     * Checks if this unit can do installation bombing in the given hex.
     *
     * @param hex   The hex to bomb.
     *
     * @returns Null if bombing is possible, otherwise a human-readable string explaining why not.
     */
    canDoInstallationBombing(hex: Hex): string | null {
        if(this.bomberStrength === 0){
            return "Only bombers can bomb.";
        }
        else if(hex.controller()?.partnership() !== this.owner.partnership()?.opponent()){
            return "You can only bomb hexes your opponent controls.";
        }
        else if(hex.airbaseCapacity() === 0 && !hex.fortified()){
            return "There's nothing to bomb in this hex.";
        }
        else if(this.hasAttacked){
            return "This unit has already attacked this turn.";
        }
        else{
            return null;
        }
    }

    /**
     * Checks if this unit can do strategic bombing in the given hex.
     *
     * @param hex   The hex to bomb.
     *
     * @returns Null if bombing is possible, otherwise a human-readable string explaining why not.
     */
    canDoStrategicBombing(hex: Hex): string | null {
        if(this.bomberStrength === 0){
            return "Only bombers can bomb.";
        }
        else if(hex.controller()?.partnership() !== this.owner.partnership()?.opponent()){
            return "You can only bomb hexes your opponent controls.";
        }
        else if(!hex.isResourceHex){
            return "You can only do strategic bombing in resource hexes.";
        }
        else if(hex.resourceHexDestroyed || hex.destroyedByAtomicBomb){
            return "This resource hex is already destroyed.";
        }
        else if(this.hasAttacked){
            return "This unit has already attacked this turn.";
        }
        else{
            return null;
        }
    }

    /**
     * Checks if this unit can drop an atomic bomb in the given hex.
     *
     * @param hex   The hex to bomb.
     *
     * @returns Null if bombing is possible, otherwise a human-readable string explaining why not.
     */
    canDoAtomicBombing(hex: Hex): string | null {
        if(!["B-29 Superfortress", "Ki-48-IIc", "HE-177", "Tu-2", "Lancaster"].includes(this.model)){
            return "This air unit model can't drop atomic bombs.";
        }
        else if(!this.owner.hasAtomicBomb()){
            return `${this.owner.name()} doesn't have an atomic bomb yet.`;
        }
        else if(this.owner.hasUsedAtomicBombThisTurn){
            return `${this.owner.name()} has already used the atomic bomb this turn.`;
        }
        else if(hex.controller()?.partnership() !== this.owner.partnership()?.opponent()){
            return "You can only bomb hexes your opponent controls.";
        }
        else if(hex.destroyedByAtomicBomb){
            return "This hex is already destroyed.";
        }
        else if(this.hasAttacked){
            return "This unit has already attacked this turn.";
        }
        else{
            return null;
        }
    }

    override toJson(): Unit.Json {
        let json = super.toJson();
        json.outOfSupply = this.#outOfSupply || undefined;
        json.damaged = this.#damaged || undefined;
        json.model = this.model;
        json.usedMovementPoints = this.usedMovementPoints || undefined;
        json.based = this.based;
        return json;
    }

    /**
     * Checks if the given JSON contains a valid air unit, assuming it's a valid unit.
     *
     * @param json  The JSON object to validate.
     *
     * @returns True if it does, false if it doesn't.
     */
    static validateAirUnitJson(json: object): json is Unit.Json {
        const models: ReadonlyArray<unknown> = AirUnit.models;
        if(!("model" in json) || !models.includes(json.model)){
            console.warn("Invalid air unit: invalid model.");
            return false;
        }
        else if(!("based" in json) || typeof(json.based) !== "boolean"){
            console.warn("Invalid air unit: invalid based.");
            return false;
        }
        else if("usedMovementPoints" in json && !(typeof(json.usedMovementPoints) === "number" && json.usedMovementPoints >= 0)){
            console.warn("Invalid air unit: invalid usedMovementPoints.");
            return false;
        }
        else{
            return true;
        }
    }

    /**
     * Parses the given JSON object as an air unit.
     *
     * @param json  The JSON object to parse.
     * @param owner The unit's owner.
     *
     * @returns The unit.
     */
    static airUnitFromJson(json: Unit.Json, owner: CountryWithUnits): AirUnit {
        const unit = new AirUnit(json.model!!, owner);
        unit.#outOfSupply = json.outOfSupply ?? false;
        unit.#damaged = json.damaged ?? false;
        unit.usedMovementPoints = json.usedMovementPoints ?? 0;
        return unit;
    }
}

namespace AirUnit {
    export const models = ["ME-110C", "ME-110D", "ME-109", "HE-111", "HE-177", "FW-190", "ME-262", "FI-167", "JU-52", "Hurricane", "Typhoon", "Spitfire", "Anson", "Blenheim", "Mosquito", "Lancaster", "Swordfish", "Fulmar", "Firefly", "Dragon Rapide", "B-17 Flying Fortress", "B-24 Liberator", "B-25 Mitchell", "B-26 Marauder", "B-29 Superfortress", "P-36 Hawk", "P-38 Lightning", "P-40 Warhawk", "P-40 Kittyhawk", "P-47 Thunderbolt", "P-51 Mustang", "F4F Wildcat", "F6F Hellcat", "DC-3", "MS-406", "C-714", "LeO-451", "Latécoère 298", "C-440 Goéland", "CR-32", "C-202", "C-205", "SM-79 Sparveiro", "IAR-80", "PZL P-11", "Gladiator", "IK-2", "J-22", "S-16", "I-16", "LaGG-3", "Yak-9", "Yer-2", "Tu-2", "Li-2", "Beaufort", "Boomerang", "D.XXI", "A5M", "A6M", "A7M", "L2D", "MXY-7 Ohka", "P1Y Ginga", "Ki-21", "Ki-27", "Ki-43 Hayabusa", "Ki-46", "Ki-48-Ia", "Ki-48-IIa", "Ki-48-IIc", "Ki-67 Hiryu", "Ki-84 Hayate"] as const;
    export type Model = typeof models[number];
}

export default AirUnit;
