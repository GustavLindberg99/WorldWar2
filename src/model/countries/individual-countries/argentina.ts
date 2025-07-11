import CountryWithUnits from "../country-with-units.js";

import { Partnership } from "../../partnership.js";
import { Countries, Country } from "../../countries.js";
import { Battleship, Destroyer, HeavyCruiser, LightCruiser } from "../../units.js";

export default class Argentina extends CountryWithUnits {
    constructor(){
        super(Partnership.Allies);
        this.availableUnits = new Set([
            new Destroyer("Churruca", 1, 1, 52, this),
            new Destroyer("Mendoza", 1, 1, 52, this),
            new Destroyer("Buenos Aires", 1, 1, 50, this),
            new LightCruiser("La Argentina", 1, 1, 43, this),
            new LightCruiser("General Belgrano", 1, 1, 26, this),
            new LightCruiser("Pueyrredón", 1, 1, 26, this),
            new HeavyCruiser("Almirante Brown", 3, 4, 46, this),
            new HeavyCruiser("Veinticinco de Mayo", 3, 4, 46, this),
            new Battleship("Moreno", 4, 5, 32, this),
            new Battleship("Rivadavia", 4, 5, 32, this)
        ]);
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.unitedStates].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Argentina";
    }

    override color(): string {
        return "#97d7b6";
    }
}
