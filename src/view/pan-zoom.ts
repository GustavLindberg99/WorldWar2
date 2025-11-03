import { Hex } from "../model/mapsheet.js";

namespace PanZoom {
    let panZoomInstance: SvgPanZoom.Instance;
    let zoomFactor: number;
    let clickX: number;
    let clickY: number;
    let isDragging = false;

    /**
     * Fixes the pan so that it's within the limits.
     */
    function fixPanLimits(): void {
        const {x, y} = instance().getPan();

        const mapsheet = document.getElementById("mapsheet")!!;

        const [maxX, maxY] = svgPixelToClientPixel(Hex.svgWidth, Hex.svgHeight);

        const newX = Math.min(0, Math.max(x, -maxX + mapsheet.clientWidth));
        const newY = Math.min(0, Math.max(y, -maxY + mapsheet.clientHeight));

        if(newX !== x || newY !== y){
            instance().pan({x: newX, y: newY});
        }
    }

    /**
     * Sets up the mapsheet so that it's possible to pan and zoom on it.
     */
    export function initialize(): void {
        const mapsheet = document.querySelector<SVGSVGElement>("svg#mapsheet")!!;

        if(panZoomInstance !== undefined || zoomFactor !== undefined){
            throw new Error("PanZoom has already been initialized.");
        }

        panZoomInstance = svgPanZoom(mapsheet, {
            controlIconsEnabled: true,
            minZoom: Math.max(mapsheet.clientWidth / mapsheet.clientHeight, mapsheet.clientHeight / mapsheet.clientWidth),
            maxZoom: 150,
            onPan: fixPanLimits,
            onZoom: fixPanLimits
        });
        makeSvgPanZoomMobileFriendly(panZoomInstance, mapsheet);

        zoomFactor = Math.max(
            Hex.svgWidth / mapsheet.clientWidth,
            Hex.svgHeight / mapsheet.clientHeight
        );

        mapsheet.addEventListener("mousedown", (event: MouseEvent) => {
            clickX = event.clientX;
            clickY = event.clientY;
            isDragging = false;
        });

        mapsheet.addEventListener("mousemove", (event: MouseEvent) => {
            const dragX = event.clientX;
            const dragY = event.clientY;
            isDragging = dragX !== clickX || dragY !== clickY;
        });
    }

    /**
     * Gets the SvgPanZoom object associated to the mapsheet so that it's possible to handle pan and zoom.
     *
     * @returns The SvgPanZoom object associated to the mapsheet.
     */
    export function instance(): SvgPanZoom.Instance {
        return panZoomInstance;
    }

    /**
     * Checks if the mapsheet is currently being dragged.
     *
     * @returns True if it's being dragged, false if it isn't.
     */
    export function dragging(): boolean {
        return isDragging;
    }

    /**
     * Converts a point in client space (where event.clientX, event.clientY, panZoom.pan() etc are) to the corresponding pixel in SVG space (where hexes always have the same size regardless of zoom). The origin is considered to be at the top left edge of the mapsheet (not necessarily visible) in both cases.
     *
     * @param x The x coordinate of the point to convert.
     * @param y The y coordinate of the point to convert.
     *
     * @returns The converted point.
     */
    export function clientPixelToSvgPixel(x: number, y: number): [number, number] {
        return [
            x / getAbsoluteZoom(),
            y / getAbsoluteZoom()
        ];
    }

    /**
     * Converts a point in SVG space (where hexes always have the same size regardless of zoom) to the corresponding pixel in client space (where event.clientX, event.clientY, panZoom.pan() etc are). The origin is considered to be at the top left edge of the mapsheet (not necessarily visible) in both cases.
     *
     * @param x The x coordinate of the point to convert.
     * @param y The y coordinate of the point to convert.
     *
     * @returns The converted point.
     */
    export function svgPixelToClientPixel(x: number, y: number): [number, number] {
        return [
            x * getAbsoluteZoom(),
            y * getAbsoluteZoom()
        ];
    }

    /**
     * Gets the zoom value where 1 means that one pixel in SVG space equals one pixel in client space, rather than meaning completely zoomed out.
     *
     * @returns The absolute zoom.
     */
    export function getAbsoluteZoom(): number {
        return instance().getZoom() / zoomFactor;
    }

    /**
     * Sets the zoom value where 1 means that one pixel in SVG space equals one pixel in client space, rather than meaning completely zoomed out.
     *
     * @param zoom  The absolute zoom.
     */
    export function setAbsoluteZoom(zoom: number): void {
        instance().zoom(zoom * zoomFactor);
    }

    /**
     * Fixes so that it's possible to zoom with two fingers on mobile devices.
     *
     * @param panZoom   The object returned by svgPanZoom().
     * @param element   The <svg> element.
     */
    function makeSvgPanZoomMobileFriendly(panZoom: SvgPanZoom.Instance, element: SVGSVGElement): void {
        let oldPinchDistance: number | null = null;
        let oldScaleOnMobile: number | null = null;
        let previousZoomRatio: number = 1;

        element.addEventListener("touchmove", (event: TouchEvent) => {
            if(event.touches.length === 2){
                const currentPinchDistance = Math.hypot(event.touches[0].pageX - event.touches[1].pageX, event.touches[0].pageY - event.touches[1].pageY);
                oldPinchDistance ??= currentPinchDistance;

                if(event.cancelable){
                    event.preventDefault();
                }

                //Change the zoom
                const newScale = panZoom.getZoom() * currentPinchDistance / oldPinchDistance;
                panZoom.zoom(newScale);
            }
        });
        element.addEventListener("touchend", () => {
            oldPinchDistance = null;
            oldScaleOnMobile = null;
            previousZoomRatio = 1;
        });

        element.addEventListener("touchstart", (event: TouchEvent) => {
            if(event.touches.length === 2 && event.cancelable){
                event.preventDefault();
            }
        });
    }
}
export default PanZoom;
