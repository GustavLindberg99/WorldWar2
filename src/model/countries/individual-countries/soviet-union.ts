import CountryWithUnits from "../country-with-units.js";

import { Countries } from "../../countries.js";
import { currentYear, date, Month, month } from "../../date.js";
import { Partnership } from "../../partnership.js";
import { AirUnit, Armor, Battleship, Destroyer, HeavyCruiser, Infantry, LightCruiser, Paratrooper, Submarine, SupplyUnit, TransportShip } from "../../units.js";


export default class SovietUnion extends CountryWithUnits {
    constructor(){
        super(Partnership.Neutral);
        this.availableUnits = new Set([
            ...(new Array(100)).fill(null).map(() => new Infantry(1, 3, this)),
            ...(new Array(2)).fill(null).map(() => new AirUnit("I-16", this)),
            new Destroyer("Leningrad", 1, 1, 57, this),
            new LightCruiser("Aurora", 1, 1, 27, this),
            new LightCruiser("Chervona Ukraina", 1, 1, 42, this),
            new LightCruiser("Krasny Kavkaz", 1, 1, 42, this),
            new LightCruiser("Krasny Krym", 1, 1, 42, this),
            new Battleship("Marat", 4, 3, 34, this),
            new Battleship("Oktyabrskaya Revolutsiya", 4, 3, 34, this),
            new Battleship("Parizskaya Kommuna", 4, 3, 34, this),
            new Submarine("Srednyaya", 3, 2, 28, this),
            ...(new Array(14)).fill(null).map(() => new TransportShip(this))
        ]);
    }

    override addNewAvailableUnits(): void {
        if(this.conquered()){
            return;
        }

        if(this.enteredWar === null){
            for(let i = 0; i < 2; i++){
                this.availableUnits.add(new Infantry(1, 3, this));
            }
            if(month(date.current) % 2 === 0){
                this.availableUnits.add(new Armor(1, 5, this));
            }
        }
        else{
            for(let i = 0; i < 4; i++){
                this.availableUnits.add(new Infantry(1, 3, this))
            }
            for(let i = 0; i < 3; i++){
                this.availableUnits.add(new Armor(1, 5, this));
            }
            if(date.current === this.enteredWar){
                for(let i = 0; i < 5; i++){
                    this.availableUnits.add(new SupplyUnit(3, this));
                }
                for(let i = 0; i < 8; i++){
                    this.availableUnits.add(new AirUnit("Li-2", this));    //Air transport
                }
                this.availableUnits.add(new AirUnit("I-16", this));
                this.availableUnits.add(new AirUnit("I-16", this));
            }
            else if(date.current <= this.enteredWar + 8){
                this.availableUnits.add(new AirUnit("LaGG-3", this));
            }
            else switch(date.current - this.enteredWar){
                case 9:
                case 11:
                case 13:
                case 15:
                case 17:
                case 19:
                case 21:
                case 23:
                case 25:
                case 27:
                case 29:
                case 31:
                    this.availableUnits.add(new AirUnit("Yak-9", this));
                    break;
                case 10:
                case 14:
                case 16:
                case 18:
                case 20:
                case 22:
                    this.availableUnits.add(new AirUnit("Yer-2", this));
                    break;
                case 12:
                case 36:
                    this.availableUnits.add(new Paratrooper(1, 3, this));
                    break;
                case 24:
                case 26:
                case 28:
                case 30:
                case 32:
                case 33:
                case 34:
                case 35:
                    this.availableUnits.add(new AirUnit("Tu-2", this));
                    break;
            }
        }

        if(date.current === date(1937, Month.September)){
            this.availableUnits.add(new LightCruiser("Kirov", 3, 3, 52, this));
        }
        else if(date.current === date(1939, Month.June)){
            this.availableUnits.add(new LightCruiser("Voroshilov", 3, 3, 52, this));
        }
        else if(date.current === date(1939, Month.December)){
            this.availableUnits.add(new LightCruiser("Maxim Gorky", 3, 3, 52, this));
        }
        else if(date.current === date(1940, Month.February)){
            if(this.partnership() !== Partnership.Allies) this.availableUnits.add(new HeavyCruiser("Petropavlovsk", 3, 3, 46, this));    //Germany sold this to the Soviet Union in real life, they probably wouldn't have done this if they were already at war with the Soviet Union (see also Lützow)
        }
        else if(date.current === date(1940, Month.June)){
            this.availableUnits.add(new LightCruiser("Molotov", 3, 3, 52, this));
        }
        else if(date.current === date(1942, Month.May)){
            this.availableUnits.add(new LightCruiser("Kalinin", 3, 3, 52, this));
        }
        else if(date.current === date(1944, Month.May)){
            this.availableUnits.add(new LightCruiser("Kaganovich", 3, 3, 52, this));
        }
    }

    override joinPartnership(partnership: Partnership): void {
        super.joinPartnership(partnership);
        Countries.finland.joinPartnership(partnership.opponent());
    }

    override hasAtomicBomb(): boolean {
        return date.current >= date(1949, Month.September);
    }

    override name(): string {
        return "Soviet Union";
    }

    override maxLandUnitStrength(): number {
        if(currentYear() >= 1943){
            return 6;
        }
        else{
            return 5;
        }
    }

    override railCapacity(): number {
        return 8;
    }

    override color(): string {
        return "#f21a12";
    }
}
