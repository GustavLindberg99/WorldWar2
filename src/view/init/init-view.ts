import { Hex } from "../../model/mapsheet.js";
import { date, dateToString } from "../../model/date.js";

import InfoBubble from "../info/info-bubble.js";
import HexMarker from "../markers/hex-marker.js";

import { writeAllCountryNames } from "./write-all-country-names.js";

namespace InitView {
    /**
     * Draws the hex grid (including writing the country names).
     */
    export async function drawHexGrid(): Promise<void> {
        //If the world map is already drawn, don't do anything
        if(document.getElementById("hexGrid") !== null){
            return;
        }

        //Download the world map
        const worldMap = document.getElementById("worldMap")!!;
        const worldMapHtml = await (await fetch("mapsheet/world.xml")).text();
        worldMap.innerHTML = worldMapHtml + "<g id=\"hexGrid\"></g><g id=\"installations\"></g>";
        writeAllCountryNames();

        //Enable scrolling by dragging
        const svg = document.getElementById("mapsheet")!!;

        window.addEventListener("click", () => {
            svg.style.cursor = "";
        });

        //Set the onclick event of the world map in order to enable onclick events for hexes
        worldMap.onclick = (event: MouseEvent) => {
            if(svg.style.cursor === "move"){
                return;
            }
            const hex = HexMarker.hexAtPoint(event.clientX, event.clientY);
            if(hex !== null){
                HexMarker.onhexclick?.(hex, event);
            }
        };
        worldMap.oncontextmenu = (event) => {
            const hex = HexMarker.hexAtPoint(event.clientX, event.clientY);
            if(hex !== null){
                InfoBubble.showHexInfo(hex);
                event.preventDefault();
            }
        };

        //Define some variables
        const hexGrid = document.getElementById("hexGrid")!!;

        //Draw the hex grid
        for(let x = 0; x <= Hex.mapWidth; x++){
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            let points = "M" + (x % 2 ? x * Hex.hexWidth : (x+1/3) * Hex.hexWidth) + " 0";
            for(let y = 0; y < Hex.mapHeight * 2 + (x === 0 ? 0 : 1); y++){
                points += (x === Hex.mapWidth && y === 0 ? "m" : "l") + ((-1)**(x+y+1) * Hex.hexWidth / 3) + " " + (Hex.hexHeight / 2);
            }
            path.setAttribute("d", points);
            hexGrid.appendChild(path);
        }
        for(let y = 0; y <= Hex.mapHeight; y++){
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            let points = "M" + (Hex.hexWidth / 3) + " " + (y * Hex.hexHeight);
            for(let x = 0; x < Hex.mapWidth; x++){
                points += "h" + (Hex.hexWidth * 2 / 3) + "m" + (Hex.hexWidth / 3) + " " + ((-1)**x * Hex.hexHeight / 2);
            }
            path.setAttribute("d", points);
            hexGrid.appendChild(path);
        }

        //Draw the cities and resource hexes
        HexMarker.drawAllCities();
        HexMarker.drawResourceHexes();
    }

    /**
     * Enables the buttons in the top bar and hides the new game view.
     */
    export function enableButtons(): void {
        document.querySelector<HTMLElement>(".newGameView")!!.style.display = "none";
        document.getElementById("dateLabel")!!.textContent = dateToString(date.current);
        document.getElementById("phases")!!.style.display = "";
        document.getElementById("leftPanel")!!.style.display = "";
        document.getElementById("mainArea")!!.style.display = "";
    }
}
export default InitView;
