import { Country } from "../../model/countries.js";

import InfoBubble from "../info/info-bubble.js";

/**
 * Writes a country name to the map.
 *
 * @param text          An array where each element is a portion of text to write. A Country object means write the country's name as a clickable link to show info about the country. A string means to just write a non-clickable string.
 * @param x             The x coordinate that the SVG element should have.
 * @param y             The y coordinate that the SVG element should have.
 * @param fontSize      The font size that the text should have.
 * @param textAnchor    The alignment that the text should have.
 * @param transform     The CSS transform that the text should have. Null if it shouldn't have any.
 */
export function writeCountryName(text: ReadonlyArray<Country | string>, x: number, y: number, fontSize: number, textAnchor: string, transform: string | null): void {
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", x.toString());
    label.setAttribute("y", y.toString());
    label.setAttribute("font-size", fontSize.toString());
    label.setAttribute("text-anchor", textAnchor);
    if(transform !== null){
        label.setAttribute("transform", transform);
    }
    for(let country of text){
        if(country instanceof Country){
            label.appendChild(InfoBubble.clickableCountryInfoLink(country, "http://www.w3.org/2000/svg"));
        }
        else{
            label.appendChild(document.createTextNode(country));
            if(country !== '('){
                label.appendChild(document.createTextNode(" "));
            }
        }
    }
    document.querySelector(".countryNames")!!.appendChild(label);
}