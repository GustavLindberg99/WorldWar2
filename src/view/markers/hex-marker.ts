import { Hex } from "../../model/mapsheet.js";

import InfoBubble from "../info/info-bubble.js";
import PanZoom from "../pan-zoom.js";

namespace HexMarker {
    const fortPictures: ReadonlyArray<string> = [
        "M2 3 v-2 h-0.5 v-1 h0.6 v0.5 h0.6 v-0.5 h0.6 v0.5 h0.6 v-0.5 h0.6 v1 h-0.5 v2",
        "M2 3 v-2 l0.25 -0.25 l0.25 0.25 l0.25 -0.25 l0.25 0.25 l0.25 -0.25 l0.25 0.25 l0.25 -0.25 l0.25 0.25 v2",
        "M2 3 v-1 l0.25 -0.25 l0.25 0.25 l0.25 -0.25 l0.25 0.25 l0.25 -0.25 l0.25 0.25 l0.25 -0.25 l0.25 0.25 v1",
    ];
    const airfieldPictures: ReadonlyArray<string> = [
        "M1.2 1 H4.8M1.7 0.3 L3.5 3M4.3 0.3 L2.5 3",
        "M1.2 1 H4.8M1.7 0.3 L3.5 3",
        "M1.2 1 H4.8"
    ];

    export let onhexclick: ((hex: Hex, event: Event) => void) | null = null;

    /**
     * Draws the city markers for all city hexes.
     */
    export function drawAllCities(): void {
        for(let hex of Hex.allCityHexes){
            const cityMarker = document.createElementNS("http://www.w3.org/2000/svg", "g");
            cityMarker.setAttribute("class", "cityMarker");
            cityMarker.setAttribute("data-hex", `${hex.x},${hex.y}`);

            const point = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            point.setAttribute("cx", (hex.centerX() + hex.cityOffsetX * Hex.hexHeight / 4).toString());
            point.setAttribute("cy", (hex.centerY() + hex.cityOffsetY * Hex.hexHeight / 4).toString());
            point.setAttribute("r", (Hex.hexHeight / 6).toString());
            cityMarker.appendChild(point);

            if(hex.isMajorPort()){
                const scale = Hex.hexWidth / 2;
                const portMarker = document.createElementNS("http://www.w3.org/2000/svg", "path");
                portMarker.setAttribute("transform", `translate(${hex.centerX() + hex.cityOffsetX * Hex.hexHeight / 4}, ${hex.centerY() + hex.cityOffsetY * Hex.hexHeight / 4}) scale(${scale})`);
                portMarker.setAttribute("d", "M0,-0.2 V0.35 M-0.2,-0.05 h0.4 M-0.3,0.15 a0.6,1.5,0,0,0,0.6,0 M0,-0.2 a0.09,0.09,0,0,0,0,-0.18 a0.09,0.09,0,0,0,0,0.18");
                portMarker.setAttribute("fill", "none");
                portMarker.setAttribute("stroke", "#33bbff");
                portMarker.setAttribute("stroke-width", "0.1");
                cityMarker.appendChild(portMarker);
            }

            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            let labelOffsetX = 0;
            let labelOffsetY = 0;
            switch(hex.cityAlignment){
            case "l":
                label.setAttribute("text-anchor", "end");
                labelOffsetX = -1;
                break;
            case "r":
                label.setAttribute("text-anchor", "start");
                labelOffsetX = 1;
                break;
            case "t":
                label.setAttribute("text-anchor", "middle");
                labelOffsetY = -2;
                break;
            case "b":
                label.setAttribute("text-anchor", "middle");
                labelOffsetY = 2;
                break;
            }
            label.setAttribute("x", (hex.centerX() + (hex.cityOffsetX + labelOffsetX) * Hex.hexHeight / 4).toString());
            label.setAttribute("y", (hex.centerY() + (hex.cityOffsetY + labelOffsetY + 0.6) * Hex.hexHeight / 4).toString());
            label.setAttribute("font-size", (Hex.hexHeight * 0.6) + "px");
            label.setAttribute("font-weight", "bold");
            cityMarker.appendChild(label);

            const country = hex.country!!;
            if(!hex.isEnclaveCity || country.name() !== hex.city){
                label.textContent = hex.city;
            }
            if(hex.isEnclaveCity){
                if(country.name() !== hex.city){
                    label.appendChild(document.createTextNode(" ("));
                }
                label.appendChild(InfoBubble.clickableCountryInfoLink(country, "http://www.w3.org/2000/svg"));
                if(country.name() !== hex.city){
                    label.appendChild(document.createTextNode(")"));
                }
            }

            document.getElementById("installations")!!.appendChild(cityMarker);
        }
    }

    /**
     * Draws the resource hex markers for all resource hexes.
     */
    export function drawResourceHexes(): void {
        for(let hex of Hex.allResourceHexes){
            const resourceMarker = document.createElementNS("http://www.w3.org/2000/svg", "path");
            resourceMarker.setAttribute("class", "resourceMarker");
            resourceMarker.setAttribute("data-hex", `${hex.x},${hex.y}`);
            resourceMarker.setAttribute("transform", `translate(${hex.centerX()},${hex.centerY()})`);
            const sideLength = Hex.hexWidth * 2/3;
            resourceMarker.setAttribute("d", "M" + (-sideLength / 2) + " " + (sideLength / Math.sqrt(12)) + "H" + (sideLength / 2) + "L0 " + (-sideLength / Math.sqrt(3)) + "Z");
            resourceMarker.setAttribute("fill", "none");
            resourceMarker.setAttribute("stroke", "black");
            resourceMarker.setAttribute("stroke-width", "0.3");
            document.getElementById("installations")!!.appendChild(resourceMarker);
        }
    }

    /**
     * Updates the installation markers for the given hex.
     */
    export function updateMarkers(hex: Hex): void {
        const resourceMarker = document.querySelector<SVGElement>(`.resourceMarker[data-hex="${hex.x},${hex.y}"]`);
        if(resourceMarker !== null){
            if(hex.destroyedByAtomicBomb){
                resourceMarker.remove();
            }
            else{
                if(hex.resourceHexDestroyed){
                    resourceMarker.style.strokeDasharray = "0.75";
                }
                else{
                    resourceMarker.style.strokeDasharray = "";
                }
                if(hex.installationsDestroyed){
                    resourceMarker.style.opacity = "0.5";
                }
                else{
                    resourceMarker.style.opacity = "1";
                }
            }
        }

        const cityMarker = document.querySelector<SVGElement>(`.cityMarker[data-hex="${hex.x},${hex.y}"]`);
        if(cityMarker !== null){
            if(hex.destroyedByAtomicBomb){
                cityMarker.remove();
            }
            else if(hex.installationsDestroyed){
                cityMarker.style.opacity = "0.5";
            }
            else{
                cityMarker.style.opacity = "1";
            }
        }

        let fortificationMarker = document.querySelector<SVGElement>(`.fortificationMarker[data-hex="${hex.x},${hex.y}"]`);
        if(hex.fortified() || hex.fortUnderConstruction()){
            if(fortificationMarker === null){
                fortificationMarker = document.createElementNS("http://www.w3.org/2000/svg", "path");
                fortificationMarker.setAttribute("class", "fortificationMarker");
                fortificationMarker.setAttribute("data-hex", `${hex.x},${hex.y}`);
                fortificationMarker.setAttribute("transform", `translate(${hex.centerX() - Hex.hexHeight * 2 / 3},${hex.centerY() - Hex.hexHeight / 3})`);
                fortificationMarker.setAttribute("fill", "none");
                fortificationMarker.setAttribute("stroke", "darkred");
                fortificationMarker.setAttribute("stroke-width", "0.3");
                document.getElementById("installations")!!.appendChild(fortificationMarker);
            }
            fortificationMarker.setAttribute("d", fortPictures[hex.monthsUntilFortFinished()]);
        }
        else{
            fortificationMarker?.remove();
            fortificationMarker = null;
        }

        let airfieldMarker = document.querySelector<SVGElement>(`.airfieldMarker[data-hex="${hex.x},${hex.y}"]`);
        if(hex.hasAirfield() || hex.airfieldUnderConstruction()){
            if(airfieldMarker === null){
                airfieldMarker = document.createElementNS("http://www.w3.org/2000/svg", "path");
                airfieldMarker.setAttribute("class", "airfieldMarker");
                airfieldMarker.setAttribute("data-hex", `${hex.x},${hex.y}`);
                airfieldMarker.setAttribute("transform", `translate(${hex.centerX() - Hex.hexHeight / 2},${hex.centerY() - Hex.hexHeight / 4}) scale(${Hex.hexWidth * 0.19})`);
                airfieldMarker.setAttribute("fill", "none");
                airfieldMarker.setAttribute("stroke", "darkblue");
                airfieldMarker.setAttribute("stroke-width", "0.3");
                document.getElementById("installations")!!.appendChild(airfieldMarker);
            }
            airfieldMarker.setAttribute("d", airfieldPictures[hex.monthsUntilAirfieldFinished()]);
        }
        else{
            airfieldMarker?.remove();
            airfieldMarker = null;
        }

        let atomicBombMarker = document.querySelector<SVGGElement>(`.atomicBombMarker[data-hex="${hex.x},${hex.y}"]`);
        if(hex.destroyedByAtomicBomb){
            if(atomicBombMarker === null){
                atomicBombMarker = document.createElementNS("http://www.w3.org/2000/svg", "image");
                atomicBombMarker.setAttribute("href", "images/atomicbomb.svg");
                atomicBombMarker.setAttribute("transform", "translate(" + (hex.centerX() - Hex.hexHeight * 2 / 3) + "," + (hex.centerY() - Hex.hexHeight / 3) + ") scale(" + (Hex.hexWidth * 0.19) + ")");
                atomicBombMarker.setAttribute("x", (Hex.hexHeight / 2).toString());
                atomicBombMarker.setAttribute("y", "0");
                atomicBombMarker.setAttribute("width", Hex.hexHeight.toString());
                atomicBombMarker.setAttribute("height", Hex.hexHeight.toString());
                atomicBombMarker.setAttribute("preserveAspectRatio", "none");
                document.getElementById("installations")!!.appendChild(atomicBombMarker);
            }
        }
        else{
            atomicBombMarker?.remove();
            atomicBombMarker = null;
        }
    }

    /**
     * Gets a hex from its screen coordinates relative to the position of the window on the visible part of the page.
     *
     * @param x The x coordinate, same as event.clientX.
     * @param y The y coordinate, same as event.clientY.
     *
     * @returns The hex, or null if there's no such hex at those coordinates.
     */
    export function hexAtPoint(x: number, y: number): Hex | null {
        //Get the zoom independent coordinates
        const boundingRect = document.getElementById("mapsheet")!!.getBoundingClientRect();
        [x, y] = PanZoom.clientPixelToSvgPixel(
            x - boundingRect.x - PanZoom.instance().getPan().x,
            y - boundingRect.y - PanZoom.instance().getPan().y
        );

        //Normalize the coordinates so that hexWidth = hexHeight = 1
        x /= Hex.hexWidth;
        y /= Hex.hexHeight;

        //Find the x position in the hex (will be between 0 and 1). If it's greater than 1/3, we know the x coordinate of the hex, otherwise we need to look at y (if it's on the right side of the hex it will be between 0 and 1/3 of the next hex).
        const xPositionInHex = x % 1;
        const yPositionInHex = y % 1;    //This won't be the actual y position in odd hexes, but it doesn't matter since we only use this to find the x coordinate of the hex.

        //Find the x coordinate of the hex. If xPositionInHex is greater than 1/3 this is correct, otherwise we might need to adjust it.
        let hexX = Math.floor(x);

        //Adjust hexX if needed
        if(xPositionInHex < 1/3){
            if(hexX % 2 === 0){
                if((yPositionInHex < 1/2 && xPositionInHex/2 + yPositionInHex/3 < 1/6) || (yPositionInHex > 1/2 && xPositionInHex/2 - yPositionInHex/3 < -1/6)){
                    hexX--;
                }
            }
            else{
                if((yPositionInHex < 1/2 && xPositionInHex/2 - yPositionInHex/3 < 0) || (yPositionInHex > 1/2 && xPositionInHex/2 + yPositionInHex/3 < 1/3)){
                    hexX--;
                }
            }
        }

        //Now that we know if x is odd or even, finding the y coordinate of the hex is easy
        const hexY = Math.floor(hexX % 2 ? (y - 1/2) : y);

        return Hex.fromCoordinates(hexX, hexY) ?? null;    //This can return undefined if it's out of range. When calling fromCoordinates directly that should never happen, but when calling hexAtPoint() that can happen.
    }

    let coloredHexes = new Map<Hex, SVGPolygonElement>();

    /**
     * Colors the given hex with the given color.
     *
     * @param hex   The hex to color.
     * @param color The color to set. Any color accepted as a fill attribute for an SVG element is allowed.
     */
    export function colorHex(hex: Hex, color: string): void {
        uncolorHex(hex);
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const points: ReadonlyArray<readonly [number, number]> = [
            [hex.centerX() - Hex.hexWidth / 3, hex.centerY() - Hex.hexHeight / 2],
            [hex.centerX() - 2 * Hex.hexWidth / 3, hex.centerY()],
            [hex.centerX() - Hex.hexWidth / 3, hex.centerY() + Hex.hexHeight / 2],
            [hex.centerX() + Hex.hexWidth / 3, hex.centerY() + Hex.hexHeight / 2],
            [hex.centerX() + 2 * Hex.hexWidth / 3, hex.centerY()],
            [hex.centerX() + Hex.hexWidth / 3, hex.centerY() - Hex.hexHeight / 2]
        ];
        polygon.setAttribute("points", points.map(it => it.join(",")).join(" "));
        polygon.setAttribute("fill", color);
        polygon.setAttribute("opacity", "0.5");
        polygon.setAttribute("stroke", "none");
        document.getElementById("selectedHexes")!!.appendChild(polygon);
        coloredHexes.set(hex, polygon);
    }

    /**
     * Removes the color from the given hex. If the hex isn't colored, does nothing.
     *
     * @param hex   The hex to uncolor.
     */
    export function uncolorHex(hex: Hex): void {
        coloredHexes.get(hex)?.remove();
    }

    /**
     * Scrolls to the given hex.
     *
     * @param hex   The hex to scroll to.
     */
    export function scrollToHex(hex: Hex): void {
        const [x, y] = PanZoom.svgPixelToClientPixel(hex.centerX(), hex.centerY());
        const boundingRect = document.getElementById("mapsheet")!!.getBoundingClientRect();
        PanZoom.instance().pan({x: -x + boundingRect.width / 2, y: -y + boundingRect.height / 2});
    }
}
export default HexMarker;
