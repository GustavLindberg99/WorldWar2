import { Hex, WeatherZone } from "./mapsheet.js";
import { Partnership } from "./partnership.js";
import { Countries, Country } from "./countries.js";
import { date, Month } from "./date.js";
import { Phase } from "./phase.js";

export namespace SavedGames {
    export type Json = {
        date: number,
        phase: number,
        humanPartnership: "Axis" | "Allies",
        groundedAirUnits?: Array<keyof typeof WeatherZone>,
        hexes: Array<Hex.Json>,
        countries: Array<Country.Json>
    };

    /**
     * Serializes the current game state to a JSON object.
     *
     * @param humanPartnership  The partnership of the human player.
     *
     * @returns A JSON object representing the current game state.
     */
    export function gameToJson(humanPartnership: Partnership): SavedGames.Json {
        return {
            date: date.current,
            phase: Phase.current,
            humanPartnership: humanPartnership.name,
            groundedAirUnits: (Object.keys(WeatherZone) as Array<keyof typeof WeatherZone>).filter(it => Hex.groundedAirUnits.has(WeatherZone[it])),
            hexes: Hex.allHexes.map(it => it.toJson()).filter(hexJson => Object.values(hexJson).filter(it => it !== undefined).length > 2),
            countries: Countries.all().map(it => it.toJson())
        };
    }

    /**
     * Checks if the given object is JSON representing a valid game.
     *
     * @param json  The JSON object to validate.
     *
     * @returns True if it's valid, false if it isn't.
     */
    export function validateJson(json: unknown): json is SavedGames.Json {
        if(typeof(json) !== "object" || json === null){
            console.warn("Invalid saved game: invalid type.");
            return false;
        }
        else if(!("date" in json) || typeof(json.date) !== "number" || json.date < date(1937, Month.June)){
            console.warn("Invalid saved game: invalid date.");
            return false;
        }
        else if(!("phase" in json) || typeof(json.phase) !== "number" || json.phase < Phase.Deployment || json.phase > Phase.WarDeclaration){
            console.warn("Invalid saved game: invalid phase.");
            return false;
        }
        else if(!("hexes" in json) || !(json.hexes instanceof Array) || !json.hexes.every(it => Hex.validateJson(it))){
            console.warn("Invalid saved game: invalid hexes.");
            return false;
        }
        else if(!("countries" in json) || !(json.countries instanceof Array) || !json.countries.every(it => Country.validateJson(it))){
            console.warn("Invalid saved game: invalid countries.");
            return false;
        }
        else if("groundedAirUnits" in json && (!(json.groundedAirUnits instanceof Array) || !json.groundedAirUnits.every(it => typeof(it) === "string" && Object.keys(WeatherZone).includes(it)))){
            console.warn("Invalid saved game: invalid air units.");
            return false;
        }
        else{
            return true;
        }
    }

    /**
     * Deserializes a JSON object holding a game state and makes it the current game state.
     *
     * @param json  A JSON object holding a game state.
     */
    export function loadGameFromJson(json: SavedGames.Json): void {
        date.current = json.date;
        Phase.current = json.phase;
        Hex.groundedAirUnits = new Set(json.groundedAirUnits?.map(it => WeatherZone[it]));
        for(let hexJson of json.hexes){
            Hex.fromCoordinates(hexJson.x, hexJson.y).loadFromJson(hexJson);
        }
        for(let countryJson of json.countries){
            Countries.fromName(countryJson.name)!!.loadFromJson(countryJson);
        }
    }
}
