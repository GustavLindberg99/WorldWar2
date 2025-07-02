import CountryWithUnits from "../country-with-units.js";

import { Partnership } from "../../partnership.js";
import { currentMonth, date, Month } from "../../date.js";
import { AirUnit, Armor, Battleship, Carrier, Destroyer, HeavyCruiser, Infantry, Kaibokan, LightCruiser, Marine, Paratrooper, Submarine, SupplyUnit, TransportShip } from "../../units.js";

export default class Japan extends CountryWithUnits {
    constructor(){
        super(Partnership.Axis);
        this.availableUnits = new Set([
            ...(new Array(105)).fill(null).map(() => new Infantry(1, 4, this)),
            ...(new Array(3)).fill(null).map(() => new SupplyUnit(4, this)),
            ...(new Array(2)).fill(null).map(() => new AirUnit("Ki-27", this)),
            ...(new Array(3)).fill(null).map(() => new AirUnit("Ki-21", this)),
            ...(new Array(5)).fill(null).map(() => new Destroyer("Otori", 1, 1, 50, this)),
            ...(new Array(5)).fill(null).map(() => new Destroyer("Shiratsuyu", 1, 1, 49, this)),
            ...(new Array(5)).fill(null).map(() => new Destroyer("Asashio", 1, 1, 50, this)),
            ...(new Array(5)).fill(null).map(() => new TransportShip(this)),
            new LightCruiser("Yakumo", 1, 1, 29, this),
            new LightCruiser("Tama", 1, 1, 52, this),
            new LightCruiser("Yūbari", 1, 1, 51, this),
            new LightCruiser("Tokiwa", 1, 1, 30, this),
            new LightCruiser("Yasoshima", 1, 1, 30, this),
            new LightCruiser("Iwate", 1, 1, 30, this),
            new LightCruiser("Izumo", 1, 1, 30, this),
            new LightCruiser("Kiso", 1, 1, 52, this),
            new LightCruiser("Kitakami", 1, 1, 52, this),
            new LightCruiser("Kuma", 1, 1, 52, this),
            new LightCruiser("Ōi", 1, 1, 52, this),
            new LightCruiser("Abukuma", 1, 1, 52, this),
            new LightCruiser("Isuzu", 1, 1, 52, this),
            new LightCruiser("Kinu", 1, 1, 52, this),
            new LightCruiser("Nagara", 1, 1, 52, this),
            new LightCruiser("Natori", 1, 1, 52, this),
            new LightCruiser("Yura", 1, 1, 52, this),
            new LightCruiser("Jintsu", 1, 1, 50, this),
            new LightCruiser("Naka", 1, 1, 50, this),
            new LightCruiser("Sendai", 1, 1, 50, this),
            new LightCruiser("Tatsuta", 1, 1, 36, this),
            new LightCruiser("Tenryū", 1, 1, 36, this),
            new HeavyCruiser("Aoba", 3, 3, 49, this),
            new HeavyCruiser("Kinugasa", 3, 3, 49, this),
            new HeavyCruiser("Furutaka", 3, 3, 49, this),
            new HeavyCruiser("Kako", 3, 3, 49, this),
            new HeavyCruiser("Atago", 3, 5, 50, this),
            new HeavyCruiser("Chōkai", 3, 5, 50, this),
            new HeavyCruiser("Maya", 3, 5, 50, this),
            new HeavyCruiser("Takao", 3, 5, 50, this),
            new HeavyCruiser("Kumano", 4, 5, 50, this),
            new HeavyCruiser("Mikuma", 4, 5, 50, this),
            new HeavyCruiser("Mogami", 4, 5, 50, this),
            new HeavyCruiser("Suzuya", 4, 5, 50, this),
            new HeavyCruiser("Haguro", 4, 5, 52, this),
            new HeavyCruiser("Ashigara", 4, 5, 52, this),
            new HeavyCruiser("Myōkō", 4, 5, 52, this),
            new HeavyCruiser("Nachi", 4, 5, 52, this),
            new Battleship("Kirishima", 6, 6, 33, this),
            new Battleship("Fusō", 6, 7, 32, this),
            new Battleship("Yamashiro", 10, 7, 32, this),
            new Battleship("Hyūga", 6, 7, 33, this),
            new Battleship("Ise", 6, 7, 33, this),
            new Battleship("Mutsu", 8, 9, 38, this),
            new Battleship("Nagato", 8, 9, 38, this),
            new Carrier("Hōshō", 2, 36, this, new AirUnit("A5M", this)),
            new Carrier("Ryūjō", 2, 42, this, new AirUnit("A5M", this)),
            new Carrier("Ryūhō", 2, 38, this, new AirUnit("A5M", this)),
            new Carrier("Akagi", 3, 38, this, new AirUnit("A5M", this)),
            new Carrier("Kaga", 3, 40, this, new AirUnit("A5M", this)),
            new Carrier("Sōryū", 3, 49, this, new AirUnit("A5M", this)),
            new Submarine("L4", 3, 2, 23, this),
            new Submarine("J1", 3, 2, 26, this),
            new Submarine("Kaidai III", 3, 2, 29, this)
        ]);
    }

    override addNewAvailableUnits(): void {
        if(this.conquered()){
            return;
        }
        if(date.current === this.enteredWar){
            for(let i = 0; i < 50; i++){
                this.availableUnits.add(new Infantry(1, 4, this));
            }
            this.availableUnits.add(new HeavyCruiser("Chikuma", 3, 3, 50, this));
            this.availableUnits.add(new HeavyCruiser("Tone", 3, 3, 50, this));
            this.availableUnits.add(new Carrier("Shōhō", 2, 40, this, new AirUnit("A6M", this)));
            for(let i = 0; i < 27; i++){
                this.availableUnits.add(new SupplyUnit(4, this));
            }
            for(let i = 0; i < 6; i++){
                this.availableUnits.add(new AirUnit("L2D", this));
            }
            for(let i = 0; i < 15; i++){
                this.availableUnits.add(new TransportShip(this));
            }
        }
        if(date.current <= date(1938, Month.December)){
            for(let i = 0; i < 2; i++){
                this.availableUnits.add(new Infantry(1, 4, this));
            }
        }
        else if(date.current <= date(1939, Month.December)){
            for(let i = 0; i < 5; i++){
                this.availableUnits.add(new Infantry(1, 4, this))
            }
            this.availableUnits.add(new Marine(1, 4, this));
        }
        else if(date.current <= date(1940, Month.December)){
            for(let i = 0; i < 3; i++){
                this.availableUnits.add(new Infantry(1, 4, this));
            }
            this.availableUnits.add(new Marine(1, 4, this));
        }
        else if(date.current <= date(1941, Month.December)){
            if(currentMonth() % 2 === 0){
                this.availableUnits.add(new Armor(1, 5, this));
            }
            else for(let i = 0; i < 3; i++){
                this.availableUnits.add(new Infantry(1, 4, this));
            }
            this.availableUnits.add(new Marine(1, 4, this));
        }
        else if(date.current <= date(1942, Month.December)){
            for(let i = 0; i < 2; i++){
                this.availableUnits.add(new Infantry(1, 4, this));
            }
            this.availableUnits.add(new Armor(1, 5, this));
            this.availableUnits.add(new Marine(1, 4, this));
        }
        else if(date.current <= date(1943, Month.December)){
            this.availableUnits.add(new Infantry(1, 4, this));
        }
        else{
            this.availableUnits.add(new Armor(1, 5, this));
        }

        if(date.current === date(1938, Month.January)){
            this.availableUnits.add(new Destroyer("Kagerō", 1, 1, 51, this));
        }
        else if(date.current === date(1938, Month.July)){
            this.availableUnits.add(new Carrier("Hiryū", 3, 49, this, new AirUnit("A6M", this)));
        }
        else if(date.current === date(1938, Month.November)){
            this.availableUnits.add(new Kaibokan("Shimushu", 1, 1, 28, this));
        }
        else if(date.current === date(1939, Month.February)){
            this.availableUnits.add(new AirUnit("Ki-21", this))
            this.availableUnits.add(new Destroyer("Kagerō", 1, 1, 51, this));
            this.availableUnits.add(new Kaibokan("Kunashiri", 1, 1, 28, this));
        }
        else if(date.current === date(1939, Month.October)){
            this.availableUnits.add(new AirUnit("Ki-21", this));
            this.availableUnits.add(new AirUnit("Ki-48-Ia", this));
            this.availableUnits.add(new Destroyer("Kagerō", 1, 1, 51, this));
            this.availableUnits.add(new LightCruiser("Kashima", 1, 1, 44, this));
            this.availableUnits.add(new LightCruiser("Katori", 1, 1, 44, this));
            this.availableUnits.add(new Carrier("Zuihō", 2, 40, this, new AirUnit("A6M", this)));
            this.availableUnits.add(new Kaibokan("Ishigaki", 1, 1, 28, this));
            this.availableUnits.add(new Kaibokan("Hachijo", 1, 1, 28, this));
            this.availableUnits.add(new Carrier("Shōkaku", 3, 49, this, new AirUnit("A6M", this)));
            this.availableUnits.add(new Carrier("Zuikaku", 3, 49, this, new AirUnit("A6M", this)));
        }
        else if(date.current === date(1940, Month.March)){
            this.availableUnits.add(new AirUnit("Ki-21", this));
        }
        else if(date.current === date(1940, Month.August)){
            this.availableUnits.add(new Battleship("Yamato", 11, 11, 39, this))
            this.availableUnits.add(new Carrier("Taiyō", 2, 30, this, new AirUnit("A6M", this)));
        }
        else if(date.current === date(1940, Month.November)){
            this.availableUnits.add(new AirUnit("Ki-43 Hayabusa", this));
            this.availableUnits.add(new AirUnit("Ki-46", this));
            this.availableUnits.add(new AirUnit("Ki-21", this));
            this.availableUnits.add(new AirUnit("Ki-48-Ia", this));
            this.availableUnits.add(new Destroyer("Kagerō", 1, 1, 51, this));
            this.availableUnits.add(new LightCruiser("Kashii", 1, 1, 44, this));
            this.availableUnits.add(new Battleship("Musashi", 11, 11, 39, this));
        }
        else if(date.current === date(1941, Month.March)){
            this.availableUnits.add(new AirUnit("Ki-46", this));
            this.availableUnits.add(new AirUnit("Ki-48-Ia", this));
        }
        else if(date.current === date(1941, Month.June)){
            this.availableUnits.add(new AirUnit("Ki-43 Hayabusa", this));
            this.availableUnits.add(new AirUnit("Ki-46", this));
            this.availableUnits.add(new AirUnit("Ki-48-Ia", this));
            this.availableUnits.add(new Destroyer("Kagerō", 1, 1, 51, this));
            this.availableUnits.add(new Destroyer("Akizuki", 1, 1, 47, this));
            this.availableUnits.add(new Carrier("Junyō", 3, 36, this, new AirUnit("A6M", this)));
            this.availableUnits.add(new Carrier("Hiyō", 3, 36, this, new AirUnit("A6M", this)));
            this.availableUnits.add(new Submarine("B1", 3, 2, 34, this));
        }
        else if(date.current === date(1942, Month.January)){
            this.availableUnits.add(new Paratrooper(1, 4, this));
            this.availableUnits.add(new AirUnit("Ki-43 Hayabusa", this));
            this.availableUnits.add(new AirUnit("Ki-21", this));
            this.availableUnits.add(new AirUnit("Ki-48-Ia", this));
            this.availableUnits.add(new Carrier("Chiyoda", 2, 41, this, new AirUnit("A6M", this)));
            this.availableUnits.add(new Destroyer("Yūgumo", 1, 1, 51, this));
            this.availableUnits.add(new LightCruiser("Agano", 1, 1, 50, this));
            this.availableUnits.add(new Submarine("B1", 3, 2, 34, this));
        }
        else if(date.current === date(1942, Month.April)){
            this.availableUnits.add(new AirUnit("Ki-43 Hayabusa", this));
            this.availableUnits.add(new AirUnit("Ki-67 Hiryu", this));
            this.availableUnits.add(new AirUnit("Ki-21", this));
            this.availableUnits.add(new LightCruiser("Ōyodo", 1, 1, 50, this));
            this.availableUnits.add(new Submarine("Kaidai VII", 3, 2, 29, this));
        }
        else if(date.current === date(1942, Month.July)){
            this.availableUnits.add(new AirUnit("Ki-48-Ia", this))
            this.availableUnits.add(new Submarine("Kaidai VII", 3, 2, 29, this));
        }
        else if(date.current === date(1942, Month.October)){
            this.availableUnits.add(new AirUnit("Ki-48-IIa", this));
            this.availableUnits.add(new Destroyer("Akizuki", 1, 1, 47, this));
            this.availableUnits.add(new LightCruiser("Noshiro", 1, 1, 50, this));
            this.availableUnits.add(new Kaibokan("Matsuwa", 1, 1, 28, this));
            this.availableUnits.add(new Kaibokan("Sado", 1, 1, 28, this));
            this.availableUnits.add(new Kaibokan("Oki", 1, 1, 28, this));
            this.availableUnits.add(new Submarine("Ko", 3, 2, 20, this));
        }
        else if(date.current === date(1943, Month.January)){
            this.availableUnits.add(new AirUnit("Ki-48-IIa", this));
            this.availableUnits.add(new Paratrooper(1, 4, this));
            this.availableUnits.add(new Carrier("Chitose", 2, 41, this, new AirUnit("A6M", this)));
            this.availableUnits.add(new Destroyer("Yūgumo", 1, 1, 51, this));
            this.availableUnits.add(new LightCruiser("Yahagi", 1, 1, 50, this));
            this.availableUnits.add(new Carrier("Shin'yō", 5, 32, this, new AirUnit("A6M", this)));
            this.availableUnits.add(new Carrier("Taihō", 5, 48, this, new AirUnit("A6M", this)));
            this.availableUnits.add(new Kaibokan("Etorofu", 1, 1, 28, this));
            this.availableUnits.add(new Kaibokan("Iki", 1, 1, 28, this));
            this.availableUnits.add(new Submarine("Ko", 3, 2, 20, this));
        }
        else if(date.current === date(1943, Month.April)){
            this.availableUnits.add(new AirUnit("Ki-48-IIa", this));
            this.availableUnits.add(new AirUnit("Ki-46", this));
            this.availableUnits.add(new AirUnit("P1Y Ginga", this));
            this.availableUnits.add(new Kaibokan("Mutsure", 1, 1, 28, this));
            this.availableUnits.add(new Kaibokan("Wakamiya", 1, 1, 28, this));
            this.availableUnits.add(new Kaibokan("Hirado", 1, 1, 28, this));
            this.availableUnits.add(new Kaibokan("Fukae", 1, 1, 28, this));
            this.availableUnits.add(new Kaibokan("Tsushima", 1, 1, 28, this));
            this.availableUnits.add(new Submarine("B2", 3, 2, 34, this));
        }
        else if(date.current === date(1943, Month.July)){
            this.availableUnits.add(new AirUnit("Ki-48-IIa", this));
            this.availableUnits.add(new AirUnit("Ki-46", this));
            this.availableUnits.add(new AirUnit("P1Y Ginga", this));
            this.availableUnits.add(new Destroyer("Yūgumo", 1, 1, 51, this));
            this.availableUnits.add(new Kaibokan("Manju", 1, 1, 28, this));
            this.availableUnits.add(new Kaibokan("Kanju", 1, 1, 28, this));
            this.availableUnits.add(new Submarine("Kaichū VII", 3, 2, 28, this));
        }
        else if(date.current === date(1943, Month.September)){
            this.availableUnits.add(new Carrier("Unryū", 4, 49, this, new AirUnit("A7M", this)));
            this.availableUnits.add(new Carrier("Amagi", 4, 49, this, new AirUnit("A7M", this)));
            this.availableUnits.add(new Kaibokan("Amakusa", 1, 1, 28, this));
            this.availableUnits.add(new Submarine("C2", 3, 2, 34, this));
        }
        else if(date.current === date(1944, Month.January)){
            this.availableUnits.add(new AirUnit("Ki-84 Hayate", this));
            this.availableUnits.add(new Carrier("Shinano", 6, 40, this, new AirUnit("A7M", this)));
            this.availableUnits.add(new Carrier("Katsuragi", 6, 46, this, new AirUnit("A7M", this)));
            this.availableUnits.add(new Destroyer("Yūgumo", 1, 1, 51, this));
            this.availableUnits.add(new Kaibokan("Kasado", 1, 1, 28, this));
            this.availableUnits.add(new Submarine("Kaichū VII", 3, 2, 28, this));
        }
        else if(date.current === date(1944, Month.March)){
            this.availableUnits.add(new AirUnit("Ki-48-IIc", this));
            this.availableUnits.add(new AirUnit("P1Y Ginga", this));
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));
            this.availableUnits.add(new LightCruiser("Sakawa", 1, 1, 50, this));
        }
        else if(date.current === date(1944, Month.June)){
            this.availableUnits.add(new AirUnit("Ki-84 Hayate", this));
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));
            this.availableUnits.add(new Submarine("Ha-201", 3, 2, 20, this));
        }
        else if(date.current === date(1944, Month.July)){
            this.availableUnits.add(new AirUnit("Ki-48-IIc", this));
            this.availableUnits.add(new Destroyer("Yūgumo", 1, 1, 51, this));    //Planned but never built in real life
        }
        else if(date.current === date(1944, Month.August)){
            this.availableUnits.add(new AirUnit("P1Y Ginga", this));
            this.availableUnits.add(new Destroyer("Yūgumo", 1, 1, 51, this));    //Planned but never built in real life
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));
            this.availableUnits.add(new Submarine("Sentaka", 3, 2, 22, this));
        }
        else if(date.current === date(1944, Month.November)){
            this.availableUnits.add(new AirUnit("Ki-84 Hayate", this));
            this.availableUnits.add(new AirUnit("MXY-7 Ohka", this));
            this.availableUnits.add(new Carrier("Kasagi", 3, 46, this, new AirUnit("A7M", this)));    //Built but never finished in real life
            this.availableUnits.add(new Carrier("Aso", 3, 46, this, new AirUnit("A7M", this)));    //Built but never finished in real life
            this.availableUnits.add(new Carrier("Ikoma", 3, 46, this, new AirUnit("A7M", this)));    //Planned but never built in real life
            this.availableUnits.add(new Destroyer("Yūgumo", 1, 1, 51, this));    //Planned but never built in real life
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));
        }
        else if(date.current === date(1945, Month.January)){
            this.availableUnits.add(new AirUnit("Ki-84 Hayate", this));
            this.availableUnits.add(new AirUnit("MXY-7 Ohka", this));
            this.availableUnits.add(new Carrier("Kurama", 3, 46, this, new AirUnit("A7M", this)));    //Planned but never built in real life
            this.availableUnits.add(new Destroyer("Yūgumo", 1, 1, 51, this));    //Planned but never built in real life
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));
        }
        else if(date.current === date(1945, Month.May)){
            this.availableUnits.add(new AirUnit("Ki-84 Hayate", this));
            this.availableUnits.add(new AirUnit("MXY-7 Ohka", this));
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));
        }
        else if(date.current === date(1945, Month.June)){
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
        }
        else if(date.current === date(1945, Month.July)){
            this.availableUnits.add(new AirUnit("Ki-84 Hayate", this));
            this.availableUnits.add(new AirUnit("MXY-7 Ohka", this));
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
        }
        else if(date.current === date(1945, Month.August)){
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
        }
        else if(date.current === date(1945, Month.September)){
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
        }
        else if(date.current === date(1945, Month.October)){
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
        }
        else if(date.current === date(1945, Month.November)){
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
        }
        else if(date.current === date(1945, Month.December)){
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
        }
        else if(date.current === date(1946, Month.January)){
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
        }
        else if(date.current === date(1946, Month.February)){
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
        }
        else if(date.current === date(1946, Month.March)){
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
        }
        else if(date.current === date(1946, Month.April)){
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
            this.availableUnits.add(new Destroyer("Matsu", 1, 1, 40, this));    //Planned but never built in real life
        }
    }

    override hasAtomicBomb(): boolean {
        return date.current >= date(1946, Month.October);
    }

    override income(): number {
        return super.income() + this.homelandResourceHexes().length * 150;
    }

    override maxMoneyExchange(): number {
        return 0;
    }

    override name(): string {
        return "Japan";
    }

    override railCapacity(): number {
        return 3;
    }

    override color(): string {
        return "#62666a";
    }
}
