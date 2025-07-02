import { Hex } from "../../model/mapsheet.js";
import { Unit } from "../../model/units.js";

import HexMarker from "./hex-marker.js";
import PanZoom from "../pan-zoom.js";
import UnitMarker from "./unit-marker.js";

export default class MoveUnitListener {
    readonly #marker: HTMLElement | SVGElement;
    readonly #copyImage: SVGSVGElement;
    readonly #allowHexesOutsideMapsheet: boolean;

    //Because the touchend event doesn't support clientX and clientY, we need to store the ones from the touchmove event.
    #clientX: number = NaN;
    #clientY: number = NaN;
    #offset: number = 0;

    ondragstart: ((event: Event) => boolean | void) | null = null;
    ondragmove: ((hex: Hex | null) => void) | null = null;
    ondragfinished: ((hex: Hex | null) => void) | null = null;
    onunitbubblecreate: ((unit: Unit, tippy: Tippy.Tippy) => string | null) | null = null;
    onunitbubblemouseover: (() => void) | null = null;
    onunitbubblemouseout: (() => void) | null = null;

    static #activeListener: MoveUnitListener | null = null;

    /**
     * Sets up a listener to move a unit.
     *
     * @param unit                      The unit to move.
     * @param marker                    The element that can be dragged.
     * @param allowHexesOutsideMapsheet If false, ondragfinished will return null if the unit was dropped outside of the mapsheet. If true, it will return the hex hidden behind that position when scrolled if possible, otherwise null.
     */
    constructor(unit: Unit, marker: HTMLElement | SVGElement, allowHexesOutsideMapsheet: boolean){
        this.#marker = marker;
        this.#marker.style.cursor = "grab";
        this.#marker.addEventListener("mousedown", this.#mousedown);
        this.#marker.addEventListener("touchstart", this.#mousedown);

        this.#copyImage = UnitMarker.get(unit).createCopyImage();
        this.#copyImage.style.position = "absolute";

        this.#allowHexesOutsideMapsheet = allowHexesOutsideMapsheet;
    }

    /**
     * Removes the listener to move a unit.
     */
    delete(): void {
        this.#marker.removeEventListener("mousedown", this.#mousedown);
        this.#marker.removeEventListener("touchstart", this.#mousedown);
        this.#marker.style.cursor = "";
        this.#cleanup();
    }

    /**
     * Simulates a drag start. Doesn't call `ondragstart()`.
     *
     * @param event     The event to use when determining the position.
     * @param offset    The offset in pixels compared to the actual position to use when showing the unit marker being dragged.
     */
    simulateDragStart(event: Event, offset: number): void {
        this.#mousedown(event, false);
        this.#offset = offset;
    }

    /**
     * Cleans up anything set up while the marker was being dragged, but allows it to be dragged again. To be called in mouseup and delete.
     */
    #cleanup(): void {
        //The capture parameter for removeEventListener must match addEventListener, but not the passive parameter, see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener#matching_event_listeners_for_removal
        window.removeEventListener("mousemove", this.#mousemove, {capture:true});
        window.removeEventListener("touchmove", this.#mousemove, {capture:true});
        window.removeEventListener("mouseup", this.#mouseup);
        window.removeEventListener("touchend", this.#mouseup);

        this.#offset = 0;
        this.#marker.style.visibility = "";
        this.#copyImage.remove();
        document.body.style.cursor = "";
        MoveUnitListener.#activeListener = null;
    }

    /**
     * Updates the position of the copy image to the current position of the mouse.
     *
     * @param event The event containing the current position of the mouse.
     */
    #updatePosition(event: Event): void {
        if(event.cancelable){
            event.preventDefault();    //So that it doesn't scroll on touch screens
        }

        let pageX: number;
        let pageY: number;
        if(event instanceof MouseEvent){
            pageX = event.pageX;
            pageY = event.pageY;
            this.#clientX = event.clientX;
            this.#clientY = event.clientY;
        }
        else if(event instanceof TouchEvent){
            pageX = event.touches[0].pageX;
            pageY = event.touches[0].pageY;
            this.#clientX = event.touches[0].clientX;
            this.#clientY = event.touches[0].clientY;
        }
        else{
            throw new TypeError("Unknown event type");
        }

        this.#copyImage.style.left = (pageX + 3 + this.#offset) + "px";
        this.#copyImage.style.top = (pageY + 3 + this.#offset) + "px";
    }

    /**
     * Gets the hex at the current position of the mouse, taking into account allowHexesOutsideMapsheet.
     *
     * @param event The mousemove or mouseup event. Used to check if the mouse is currently on the mapsheet. Not used to get the actual postion, which is determined using this.#clientX and this.#clientY.
     */
    #hexAtCurrentPosition(event: Event): Hex | null {
        if(!this.#allowHexesOutsideMapsheet && !document.getElementById("mapsheet")!!.contains(event.target as Node)){
            return null;
        }
        else{
            return HexMarker.hexAtPoint(this.#clientX, this.#clientY);
        }
    }

    /**
     * Listener to be called when mouse is pressed down on the marker. Must be an arrow function so that `this` is preserved when adding it as a callback.
     *
     * @param event         The mousedown event.
     * @param sendDragStart If true, calls `ondragstart()` and stops the propagation of the event.
     */
    readonly #mousedown = (event: Event, sendDragStart: boolean = true) => {
        if(event instanceof MouseEvent && event.button !== 0){    //If it's not the left mouse button that was pressed
            return;
        }
        document.body.appendChild(this.#copyImage);    //This needs to come first so that they're in the correct order when moving several units at once
        if(sendDragStart){
            event.stopPropagation();    //So that it doesn't scroll

            if(event !== null && this.ondragstart?.(event) === false){
                this.#copyImage.remove();
                return;
            }
        }

        window.addEventListener("mousemove", this.#mousemove, {capture:true});    //The true is very important because otherwise event.stopPropagation wouldn't do anything
        window.addEventListener("touchmove", this.#mousemove, {capture:true, passive:false});    //passive:false is needed otherwise it will give weird errors when using event.preventDefault(). See https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener for a complete list of options.
        window.addEventListener("mouseup", this.#mouseup);
        window.addEventListener("touchend", this.#mouseup);

        this.#marker.style.visibility = "hidden";
        document.body.style.cursor = "grabbing";
        MoveUnitListener.#activeListener = this;

        this.#updatePosition(event);
    }

    /**
     * Listener to be called when the mouse is moved while the marker is being dragged. Must be an arrow function so that `this` is preserved when adding it as a callback.
     *
     * @param event The mousemove event.
     */
    readonly #mousemove = (event: Event) => {
        this.#updatePosition(event);
        if(this.#allowHexesOutsideMapsheet){
            const boundingRect = document.getElementById("mapsheet")!!.getBoundingClientRect();
            if(this.#clientX < boundingRect.left){
                PanZoom.instance().panBy({x: 10, y: 0});
            }
            if(this.#clientX > boundingRect.right){
                PanZoom.instance().panBy({x: -10, y: 0});
            }
            if(this.#clientY < boundingRect.top){
                PanZoom.instance().panBy({x: 0, y: 10});
            }
            if(this.#clientY > boundingRect.bottom){
                PanZoom.instance().panBy({x: 0, y: -10});
            }
        }
        this.ondragmove?.(this.#hexAtCurrentPosition(event));
    }

    /**
     * Listener to be called when the mouse is released while the marker is being dragged. Must be an arrow function so that `this` is preserved when adding it as a callback.
     *
     * @param event The mouseup event.
     */
    readonly #mouseup = (event: Event) => {
        this.#cleanup();
        this.ondragfinished?.(this.#hexAtCurrentPosition(event));
    }

    /**
     * Gets the listener associated to the unit that's currently moving, if any.
     *
     * @returns The active listener, or null if no listener is active.
     */
    static activeListener(): MoveUnitListener | null {
        return MoveUnitListener.#activeListener;
    }
}
