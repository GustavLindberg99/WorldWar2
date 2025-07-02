import { addToMapOfSets } from "../../../utils.js";

import CountryWithUnits from "../country-with-units.js";

import { Hex } from "../../mapsheet.js";
import { Partnership } from "../../partnership.js";
import { Countries, Country } from "../../countries.js";
import { AirUnit, Armor, Battleship, Carrier, Destroyer, HeavyCruiser, Infantry, LightCruiser, Submarine, SupplyUnit, TransportShip } from "../../units.js";
import { date, Month, month } from "../../date.js";

export default class France extends CountryWithUnits {
    #hasAttemptedVichy: boolean = false;

    constructor(){
        super(Partnership.Allies);
        this.availableUnits = new Set([
            ...(new Array(80)).fill(null).map(() => new Infantry(1, 3, this)),
            ...(new Array(8)).fill(null).map(() => new Armor(1, 5, this)),
            ...(new Array(4)).fill(null).map(() => new SupplyUnit(3, this)),
            ...(new Array(2)).fill(null).map(() => new AirUnit("MS-406", this)),
            ...(new Array(2)).fill(null).map(() => new AirUnit("LeO-451", this)),
            new Destroyer("Jaguar", 1, 1, 50, this),
            new Destroyer("Bison", 1, 1, 51, this),
            new Destroyer("Aigle", 1, 1, 51, this),
            new Destroyer("Vauquelin", 1, 1, 51, this),
            new Destroyer("Le Fantasque", 1, 1, 53, this),
            new Destroyer("Mogador", 1, 1, 56, this),
            ...(new Array(2)).fill(null).map(() => new Destroyer("La Melpomène", 1, 1, 49, this)),
            new LightCruiser("Pluton", 1, 1, 43, this),
            new LightCruiser("Lamotte-Piquet", 1, 1, 47, this),
            new LightCruiser("Primauguet", 1, 1, 47, this),
            new LightCruiser("Jeanne d'Arc", 1, 1, 36, this),
            new LightCruiser("Marseillaise", 1, 1, 44, this),
            new LightCruiser("Jean de Vienne", 1, 1, 44, this),
            new LightCruiser("Duguay-Trouin", 1, 1, 47, this),
            new LightCruiser("La Galissonnière", 1, 1, 44, this),
            new LightCruiser("Émile Bertin", 1, 1, 49, this),
            new LightCruiser("Montcalm", 1, 1, 44, this),
            new LightCruiser("George Leygues", 1, 1, 44, this),
            new LightCruiser("Gloire", 1, 1, 44, this),
            new HeavyCruiser("Colbert", 3, 2, 46, this),
            new HeavyCruiser("Dupleix", 3, 2, 46, this),
            new HeavyCruiser("Suffren", 3, 2, 46, this),
            new HeavyCruiser("Foch", 3, 2, 46, this),
            new HeavyCruiser("Algérie", 3, 3, 44, this),
            new HeavyCruiser("Duquesne", 3, 3, 49, this),
            new HeavyCruiser("Tourville", 3, 3, 49, this),
            new Battleship("Courbet", 4, 4, 30, this),
            new Battleship("Océan", 4, 4, 30, this),
            new Battleship("Paris", 4, 4, 30, this),
            new Battleship("Bretagne", 4, 5, 29, this),
            new Battleship("Provence", 4, 5, 29, this),
            new Battleship("Lorraine", 4, 5, 29, this),
            new Battleship("Dunkerque", 4, 5, 42, this),
            new Battleship("Strasbourg", 4, 5, 42, this),
            new Battleship("Jean Bart", 6, 8, 46, this),
            new Battleship("Richelieu", 6, 8, 46, this),
            new Carrier("Béarn", 3, 31, this, new AirUnit("Latécoère 298", this)),
            new Submarine("Diane", 3, 2, 20, this),
            new Submarine("Minerve", 3, 2, 20, this),
            new Submarine("Requin", 3, 2, 22, this),
            new Submarine("Saphir", 3, 2, 17, this),
            ...(new Array(2)).fill(null).map(() => new Submarine("Redoutable", 3, 2, 29, this)),
            ...(new Array(4)).fill(null).map(() => new TransportShip(this))
        ]);
    }

    override addNewAvailableUnits(): void {
        if(this.conquered()){
            return;
        }
        for(let i = 0; i < 2; i++){
            this.availableUnits.add(new Infantry(1, 3, this));
        }

        if(this.enteredWar !== null && (month(date.current) % 2 === 0 || date.current >= this.enteredWar + 12)){
            for(let i = 0; i < 2; i++){
                this.availableUnits.add(new Armor(1, 5, this));
            }
        }

        if(date.current === this.enteredWar){
            for(let i = 0; i < 16; i++){
                this.availableUnits.add(new SupplyUnit(3, this));
            }
            for(let i = 0; i < 6; i++){
                this.availableUnits.add(new AirUnit("C-440 Goéland", this));
            }
            for(let i = 0; i < 10; i++){
                this.availableUnits.add(new TransportShip(this));
            }
            for(let i = 0; i < 25; i++){
                this.availableUnits.add(new Infantry(1, 3, this));
            }
        }

        if(date.current === date(1940, Month.January)){
            this.availableUnits.add(new AirUnit("C-714", this));
            this.availableUnits.add(new AirUnit("LeO-451", this));
        }
        if(date.current === date(1940, Month.April)){
            this.availableUnits.add(new AirUnit("LeO-451", this));
        }
        if(date.current === date(1940, Month.June)){
            this.availableUnits.add(new Carrier("Joffre", 3, 48, this, new AirUnit("Latécoère 298", this)));
            this.availableUnits.add(new AirUnit("C-714", this));
        }
        else if(date.current === date(1942, Month.June)){
            this.availableUnits.add(new Carrier("Painlevé", 3, 48, this, new AirUnit("Latécoère 298", this)));    //Planned but never built in real life
        }
    }

    protected override liberate(): void {
        //Liberating Vichy France
        if(this.partnership() === Partnership.Neutral){
            this.joinPartnership(Partnership.Allies);
        }

        super.liberate();
    }

    protected override shouldBeConquered(): boolean {
        return super.shouldBeConquered() || (this.#hasAttemptedVichy && this.partnership() === Partnership.Neutral);
    }

    protected override shouldBeLiberated(): boolean {
        //Liberating Vichy France
        if(this.partnership() === Partnership.Neutral){
            return this.cities.every(it => it.controller() === this || it.isColony || it.controller()!!.partnership() === Partnership.Allies);
        }
        else{
            return super.shouldBeLiberated();
        }
    }

    override additionalInvadedCountries(partnership: Partnership): Array<Country> {
        return [Countries.unitedKingdom].filter(it => it.canBeInvadedBy(partnership));
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.germany, Countries.unitedKingdom].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        if(this.#hasAttemptedVichy && this.partnership() !== Partnership.Allies){
            return "Vichy France";
        }
        else{
            return "France";
        }
    }

    override maxLandUnitStrength(): number {
        return 6;
    }

    override railCapacity(): number {
        return 3;
    }

    override color(): string {
        return "#f2f200";
    }

    /**
     * Checks if the given partnership can attempt to create Vichy France (always returns false if the Allies attempt to create Vichy France).
     *
     * @param partnership   The partnership attempting to create Vichy France.
     *
     * @returns True if the the given partnership can attempt to create Vichy France, false otherwise.
     */
    canAttemptVichy(partnership: Partnership): boolean {
        return partnership === Partnership.Axis && !this.#hasAttemptedVichy && !this.hasBeenConquered() && this.enteredWar !== null && date.current <= this.enteredWar + 24 && this.cities.some(it => it.city === "Paris" && it.controller()!!.partnership() === Partnership.Axis);
    }

    /**
     * Attempts to create Vichy France.
     *
     * @returns True if Vichy France was successfully created, false if it wasn't.
     */
    attemptVichy(): boolean {
        this.#hasAttemptedVichy = true;
        if(Math.random() < 0.25){
            return false;
        }
        else{
            this.createVichy();
            return true;
        }
    }

    /**
     * Creates Vichy France.
     *
     * Should only be called directly from the unit tests, otherwise attemptVichy() should be called. Public only so that the unit tests can test Vichy France without behaving randomly.
     */
    createVichy(): void {
        //Make France neutral (this needs to come first otherwise giving French hexes to the UK when they have the same partnership will do nothing)
        this.#hasAttemptedVichy = true;
        this.makeNeutral();

        //Give the countries control of the correct hexes
        for(let hex of Hex.allHexes){
            if(hex.country === this){
                if(hex.secondaryController === this){
                    hex.setController(this);
                    for(let unit of hex.units()){
                        unit.delete();
                        addToMapOfSets(unit.owner.delayedUnits, date.current, unit);
                    }
                }
                else{
                    hex.setController(hex.landUnits().find(it => it.owner !== this)?.owner ?? hex.secondaryController!!);
                }
            }
            else if(hex.controller() === this){
                hex.setController(Countries.unitedKingdom);
            }
        }

        this.conquerOrLiberate();
    }

    override toJson(): Country.Json {
        let json = super.toJson();
        json.hasAttemptedVichy = this.#hasAttemptedVichy || undefined;
        return json;
    }

    override loadFromJson(json: Country.Json): void {
        super.loadFromJson(json);
        this.#hasAttemptedVichy = json.hasAttemptedVichy ?? false;
    }
}
