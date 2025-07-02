import CountryWithUnits from "../country-with-units.js";

import { Countries, Country } from "../../countries.js";
import { date, Month, month, year } from "../../date.js";
import { Partnership } from "../../partnership.js";
import { AirUnit, Armor, Battleship, Destroyer, HeavyCruiser, Infantry, LightCruiser, Paratrooper, Submarine, SupplyUnit, TransportShip } from "../../units.js";

export default class Italy extends CountryWithUnits {
    constructor(){
        super(Partnership.Axis);
        this.availableUnits = new Set([
            ...(new Array(30)).fill(null).map(() => new Infantry(1, 3, this)),
            ...(new Array(4)).fill(null).map(() => new SupplyUnit(3, this)),
            ...(new Array(2)).fill(null).map(() => new AirUnit("CR-32", this)),
            new Destroyer("Dardo", 1, 1, 43, this),
            new Destroyer("Navigatori", 1, 1, 46, this),
            new Destroyer("Sauro", 1, 1, 44, this),
            new Destroyer("Sella", 1, 1, 47, this),
            ...(new Array(2)).fill(null).map(() => new Destroyer("Soldati", 1, 1, 50, this)),
            new Destroyer("Turbine", 1, 1, 47, this),
            new LightCruiser("Alberico da Barbiano", 1, 1, 53, this),
            new LightCruiser("Alberto di Giussano", 1, 1, 53, this),
            new LightCruiser("Bartolomeo Colleoni", 1, 1, 53, this),
            new LightCruiser("Giovanni dalle Bande Nere", 1, 1, 53, this),
            new LightCruiser("Armando Diaz", 1, 1, 53, this),
            new LightCruiser("Luigi Cadorna", 1, 1, 53, this),
            new LightCruiser("Emanuele Filiberto Duca d'Aosta", 1, 1, 53, this),
            new LightCruiser("Eugenio di Savoia", 1, 1, 53, this),
            new LightCruiser("Duca degli Abruzzi", 1, 1, 53, this),
            new LightCruiser("Giuseppe Garibaldi", 1, 1, 53, this),
            new LightCruiser("Muzio Attendolo", 1, 1, 53, this),
            new LightCruiser("Raimondo Montecuccoli", 1, 1, 53, this),
            new LightCruiser("Taranto", 1, 1, 39, this),
            new LightCruiser("Bari", 1, 1, 39, this),
            new HeavyCruiser("San Giorgio", 3, 3, 33, this),
            new HeavyCruiser("Trento", 3, 3, 51, this),
            new HeavyCruiser("Trieste", 3, 3, 51, this),
            new HeavyCruiser("Fiume", 3, 3, 47, this),
            new HeavyCruiser("Gorizia", 3, 3, 47, this),
            new HeavyCruiser("Pola", 3, 3, 47, this),
            new HeavyCruiser("Zara", 3, 3, 47, this),
            new Battleship("Andrea Doria", 4, 5, 30, this),
            new Battleship("Caio Duilio", 4, 5, 30, this),
            new Battleship("Conte di Cavour", 4, 5, 30, this),
            new Battleship("Giulio Cesare", 4, 5, 30, this),
            new Submarine("Adua", 3, 2, 20, this),
            new Submarine("Argonauta", 3, 2, 20, this),
            new Submarine("Perla", 3, 2, 20, this),
            new Submarine("Sirena", 3, 2, 20, this),
            new Submarine("Bandiera", 3, 2, 22, this),
            ...(new Array(3)).fill(null).map(() => new TransportShip(this))
        ]);
    }

    override addNewAvailableUnits(): void {
        if(this.conquered()){
            return;
        }
        if(month(date.current) % 2 === 0){
            this.availableUnits.add(new Infantry(1, 3, this));
            if(year(date.current) >= 1939){
                this.availableUnits.add(new Armor(1, 5, this));
            }
        }

        if(date.current === this.enteredWar){
            for(let i = 0; i < 10; i++){
                this.availableUnits.add(new SupplyUnit(3, this));
            }
            for(let i = 0; i < 4; i++){
                this.availableUnits.add(new TransportShip(this));
            }
        }

        if(date.current === date(1937, Month.August)){
            this.availableUnits.add(new Battleship("Littorio", 6, 6, 43, this));
            this.availableUnits.add(new Battleship("Vittorio Veneto", 6, 6, 43, this));
        }
        else if(date.current === date(1938, Month.September)){
            this.availableUnits.add(new Submarine("Marcello", 3, 2, 25, this));
        }
        else if(date.current === date(1939, Month.June)){
            this.availableUnits.add(new AirUnit("SM-79 Sparveiro", this));
        }
        else if(date.current === date(1939, Month.November)){
            this.availableUnits.add(new AirUnit("SM-79 Sparveiro", this));
            this.availableUnits.add(new AirUnit("CR-32", this));
            this.availableUnits.add(new Battleship("Roma", 6, 6, 43, this));
            this.availableUnits.add(new Submarine("Marconi", 3, 2, 25, this));
        }
        else if(date.current === date(1940, Month.June)){
            this.availableUnits.add(new AirUnit("SM-79 Sparveiro", this));
            this.availableUnits.add(new AirUnit("CR-32", this));
            this.availableUnits.add(new Battleship("Impero", 6, 6, 43, this));
        }
        else if(date.current === date(1940, Month.September)){
            this.availableUnits.add(new AirUnit("SM-79 Sparveiro", this));
            this.availableUnits.add(new Battleship("Impero", 6, 6, 43, this));
        }
        else if(date.current === date(1941, Month.January)){
            this.availableUnits.add(new AirUnit("C-202", this));
            this.availableUnits.add(new Paratrooper(1, 3, this));
        }
        else if(date.current === date(1941, Month.June)){
            this.availableUnits.add(new AirUnit("C-202", this));
        }
        else if(date.current === date(1941, Month.November)){
            this.availableUnits.add(new AirUnit("C-202", this));
            this.availableUnits.add(new LightCruiser("Attilio Regolo", 1, 1, 59, this));
            this.availableUnits.add(new Submarine("Acciaio", 3, 2, 20, this));
        }
        else if(date.current === date(1942, Month.April)){
            this.availableUnits.add(new AirUnit("C-202", this));
        }
        else if(date.current === date(1942, Month.December)){
            this.availableUnits.add(new LightCruiser("Pompeo Magno", 1, 1, 59, this));
            this.availableUnits.add(new LightCruiser("Scipione Africano", 1, 1, 59, this));
            this.availableUnits.add(new Submarine("Flutto", 3, 2, 23, this));
        }
        else if(date.current === date(1943, Month.July)){
            this.availableUnits.add(new AirUnit("C-205", this));
            this.availableUnits.add(new AirUnit("SM-79 Sparveiro", this));
            this.availableUnits.add(new LightCruiser("Giulio Germanico", 1, 1, 59, this));    //Built but not finished until after the war in real life
        }
        else if(date.current === date(1944, Month.January)){
            this.availableUnits.add(new AirUnit("C-205", this));
            this.availableUnits.add(new AirUnit("SM-79 Sparveiro", this));
        }
    }

    protected override conquer(): void {
        if(!Countries.germany.conquered()){
            for(let hex of this.hexes){
                if(hex.controller() === this && !hex.isColony){
                    hex.setController(Countries.germany);
                }
            }
        }

        super.conquer();
    }

    protected override shouldBeConquered(): boolean {
        return super.shouldBeConquered()
            || this.cities.every(it => it.isColony || it.controller()!!.partnership() !== this.partnership())
            || (
                this.cities.every(it => !it.isColony || it.controller()!!.partnership() !== this.partnership())
                && this.cities.some(it => !it.isColony && it.controller()!!.partnership() !== this.partnership())
            );
    }

    protected override shouldBeLiberated(): boolean {
        return false;
    }

    override canBeActivated(partnership: Partnership): boolean {
        return this.partnership() === Partnership.Neutral
            && partnership === Partnership.Axis
            && Countries.germany.partnership() === Partnership.Axis
            && !Countries.germany.conquered();
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.germany, Countries.unitedKingdom].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Italy";
    }

    override railCapacity(): number {
        return 1;
    }

    override color(): string {
        return "#a8a8a8";
    }
}
