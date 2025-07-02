import CountryWithUnits from "../country-with-units.js";

import { Countries, Country } from "../../countries.js";
import { currentYear, date, Month, month, year } from "../../date.js";
import { Partnership } from "../../partnership.js";
import { AirUnit, Armor, Battleship, Carrier, Destroyer, HeavyCruiser, Infantry, LightCruiser, Paratrooper, Submarine, SupplyUnit, TransportShip } from "../../units.js";

export default class Germany extends CountryWithUnits {
    constructor(){
        super(Partnership.Axis);
        this.availableUnits = new Set([
            ...(new Array(100)).fill(null).map(() => new Infantry(1, 3, this)),
            ...(new Array(4)).fill(null).map(() => new SupplyUnit(3, this)),
            ...(new Array(2)).fill(null).map(() => new AirUnit("ME-109", this)),
            ...(new Array(2)).fill(null).map(() => new AirUnit("ME-110C", this)),
            ...(new Array(2)).fill(null).map(() => new AirUnit("HE-111", this)),
            ...(new Array(2)).fill(null).map(() => new AirUnit("JU-52", this)),    //ATP
            ...(new Array(4)).fill(null).map(() => new Destroyer("1934", 1, 2, 52, this)),
            new LightCruiser("Emden", 1, 1, 42, this),
            new LightCruiser("Karlsruhe", 1, 1, 46, this),
            new LightCruiser("Köln", 1, 1, 46, this),
            new LightCruiser("Königsberg", 1, 1, 46, this),
            new LightCruiser("Leipzig", 1, 1, 46, this),
            new LightCruiser("Nürnberg", 1, 1, 46, this),
            new HeavyCruiser("Admiral Graf Spee", 4, 5, 41, this),
            new HeavyCruiser("Admiral Scheer", 4, 5, 41, this),
            new HeavyCruiser("Deutschland", 4, 5, 41, this),
            new Battleship("Schlesien", 3, 2, 26, this),
            new Battleship("Schleswig-Holstein", 3, 2, 26, this),
            new Battleship("Gneisenau", 4, 8, 44, this),
            new Submarine("IIA", 3, 2, 18, this),
            new Submarine("IIB", 3, 2, 18, this),
            new Submarine("IIC", 3, 2, 18, this),
            new Submarine("IXA", 3, 2, 25, this),
            new Submarine("VIIA", 3, 2, 25, this),
            ...(new Array(2)).fill(null).map(() => new Submarine("VIIB", 3, 2, 25, this)),
            ...(new Array(2)).fill(null).map(() => new TransportShip(this))
        ]);
    }

    override addNewAvailableUnits(): void {
        if(this.conquered()){
            return;
        }
        for(let i = 0; i < 3; i++){
            this.availableUnits.add(new Armor(1, 5, this));
        }
        if(this.enteredWar !== null && month(date.current) % 2 === 0){
            const type = month(date.current) % 6 === 0 ? "IXC" : "VIIC";
            if(year(date.current) <= 1939){
                this.availableUnits.add(new Submarine("IXB", 3, 2, 25, this));
            }
            else if(year(date.current) <= 1940){
                this.availableUnits.add(new Submarine(type, 3, 2, 25, this));
            }
            else{
                this.availableUnits.add(new Submarine("Schnorchel-" + type, 4, 3, 25, this));
            }
        }
        if(date.current <= date(1940, Month.December)){
            for(let i = 0; i < 3; i++){
                this.availableUnits.add(new Infantry(1, 3, this));
            }
        }
        else if(date.current <= date(1941, Month.December)){
            for(let i = 0; i < 8; i++){
                this.availableUnits.add(new Infantry(1, 3, this));
            }
        }
        else if(date.current <= date(1942, Month.December)){
            for(let i = 0; i < 5; i++){
                this.availableUnits.add(new Infantry(1, 3, this));
            }
        }
        else{
            for(let i = 0; i < 2; i++){
                this.availableUnits.add(new Infantry(1, 2, this));
            }
        }

        if(date.current === this.enteredWar){
            for(let i = 0; i < 20; i++){
                this.availableUnits.add(new SupplyUnit(3, this));
            }
            for(let i = 0; i < 6; i++){
                this.availableUnits.add(new AirUnit("JU-52", this));    //Air transport
            }
            for(let i = 0; i < 14; i++){
                this.availableUnits.add(new TransportShip(this));
            }
        }

        if(date.current === date(1938, Month.January)){
            this.availableUnits.add(new Battleship("Scharnhorst", 4, 8, 44, this));
        }
        else if(date.current === date(1938, Month.April)){
            this.availableUnits.add(new AirUnit("ME-110C", this))
            this.availableUnits.add(new HeavyCruiser("Admiral Hipper", 3, 3, 46, this));
        }
        else if(date.current === date(1938, Month.September)){
            this.availableUnits.add(new AirUnit("ME-109", this));
            this.availableUnits.add(new AirUnit("HE-111", this));
            this.availableUnits.add(new AirUnit("ME-110C", this));
            this.availableUnits.add(new HeavyCruiser("Prinz Eugen", 3, 3, 46, this));
            this.availableUnits.add(new HeavyCruiser("Blücher", 3, 3, 46, this));
        }
        else if(date.current === date(1939, Month.January)){
            this.availableUnits.add(new Paratrooper(1, 3, this));
            this.availableUnits.add(new AirUnit("ME-109", this));
            this.availableUnits.add(new AirUnit("HE-111", this));
            this.availableUnits.add(new AirUnit("ME-110C", this));
            this.availableUnits.add(new Battleship("Bismarck", 6, 10, 43, this));
            this.availableUnits.add(new Carrier("Graf Zeppelin", 3, 48, this, new AirUnit("FI-167", this)));
        }
        else if(date.current === date(1939, Month.April)){
            this.availableUnits.add(new AirUnit("ME-110C", this));
            this.availableUnits.add(new Battleship("Tirpitz", 6, 10, 43, this));
        }
        else if(date.current === date(1939, Month.September)){
            this.availableUnits.add(new Carrier("Peter Strasser", 3, 48, this, new AirUnit("FI-167", this)));    //Built but never finished in real life
        }
        else if(date.current === date(1940, Month.January)){
            this.availableUnits.add(new Paratrooper(1, 3, this));
            this.availableUnits.add(new AirUnit("ME-109", this));
            this.availableUnits.add(new AirUnit("ME-110C", this));
            this.availableUnits.add(new AirUnit("HE-111", this));
        }
        else if(date.current === date(1940, Month.February)){
            if(Countries.sovietUnion.partnership() === Partnership.Allies) this.availableUnits.add(new HeavyCruiser("Lützow", 3, 3, 46, this));    //Germany sold this to the Soviet Union in real life, they probably wouldn't have done this if they were already at war with the Soviet Union (see also Petropavlovsk)
        }
        else if(date.current === date(1940, Month.April)){
            this.availableUnits.add(new AirUnit("HE-111", this));
        }
        else if(date.current === date(1940, Month.July)){
            this.availableUnits.add(new AirUnit("ME-109", this));
            this.availableUnits.add(new AirUnit("ME-110C", this));
            this.availableUnits.add(new AirUnit("HE-111", this));
        }
        else if(date.current === date(1940, Month.October)){
            this.availableUnits.add(new AirUnit("HE-111", this));
        }
        else if(date.current === date(1941, Month.January)){
            this.availableUnits.add(new Paratrooper(1, 3, this));
            this.availableUnits.add(new AirUnit("ME-109", this));
            this.availableUnits.add(new AirUnit("ME-110C", this));
            this.availableUnits.add(new AirUnit("HE-111", this));
            this.availableUnits.add(new Destroyer("1936", 1, 1, 52, this));
        }
        else if(date.current === date(1941, Month.July)){
            this.availableUnits.add(new AirUnit("ME-109", this));
            this.availableUnits.add(new AirUnit("ME-110C", this));
            this.availableUnits.add(new AirUnit("HE-111", this));
        }
        else if(date.current === date(1942, Month.January)){
            this.availableUnits.add(new AirUnit("ME-109", this));
            this.availableUnits.add(new AirUnit("ME-110D", this));
            this.availableUnits.add(new AirUnit("FW-190", this));
            this.availableUnits.add(new AirUnit("HE-111", this));
            this.availableUnits.add(new Destroyer("1936", 1, 1, 52, this));
        }
        else if(date.current === date(1942, Month.April)){
            this.availableUnits.add(new AirUnit("HE-111", this));
        }
        else if(date.current === date(1942, Month.July)){
            this.availableUnits.add(new AirUnit("ME-109", this));
            this.availableUnits.add(new AirUnit("ME-110D", this));
            this.availableUnits.add(new AirUnit("FW-190", this));
            this.availableUnits.add(new AirUnit("HE-111", this));
            this.availableUnits.add(new Destroyer("1936", 1, 1, 52, this));
        }
        else if(date.current === date(1942, Month.October)){
            this.availableUnits.add(new AirUnit("HE-111", this));
        }
        else if(date.current === date(1943, Month.January)){
            this.availableUnits.add(new AirUnit("ME-110D", this));
            this.availableUnits.add(new AirUnit("FW-190", this));
            this.availableUnits.add(new AirUnit("HE-177", this));
            this.availableUnits.add(new AirUnit("ME-262", this));
            this.availableUnits.add(new Destroyer("1936", 1, 1, 52, this));
        }
        else if(date.current === date(1943, Month.July)){
            this.availableUnits.add(new AirUnit("ME-110D", this));
            this.availableUnits.add(new AirUnit("FW-190", this));
            this.availableUnits.add(new AirUnit("HE-177", this));
            this.availableUnits.add(new Destroyer("1936", 1, 1, 52, this));
        }
        else if(date.current === date(1944, Month.January)){
            this.availableUnits.add(new AirUnit("ME-110D", this));
            this.availableUnits.add(new AirUnit("FW-190", this));
            this.availableUnits.add(new AirUnit("HE-177", this));
            this.availableUnits.add(new AirUnit("ME-262", this));
        }
        else if(date.current === date(1944, Month.April)){
            this.availableUnits.add(new AirUnit("FW-190", this));
        }
        else if(date.current === date(1944, Month.July)){
            this.availableUnits.add(new AirUnit("ME-110D", this));
            this.availableUnits.add(new AirUnit("FW-190", this));
            this.availableUnits.add(new AirUnit("HE-177", this));
            this.availableUnits.add(new AirUnit("ME-262", this));
        }
        else if(date.current === date(1944, Month.October)){
            this.availableUnits.add(new AirUnit("FW-190", this));
        }
    }

    override hasAtomicBomb(): boolean {
        return date.current >= date(1947, Month.June);
    }

    override income(): number {
        return super.income() + this.homelandResourceHexes().length * 50;
    }

    override maxMoneyExchange(): number {
        return Math.min(this.money, 500);
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return Countries.all().filter(it => it !== this && it.partnership() === this.partnership() && !it.conquered() && it.canSendMoneyWithoutConvoys().includes(this));
    }

    override name(): string {
        return "Germany";
    }

    override maxLandUnitStrength(): number {
        return 8;
    }

    override maxArmorStrength(): number {
        if(currentYear() >= 1943){
            return 12;
        }
        else{
            return 10;
        }
    }

    override railCapacity(): number {
        return 6;
    }

    override color(): string {
        return "#000000";
    }
}
