import CountryWithUnits from "../country-with-units.js";

import { Countries, Country } from "../../countries.js";
import { date, Month, year } from "../../date.js";
import { Partnership } from "../../partnership.js";
import { Convoy, Destroyer, DestroyerEscort, Infantry, LightCruiser, SupplyUnit, TransportShip } from "../../units.js";

export default class Canada extends CountryWithUnits {
    constructor(){
        super(Partnership.Allies);
        this.availableUnits = new Set([
            ...(new Array(5)).fill(null).map(() => new Infantry(1, 4, this)),
            new SupplyUnit(4, this),
            new Destroyer("River", 1, 1, 50, this),
            new Convoy(this),
            new TransportShip(this)
        ]);
    }

    override addNewAvailableUnits(): void {
        if(this.conquered()){
            return;
        }
        if(date.current === date(1940, Month.March)){
            this.availableUnits.add(new Destroyer("Town", 1, 1, 50, this));
            this.availableUnits.add(new Destroyer("Town", 1, 1, 50, this));
        }
        else if(date.current === date(1943, Month.March)){
            this.availableUnits.add(new Destroyer("Tribal", 1, 1, 52, this));
            this.availableUnits.add(new DestroyerEscort("River", 1, 1, 29, this));
        }
        else if(date.current === date(1943, Month.September)){
            this.availableUnits.add(new DestroyerEscort("River", 1, 1, 29, this));
        }
        else if(year(date.current) === 1944){
            this.availableUnits.add(new DestroyerEscort("River", 1, 1, 29, this));
        }
        else if(date.current === date(1945, Month.January)){
            this.availableUnits.add(new Destroyer("C", 1, 1, 52, this));
            this.availableUnits.add(new LightCruiser("Ontario", 1, 1, 45, this));
        }
        else if(date.current === date(1946, Month.February)){
            this.availableUnits.add(new Destroyer("Tribal", 1, 1, 52, this));
        }
    }

    override income(): number {
        //Canada gets $500B extra per month as long as the US is neutral, this represents lend lease to the UK (Canada gets this to force it to be transported by convoys)
        return super.income() + (Countries.unitedStates.partnership() === Partnership.Neutral ? 500 : 0);
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.unitedStates].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override canSendMoneyWithConvoys(): Array<Country> {
        return [Countries.unitedKingdom, Countries.sovietUnion].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Canada";
    }

    override railCapacity(): number {
        return 1;
    }

    override color(): string {
        return "#70ec10";
    }
}
