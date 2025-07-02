import CountryWithUnits from "../country-with-units.js";

import { Countries, Country } from "../../countries.js";
import { Partnership } from "../../partnership.js";
import { AirUnit, Destroyer, HeavyCruiser, Infantry, LightCruiser, TransportShip } from "../../units.js";

export default class Spain extends CountryWithUnits {
    hasAttemptedActivation: boolean = false;

    constructor(){
        super(Partnership.Neutral);
        this.availableUnits = new Set([
            ...(new Array(25)).fill(null).map(() => new Infantry(1, 3, this)),
            new AirUnit("ME-110C", this),
            new Destroyer("Alsedo", 1, 1, 49, this),
            ...(new Array(3)).fill(null).map(() => new Destroyer("Churruca", 1, 2, 52, this)),
            new LightCruiser("Almirante Cervera", 1, 1, 47, this),
            new HeavyCruiser("Canarias", 2, 2, 47, this),
            new LightCruiser("Galicia", 1, 1, 47, this),
            new LightCruiser("Méndez Núñez", 1, 1, 42, this),
            new LightCruiser("Miguel de Cervantes", 1, 1, 47, this),
            new LightCruiser("Navarra", 1, 1, 36, this),
            ...(new Array(1)).fill(null).map(() => new TransportShip(this))
        ]);
    }

    override canBeActivated(partnership: Partnership): boolean {
        return this.partnership() === Partnership.Neutral
            && partnership === Partnership.Axis
            && !this.hasAttemptedActivation
            && (
                (Countries.germany.partnership() === Partnership.Axis && !Countries.germany.conquered())
                || (Countries.italy.partnership() === Partnership.Axis && !Countries.italy.conquered())
            );
    }

    override canSendMoneyWithoutConvoys(): Array<Country> {
        return [Countries.germany, Countries.unitedKingdom].filter(it => it.partnership() === this.partnership() && !it.conquered());
    }

    override name(): string {
        return "Spain";
    }

    override color(): string {
        return "#07c7f0";
    }

    override toJson(): Country.Json {
        let json = super.toJson();
        json.hasAttemptedActivation = this.hasAttemptedActivation || undefined;
        return json;
    }

    override loadFromJson(json: Country.Json): void {
        super.loadFromJson(json);
        this.hasAttemptedActivation = json.hasAttemptedActivation ?? false;
    }
}
