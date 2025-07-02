import { Partnership } from "../partnership.js";
import { Country } from "../countries.js";

import Afghanistan from "./individual-countries/afghanistan.js";
import Argentina from "./individual-countries/argentina.js";
import Australia from "./individual-countries/australia.js";
import BalticCountry from "./individual-countries/baltic-country.js";
import Belgium from "./individual-countries/belgium.js";
import Brazil from "./individual-countries/brazil.js";
import Bulgaria from "./individual-countries/bulgaria.js";
import Canada from "./individual-countries/canada.js";
import Chile from "./individual-countries/chile.js";
import China from "./individual-countries/china.js";
import Colombia from "./individual-countries/colombia.js";
import CountryWithoutUnits from "./country-without-units.js";
import Cuba from "./individual-countries/cuba.js";
import Denmark from "./individual-countries/denmark.js";
import Finland from "./individual-countries/finland.js";
import France from "./individual-countries/france.js";
import Germany from "./individual-countries/germany.js";
import Greece from "./individual-countries/greece.js";
import Hungary from "./individual-countries/hungary.js";
import Ireland from "./individual-countries/ireland.js";
import Italy from "./individual-countries/italy.js";
import Japan from "./individual-countries/japan.js";
import LatinAmericanCountry from "./individual-countries/latin-american-country.js";
import Mongolia from "./individual-countries/mongolia.js";
import Netherlands from "./individual-countries/netherlands.js";
import NewZealand from "./individual-countries/new-zealand.js";
import Norway from "./individual-countries/norway.js";
import Panama from "./individual-countries/panama.js";
import Peru from "./individual-countries/peru.js";
import Poland from "./individual-countries/poland.js";
import Portugal from "./individual-countries/portugal.js";
import Romania from "./individual-countries/romania.js";
import SovietUnion from "./individual-countries/soviet-union.js";
import Spain from "./individual-countries/spain.js";
import Sweden from "./individual-countries/sweden.js";
import Switzerland from "./individual-countries/switzerland.js";
import Thailand from "./individual-countries/thailand.js";
import Turkey from "./individual-countries/turkey.js";
import UnitedKingdom from "./individual-countries/united-kingdom.js";
import UnitedStates from "./individual-countries/united-states.js";
import Venezuela from "./individual-countries/venezuela.js";
import Yugoslavia from "./individual-countries/yugoslavia.js";

namespace Countries {
    /*
    Color code:
    Black, gray: Axis
    Brown: Axis minor partner
    Blue: Neutral, remained neutral in real life
    Purple, pink: Neutral, was invaded by Axis in real life
    Red, orange, yellow, green: Allies
    */
    //Regex for finding hardcoded countries: Countries\.(canada|united|mexico|guatemala|elSalvador|honduras|nicaragua|costaRica|panama|cuba|haiti|dominican|colombia|venezuela|ecuador|peru|brazil|bolivia|paraguay|uruguay|argentina|chile|ireland|france|spain|portugal|luxemburg|belgium|netherlands|germany|switzerland|italy|denmark|norway|sweden|finland|estonia|latvia|lithuania|poland|hungary|romania|bulgaria|yugoslavia|greece|turkey|sovietUnion|yemen|saudi|iran|liberia|afghanistan|tibet|thailand|china|japan|mongolia|australia|newZealand)
    export const canada = new Canada();
    export const unitedStates = new UnitedStates();
    export const mexico = new LatinAmericanCountry("Mexico");
    export const guatemala = new LatinAmericanCountry("Guatemala");
    export const elSalvador = new LatinAmericanCountry("El Salvador");
    export const honduras = new LatinAmericanCountry("Honduras");
    export const nicaragua = new LatinAmericanCountry("Nicaragua");
    export const costaRica = new LatinAmericanCountry("Costa Rica");
    export const panama = new Panama("Panama", Partnership.Allies);
    export const cuba = new Cuba();
    export const haiti = new LatinAmericanCountry("Haiti");
    export const dominicanRepublic = new LatinAmericanCountry("Dominican Republic");
    export const colombia = new Colombia();
    export const venezuela = new Venezuela();
    export const ecuador = new LatinAmericanCountry("Ecuador");
    export const peru = new Peru();
    export const brazil = new Brazil();
    export const bolivia = new LatinAmericanCountry("Bolivia");
    export const paraguay = new LatinAmericanCountry("Paraguay");
    export const uruguay = new LatinAmericanCountry("Uruguay");
    export const argentina = new Argentina();
    export const chile = new Chile();

    export const ireland = new Ireland();
    export const unitedKingdom = new UnitedKingdom();
    export const france = new France();
    export const spain = new Spain();
    export const portugal = new Portugal();
    export const luxemburg = new CountryWithoutUnits("Luxemburg");
    export const belgium = new Belgium();
    export const netherlands = new Netherlands();
    export const germany = new Germany();
    export const switzerland = new Switzerland();
    export const italy = new Italy();
    export const denmark = new Denmark();
    export const norway = new Norway();
    export const sweden = new Sweden();
    export const finland = new Finland();
    export const estonia = new BalticCountry("Estonia");
    export const latvia = new BalticCountry("Latvia");
    export const lithuania = new BalticCountry("Lithuania");
    export const poland = new Poland();
    export const hungary = new Hungary();
    export const romania = new Romania();
    export const bulgaria = new Bulgaria();
    export const yugoslavia = new Yugoslavia();
    export const greece = new Greece();
    export const turkey = new Turkey();
    export const sovietUnion = new SovietUnion();

    export const yemen = new CountryWithoutUnits("Yemen");
    export const saudiArabia = new CountryWithoutUnits("Saudi Arabia");
    export const iran = new CountryWithoutUnits("Iran");
    export const liberia = new CountryWithoutUnits("Liberia");
    export const afghanistan = new Afghanistan();
    export const tibet = new CountryWithoutUnits("Tibet");
    export const thailand = new Thailand();
    export const china = new China();
    export const japan = new Japan();
    export const mongolia = new Mongolia();
    export const australia = new Australia();
    export const newZealand = new NewZealand();

    /**
     * Gets all the countries.
     *
     * @returns An array of countries.
     */
    export function all(): Array<Country> {
        return Object.values(Countries).filter(it => it instanceof Country).sort((a, b) => a.name().localeCompare(b.name()));
    }

    /**
     * Gets a country from its name.
     *
     * @param name  The name to search for. Can only succeed if this parameter is a string, but allows any type to simplify validation when parsing JSON.
     *
     * @returns The country that has the name, or null if it could not be found.
     */
    export function fromName(name: unknown): Country | null {
        if(name === "France" || name === "Vichy France"){
            return Countries.france;
        }
        return Countries.all().find(it => it.name() === name) ?? null;
    }
}
export default Countries;
