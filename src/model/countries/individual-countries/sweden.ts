import CountryWithUnits from "../country-with-units.js";

import { Countries, Country } from "../../countries.js";
import { date } from "../../date.js";
import { Partnership } from "../../partnership.js";
import { AirUnit, Destroyer, Infantry, LightCruiser } from "../../units.js";


export default class Sweden extends CountryWithUnits {
    constructor(){
        super(Partnership.Neutral);
        this.availableUnits = new Set([
            ...(new Array(10)).fill(null).map(() => new Infantry(1, 3, this)),
            new AirUnit("J-22", this),
            new Destroyer("Ehrensköld", 1, 1, 52, this),
            new LightCruiser("Gotland", 1, 1, 39, this)
        ]);
    }

    override addNewAvailableUnits(): void {
        if(this.conquered()){
            return;
        }
        if(this.enteredWar !== null || Countries.norway.enteredWar !== null){
            const nordicCountriesAttacked = Math.min(this.enteredWar ?? Infinity, Countries.norway.enteredWar ?? Infinity);
            if(date.current < nordicCountriesAttacked + 15){
                for(let i = 0; i < 2; i++){
                    this.availableUnits.add(new Infantry(1, 3, this));
                }
            }
            else if(date.current === nordicCountriesAttacked + 24){
                this.availableUnits.add(new Destroyer("Mode", 1, 2, 43, this));
            }
            else if(date.current === nordicCountriesAttacked + 36){
                this.availableUnits.add(new Destroyer("Visby", 1, 2, 56, this));
            }
        }
    }

    override additionalInvadedCountries(partnership: Partnership): Array<Country> {
        return [Countries.unitedKingdom].filter(it => it.canBeInvadedBy(partnership));
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.germany, Countries.unitedKingdom].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Sweden";
    }

    override color(): string {
        return "#021cde";
    }
}
