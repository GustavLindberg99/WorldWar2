import { addToMapOfSets } from "../../utils.js";

import { Countries } from "../countries.js";
import { date, Month } from "../date.js";
import { Hex } from "../mapsheet.js";
import { Partnership } from "../partnership.js";
import { Convoy, Unit } from "../units.js";

import UnitContainer from "../unit-container.js";

abstract class Country extends UnitContainer {
    money: number = 0;
    gotMoneyFromConvoys: boolean = false;
    cities: Array<Hex> = [];
    hexes: Array<Hex> = [];
    enteredWar: number | null = null;
    atomicBombCount: number = 0;
    surrenderedFromAtomicBomb: Country | null = null;    //Country that dropped the atomic bomb
    hasUsedAtomicBombThisTurn: boolean = false;

    #partnership: Partnership | null = Partnership.Neutral;
    #preferredPartnership: Partnership | null;
    #conquered: boolean = false;
    #hasBeenConquered: boolean = false;

    delayedUnits = new Map<number, Set<Unit>>();    //Has the date as key and a set with units as value
    availableUnits = new Set<Unit>();

    /**
     * Constructs a country.
     *
     * @param name                  The country's name.
     * @param color                 The color of the country's units. Null if the country doesn't have any units.
     * @param preferredPartnership  The partnership that's not allowed to declare war on this country. Neutral if any partnership is allowed to declare war on this country.
     */
    constructor(preferredPartnership: Partnership | null){
        super();
        this.#preferredPartnership = preferredPartnership;
    }

    /**
     * Adds the units that should be added to all countries' available units at the current date.
     */
    addNewAvailableUnits(): void {
        //Override in subclasses for countries that have units
    }

    /**
     * Gets the capital of this country.
     *
     * @returns The capital of this country.
     */
    capital(): Hex {
        return this.cities.find(it => it.isCapital)!!;
    }

    /**
     * Gets the country's partnership.
     *
     * @returns The country's partnership.
     */
    partnership(): Partnership | null {
        return this.#partnership;
    }

    /**
     * Makes the country join a partnership.
     *
     * @param partnership The partnership to join.
     */
    joinPartnership(partnership: Partnership): void {
        if(this.partnership() !== Partnership.Neutral){
            //Do nothing, since this can happen if a country joins a partnership as a result of an invasion (for example Germany invades Poland which makes the UK join the Allies but the UK is already part of the Allies)
            return;
        }

        if(partnership === Partnership.Axis){
            //Vichy France is no longer conquered when joining the Axis (this is only relevant for Vichy France as it's they only country that can be both conquered and neutral at the same time)
            this.#conquered = false;
        }

        this.#partnership = this.#preferredPartnership = partnership;
        this.enteredWar = date.current;
        this.delayedUnits.set(date.current, this.availableUnits);
        this.availableUnits = new Set();

        //Countries that enter the war when this country is invaded
        for(let country of this.additionalInvadedCountries(partnership.opponent())){
            country.joinPartnership(partnership);
        }
    }

    /**
     * Makes the country neutral by setting the partnership and deleting its money and units.
     */
    protected makeNeutral(): void {
        this.#partnership = Partnership.Neutral;
        this.#preferredPartnership = Partnership.Neutral;
        this.money = 0;
        for(let unit of [...this.units()]){    //Iterate over a clone to avoid problems with elements being removed
            unit.die();
        }
    }

    /**
     * Checks if this country is conquered.
     *
     * @returns True if the country is conquered, false otherwise.
     */
    conquered(): boolean {
        return this.#conquered;
    }

    /**
     * Checks if a country has been conquered.
     *
     * @returns True if the country has been conquered, false otherwise.
     */
    hasBeenConquered(): boolean {
        return this.#hasBeenConquered;
    }

    /**
     * Conquers the country if it doesn't control any of its city hexes, and liberates the country if it's already conquered but has gotten back at least one city hex.
     */
    conquerOrLiberate(): void {
        //Conquer
        if(this.shouldBeConquered() && !this.#conquered){
            this.conquer();
        }

        //Liberate
        else if(this.shouldBeLiberated() && this.#conquered){
            this.liberate();
        }
    }

    /**
     * Conquers the country. Should not be called directly, call conquerOrLiberate() instead. Exists so that functionality can be added in subclasses.
     */
    protected conquer(): void {
        this.money = 0;

        const china: Country = Countries.china;
        if(this !== china && this.partnership() !== Partnership.Neutral){
            for(let hex of Hex.allHexes){
                if(hex.controller() === this){
                    const conquerer = this.capital().controller()!!;
                    const friendlyCountry = Countries.all()
                        .filter(it => !it.conquered() && it.partnership() === this.partnership())
                        .toSorted((a, b) => [...b.units()].length - [...a.units()].length)[0];
                    const [landUnit] = hex.landUnits();
                    if(landUnit !== undefined){
                        hex.setController(landUnit.owner);
                    }
                    else if(hex.country === this){
                        const denmark: Country = Countries.denmark;
                        const belgium: Country = Countries.belgium;
                        if(hex.isColony && this === denmark){
                            hex.setController(hex.secondaryController!!);
                            if(hex.secondaryController === Partnership.Neutral){
                                for(let unit of hex.units()){
                                    unit.delete();
                                    addToMapOfSets(unit.owner.delayedUnits, date.current, unit);
                                }
                            }
                        }
                        else if(hex.isColony && this === belgium){
                            hex.setController(Countries.unitedKingdom);
                        }
                        else{
                            hex.setController(conquerer);
                        }
                    }
                    else{
                        hex.setController(friendlyCountry ?? conquerer);
                    }
                }
            }
        }

        for(let convoy of Unit.allAliveUnits().filter(it => it instanceof Convoy)){
            if(convoy.destination === this){
                convoy.destination = convoy.owner;
            }
        }

        //Units are taken care of in the CountryWithUnits class

        this.#conquered = true;
        this.#hasBeenConquered = true;
    }

    /**
     * Liberates the country. Should not be called directly, call conquerOrLiberate() instead. Exists so that functionality can be added in subclasses.
     */
    protected liberate(): void {
        //Liberated forces are taken care of in the CountryWithUnits class

        for(let hex of this.hexes){
            if(!hex.landUnits().some(it => it.owner.partnership() !== this.partnership())){
                hex.setController(this);
            }
        }

        this.#conquered = false;
    }

    /**
     * Checks if the country fulfills the requirements to be conquered.
     *
     * @returns True if it should be conquered, false if it shouldn't.
     */
    protected shouldBeConquered(): boolean {
        const countriesConqueredWithoutColonies: ReadonlyArray<Country> = [Countries.belgium, Countries.denmark, Countries.italy];
        return this.surrenderedFromAtomicBomb !== null
            || this.cities.every(it => it.controller()!!.partnership() !== this.partnership() || (it.isColony && countriesConqueredWithoutColonies.includes(this)));
    }

    /**
     * Checks if the country fulfills the requirements to be conquered.
     *
     * @returns True if it should be conquered, false if it shouldn't.
     */
    protected shouldBeLiberated(): boolean {
        return this.surrenderedFromAtomicBomb === null
            && this.cities.every(it => it.controller()!!.partnership() === this.partnership() || it.isColony);
    }

    /**
     * Checks if this country can be invaded by the given partnership.
     *
     * @param partnership The partnership attempting to invade this country.
     *
     * @returns True if the partnership can invade this country, false otherwise.
     */
    canBeInvadedBy(partnership: Partnership): boolean {
        const countriesBorderingChina: ReadonlyArray<Country> = [Countries.tibet, Countries.mongolia, Countries.afghanistan, Countries.sovietUnion];
        return this.partnership() === Partnership.Neutral &&
            //Don't invade friendly countries
            this.#preferredPartnership !== partnership &&
            //China may not declare war on just anyone
            (
                partnership === Partnership.Axis
                || countriesBorderingChina.includes(this)
                || Countries.all().some(it => it.partnership() === partnership && it !== Countries.china)
            );
    }

    /**
     * Gets the other countries that get invaded if this country gets invaded. Does not need to be called after joinPartnership() since it's called automatically.
     *
     * @param partnership   The partnership attempting to invade this country.
     *
     * @returns An array of countries.
     */
    additionalInvadedCountries(_partnership: Partnership): Array<Country> {
        //Override in subclasses for countries that can't be invaded without invading other countries
        return [];
    }

    /**
     * Checks if this country can be activated by the given partnership.
     *
     * @param partnership The partnership attempting to activate this country.
     *
     * @returns True if the partnership can activate this country, false otherwise.
     */
    canBeActivated(_partnership: Partnership): boolean {
        //Override in subclasses for countries that can be activated
        return false;
    }

    /**
     * Checks if this country has the atomic bomb.
     *
     * @returns True if it does, false if it doesn't.
     */
    hasAtomicBomb(): boolean {
        return false;    //Override in subclasses for countries that can have the atomic bomb
    }

    /**
     * Gets this country's current income.
     *
     * @returns This country's current income.
     */
    income(): number {
        return Hex.allResourceHexes.filter(it => it.controller() === this && !it.resourceHexDestroyed).length * 50;
    }

    /**
     * Gets the largest amount of money this country can send to other countries during one game turn. Overridden in some subclasses.
     *
     * @returns The largest amount of money this country can send to other countries during one game turn.
     */
    maxMoneyExchange(): number {
        return this.money;
    }

    /**
     * Gets the countries that this country can send money to without convoys.
     *
     * @returns The countries that this country can send money to without convoys.
     */
    canSendMoneyWithoutConvoys(): Array<Country> {
        return [];
    }

    /**
     * Gets the countries that this country can send money to with convoys.
     *
     * @returns The countries that this country can send money to with convoys.
     */
    canSendMoneyWithConvoys(): Array<Country> {
        return [];
    }

    /**
     * Gets all the resource hexes in this country that this country controls and that aren't destroyed by strategic bombing.
     *
     * @returns An array of resource hexes.
     */
    protected homelandResourceHexes(): Array<Hex> {
        return Hex.allResourceHexes.filter(it =>
            it.country === this
            && it.controller() === this
            && !it.isColony
            && !it.resourceHexDestroyed
        );
    }

    /**
     * Checks if this country is at war against the given partnership.
     *
     * @returns True if country is at war against the given partnership, false otherwise.
     */
    isEnemy(partnership: Partnership): boolean {
        return this.partnership() !== partnership && this.partnership() !== Partnership.Neutral && partnership !== Partnership.Neutral;
    }

    /**
     * Gets the country's rail capacity.
     */
    railCapacity(): number {
        return 0;
    }

    /**
     * Gets this country's name.
     */
    abstract name(): string;

    /**
     * Serializes the country to a JSON object.
     *
     * @returns An object containing information about this country that can be stringified to JSON.
     */
    toJson(): Country.Json {
        let json: Country.Json = {
            name: this.name(),
            money: this.money,
            partnership: this.#partnership?.name,
            preferredPartnership: this.#preferredPartnership?.name,
            gotMoneyFromConvoys: this.gotMoneyFromConvoys || undefined,
            enteredWar: this.enteredWar ?? undefined,
            atomicBombCount: this.atomicBombCount || undefined,
            surrenderedFromAtomicBomb: this.surrenderedFromAtomicBomb?.name(),
            hasUsedAtomicBombThisTurn: this.hasUsedAtomicBombThisTurn || undefined,
            conquered: this.#conquered || undefined,
            hasBeenConquered: this.#hasBeenConquered || undefined
        };
        if(this.delayedUnits.size > 0){
            json.delayedUnits = [...this.delayedUnits].map(([month, units]) => [month, [...units.values().map(it => it.toJson())]]);
        }
        if(this.availableUnits.size > 0){
            json.availableUnits = [...this.availableUnits.values().map(it => it.toJson())];
        }
        const unitsJson = [...this.units().filter(it => it.embarkedOn() === null).map(it => it.toJson())];
        if(unitsJson.length > 0){
            json.units = unitsJson;
        }
        return json;
    }

    /**
     * Checks if the given JSON contains valid country info.
     *
     * @param json  The JSON object to validate.
     *
     * @returns True if it does, false if it doesn't.
     */
    static validateJson(json: unknown): json is Country.Json {
        const partnerships: ReadonlyArray<unknown> = ["Axis", "Allies", "Neutral"];
        if(typeof(json) !== "object" || json === null){
            console.warn("Invalid country.");
            return false;
        }
        else if(!("name" in json) || Countries.fromName(json.name) === null){
            console.warn("Invalid country: invalid name.");
            return false;
        }
        else if(!("money" in json) || typeof(json.money) !== "number"){
            console.warn(`Invalid country ${json.name}: invalid money.`);
            return false;
        }
        else if("partnership" in json && !partnerships.includes(json.partnership)){
            console.warn(`Invalid country ${json.name}: invalid partnership.`);
            return false;
        }
        else if("preferredPartnership" in json && !partnerships.includes(json.preferredPartnership)){
            console.warn(`Invalid country ${json.name}: invalid preferred partnership.`);
            return false;
        }
        else if("delayedUnits" in json && !(json.delayedUnits instanceof Array && json.delayedUnits.every(it => it instanceof Array && it.length === 2 && typeof(it[0]) === "number" && it[1] instanceof Array && it[1].every(unitJson => Unit.validateJson(unitJson) && unitJson.owner === json.name && !("hex" in unitJson) && (unitJson.strength === undefined || unitJson.strength <= 1))))){
            console.warn(`Invalid country ${json.name}: invalid delayed units.`);
            return false;
        }
        else if("availableUnits" in json && !(json.availableUnits instanceof Array && json.availableUnits.every(it => Unit.validateJson(it) && it.owner === json.name && !("hex" in it) && (it.strength === undefined || it.strength <= 1)))){
            console.warn(`Invalid country ${json.name}: invalid available units.`);
            return false;
        }
        else if("liberatedForces" in json && !(json.liberatedForces instanceof Array && json.liberatedForces.every(it => Unit.validateJson(it) && it.owner === json.name && !("hex" in it) && it.type === "Infantry" && it.strength === 1))){
            console.warn(`Invalid country ${json.name}: invalid liberated forces.`);
            return false;
        }
        else if("units" in json && !(json.units instanceof Array && json.units.every(it => Unit.validateJson(it) && it.owner === json.name && "hex" in it))){
            console.warn(`Invalid country ${json.name}: invalid units.`);
            return false;
        }
        else if("gotMoneyFromConvoys" in json && typeof(json.gotMoneyFromConvoys) !== "boolean"){
            console.warn(`Invalid country ${json.name}: invalid gotMoneyFromConvoys.`);
            return false;
        }
        else if("enteredWar" in json && !(typeof(json.enteredWar) === "number" && json.enteredWar >= date(1937, Month.June))){
            console.warn(`Invalid country ${json.name}: invalid enteredWar.`);
            return false;
        }
        else if("atomicBombCount" in json && !(typeof(json.atomicBombCount) === "number" && json.atomicBombCount >= 0)){
            console.warn(`Invalid country ${json.name}: invalid atomic bomb count.`);
            return false;
        }
        else if("surrenderedFromAtomicBomb" in json && Countries.fromName(json.surrenderedFromAtomicBomb) === null){
            console.warn(`Invalid country ${json.name}: invalid surrenderedFromAtomicBomb.`);
            return false;
        }
        else if("hasUsedAtomicBombThisTurn" in json && typeof(json.hasUsedAtomicBombThisTurn) !== "boolean"){
            console.warn(`Invalid country ${json.name}: invalid hasUsedAtomicBombThisTurn.`);
            return false;
        }
        else if("conquered" in json && typeof(json.conquered) !== "boolean"){
            console.warn(`Invalid country ${json.name}: invalid conquered.`);
            return false;
        }
        else if("hasBeenConquered" in json && typeof(json.hasBeenConquered) !== "boolean"){
            console.warn(`Invalid country ${json.name}: invalid hasBeenConquered.`);
            return false;
        }
        else if("hasAttemptedVichy" in json && typeof(json.hasAttemptedVichy) !== "boolean"){
            console.warn(`Invalid country ${json.name}: invalid hasAttemptedVichy.`);
            return false;
        }
        else if("hasAttemptedActivation" in json && typeof(json.hasAttemptedActivation) !== "boolean"){
            console.warn(`Invalid country ${json.name}: invalid hasAttemptedActivation.`);
            return false;
        }
        else if("hasReceivedExtraArmor" in json && typeof(json.hasReceivedExtraArmor) !== "boolean"){
            console.warn(`Invalid country ${json.name}: invalid hasReceivedExtraArmor.`);
            return false;
        }
        else{
            return true;
        }
    }

    /**
     * Parses the given JSON object as country info and updates this country with that info.
     *
     * @param json  The JSON object to parse.
     */
    loadFromJson(json: Country.Json): void {
        this.money = json.money;
        this.#partnership = Partnership[json.partnership ?? "Neutral"];
        this.#preferredPartnership = Partnership[json.preferredPartnership ?? "Neutral"];
        this.delayedUnits = new Map(json.delayedUnits?.map(([enterDate, units]) => [enterDate, new Set(units.map(it => Unit.fromJson(it)))]));
        this.availableUnits = new Set(json.availableUnits?.map(it => Unit.fromJson(it)));
        for(let unitJson of json.units ?? []){
            Unit.fromJson(unitJson);    //Automatically sets the hex of the units which is where this.units() gets its info from
        }
        this.gotMoneyFromConvoys = json.gotMoneyFromConvoys ?? false;
        this.enteredWar = json.enteredWar ?? null;
        this.atomicBombCount = json.atomicBombCount ?? 0;
        this.surrenderedFromAtomicBomb = Countries.fromName(json.surrenderedFromAtomicBomb);
        this.hasUsedAtomicBombThisTurn = json.hasUsedAtomicBombThisTurn ?? false;
        this.#conquered = json.conquered ?? false;
        this.#hasBeenConquered = json.hasBeenConquered ?? false;
    }
}

namespace Country {
    export type Json = {
        name: string,
        money: number,
        partnership?: "Axis" | "Allies",
        preferredPartnership?: "Axis" | "Allies",
        delayedUnits?: Array<[number, Array<Unit.Json>]>,
        availableUnits?: Array<Unit.Json>,
        liberatedForces?: Array<Unit.Json>,
        units?: Array<Unit.Json>,
        gotMoneyFromConvoys?: boolean,
        enteredWar?: number,
        atomicBombCount?: number,
        surrenderedFromAtomicBomb?: string,
        hasUsedAtomicBombThisTurn?: boolean,
        conquered?: boolean,
        hasBeenConquered?: boolean,
        hasAttemptedVichy?: boolean,
        hasAttemptedActivation?: boolean,
        hasReceivedExtraArmor?: boolean
    };
}

export default Country;
