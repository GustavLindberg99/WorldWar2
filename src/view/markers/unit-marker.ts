import lodash from "https://cdn.jsdelivr.net/npm/lodash@4.17.21/+esm";
import Color from "https://colorjs.io/dist/color.min.js";

import { joinIterables, wait } from "../../utils.js";

import { Hex } from "../../model/mapsheet.js";
import { Partnership } from "../../model/partnership.js";
import { AirUnit, Armor, Carrier, Convoy, Infantry, LandUnit, Marine, NavalUnit, Paratrooper, Submarine, SupplyUnit, TransportShip, Unit } from "../../model/units.js";

import HexMarker from "./hex-marker.js";
import InfoBubble from "../info/info-bubble.js";
import MoveUnitListener from "./move-unit-listener.js";

import HumanPlayer from "../../controller/player/human-player.js";
import Player from "../../controller/player/player.js";

export default class UnitMarker {
    readonly #marker: SVGGElement;
    readonly #parent: SVGGElement;
    readonly #infoMarkers = new Map<SVGImageElement, string>();

    readonly #unit: Unit;
    #hex: Hex;    //Needed to keep track of the previous hex that the marker was in when moving the unit

    #fleetMarker: SVGGElement | null = null;
    #otherUnitsInFleetMarker: ReadonlyArray<UnitMarker> = [];    //The array itself is readonly but the reference is non-const because there's no need to mutate the array itself but there is a need to assign a readonly array to it

    #showStackedUnitsInterval: number | null = null;
    #moveUnitListener: MoveUnitListener | null = null;

    onclick: (() => void) | null = null;

    static #shouldNotCollapseStack: Set<Hex> = new Set();
    static #expandedStackHex: Hex | null = null;
    static #showNavalUnits: Set<Hex> = new Set();
    static #infoBubbleTimeout: number | null = null;

    static #allMarkers: Map<Unit, UnitMarker> = new Map();

    readonly #possibleInfoMarkers: ReadonlyArray<[string, string, () => boolean]> = [
        ["images/inside.svg", "Embarked units:", () => this.#unit.embarkedUnits().size > 0],
        ["images/landing-plane.svg", "Based", () => this.#unit instanceof AirUnit && this.#unit.based],
        ["images/port.svg", "In port", () => this.#unit instanceof NavalUnit && this.#unit.inPort()],
        ["images/damaged.svg", "Damaged", () => (this.#unit instanceof AirUnit || this.#unit instanceof NavalUnit) && this.#unit.damaged()],
        ["images/sword.svg", "Has attacked this turn", () => this.#unit.hasAttacked],
        ["images/train.svg", "Moving by rail", () => this.#unit instanceof LandUnit && this.#unit.movingByRail]
    ];

    /**
     * Constructs a unit marker and appends it to the DOM.
     *
     * @param unit  The unit to create the marker for.
     */
    private constructor(unit: Unit){
        this.#unit = unit;

        if(unit instanceof LandUnit){
            this.#parent = document.querySelector<SVGGElement>("#landUnits")!!;
        }
        else if(unit instanceof AirUnit){
            this.#parent = document.querySelector<SVGGElement>("#airUnits")!!;
        }
        else if(unit instanceof NavalUnit){
            this.#parent = document.querySelector<SVGGElement>("#navalUnits")!!;
        }
        else{
            throw new TypeError("Unknown unit type");
        }

        this.#marker = this.#makeMarker("g");
        this.#marker.onmouseover = (event: MouseEvent) => this.#expandStack(event);
        this.#marker.onmouseout = (event: MouseEvent) => this.#collapseStack(event);
        this.#parent.appendChild(this.#marker);

        UnitMarker.#allMarkers.set(this.#unit, this);

        this.#marker.onclick = (event: MouseEvent) => {
            if(this.onclick !== null){
                this.onclick();
            }
            else{
                const clickedHex = HexMarker.hexAtPoint(event.clientX, event.clientY);
                if(clickedHex === this.#hex){
                    HexMarker.onhexclick?.(this.#hex, event);
                }
            }
        };
        this.#marker.oncontextmenu = (event: MouseEvent) => {
            const hex = HexMarker.hexAtPoint(event.clientX, event.clientY);
            if(hex !== null){
                InfoBubble.showHexInfo(hex);
                event.preventDefault();
            }
        };

        this.#hex = this.#unit.hex()!!;
        this.update();
    }

    /**
     * Creates an element that displays a copy of this unit's marker that can be appended to the HTML DOM.
     *
     * @param showBubble        Whether to show the unit's info bubble when hovering over the copy image.
     * @param keepInfoMarkers   Whether to keep the info markers that are on this unit marker.
     * @param size              The size that the element should have.
     */
    createCopyImage(showBubble: boolean, keepInfoMarkers: boolean = false, size: string = "2em"): SVGSVGElement {
        const image = this.#makeMarker("svg", showBubble);
        image.setAttribute("width", size);
        image.setAttribute("height", size);
        image.setAttribute("viewBox", "0 0 3 3");
        image.classList.add("copyImage");
        image.style.marginRight = "4px";
        image.style.userSelect = "none";
        image.style.verticalAlign = "middle";
        if(keepInfoMarkers){
            for(let infoMarker of this.#infoMarkers.keys()){
                image.appendChild(infoMarker.cloneNode());
            }
        }
        return image;
    }

    /**
     * Creates a unit marker. Used both in the constructor and in createCopyImage().
     *
     * @param tagName       The tag name that the marker should have. Should to be "g" for an actual marker or "svg" for a copy image.
     * @param showBubble    Whether to show the unit's info bubble when hovering over the copy image.
     */
    #makeMarker<TagName extends "g" | "svg">(tagName: TagName, showBubble: boolean = true): SVGElementTagNameMap[TagName] {
        const result = document.createElementNS("http://www.w3.org/2000/svg", tagName);
        result.classList.add("unit");

        const markerBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        markerBackground.classList.add("markerBackground");
        markerBackground.setAttribute("fill", this.#unit.owner.color());
        result.appendChild(markerBackground);

        const backgroundColor = new Color(this.#unit.owner.color());
        const textColor = backgroundColor.luminance < 0.3 ? "white" : "black";

        const topLeft = this.#topLeftText();
        if(topLeft !== null){
            const topLeftText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            topLeftText.setAttribute("class", "topLeftText");
            topLeftText.textContent = topLeft;
            topLeftText.setAttribute("fill", textColor);
            topLeftText.setAttribute("x", "0.3");
            topLeftText.setAttribute("y", "1.1");
            topLeftText.setAttribute("text-anchor", "start");
            result.appendChild(topLeftText);
        }

        const topRight = this.#topRightText();
        if(topRight !== null){
            const topRightText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            topRightText.setAttribute("class", "topRightText");
            topRightText.textContent = topRight;
            topRightText.setAttribute("fill", textColor);
            topRightText.setAttribute("x", "2.7");
            topRightText.setAttribute("y", "1.1");
            topRightText.setAttribute("text-anchor", "end");
            result.appendChild(topRightText);
        }

        const bottomLeftText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        bottomLeftText.setAttribute("class", "bottomLeftText");
        bottomLeftText.textContent = this.#bottomLeftText();
        bottomLeftText.setAttribute("fill", textColor);
        bottomLeftText.setAttribute("x", "0.3");
        bottomLeftText.setAttribute("y", "2.6");
        bottomLeftText.setAttribute("text-anchor", "start");
        result.appendChild(bottomLeftText);

        const bottomRightText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        bottomRightText.setAttribute("class", "bottomRightText");
        bottomRightText.textContent = this.#bottomRightText();
        bottomRightText.setAttribute("fill", textColor);
        bottomRightText.setAttribute("x", "2.7");
        bottomRightText.setAttribute("y", "2.6");
        bottomRightText.setAttribute("text-anchor", "end");
        result.appendChild(bottomRightText);

        const image = this.#createImage();
        image.classList.add("unitMarkerImage");
        if(backgroundColor.luminance < 0.3){
            image.style.filter = "url(#invert)";
        }
        result.appendChild(image);

        if(showBubble){
            result.onmouseover = (event: MouseEvent) => {
                if(result.contains(event.relatedTarget as Element | null)){
                    return;
                }
                InfoBubble.showUnitInfo(this.#unit, result);
            };
        }

        return result;
    }

    /**
     * Deletes the unit marker from the map.
     */
    delete(): void {
        UnitMarker.#allMarkers.delete(this.#unit);
        this.#marker.remove();
    }

    /**
     * Updates the unit marker with info from the unit. Deletes the unit marker if the unit is no longer alive.
     */
    update(): void {
        const hex = this.#unit.hex();
        if(hex === null){
            this.delete();
        }
        else{
            //Update the hex
            this.#setHex(hex);

            //Update the numbers
            const topLeftText = this.#marker.querySelector(".topLeftText");
            if(topLeftText !== null){
                topLeftText.textContent = this.#topLeftText();
            }
            const topRightText = this.#marker.querySelector(".topRightText");
            if(topRightText !== null){
                topRightText.textContent = this.#topRightText();
            }
            this.#marker.querySelector(".bottomLeftText")!!.textContent = this.#bottomLeftText();
            this.#marker.querySelector(".bottomRightText")!!.textContent = this.#bottomRightText();

            //Update the info markers
            for(let [url, title, condition] of this.#possibleInfoMarkers){
                if(condition()){
                    this.#addInfoMarker(url, title);
                }
                else{
                    this.#removeInfoMarker(url);
                }
            }
        }
        if(this.#unit.embarkedOn() !== null){
            this.delete();    //This must be done at the end so that copy images get updated
        }
    }

    /**
     * Creates a listener to the unit marker to move the unit.
     *
     * @param allowHexesOutsideMapsheet If false, ondragfinished will return null if the unit was dropped outside of the mapsheet. If true, it will return the hex hidden behind that position when scrolled if possible, otherwise null.
     *
     * @returns A MoveUnitListener object. To remove the listener, call delete() on this object, and to set a callback for when the unit is dropped, set ondragfinished on this object.
     */
    createMoveUnitListener(allowHexesOutsideMapsheet: boolean): MoveUnitListener {
        this.#moveUnitListener?.delete();
        this.#moveUnitListener = new MoveUnitListener(this.#unit, this.#marker, allowHexesOutsideMapsheet);
        return this.#moveUnitListener;
    }

    /**
     * Selects the unit marker by highlighting its border.
     */
    select(): void {
        this.#marker.classList.add("selected");
    }

    /**
     * Deselects the unit marker.
     */
    deselect(): void {
        this.#marker.classList.remove("selected");
    }

    /**
     * Gets the info markers on this unit marker.
     *
     * @returns Map<info marker, title>.
     */
    infoMarkers(): ReadonlyMap<SVGImageElement, string> {
        return this.#infoMarkers;
    }

    /**
     * Checks if this unit is friendly to the human player.
     *
     * @returns True if the unit belongs to the human player, false if it's neutral or belongs to the computer player.
     */
    #isFriendly(): boolean {
        const partnership = this.#unit.owner.partnership();
        if(partnership === Partnership.Neutral){
            return false;
        }
        return Player.fromPartnership(partnership) instanceof HumanPlayer;
    }

    /**
     * Checks if this unit is friendly neutral.
     *
     * @returns True if the unit is neutral, false if it isn't.
     */
    #isNeutral(): boolean {
        return this.#unit.owner.partnership() === Partnership.Neutral;
    }

    /**
     * Places the unit marker in a hex.
     *
     * @param hex   The hex to place the unit marker in.
     */
    #setHex(hex: Hex): void {
        const oldHexUnits = this.#hex.units();
        const newHexUnits = hex.units();
        this.#hex = hex;

        for(let [i, unit] of [...[...oldHexUnits].entries(), ...[...newHexUnits].entries()]){
            const marker = UnitMarker.#allMarkers.get(unit);
            if(marker === undefined){
                continue;
            }
            if(i === 0 && [...unit.hex()!!.units()].length > 1){
                marker.#marker.style.filter = "url(#shadow)";
            }
            else{
                marker.#marker.style.filter = "";
            }
        }

        this.#updatePosition();
    }

    /**
     * The text that should be displayed in the top left of the unit marker.
     *
     * @returns The text that should be displayed in the top left of the unit marker.
     */
    #topLeftText(): string | null {
        if(this.#unit instanceof AirUnit){
            if(this.#unit.isTransportUnit()){
                return "T";
            }
            else{
                return this.#unit.fighterStrength.toString();
            }
        }
        else if(this.#unit instanceof Carrier){
            return "C";
        }
        else if(this.#unit instanceof TransportShip){
            return "T";
        }
        else if(this.#unit instanceof Convoy){
            return "$";
        }
        else if(this.#unit instanceof NavalUnit){
            return this.#unit.attack.toString();
        }
        return null;
    }

    /**
     * The text that should be displayed in the top right of the unit marker.
     *
     * @returns The text that should be displayed in the top right of the unit marker.
     */
    #topRightText(): string | null {
        if(this.#unit instanceof AirUnit || this.#unit instanceof NavalUnit){
            return this.#unit.defense.toString();
        }
        return null;
    }

    /**
     * The text that should be displayed in the bottom left of the unit marker.
     *
     * @returns The text that should be displayed in the bottom left of the unit marker.
     */
    #bottomLeftText(): string {
        if(this.#unit instanceof LandUnit){
            return this.#unit.strength.toString();
        }
        else if(this.#unit instanceof AirUnit){
            let result = (this.#unit.bomberStrength || this.#unit.kamikazeBaseStrength).toString();
            if(this.#unit.bomberStrength === 0 && this.#unit.kamikazeBaseStrength > 0){
                result += "ᴷ";
            }
            return result;
        }
        else if(this.#unit instanceof NavalUnit){
            return this.#unit.submarineAttack.toString();
        }
        throw new TypeError("Unknown unit type");
    }

    /**
     * The text that should be displayed in the bottom right of the unit marker.
     *
     * @returns The text that should be displayed in the bottom right of the unit marker.
     */
    #bottomRightText(): string {
        let result = this.#unit.movementAllowance.toString();
        if(this.#unit instanceof AirUnit && this.#unit.carrierBased()){
            result += "ꟲ";
        }
        return result;
    }

    /**
     * Creates an image of the unit.
     *
     * List of symbols at https://en.wikipedia.org/wiki/NATO_Joint_Military_Symbology.
     *
     * @returns A new DOM element with the image of the unit. The center of the image will be placed at the center of the unit in the x-direction and 0.5px above the center of the unit in the y-direction.
     */
    #createImage(): SVGElement {
        if(this.#unit instanceof LandUnit){
            const result = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const rectangle = document.createElementNS("http://www.w3.org/2000/svg", "path");
            rectangle.setAttribute("d",
                this.#isFriendly()
                ? "M-1,-0.5 L1,-0.5 L1,0.5 L-1,0.5 Z"
                : this.#isNeutral()
                ? "M-0.5,-0.5 L0.5,-0.5 L0.5,0.5 L-0.5,0.5 Z"
                : "M-0.7,0 L0,-0.7 L0.7,0 L0,0.7 Z"
            );
            result.appendChild(rectangle);
            if(this.#unit instanceof Armor){
                const ellipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
                ellipse.setAttribute("cx", "0");
                ellipse.setAttribute("cy", "0");
                ellipse.setAttribute("rx", this.#isFriendly() ? "0.7" : "0.5");
                ellipse.setAttribute("ry", "0.3");
                result.appendChild(ellipse);
            }
            else if(this.#unit instanceof Infantry){
                const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
                line.setAttribute("d",
                    this.#isFriendly()
                    ? "M-1,-0.5 L1,0.5 M1,-0.5 L-1,0.5"
                    : this.#isNeutral()
                    ? "M-0.5,-0.5 L0.5,0.5 M0.5,-0.5 L-0.5,0.5"
                    : "M-0.35,-0.35 L0.35,0.35 M-0.35,0.35 L0.35,-0.35"
                );
                result.appendChild(line);
            }
            else if(this.#unit instanceof Marine){
                const anchor = document.createElementNS("http://www.w3.org/2000/svg", "path");
                anchor.setAttribute("d", "M0,-0.2 V0.35 M-0.2,-0.05 h0.4 M-0.3,0.15 a0.6,1.5,0,0,0,0.6,0 M0,-0.2 a0.09,0.09,0,0,0,0,-0.18 a0.09,0.09,0,0,0,0,0.18");
                result.appendChild(anchor);
            }
            else if(this.#unit instanceof Paratrooper){
                const parachute = document.createElementNS("http://www.w3.org/2000/svg", "path");
                parachute.setAttribute("d", "M-0.3,-0.1 l0.3,0.4 l0.3,-0.4 a0.3,0.2,180,0,0,-0.6,0 h0.6");
                result.appendChild(parachute);
            }
            else if(this.#unit instanceof SupplyUnit){
                const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
                line.setAttribute("d",
                    this.#isFriendly()
                    ? "M-1,0.3h2"
                    : this.#isNeutral()
                    ? "M-0.5,0.3h1"
                    : "M-0.4,0.3h0.8"
                );
                result.appendChild(line);
            }
            return result;
        }
        else if(this.#unit instanceof AirUnit){
            const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
            image.setAttribute("href", this.#unit.imageUrl);
            image.setAttribute("x", "-0.55");
            image.setAttribute("y", "-0.25");
            image.setAttribute("width", "1.1");
            image.setAttribute("height", "1.5");
            image.setAttribute("preserveAspectRatio", "none");
            return image;
        }
        else if(this.#unit instanceof NavalUnit){
            const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
            if(this.#unit instanceof Submarine){
                image.setAttribute("href", "images/ships/submarine.svg");
            }
            else if(this.#unit instanceof Carrier){
                image.setAttribute("href", "images/ships/carrier.svg");
            }
            else{
                image.setAttribute("href", "images/ships/ship.svg");
            }
            image.setAttribute("x", "-1");
            image.setAttribute("y", "-0.5");
            image.setAttribute("width", "2");
            image.setAttribute("height", "1.5");
            image.setAttribute("preserveAspectRatio", "none");
            return image;
        }
        throw new TypeError("Unknown unit type");
    }

    /**
     * Expands the stack for the hex that the unit is in.
     *
     * @param event The event that caused the stack to be expanded.
     */
    #expandStack(event: MouseEvent): void {
        const relatedTarget = event.relatedTarget as Element | null;
        if(this.#marker.contains(relatedTarget)){
            return;
        }

        UnitMarker.#shouldNotCollapseStack.add(this.#hex);
        const shouldExpand = UnitMarker.#expandedStackHex !== this.#hex;
        UnitMarker.#expandedStackHex = this.#hex;

        //Move stacked units to the side to se all units in the hex (only if the cursor didn't just leave another unit in the same hex)
        const markers = [...UnitMarker.#unitMarkersInHex(this.#hex)];

        //Collapse naval units if there are other units (otherwise there's no use for collapsing them) and if there are more than 3 naval units
        const collapsableMarkers: ReadonlyArray<UnitMarker> = markers.filter(it => it.#unit instanceof NavalUnit && !(it.#unit instanceof Carrier) && !(it.#unit instanceof TransportShip));
        const firstNavalMarker = collapsableMarkers.at(-1);
        let collapsedMarkers: Array<UnitMarker> = [];
        if(!UnitMarker.#showNavalUnits.has(this.#hex) && firstNavalMarker !== undefined && collapsableMarkers.length > 5 && collapsableMarkers.length < [...this.#hex.units()].length){
            firstNavalMarker.#showFleetMarker(collapsableMarkers);
            collapsedMarkers = lodash.without(collapsableMarkers, firstNavalMarker);
            lodash.pull(markers, ...collapsedMarkers);
        }

        //If the stack is collapsed, expand it
        if(shouldExpand && markers.length > 1 && (event instanceof PointerEvent || !markers.some(it => it.#marker.contains(relatedTarget)))){
            for(let [i, marker] of markers.entries()){
                //Put the unit above units in other hexes
                marker.#placeOnTop(false);

                //Seperate the units so that it's possible to see each one individually
                if(marker.#showStackedUnitsInterval !== null){
                    clearInterval(marker.#showStackedUnitsInterval);
                }
                const start = performance.now();
                marker.#showStackedUnitsInterval = setInterval(() => {
                    const distance = Math.min(0.002 * (performance.now() - start), 1.5);
                    marker.#updatePosition(i * distance);
                    if(marker === firstNavalMarker){
                        for(let collapsedMarker of collapsedMarkers){
                            collapsedMarker.#marker.style.transform = marker.#marker.style.transform;
                        }
                    }
                    if(distance >= 1.5 && marker.#showStackedUnitsInterval !== null){
                        clearInterval(marker.#showStackedUnitsInterval);
                        marker.#showStackedUnitsInterval = null;
                    }
                }, 0);
            }
            //Remove the shadow (fetch the markers again because markers won't contain collapsed naval units)
            for(let marker of UnitMarker.#unitMarkersInHex(this.#hex)){
                marker.#marker.style.filter = "";
            }
        }

        //Otherwise place the unit on top so that we can read it and show the info bubble
        else if(markers.every(it => it.#showStackedUnitsInterval === null)){
            //Place the unit on top of the stack so that we can read everything that's on it
            this.#placeOnTop(false);

            //Show the info bubble
            if(UnitMarker.#infoBubbleTimeout !== null){
                clearInterval(UnitMarker.#infoBubbleTimeout);
            }
            InfoBubble.closeOtherUnitInfoBubbles(this.#unit);
            if([...this.#hex.units()].length === 1){
                InfoBubble.showUnitInfo(this.#unit, this.#marker);
            }
            else{
                UnitMarker.#infoBubbleTimeout = setTimeout(() => {
                    if(document.getElementById("PlaceLandUnitsBubble.placeLandUnits") === null){
                        InfoBubble.showUnitInfo(this.#unit, this.#marker);
                    }
                }, 1000);
            }

            //Move down the info markers
            for(let infoMarker of this.#infoMarkers.keys()){
                infoMarker.setAttribute("y", "2.7");
                infoMarker.setAttribute("opacity", "1");
            }
        }
    }

    /**
     * Collapses the stack for the hex that the unit is in.
     *
     * @param event The event that caused the stack to be collapsed.
     */
    async #collapseStack(event: MouseEvent): Promise<void> {
        const relatedTarget = event.relatedTarget as Element | null;

        //If the cursor entered onto another unit in the same hex or its info bubble, do nothing (this is only for collapsing stacked units again, closing the info bubble is handled in the showInfoBubble method)
        const markers = [...UnitMarker.#unitMarkersInHex(this.#hex)];
        if(
            markers.some(it => it.#marker.contains(relatedTarget) || it.#fleetMarker?.contains(relatedTarget))
            || relatedTarget?.matches(".bubble *")
            || relatedTarget?.matches(".tip *")
            || relatedTarget?.matches(".copyImage *")
        ){
            return;
        }

        //Wait a little bit before collapsing the stack
        UnitMarker.#shouldNotCollapseStack.delete(this.#hex);
        await wait(500);
        if(UnitMarker.#shouldNotCollapseStack.has(this.#hex)){
            return;
        }

        //Add the shadow again
        if(markers.length > 1){
            markers[0].#marker.style.filter = "url(#shadow)";
        }

        //Collapse the stack
        UnitMarker.#showNavalUnits.delete(this.#hex);
        for(let marker of markers){
            if(!marker.#unit.isAlive()){    //If the unit disappeared while the stack was expanded, ignore it
                continue;
            }
            if(marker.#showStackedUnitsInterval !== null){
                clearInterval(marker.#showStackedUnitsInterval);
                marker.#showStackedUnitsInterval = null;
            }
            marker.#hideFleetMarker();
            marker.#updatePosition();

            //Place the units in the correct order
            marker.#placeOnTop(true);
        }
        UnitMarker.#expandedStackHex = null;

        //Don't show any info bubbles that were waiting
        if(UnitMarker.#infoBubbleTimeout !== null){
            clearTimeout(UnitMarker.#infoBubbleTimeout);
            UnitMarker.#infoBubbleTimeout = null;
        }

        //Move up the info markers
        for(let infoMarker of this.#infoMarkers.keys()){
            infoMarker.setAttribute("y", "2");
            infoMarker.setAttribute("opacity", "0.5");
        }
    }

    /**
     * Adds an info marker to this unit. If an info marker with the same image URL already exists on this unit, does nothing.
     *
     * @param imageUrl  The URL of the image that the info marker should have.
     * @param title     The title text that the info marker should have when hovering over it.
     */
    #addInfoMarker(imageUrl: string, title: string): void {
        if(this.#infoMarkers.keys().some(it => it.getAttribute("href") === imageUrl)){
            return;
        }

        const infoMarker = document.createElementNS("http://www.w3.org/2000/svg", "image");
        infoMarker.classList.add("infoMarker");
        infoMarker.setAttribute("href", imageUrl);
        infoMarker.setAttribute("preserveAspectRatio", "none");
        infoMarker.setAttribute("width", "1");
        infoMarker.setAttribute("height", "1");
        infoMarker.setAttribute("x", (2 - this.#infoMarkers.size).toString());
        if(this.#infoMarkers.size > 0){
            infoMarker.setAttribute("y", [...this.#infoMarkers.keys()][0].getAttribute("y")!!);
            infoMarker.setAttribute("opacity", [...this.#infoMarkers.keys()][0].getAttribute("opacity")!!);
        }
        else{
            infoMarker.setAttribute("y", "2");
            infoMarker.setAttribute("opacity", "0.5");
        }
        this.#marker.appendChild(infoMarker);
        this.#infoMarkers.set(infoMarker, title);
    }

    /**
     * Removes an info marker from this unit. If the given info marker doesn't exist on this unit, does nothing.
     *
     * @param imageUrl  The URL of the image that the info marker has.
     */
    #removeInfoMarker(imageUrl: string): void {
        let i = 0;
        for(let marker of [...this.#infoMarkers.keys()]){
            if(marker.getAttribute("href") === imageUrl){
                this.#marker.removeChild(marker);
                this.#infoMarkers.delete(marker);
            }
            else{
                marker.setAttribute("x", (2 - i).toString());
                i++;
            }
        }
    }

    /**
     * Turns this unit marker into a fleet marker. Does not collaps the other markers into this fleet marker, that should be done by the caller.
     *
     * @param markers All unit markers that should be represented in this fleet (including this one).
     */
    #showFleetMarker(markers: ReadonlyArray<UnitMarker>): void {
        this.#otherUnitsInFleetMarker = markers;
        const numberOfUnits = "x" + markers.length;
        const movementAllowance = Math.min(...markers.map(it => it.#unit.movementAllowance));
        if(this.#fleetMarker === null){
            for(let marker of markers){
                marker.#marker.style.visibility = "hidden";
            }

            this.#fleetMarker = document.createElementNS("http://www.w3.org/2000/svg", "g");
            this.#fleetMarker.classList.add("unit");
            this.#fleetMarker.onclick = (event) => {
                this.#hideFleetMarker();
                UnitMarker.#showNavalUnits.add(this.#hex);
                UnitMarker.#expandedStackHex = null;
                this.#expandStack(event);
            };
            this.#fleetMarker.oncontextmenu = this.#marker.oncontextmenu;
            tippy(this.#fleetMarker, {
                content: `${markers.length} units, click to show`,
                showOnCreate: false,
                trigger: "mouseenter focus"
            });

            const markerBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            markerBackground.classList.add("markerBackground");
            markerBackground.setAttribute("fill", this.#unit.owner.color());
            this.#fleetMarker.appendChild(markerBackground);

            const backgroundColor = new Color(this.#unit.owner.color());
            const textColor = backgroundColor.luminance < 0.3 ? "white" : "black";

            const sizeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            sizeText.textContent = numberOfUnits;
            sizeText.setAttribute("font-size", "0.8px");
            sizeText.setAttribute("fill", textColor);
            sizeText.setAttribute("x", "2.7");
            sizeText.setAttribute("y", "1.1");
            sizeText.setAttribute("text-anchor", "end");
            sizeText.setAttribute("font-weight", "bold");
            this.#fleetMarker.appendChild(sizeText);

            const movementAllowanceText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            movementAllowanceText.textContent = movementAllowance.toString();
            movementAllowanceText.setAttribute("font-size", "0.8px");
            movementAllowanceText.setAttribute("fill", textColor);
            movementAllowanceText.setAttribute("x", "2.7");
            movementAllowanceText.setAttribute("y", "2.7");
            movementAllowanceText.setAttribute("text-anchor", "end");
            movementAllowanceText.setAttribute("font-weight", "bold");
            this.#fleetMarker.appendChild(movementAllowanceText);

            const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
            image.setAttribute("href", "images/ships/fleet.svg");
            image.setAttribute("x", "0.5");
            image.setAttribute("y", "0.75");
            image.setAttribute("width", "2");
            image.setAttribute("height", "1.5");
            image.setAttribute("preserveAspectRatio", "none");
            if(backgroundColor.luminance < 0.3){
                image.style.filter = "url(#invert)";
            }
            this.#fleetMarker.appendChild(image);
            this.#parent.appendChild(this.#fleetMarker);
        }
        else{
            this.#fleetMarker.querySelector("text")!!.textContent = numberOfUnits;
            this.#fleetMarker.querySelector("text+text")!!.textContent = movementAllowance.toString();
        }
    }

    /**
     * Turns the fleet marker back into a marker for just this unit.
     */
    #hideFleetMarker(): void {
        if(this.#fleetMarker !== null){
            this.#fleetMarker.remove();
            this.#fleetMarker = null;
        }
        for(let marker of this.#otherUnitsInFleetMarker){
            marker.#marker.style.visibility = "";
        }
        this.#otherUnitsInFleetMarker = [];
    }

    /**
     * Places the current marker above all other unit markers of the same unit type in this hex.
     *
     * @param respectTypeOrder If true and this is a naval unit, places it below land and air units, and similarly for land units below air units. If false, places it above all other units regardless of type.
     */
    #placeOnTop(respectTypeOrder: boolean): void {
        if(this.#marker.parentElement === null){
            return;
        }
        const parent = respectTypeOrder ? this.#parent : document.querySelector<SVGGElement>("#selectedUnits")!!;
        this.#marker.remove();
        parent.appendChild(this.#marker);
        if(this.#fleetMarker !== null){
            this.#fleetMarker.remove();
            parent.appendChild(this.#fleetMarker);
        }
    }

    /**
     * Updates the CSS transform attribute so that the unit marker is inside its hex.
     *
     * @param offset    The distance to the bottom right from the center of the hex that it should be at. Used when stacks get expanded.
     */
    #updatePosition(offset: number = 0): void {
        this.#marker.style.transform = `translate(${this.#hex.centerX() - Hex.hexWidth / 3}px,${this.#hex.centerY() - Hex.hexWidth / 3}px) translate(${offset}px,${offset}px) scale(${3 / Hex.hexWidth})`;
        if(this.#fleetMarker !== null){
            this.#fleetMarker.style.transform = this.#marker.style.transform;
        }
    }

    /**
     * Gets all the unit markers in a given hex.
     *
     * @param hex   The hex to get the unit markers in.
     *
     * @returns All the unit markers in the hex.
     */
    static #unitMarkersInHex(hex: Hex): IteratorObject<UnitMarker> {
        //We need to join the three types of units instead of just calling units() because naval units are always on the bottom and air units are always on top
        return joinIterables<Unit>(hex.navalUnits(), hex.landUnits(), hex.airUnits())
            .map(it => UnitMarker.#allMarkers.get(it))
            .filter(it => it !== undefined);
    }

    /**
     * Gets the unit marker of the given unit. If it doesn't exist, creates one.
     *
     * @param unit  The unit to get the marker from.
     *
     * @returns The unit marker of the unit.
     */
    static get(unit: Unit): UnitMarker {
        return UnitMarker.#allMarkers.get(unit) ?? new UnitMarker(unit);
    }

    /**
     * Gets the units in the expanded stack.
     *
     * @returns The units in the expanded stack, or null if no stack is expanded.
     */
    static expandedStack(): IteratorObject<Unit> | null {
        return this.#expandedStackHex?.units() ?? null;
    }
}
