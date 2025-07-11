import { wait } from "../../utils.js";

import { Hex } from "../../model/mapsheet.js";
import { Partnership } from "../../model/partnership.js";
import { Countries, Country } from "../../model/countries.js";
import { AirUnit, Convoy, Destroyer, LandUnit, NavalUnit, TransportShip, Unit } from "../../model/units.js";
import { date, dateToString } from "../../model/date.js";
import { Phase } from "../../model/phase.js";

import HexMarker from "../markers/hex-marker.js";
import MoveUnitListener from "../markers/move-unit-listener.js";
import UnitMarker from "../markers/unit-marker.js";

namespace InfoBubble {
    let hexTippyElement: SVGElement | null = null;    //Dummy element at the center of the hex because tippy.js needs an element to point to
    let unitTippyBubbles = new Map<Tippy.Tippy, Unit>();

    /**
     * Shows a tippy bubble on a hex. Similar to the tippy() function, but takes a hex instead of a DOM element.
     *
     * @param hex   The hex to show the bubble on.
     * @param props The parameters to pass to the tippy function.
     *
     * @returns The tippy bubble.
     */
    export function hexTippy(hex: Hex, props: Tippy.Props): Tippy.Tippy {
        hexTippyElement ??= document.createElementNS("http://www.w3.org/2000/svg", "rect");
        hexTippyElement.setAttribute("x", hex.centerX().toString());
        hexTippyElement.setAttribute("y", hex.centerY().toString());
        hexTippyElement.setAttribute("width", "1");    //The width and height can't be 0 otherwise it won't work in Firefox
        hexTippyElement.setAttribute("height", "1");
        hexTippyElement.setAttribute("fill", "none");
        hexTippyElement.setAttribute("stroke", "none");
        document.getElementById("installations")!!.appendChild(hexTippyElement);

        return tippy(hexTippyElement, props);
    }

    /**
     * Shows an info bubble with information about a hex.
     *
     * @param hex   The hex to show an info bubble about.
     */
    export function showHexInfo(hex: Hex): void {
        let installations = [];
        if(hex.destroyedByAtomicBomb){
            installations.push("Destroyed by atomic bomb");
        }
        else{
            if(hex.city !== null){
                installations.push(`City (${hex.city})`);
            }
            if(hex.isMajorPort()){
                installations.push("Major port" + (hex.installationsDestroyed ? " (destroyed)" : ""));
            }
            if(hex.isResourceHex){
                installations.push("Resource hex" + (hex.resourceHexDestroyed ? " (destroyed)" : ""));
            }
            if(hex.fortified()){
                installations.push("Fortification");
            }
            else if(hex.fortUnderConstruction()){
                installations.push(`Fortification (under construction, finished in ${hex.monthsUntilFortFinished()} months)`);
            }
            if(hex.hasAirfield()){
                installations.push("Airfield");
            }
            else if(hex.airfieldUnderConstruction()){
                installations.push(`Airfield (under construction, finished in ${hex.monthsUntilAirfieldFinished()} months)`);
            }
        }

        hexTippy(hex, {content: `
            <div class="infoBubble">
                <div class="box">
                    <h3>Terrain</h3>
                    <p>Terrain: ${hex.terrain}</p>
                    <p>Weather zone: ${hex.weatherZone}</p>
                    <p>Hex coordinates: ${hex.x}, ${hex.y}</p>
                </div>
                <div class="box">
                    <h3>Country</h3>
                    <p>Country: ${hex.country === null ? "N/A" : clickableCountryInfoLinkHtml(hex.country)}${hex.isColony ? " (colony)" : ""}</p>
                    <p>Controller: ${hex.controller() === null ? "N/A" : clickableCountryInfoLinkHtml(hex.controller()!!)}</p>
                </div>
                <div class="box">
                    <h3>Installations and Capacity</h3>
                    <p>Installations: ${installations.join(", ") || "None"}</p>
                    <p>Airbase capacity: ${hex.installationsDestroyed ? "destroyed" : (`${hex.airbaseCapacity()} air units (${[...hex.basedAirUnits()].length} used)`)}</p>
                </div>
                <div class="box">
                    <h3>Units</h3>
                    <p id="Hex.units"></p>
                </div>
            </div>`
        });

        const unitsContainer = document.getElementById("Hex.units")!!;
        if([...hex.units()].length === 0){
            unitsContainer.textContent = "None";
        }
        else for(let unit of hex.units()){
            unitsContainer.appendChild(UnitMarker.get(unit).createCopyImage());
        }

        makeCountryInfoLinksClickable();
    }

    /**
     * Generates an HTML link element containing the name of the country that when clicked shows an info dialog for this country.
     *
     * @param country       The country that the link should point to.
     * @param namespaceURI  The SVG namespace URI to generate an SVG element, or null to generate an HTML element.
     *
     * @returns The link.
     */
    export function clickableCountryInfoLink(country: Country, namespaceURI: "http://www.w3.org/2000/svg" | null = null): HTMLAnchorElement | SVGAElement {
        const link = namespaceURI === null ? document.createElement("a") : document.createElementNS(namespaceURI, "a");
        link.textContent = country.name();
        link.setAttribute("href", "javascript:void(0)");
        link.setAttribute("role", "button");
        link.onclick = (event) => {
            InfoBubble.showCountryInfo(country);
            event.stopPropagation();
        };
        return link;
    }

    /**
     * Generates the HTML source code of a link containing the name of the country that when clicked shows an info dialog for this country. Once this has been added to the DOM, makeInfoLinksClickable() must be called.
     *
     * @param country   The country that the link should point to.
     *
     * @returns A string containing HTML code for the link.
     */
    function clickableCountryInfoLinkHtml(country: Country): string {
        return `<a href="javascript:void(0)" role="button" class="countryInfoLink">${country.name()}</a>`;
    }

    /**
     * Makes all links generated with clickableInfoLink() to any country clickable.
     */
    function makeCountryInfoLinksClickable(): void {
        for(let countryInfoLink of document.querySelectorAll<HTMLAnchorElement>(`a.countryInfoLink`)){
            const country = Countries.fromName(countryInfoLink.textContent)!!;
            countryInfoLink.onclick = () => showCountryInfo(country);
        }
    }

    /**
     * Shows an info dialog with information about a country.
     *
     * @param country   The country to show an info dialog about.
     */
    export function showCountryInfo(country: Country): void {
        const showUsedRailCapacity = (country.partnership() === Partnership.Allies && Phase.current === Phase.AlliedSecondMovement) || (country.partnership() === Partnership.Axis && Phase.current === Phase.AxisSecondMovement);
        xdialog.open({
            title: "Country Information: " + country.name(),
            body: `
                <div class="infoBubble">
                    <div class="box">
                        <h3>Status</h3>
                        <p>Partnership: ${country.partnership()?.name ?? "Neutral"}</p>
                        <p>Conquered: ${country.conquered() ? "Yes" : "No, cities remaining: <span id=\"Country.remainingCities\"></span>"}</p>
                        <p>Entered war: ${country.enteredWar === null ? "Never" : dateToString(country.enteredWar)}</p>
                    </div>
                    <div class="box">
                        <h3>Resources</h3>
                        <p>Money: $${country.money.toLocaleString()}B</p>
                        <p>Icome: $${country.income().toLocaleString()}B/month</p>
                        <p>Rail capacity: ${country.railCapacity()}${showUsedRailCapacity ? " (" + [...country.landUnits().filter(it => it.movingByRail)].length + " used)" : ""}</p>
                        <p>${country.hasAtomicBomb() ? "Atomic bomb" : "Has atomic bomb"}: ${!country.hasAtomicBomb() ? "No" : country.hasUsedAtomicBombThisTurn ? "Already used this turn" : "Ready for use"}</p>
                    </div>
                    <div class="box">
                        <h3>Units</h3>
                        <p>Units on the map:</p>
                        <p id="Country.unitsOnMap"></p>
                        <p>${country.partnership() === Partnership.Neutral ? "Units arriving when this country enters the war" : "Units available for build"}:</p>
                        <p id="Country.availableUnits"></p>
                    </div>
                </div>`,
            buttons: null,
            style: "width: 400px"
        });

        const remainingCitiesSpan = document.getElementById("Country.remainingCities");
        if(remainingCitiesSpan !== null){
            const remainingCities: ReadonlyArray<string> = country.remainingCitiesBeforeConqured().map(it => it.city!!).sort();
            if(remainingCities.length > 5 && remainingCities.length === country.cities.length){
                remainingCitiesSpan.textContent = "All";
            }
            else{
                remainingCitiesSpan.textContent = remainingCities.slice(0, 5).join(", ");
                if(remainingCities.length > 5){
                    const showAllLink = document.createElement("a");
                    showAllLink.href = "javascript:void(0)";
                    showAllLink.role = "button";
                    showAllLink.textContent = "...";
                    showAllLink.onclick = () => {
                        remainingCitiesSpan.textContent = remainingCities.join(", ");
                    };
                    remainingCitiesSpan.textContent += ", ";
                    remainingCitiesSpan.appendChild(showAllLink);
                }
            }
        }

        const unitsOnMapContainer = document.getElementById("Country.unitsOnMap")!!;
        const unitsOnMap: ReadonlyMap<Unit, number> = Unit.groupByType(country.units());
        if(unitsOnMap.size === 0){
            unitsOnMapContainer.textContent = "None";
        }
        else for(let [unit, numberOfUnits] of unitsOnMap){
            unitsOnMapContainer.appendChild(UnitMarker.get(unit).createCopyImage(true));
            if(numberOfUnits > 1){
                unitsOnMapContainer.appendChild(document.createTextNode("(x" + numberOfUnits  + ") "));
            }
        }

        const availableUnitsContainer = document.getElementById("Country.availableUnits")!!;
        const availableUnits: ReadonlyMap<Unit, number> = Unit.groupByType(country.availableUnits);
        if(availableUnits.size === 0){
            availableUnitsContainer.textContent = "None";
        }
        else for(let [unit, numberOfUnits] of availableUnits){
            availableUnitsContainer.appendChild(UnitMarker.get(unit).createCopyImage(true));
            if(numberOfUnits > 1){
                availableUnitsContainer.appendChild(document.createTextNode("(x" + numberOfUnits  + ") "));
            }
        }

        for(let [arrivalDate, delayedUnits] of [...country.delayedUnits.entries()].sort()){
            const groupedDelayedUnits: ReadonlyMap<Unit, number> = Unit.groupByType(
                arrivalDate === date.current
                ? [...delayedUnits, ...country.units()]
                : delayedUnits
            );
            if(groupedDelayedUnits.size === 0){
                continue;
            }

            const infoBubble = availableUnitsContainer.parentElement!!;
            const title = document.createElement("p");
            title.textContent = `Bought units arriving in ${dateToString(arrivalDate)}:`;
            infoBubble.appendChild(title);

            const delayedUnitsContainer = document.createElement("p");
            for(let [unit, numberOfUnits] of groupedDelayedUnits){
                delayedUnitsContainer.appendChild(UnitMarker.get(unit).createCopyImage(true));
                if(numberOfUnits > 1){
                    delayedUnitsContainer.appendChild(document.createTextNode("(x" + numberOfUnits  + ") "));
                }
            }
            infoBubble.appendChild(delayedUnitsContainer);
        }
    }

    export let onshowembarkedunit: ((embarkedUnit: Unit, copyImage: HTMLElement | SVGElement) => void) | null = null;

    /**
     * Shows an info bubble with information about a unit.
     *
     * @param unit      The unit to show an info bubble about.
     * @param marker    The marker that the info bubble should point to (can be the marker on the mapsheet or a copy image).
     */
    export function showUnitInfo(unit: Unit, marker: SVGGElement | SVGSVGElement): void {
        const unitImageId = unit.embarkedOn() === null ? "InfoBubble.unitImage" : "InfoBubble.embarkedUnitImage";
        let content = `
            <div class="infoBubble">
                <div id="${unitImageId}"></div>
                <div class="box">
                    <h3>General</h3>
                    <p>Type: ${unit.type()}</p>
                    <p>Owner: ${clickableCountryInfoLinkHtml(unit.owner)}</p>
                    <p>Movement allowance: ${unit.movementAllowance}`
        if(unit instanceof AirUnit){
            content += ` (${unit.usedMovementPoints} used)`;
        }
        content += "</p>";
        if(unit instanceof NavalUnit){
            if(unit.outOfSupply()){
                content += `<p>Out of supply: <b style="color:red">Yes</b></p>`;
            }
            else{
                content += `<p>Remaining supply: ${unit.remainingSupply()} months</p>`;
            }
        }
        else{
            content += `<p>Out of supply: ${unit.outOfSupply() ? "<b style=\"color:red\">Yes</b>" : "No"}</p>`
        }
        content += "</div>";
        if(unit instanceof LandUnit){
            content += `
                <div class="box">
                    <h3>Land unit</h3>
                    <p>Strength: ${unit.strength}</p>
                    <p>Modified attack strength: ${unit.modifiedLandAttack()}</p>
                    <p>Modified defense strength: ${unit.modifiedDefense()}</p>
                </div>`;
        }
        else if(unit instanceof AirUnit){
            content += `
                <div class="box">
                    <h3>Air unit</h3>
                    <p>Model: ${unit.model}</p>
                    <p>Fighter strength: ${unit.fighterStrength}</p>
                    <p>Bomber strength: ${unit.bomberStrength}</p>
                    <p>Defense strength: ${unit.defense}</p>
                </div>`;
        }
        else if(unit instanceof NavalUnit){
            content += `
                <div class="box">
                    <h3>Naval unit</h3>`;
            if(unit instanceof Destroyer){
                content += `<p>Class: ${unit.name}</p>`;
            }
            else if(!(unit instanceof Convoy) && !(unit instanceof TransportShip)){
                content += `<p>Name: ${unit.name}</p>`;
            }
            if(unit instanceof Convoy){
                content += `<p>Transported money: $${unit.money}B`;
                if(unit.destination !== null){
                    content += ` to ${unit.destination.name()}`;
                }
                content += `</p>`;
            }
            content += `
                <p>Attack strength against surface naval units: ${unit.attack}</p>
                <p>Attack strength against submarines: ${unit.submarineAttack}</p>
                <p>Defense strength: ${unit.defense}</p>
            </div>`;
        }

        const infoMarkers = UnitMarker.get(unit).infoMarkers();
        if(infoMarkers.size > 0){
            content += `<div class="box"><h3>More info</h3>`;
            for(let [infoMarker, title] of infoMarkers){
                content += `<p><img src="${infoMarker.getAttribute("href")}" class="inline"/> ${title}</p>`;
                if(title === "Embarked units:"){
                    content += `<div id="InfoBubble.embarkedUnits" style="margin-top:4px"></div>`;
                }
            }
            content += `</div>`;
        }

        const arrivalDate = unit.owner.delayedUnits.entries().find(it => it[1].has(unit))?.[0];
        if(arrivalDate !== undefined){
            content += `
                <div class="box">
                    <h3>Delay</h3>
                    <p>Date this unit arrives: ${dateToString(arrivalDate)}</p>
                </div>`;
        }
        else if(unit.owner.availableUnits.has(unit)){
            content += `
                <div class="box">
                    <h3>Price and delay</h3>
                    <p>Price: $${unit.price().toLocaleString()}B (${unit.owner.name()} has $${unit.owner.money.toLocaleString()}B)</p>
                    <p>Delay between buying the unit and it arriving: ${unit.delay()} months</p>
                </div>`;
        }
        content += "</div>";

        //If the bubble is already shown for another unit, close that bubble first
        for(let [otherBubble, otherUnit] of new Map(unitTippyBubbles)){
            if(unit.embarkedOn() !== otherUnit){
                otherBubble.destroy();
                unitTippyBubbles.delete(otherBubble);
            }
        }

        if(content !== null){
            const bubble = tippy(marker, {content: content});
            makeCountryInfoLinksClickable();

            const copyImage = UnitMarker.get(unit).createCopyImage(false, false, "4em");
            copyImage.style.display = "block";
            const unitImageDiv = document.getElementById(unitImageId);
            unitImageDiv?.appendChild(copyImage);
            const hex = unit.hex();
            if(marker instanceof SVGSVGElement && hex !== null){
                const scrollToHexButton = document.createElement("button");
                scrollToHexButton.textContent = "Show unit on the map";
                scrollToHexButton.onclick = async () => {
                    HexMarker.scrollToHex(hex);
                    for(let i = 0; i < 3; i++){
                        HexMarker.colorHex(hex, "purple");
                        await wait(500);
                        HexMarker.uncolorHex(hex);
                        await wait(500);
                    }
                };
                unitImageDiv?.appendChild(scrollToHexButton);
            }

            for(let embarkedUnit of unit.embarkedUnits()){
                const embarkedImage = UnitMarker.get(embarkedUnit).createCopyImage(true, true);
                document.getElementById("InfoBubble.embarkedUnits")?.appendChild(embarkedImage);
                InfoBubble.onshowembarkedunit?.(embarkedUnit, embarkedImage);
            }

            const activeListener = MoveUnitListener.activeListener();
            if(activeListener !== null){
                bubble.popper.addEventListener("mouseover", () => activeListener.onunitbubblemouseover?.());
                bubble.popper.addEventListener("mouseout", () => activeListener.onunitbubblemouseout?.());
                const newContent = activeListener.onunitbubblecreate?.(unit, bubble) ?? null;
                if(newContent === null){
                    bubble.destroy();
                    return;
                }
                else{
                    bubble.setContent(newContent);
                }
            }
            unitTippyBubbles.set(bubble, unit);
        }
    }

    /**
     * Closes all unit info bubbles except for the one for the given unit.
     *
     * @param excludedUnit  The unit whose bubble to keep. If null, closes all unit info bubbles.
     */
    export function closeOtherUnitInfoBubbles(excludedUnit: Unit | null): void {
        for(let [otherBubble, otherUnit] of new Map(unitTippyBubbles)){
            if(excludedUnit !== otherUnit && excludedUnit?.embarkedOn() !== otherUnit){
                otherBubble.destroy();
                unitTippyBubbles.delete(otherBubble);
            }
        }
    }
}
export default InfoBubble;
