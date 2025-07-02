import CountryWithUnits from "../country-with-units.js";

import { Countries, Country } from "../../countries.js";
import { date, Month, month, year } from "../../date.js";
import { Partnership } from "../../partnership.js";
import { AirUnit, Armor, Battlecruiser, Battleship, Carrier, Convoy, Destroyer, DestroyerEscort, HeavyCruiser, Infantry, LightCruiser, Marine, Paratrooper, Submarine, SupplyUnit, TransportShip } from "../../units.js";

export default class UnitedStates extends CountryWithUnits {
    #hasReceivedExtraArmor: boolean = false;

    constructor(){
        super(Partnership.Allies);
        this.availableUnits = new Set([
            ...(new Array(110)).fill(null).map(() => new Infantry(1, 4, this)),
            ...(new Array(30)).fill(null).map(() => new Armor(1, 5, this)),
            ...(new Array(35)).fill(null).map(() => new Marine(1, 4, this)),
            new Paratrooper(1, 4, this),
            ...(new Array(10)).fill(null).map(() => (new SupplyUnit(4, this))),
            ...(new Array(2)).fill(null).map(() => new Destroyer("Bagley", 1, 2, 53, this)),
            ...(new Array(4)).fill(null).map(() => new Destroyer("Clemson", 1, 2, 52, this)),
            new Destroyer("Farragut", 1, 2, 53, this),
            ...(new Array(3)).fill(null).map(() => new Destroyer("Mahan", 1, 2, 53, this)),
            new Destroyer("Porter", 1, 2, 53, this),
            ...(new Array(4)).fill(null).map(() => new Destroyer("Wickes", 1, 2, 50, this)),
            new LightCruiser("Boise", 1, 1, 46, this),
            new LightCruiser("Brooklyn", 1, 1, 46, this),
            new LightCruiser("Honolulu", 1, 1, 46, this),
            new LightCruiser("Nashville", 1, 1, 46, this),
            new LightCruiser("Philadelphia", 1, 1, 46, this),
            new LightCruiser("Phoenix", 1, 1, 46, this),
            new LightCruiser("Savannah", 1, 1, 46, this),
            new LightCruiser("Cincinnati", 1, 1, 50, this),
            new LightCruiser("Concord", 1, 1, 50, this),
            new LightCruiser("Detroit", 1, 1, 50, this),
            new LightCruiser("Marblehead", 1, 1, 50, this),
            new LightCruiser("Memphis", 1, 1, 50, this),
            new LightCruiser("Milwaukee", 1, 1, 50, this),
            new LightCruiser("Omaha", 1, 1, 50, this),
            new LightCruiser("Raleigh", 1, 1, 50, this),
            new LightCruiser("Richmond", 1, 1, 50, this),
            new LightCruiser("Trenton", 1, 1, 50, this),
            new LightCruiser("Saint Louis", 1, 1, 46, this),
            new LightCruiser("Helena", 1, 1, 46, this),
            new HeavyCruiser("Wichita", 3, 3, 47, this),
            new HeavyCruiser("Astoria", 3, 3, 47, this),
            new HeavyCruiser("Minneapolis", 3, 3, 47, this),
            new HeavyCruiser("New Orleans", 3, 3, 47, this),
            new HeavyCruiser("Quincy", 3, 3, 47, this),
            new HeavyCruiser("San Francisco", 3, 3, 47, this),
            new HeavyCruiser("Tuscaloosa", 3, 3, 47, this),
            new HeavyCruiser("Vincennes", 3, 3, 47, this),
            new HeavyCruiser("Augusta", 3, 3, 47, this),
            new HeavyCruiser("Chester", 3, 3, 47, this),
            new HeavyCruiser("Chicago", 3, 3, 47, this),
            new HeavyCruiser("Houston", 3, 3, 47, this),
            new HeavyCruiser("Louisville", 3, 3, 47, this),
            new HeavyCruiser("Northampton", 3, 3, 47, this),
            new HeavyCruiser("Pensacola", 3, 3, 47, this),
            new HeavyCruiser("Salt Lake City", 3, 3, 47, this),
            new HeavyCruiser("Indianapolis", 3, 3, 47, this),
            new HeavyCruiser("Portland", 3, 3, 47, this),
            new Battleship("Nevada", 4, 5, 29, this),
            new Battleship("Oklahoma", 4, 5, 29, this),
            new Battleship("Arkansas", 4, 5, 29, this),
            new Battleship("Arizona", 4, 5, 30, this),
            new Battleship("Pennsylvania", 4, 5, 30, this),
            new Battleship("California", 5, 6, 30, this),
            new Battleship("Tennessee", 5, 6, 30, this),
            new Battleship("Colorado", 6, 7, 30, this),
            new Battleship("Maryland", 6, 7, 30, this),
            new Battleship("West Virginia", 6, 7, 30, this),
            new Battleship("Idaho", 6, 7, 30, this),
            new Battleship("Mississippi", 6, 7, 30, this),
            new Battleship("New Mexico", 6, 7, 30, this),
            new Battleship("New York", 6, 7, 30, this),
            new Battleship("Texas", 6, 7, 30, this),
            new Carrier("Lexington", 3, 47, this, new AirUnit("F4F Wildcat", this)),
            new Carrier("Saratoga", 3, 47, this, new AirUnit("F4F Wildcat", this)),
            new Carrier("Enterprise", 3, 42, this, new AirUnit("F4F Wildcat", this)),
            new Carrier("Ranger", 3, 46, this, new AirUnit("F4F Wildcat", this)),
            new Carrier("Yorktown", 3, 46, this, new AirUnit("F4F Wildcat", this)),
            new Submarine("O", 2, 2, 20, this),
            new Submarine("Porpoise", 2, 2, 26, this),
            new Submarine("R", 2, 2, 19, this),
            new Submarine("Sargo", 2, 2, 30, this),
            ...(new Array(2)).fill(null).map(() => new Submarine("S", 2, 2, 20, this)),
            ...(new Array(10)).fill(null).map(() => new TransportShip(this)),
            ...(new Array(5)).fill(null).map(() => new Convoy(this))
        ]);
    }

    override addNewAvailableUnits(): void {
        if(this.conquered()){
            return;
        }
        if(this.enteredWar !== null){
            if(!this.#hasReceivedExtraArmor && Partnership.Axis.landUnits().some(it => it.embarkedOn() === null && it.hex()?.country === this && !it.hex()?.isColony)){
                //The US gets 1800 extra armor strength points (200 divisions) if the Axis invades the US mainland, see https://www.quora.com/What-if-the-Japanese-had-invaded-the-US-mainland-in-1941
                for(let i = 0; i < 1800; i++){    //this is not a typo, it should be 1800
                    this.availableUnits.add(new Armor(1, 5, this));
                }
                this.#hasReceivedExtraArmor = true;
            }
            for(let i = 0; i < 2; i++){
                this.availableUnits.add(new Armor(1, 5, this));
            }
            this.availableUnits.add(new Marine(1, 4, this));
            if(date.current < this.enteredWar + 18){
                for(let i = 0; i < 5; i++){
                    this.availableUnits.add(new Infantry(1, 4, this));
                }
            }
            else{
                for(let i = 0; i < 8; i++){
                    this.availableUnits.add(new Infantry(1, 4, this));
                }
            }
            if(month(date.current) % 4 === 0){
                for(let i = 0; i < 3; i++){
                    this.availableUnits.add(new Paratrooper(1, 4, this));
                }
            }
            if(month(date.current) % 2 === 0){
                let name;
                if(month(date.current) % 4 === 0){
                    name = "Balao";
                }
                else if(year(date.current) < 1944){
                    name = "Gato";
                }
                else{
                    name = "Tench";
                }
                this.availableUnits.add(new Submarine(name, 4, 2, 29, this));
            }

            const airUnit = date.current < date(1942, Month.March) ? "F4F Wildcat" : "F6F Hellcat";
            if(date.current === this.enteredWar){
                this.availableUnits.add(new Carrier("Essex", 3, 47, this, new AirUnit(airUnit, this)));    //This ship was planned before the war, but its construction was accelerated because of the war
                for(let i = 0; i < 50; i++){
                    this.availableUnits.add(new TransportShip(this));
                    this.availableUnits.add(new SupplyUnit(4, this));
                }
                for(let i = 0; i < 25; i++){
                    this.availableUnits.add(new AirUnit("DC-3", this));
                }
            }
            else if(date.current === this.enteredWar + 6){
                this.availableUnits.add(new Carrier("Casablanca", 2, 27, this, new AirUnit(airUnit, this)));
                this.availableUnits.add(new Carrier("Coral Sea", 2, 27, this, new AirUnit(airUnit, this)));
                this.availableUnits.add(new Carrier("Liscome Bay", 2, 27, this, new AirUnit(airUnit, this)));
            }
            else if(date.current === this.enteredWar + 12){
                this.availableUnits.add(new Carrier("Ticonderoga", 3, 47, this, new AirUnit(airUnit, this)));
                this.availableUnits.add(new Carrier("Wasp II", 3, 47, this, new AirUnit(airUnit, this)));
                this.availableUnits.add(new Carrier("Bataan", 2, 45, this, new AirUnit(airUnit, this)));
                this.availableUnits.add(new Carrier("San Jacinto", 2, 45, this, new AirUnit(airUnit, this)));
            }
            else if(date.current === this.enteredWar + 18){
                this.availableUnits.add(new Carrier("Attu", 1, 27, this, new AirUnit(airUnit, this)));
                this.availableUnits.add(new Carrier("Midway", 3, 47, this, new AirUnit(airUnit, this)));
            }
            else if(date.current === this.enteredWar + 24){
                this.availableUnits.add(new Carrier("Bon Homme Richard", 3, 47, this, new AirUnit(airUnit, this)));
                this.availableUnits.add(new Carrier("Franklin", 3, 47, this, new AirUnit(airUnit, this)));
                this.availableUnits.add(new Carrier("Randolph", 3, 47, this, new AirUnit(airUnit, this)));
                this.availableUnits.add(new Carrier("Shangri-La", 3, 47, this, new AirUnit(airUnit, this)));
                this.availableUnits.add(new Carrier("Commencement Bay", 1, 27, this, new AirUnit(airUnit, this)));
            }
            else if(date.current === this.enteredWar + 36){
                this.availableUnits.add(new Carrier("Bairoko", 1, 27, this, new AirUnit(airUnit, this)));
            }

            if(date.current < Math.max(this.enteredWar, date(1942, Month.March)) + 24){
                this.availableUnits.add(new Destroyer("Fletcher", 1, 1, 52, this));    //These ships were designed before the war, but they made an effort to produce a lot of them because of the war
            }
            else if(date.current < Math.max(this.enteredWar, date(1942, Month.March)) + 36){
                this.availableUnits.add(new Destroyer("Sumner", 1, 1, 49, this));
            }
            else if(date.current < Math.max(this.enteredWar, date(1942, Month.March)) + 60){
                this.availableUnits.add(new Destroyer("Gearing", 1, 1, 53, this));
            }
        }

        if(month(date.current) % 2 === 0 && date.current >= date(1942, Month.March) && date.current <= date(1944, Month.February)){
            this.availableUnits.add(new Destroyer("Fletcher", 1, 1, 52, this));
        }
        if(month(date.current) % 3 === 0 && year(date.current) >= 1942 && year(date.current) <= 1943){
            this.availableUnits.add(new AirUnit("P-40 Warhawk", this));
        }
        if(year(date.current) === 1943 && month(date.current) % 4 === 0){
            this.availableUnits.add(new AirUnit("B-24 Liberator", this));
            this.availableUnits.add(new AirUnit("B-17 Flying Fortress", this));
            this.availableUnits.add(new AirUnit("B-26 Marauder", this));
        }
        if(year(date.current) === 1943 && month(date.current) % 2 === 0){
            this.availableUnits.add(new DestroyerEscort("Buckley", 1, 1, 34, this));
            this.availableUnits.add(new DestroyerEscort("Cannon", 1, 1, 30, this));
            this.availableUnits.add(new DestroyerEscort("Evarts", 1, 1, 27, this));
        }
        if(date.current >= date(1943, Month.October) && date.current <= date(1945, Month.March)){
            this.availableUnits.add(new AirUnit("B-24 Liberator", this));
        }
        if(year(date.current) === 1944 && month(date.current) % 4 === 0){
            this.availableUnits.add(new DestroyerEscort("Butler", 1, 1, 35, this));
        }
        if(month(date.current) % 2 === 0 && date.current >= date(1943, Month.September) && date.current <= date(1946, Month.March)){
            this.availableUnits.add(new AirUnit("P-51 Mustang", this));
        }
        if(month(date.current) % 2 === 0 && date.current >= date(1944, Month.July) && year(date.current) <= 1945){
            this.availableUnits.add(new AirUnit("B-29 Superfortress", this));
        }

        if(date.current === date(1937, Month.October)){
            this.availableUnits.add(new Destroyer("Gridley", 1, 1, 55, this));
        }
        else if(date.current === date(1938, Month.January)){
            this.availableUnits.add(new AirUnit("B-17 Flying Fortress", this));
            this.availableUnits.add(new AirUnit("P-36 Hawk", this));
            this.availableUnits.add(new Destroyer("Somers", 1, 1, 52, this));
        }
        else if(date.current === date(1938, Month.October)){
            this.availableUnits.add(new AirUnit("B-17 Flying Fortress", this));
            this.availableUnits.add(new Destroyer("Benham", 1, 1, 54, this));
        }
        else if(date.current === date(1939, Month.March)){
            this.availableUnits.add(new AirUnit("P-40 Kittyhawk", this));
            this.availableUnits.add(new AirUnit("B-17 Flying Fortress", this));
            this.availableUnits.add(new Destroyer("Sims", 1, 1, 53, this));
        }
        else if(date.current === date(1939, Month.April)){
            this.availableUnits.add(new Destroyer("Benham", 1, 1, 54, this));
            this.availableUnits.add(new Carrier("Wasp", 3, 42, this, new AirUnit("F4F Wildcat", this)));
        }
        else if(date.current === date(1939, Month.November)){
            this.availableUnits.add(new AirUnit("P-40 Kittyhawk", this));
            this.availableUnits.add(new AirUnit("B-17 Flying Fortress", this));
            this.availableUnits.add(new Destroyer("Sims", 1, 1, 53, this));
        }
        else if(date.current === date(1940, Month.April)){
            this.availableUnits.add(new Destroyer("Benson", 1, 1, 54, this));
            this.availableUnits.add(new Destroyer("Gleaves", 1, 1, 53, this));
            this.availableUnits.add(new Battleship("North Carolina", 9, 9, 40, this));
        }
        else if(date.current === date(1940, Month.June)){
            this.availableUnits.add(new AirUnit("B-17 Flying Fortress", this));
            this.availableUnits.add(new Battleship("Washington", 9, 9, 40, this));
        }
        else if(date.current === date(1940, Month.November)){
            this.availableUnits.add(new Destroyer("Gleaves", 1, 1, 53, this));
            this.availableUnits.add(new Carrier("Hornet", 3, 46, this, new AirUnit("F4F Wildcat", this)));
        }
        else if(date.current === date(1941, Month.March)){
            this.availableUnits.add(new AirUnit("B-17 Flying Fortress", this));
            this.availableUnits.add(new AirUnit("B-25 Mitchell", this));
            this.availableUnits.add(new Destroyer("Gleaves", 1, 1, 53, this));
            this.availableUnits.add(new Battleship("South Dakota", 9, 9, 39, this));
        }
        else if(date.current === date(1941, Month.April)){
            this.availableUnits.add(new AirUnit("P-38 Lightning", this));
            this.availableUnits.add(new Destroyer("Gleaves", 1, 1, 53, this));
            this.availableUnits.add(new Battleship("Indiana", 9, 9, 39, this));
        }
        else if(date.current === date(1941, Month.May)){
            this.availableUnits.add(new Battleship("Massachusetts", 9, 9, 39, this));
            this.availableUnits.add(new HeavyCruiser("Baltimore", 4, 5, 47, this));
        }
        else if(date.current === date(1941, Month.July)){
            this.availableUnits.add(new AirUnit("P-38 Lightning", this));
            this.availableUnits.add(new AirUnit("B-17 Flying Fortress", this));
            this.availableUnits.add(new LightCruiser("San Diego", 1, 1, 46, this));
            this.availableUnits.add(new HeavyCruiser("Boston", 4, 5, 47, this));
        }
        else if(date.current === date(1941, Month.September)){
            this.availableUnits.add(new AirUnit("B-25 Mitchell", this));
            this.availableUnits.add(new Destroyer("Gleaves", 1, 1, 53, this));
            this.availableUnits.add(new LightCruiser("Atlanta", 1, 1, 46, this));
            this.availableUnits.add(new LightCruiser("San Juan", 1, 1, 46, this));
            this.availableUnits.add(new Battleship("Alabama", 9, 9, 39, this));
            this.availableUnits.add(new Carrier("Bogue", 1, 26, this, new AirUnit("F4F Wildcat", this)));
        }
        else if(date.current === date(1941, Month.November)){
            this.availableUnits.add(new AirUnit("B-17 Flying Fortress", this));
            this.availableUnits.add(new Destroyer("Gleaves", 1, 1, 53, this));
            this.availableUnits.add(new LightCruiser("Juneau", 1, 1, 46, this));
            this.availableUnits.add(new LightCruiser("Cleveland", 1, 1, 46, this));
            this.availableUnits.add(new LightCruiser("Columbia", 1, 1, 46, this));
        }
        else if(date.current === date(1942, Month.January)){
            this.availableUnits.add(new AirUnit("P-38 Lightning", this));
            this.availableUnits.add(new Destroyer("Gleaves", 1, 1, 53, this));
            for(let i = 0; i < 5; i++){
                this.availableUnits.add(new Destroyer("Benson", 1, 1, 54, this));
            }
        }
        else if(date.current === date(1942, Month.February)){
            this.availableUnits.add(new Destroyer("Gleaves", 1, 1, 53, this));
            this.availableUnits.add(new LightCruiser("Montpelier", 1, 1, 46, this));
            this.availableUnits.add(new Battleship("Iowa", 9, 11, 47, this));
            this.availableUnits.add(new Carrier("Independence", 2, 45, this, new AirUnit("F4F Wildcat", this)));
            this.availableUnits.add(new Carrier("Princeton", 2, 45, this, new AirUnit("F4F Wildcat", this)));
            this.availableUnits.add(new Carrier("Lexington II", 3, 47, this, new AirUnit("F4F Wildcat", this)));
        }
        else if(date.current === date(1942, Month.March)){
            this.availableUnits.add(new Destroyer("Gleaves", 1, 1, 53, this));
            this.availableUnits.add(new LightCruiser("Birmingham", 1, 1, 46, this));
            this.availableUnits.add(new Carrier("Belleau Wood", 2, 45, this, new AirUnit("F6F Hellcat", this)));
            this.availableUnits.add(new Carrier("Cabot", 2, 45, this, new AirUnit("F6F Hellcat", this)));
        }
        else if(date.current === date(1942, Month.April)){
            this.availableUnits.add(new AirUnit("P-38 Lightning", this));
            this.availableUnits.add(new Destroyer("Gleaves", 1, 1, 53, this));
            this.availableUnits.add(new LightCruiser("Denver", 1, 1, 46, this));
            this.availableUnits.add(new Carrier("Yorktown II", 3, 47, this, new AirUnit("F6F Hellcat", this)));
        }
        else if(date.current === date(1942, Month.May)){
            this.availableUnits.add(new Destroyer("Gleaves", 1, 1, 53, this));
            this.availableUnits.add(new Battleship("New Jersey", 9, 11, 47, this));
            this.availableUnits.add(new Carrier("Bunker Hill", 3, 47, this, new AirUnit("F6F Hellcat", this)));
            this.availableUnits.add(new Carrier("Cowpens", 2, 45, this, new AirUnit("F6F Hellcat", this)));
        }
        else if(date.current === date(1942, Month.June)){
            this.availableUnits.add(new Destroyer("Gleaves", 1, 1, 53, this));
            this.availableUnits.add(new LightCruiser("Santa Fe", 1, 1, 46, this));
            this.availableUnits.add(new Carrier("Monterey", 2, 45, this, new AirUnit("F6F Hellcat", this)));
        }
        else if(date.current === date(1942, Month.July)){
            this.availableUnits.add(new Destroyer("Gleaves", 1, 1, 53, this));
        }
        else if(date.current === date(1942, Month.August)){
            this.availableUnits.add(new AirUnit("P-47 Thunderbolt", this));
            this.availableUnits.add(new Carrier("Hornet II", 3, 47, this, new AirUnit("F6F Hellcat", this)));
            this.availableUnits.add(new Carrier("Intrepid", 3, 47, this, new AirUnit("F6F Hellcat", this)));
            this.availableUnits.add(new Carrier("Langley", 2, 45, this, new AirUnit("F6F Hellcat", this)));
        }
        else if(date.current === date(1942, Month.October)){
            this.availableUnits.add(new AirUnit("P-47 Thunderbolt", this));
            this.availableUnits.add(new HeavyCruiser("Canberra II", 4, 5, 47, this));
            this.availableUnits.add(new HeavyCruiser("Quincy II", 4, 5, 47, this));
            this.availableUnits.add(new LightCruiser("Oakland", 1, 1, 46, this));
            this.availableUnits.add(new LightCruiser("Vincennes II", 1, 1, 46, this));
        }
        else if(date.current === date(1943, Month.January)){
            this.availableUnits.add(new AirUnit("P-38 Lightning", this));
            this.availableUnits.add(new DestroyerEscort("Edsall", 1, 1, 30, this));
            this.availableUnits.add(new Carrier("Hancock", 3, 47, this, new AirUnit("F6F Hellcat", this)));
        }
        else if(date.current === date(1943, Month.February)){
            this.availableUnits.add(new AirUnit("P-51 Mustang", this));
            this.availableUnits.add(new LightCruiser("Biloxi", 1, 1, 46, this));
            this.availableUnits.add(new LightCruiser("Miami", 1, 1, 46, this));
            this.availableUnits.add(new LightCruiser("Pasadena", 1, 1, 46, this));
        }
        else if(date.current === date(1943, Month.April)){
            this.availableUnits.add(new DestroyerEscort("Edsall", 1, 1, 30, this));
            this.availableUnits.add(new LightCruiser("Reno", 1, 1, 46, this));
            this.availableUnits.add(new Battleship("Wisconsin", 9, 11, 47, this));
        }
        else if(date.current === date(1943, Month.June)){
            this.availableUnits.add(new AirUnit("P-51 Mustang", this));
            this.availableUnits.add(new LightCruiser("Houston II", 1, 1, 46, this));
            this.availableUnits.add(new LightCruiser("Mobile", 1, 1, 46, this));
            this.availableUnits.add(new Battleship("Missouri", 9, 11, 47, this));
            this.availableUnits.add(new Battlecruiser("Alaska", 6, 5, 46, this));
            this.availableUnits.add(new Carrier("Bennington", 3, 47, this, new AirUnit("F6F Hellcat", this)));
        }
        else if(date.current === date(1943, Month.October)){
            this.availableUnits.add(new AirUnit("P-38 Lightning", this));
            this.availableUnits.add(new Destroyer("Sumner", 1, 1, 49, this));
            this.availableUnits.add(new LightCruiser("Astoria II", 1, 1, 46, this));
            this.availableUnits.add(new HeavyCruiser("Pittsburgh", 4, 5, 47, this));
            this.availableUnits.add(new Battlecruiser("Guam", 6, 5, 46, this));
            this.availableUnits.add(new Carrier("Antietam", 3, 47, this, new AirUnit("F6F Hellcat", this)));
        }
        else if(date.current === date(1944, Month.January)){
            this.availableUnits.add(new LightCruiser("Flint", 1, 1, 46, this));
            this.availableUnits.add(new LightCruiser("Atlanta II", 1, 1, 46, this));
            this.availableUnits.add(new LightCruiser("Duluth", 1, 1, 46, this));
            this.availableUnits.add(new LightCruiser("Vicksburg", 1, 1, 46, this));
            this.availableUnits.add(new LightCruiser("Wilkes-Barre", 1, 1, 46, this));
            this.availableUnits.add(new HeavyCruiser("Chicago II", 4, 5, 47, this));
        }
        else if(date.current === date(1944, Month.March)){
            this.availableUnits.add(new DestroyerEscort("Rudderow", 1, 1, 34, this));
            this.availableUnits.add(new LightCruiser("Springfield", 1, 1, 46, this));
            this.availableUnits.add(new HeavyCruiser("Saint Paul", 4, 5, 47, this));
        }
        else if(date.current === date(1944, Month.April)){
            this.availableUnits.add(new Destroyer("Sumner", 1, 1, 49, this));
            this.availableUnits.add(new LightCruiser("Amsterdam", 1, 1, 46, this));
            this.availableUnits.add(new LightCruiser("Oklahoma City", 1, 1, 46, this));
            this.availableUnits.add(new HeavyCruiser("Bremerton", 4, 5, 47, this));
            this.availableUnits.add(new Carrier("Boxer", 3, 47, this, new AirUnit("F6F Hellcat", this)));
        }
        else if(date.current === date(1944, Month.July)){
            this.availableUnits.add(new LightCruiser("Dayton", 1, 1, 46, this));
            this.availableUnits.add(new LightCruiser("Topeka", 1, 1, 46, this));
            this.availableUnits.add(new HeavyCruiser("Columbus", 4, 5, 47, this));
            this.availableUnits.add(new HeavyCruiser("Los Angeles", 4, 5, 47, this));
            this.availableUnits.add(new Carrier("Lake Champlain", 3, 47, this, new AirUnit("F6F Hellcat", this)));
        }
        else if(date.current === date(1944, Month.October)){
            this.availableUnits.add(new Destroyer("Gearing", 1, 1, 53, this));
            this.availableUnits.add(new LightCruiser("Portsmouth", 1, 1, 46, this));
            this.availableUnits.add(new LightCruiser("Tucson", 1, 1, 46, this));
        }
        else if(date.current === date(1945, Month.January)){
            this.availableUnits.add(new Destroyer("Gearing", 1, 2, 53, this));
            this.availableUnits.add(new LightCruiser("Providence", 1, 3, 46, this));
            this.availableUnits.add(new Carrier("Tarawa", 8, 47, this, new AirUnit("F6F Hellcat", this)));
        }
        else if(date.current === date(1945, Month.April)){
            this.availableUnits.add(new Destroyer("Gearing", 1, 1, 53, this));
            this.availableUnits.add(new Carrier("Kearsarge", 3, 47, this, new AirUnit("F6F Hellcat", this)));
        }
        else if(date.current === date(1945, Month.July)){
            this.availableUnits.add(new Destroyer("Gearing", 1, 1, 53, this));
            this.availableUnits.add(new Carrier("Princeton II", 3, 47, this, new AirUnit("F6F Hellcat", this)));
        }
    }

    override additionalInvadedCountries(partnership: Partnership): Array<Country> {
        return [Countries.panama].filter(it => it.canBeInvadedBy(partnership));
    }

    override hasAtomicBomb(): boolean {
        return date.current >= date(1945, Month.August);
    }

    override income(): number {
        return super.income() + this.homelandResourceHexes().length * (this.enteredWar !== null && date.current >= this.enteredWar + 24 ? 100 : 50);
    }

    override maxMoneyExchange(): number {
        return Math.floor(this.money / 3);
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        let result = Countries.all().filter(it => it !== this && !this.canSendMoneyWithConvoys().includes(it) && it.partnership() === this.partnership() && !it.conquered() && it.canSendMoneyWithoutConvoys().includes(this));
        if(Countries.china.canReceiveMoney()){
            result.push(Countries.china);
        }
        return result;
    }

    override canSendMoneyWithConvoys(): Array<Country> {
        return [Countries.unitedKingdom, Countries.france, Countries.sovietUnion].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "United States";
    }

    override maxLandUnitStrength(): number {
        return 8;
    }

    override maxArmorStrength(): number {
        return 12;
    }

    override railCapacity(): number {
        return 8;
    }

    override color(): string {
        return "#4b9c2e";
    }

    override toJson(): Country.Json {
        let json = super.toJson();
        json.hasReceivedExtraArmor = this.#hasReceivedExtraArmor || undefined;
        return json;
    }

    override loadFromJson(json: Country.Json): void {
        super.loadFromJson(json);
        this.#hasReceivedExtraArmor = json.hasReceivedExtraArmor ?? false;
    }
}
