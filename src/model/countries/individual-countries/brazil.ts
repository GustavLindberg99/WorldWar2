import CountryWithUnits from "../country-with-units.js";

import { Partnership } from "../../partnership.js";
import { Countries, Country } from "../../countries.js";
import { Battleship, Destroyer, LightCruiser } from "../../units.js";

export default class Brazil extends CountryWithUnits {
    constructor(){
        super(Partnership.Allies);
        this.availableUnits = new Set([
            new LightCruiser("Rio Grande do Sul", 1, 1, 39, this),
            new LightCruiser("Bahia", 1, 1, 39, this),
            new Battleship("Minas Geraes", 4, 4, 30, this),
            new Battleship("São Paulo", 4, 4, 30, this),
            new Destroyer("Pará", 1, 1, 39, this),
            new Destroyer("Marcilio Dias", 1, 1, 52, this)
        ]);
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.unitedStates].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Brazil";
    }

    override color(): string {
        return "#8ff5c2";
    }
}
