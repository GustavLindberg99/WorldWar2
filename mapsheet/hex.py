from __future__ import annotations

import typing

from geometry_utils import pointInsidePolygon

if typing.TYPE_CHECKING:
    from mapsheet_parser import Mapsheet

class Hex:
    """
    Class representing a hex.
    """

    x: int
    y: int
    isLand: bool = False
    isSea: bool = True
    terrain: str = "Clear"
    weatherZone: str = "Fair"
    isIcecap: bool = False
    canUseRail: bool = False
    country: str | None = None
    isColony: bool = False
    isResourceHex: bool = False
    isCapital: bool = False
    isEnclaveCity: bool = False
    isMajorPort: bool = False
    isIndia: bool = False
    secondaryController: str | None = None
    city: str | None = None
    cityAlignment: str = "right"
    cityOffset: tuple[float, float] = (0, 0)
    adjacentLandHexes: list[bool]
    adjacentSeaHexes: list[bool]
    vertices: list[complex]
    center: complex

    _mapsheet: Mapsheet

    def __init__(this, mapsheet: Mapsheet, x: int, y: int) -> None:
        this._mapsheet = mapsheet

        this.x = x
        this.y = y
        # 0=top, 1=top left, 2=bottom left, 3=bottom, 4=bottom right, 5=top right
        this.adjacentLandHexes = [False] * 6
        this.adjacentSeaHexes = [True] * 6
        # 0=top left, 1=left, 2=bottom left, 3=bottom right, 4=right, 5=top right
        yOffset = (this.x % 2) * 0.5
        this.vertices = [
            complex(mapsheet.minX + (this.x + 1/3) * mapsheet.hexWidth, mapsheet.minY + (this.y + yOffset) * mapsheet.hexHeight),
            complex(mapsheet.minX + this.x * mapsheet.hexWidth, mapsheet.minY + (this.y + yOffset + 0.5) * mapsheet.hexHeight),
            complex(mapsheet.minX + (this.x + 1/3) * mapsheet.hexWidth, mapsheet.minY + (this.y + yOffset + 1) * mapsheet.hexHeight),
            complex(mapsheet.minX + (this.x + 1) * mapsheet.hexWidth, mapsheet.minY + (this.y + yOffset + 1) * mapsheet.hexHeight),
            complex(mapsheet.minX + (this.x + 4/3) * mapsheet.hexWidth, mapsheet.minY + (this.y + yOffset + 0.5) * mapsheet.hexHeight),
            complex(mapsheet.minX + (this.x + 1) * mapsheet.hexWidth, mapsheet.minY + (this.y + yOffset) * mapsheet.hexHeight)
        ]
        this.center = complex(mapsheet.minX + (this.x + 2/3) * mapsheet.hexWidth, mapsheet.minY + (this.y + 1) * mapsheet.hexHeight)

    def completeTerrain(this) -> str:
        """
        Gets the terrain type of this hex as defined in the JavaScript TerrainType enum (but without `TerrainType.` in front).
        """
        if this.terrain == "Icecap":
            if not this.isSea:
                return "LandIce"
            elif not this.isLand:
                return "SeaIce"
            return "CoastalIce"
        elif not this.isLand:
            return "Sea"
        elif this.isSea:
            if this.terrain == "Clear":
                return "Coastal"
            else:
                return "Coastal" + this.terrain
        return this.terrain

    def completeCountry(this) -> str:
        """
        Gets the variable name of the JavaScript country object corresponding to this hex's country.
        """
        if this.country is None:
            return "null"
        return "c." + this.country

    def completeSecondaryController(this) -> str:
        """
        Gets the variable name of the JavaScript country object corresponding to this hex's secondary controller.
        """
        if not this.isLand or this.secondaryController is None:
            return "null"
        return "c." + this.secondaryController

    def polygonPassesThrough(this, polygon: list[complex]) -> bool:
        """
        Checks if the edges given polygon passes through this hex.
        """
        for point in polygon:
            if abs(point - this.center) < this._mapsheet.hexHeight and pointInsidePolygon(point, this.vertices):    #Theoretically the second condition is enough, but the second condition won't be true if the first one isn't and the first condition is a lot faster
                return True
        return False

    def isInsidePolygon(this, polygon: list[complex]) -> tuple[bool, bool]:
        """
        Checks if this hex is inside the given polygon. Returns two booleans, the first one indicating if it's partly inside and the second one indicating if it's completely inside.
        """
        passesThrough = this.polygonPassesThrough(polygon)
        centerInside = pointInsidePolygon(this.center, polygon)
        partlyInside = centerInside or passesThrough
        completelyInside = centerInside and not passesThrough
        return (partlyInside, completelyInside)

    def isInsideBoundingBox(this, boundingBox: tuple[float, float, float, float]) -> bool:
        """
        Checks if this hex is inside the given bounding box, either partially or totally.
        """
        minX, maxX, minY, maxY = boundingBox
        return minX <= this.vertices[4].real and maxX >= this.vertices[1].real and minY <= this.vertices[3].imag and maxY >= this.vertices[0].imag

    def checkWeatherZone(this, weatherZoneName: str, weatherZonePolygons: list[list[complex]]) -> bool:
        """
        Checks if this hex is in the weather zone with the given name, and if it is, sets `this.weatherZone` accordingly.
        """
        for polygon in weatherZonePolygons:
            if pointInsidePolygon(this.center, polygon):
                this.weatherZone = weatherZoneName
                return True
        return False

    def __repr__(this) -> str:
        """
        Returns a string representation of this hex for debugging purposes. The result is not intended to be interpreted as JavaScript.
        """
        return f"Hex({this.x},{this.y})"
