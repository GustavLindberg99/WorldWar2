from __future__ import annotations

import re
import svg.path
import typing
import xml.etree.ElementTree as xml

from geometry_utils import multilinePathToPolygon, parsePath, pointInsidePolygon
from hex import Hex

class Mapsheet:
    """
    Class allowing to parse the input SVG and generating the output HTML/JavaScript.
    """

    WeatherZone = typing.Literal["Polar", "Industrialized", "NorthTemperate", "SouthTemperate", "Tropical", "Fair"]

    minX: float
    minY: float
    hexWidth: float     # The distance between the far left of one hex and the far left of the next hex. The total width of the hex is this times 4/3 (proof: each angle in a hex is 120°, use this to divide the hex into six equilateral triangles).
    hexHeight: float    # The total height of a hex
    resolution: float   # The resolution to use when converting paths to polygons (which is needed to determine if a hex is inside a path)
    width: int          # The number of hexes in the x direction
    height: int         # The number of hexes in the y direction
    hexes: list[Hex]

    _svgTag: xml.Element

    def __init__(this, inputFileName: str) -> None:
        this._svgTag = xml.parse(inputFileName).getroot()

        ocean = this.layerFromName("Ocean")
        backgroundPath = svg.path.parse_path(ocean[0].attrib["d"])
        backgroundXCoords = [point.end.real for point in backgroundPath]
        backgroundYCoords = [point.end.imag for point in backgroundPath]
        this.minX = min(backgroundXCoords)
        this.minY = min(backgroundYCoords)
        this.hexWidth = abs(backgroundXCoords[backgroundYCoords.index(this.minY) - 1] - backgroundXCoords[backgroundYCoords.index(this.minY) + 1])
        this.hexHeight = abs(backgroundYCoords[backgroundXCoords.index(max(backgroundXCoords)) + 1] - backgroundYCoords[backgroundXCoords.index(max(backgroundXCoords))]) * 2
        this.resolution = this.hexHeight / 5
        this.width = round((backgroundXCoords[backgroundXCoords.index(max(backgroundXCoords)) + 1] - this.minX) / this.hexWidth)
        this.height = round((min(backgroundYCoords[backgroundYCoords.index(max(backgroundYCoords)) + 1], backgroundYCoords[backgroundYCoords.index(max(backgroundYCoords)) - 1]) - this.minY) / this.hexHeight)

        # The hexes are defined here, but will be filled with information as each method is called
        this.hexes = [Hex(this, x, y) for x in range(this.width) for y in range(this.height)]

    def parseIslandsAndContinents(this) -> None:
        """
        Parses the islands and continents and fills the hex objects with the information extracted from them.
        """
        islandsAndContinents = this.layerFromName("Islands and Continents")

        # Take the shortest paths first so that the if(not hex.isSea) optimization works as effictively as possible
        for island in sorted(islandsAndContinents, key = lambda it: len(it.attrib["d"])):
            path = svg.path.parse_path(island.attrib["d"])
            polygon, boundingBox = parsePath(path, this.resolution)
            for hex in this.hexes:
                # If we already know this is an all land hex, we don't need to check again. We do need to check again for coastal hexes though, because there might be more adjacent land hexes.
                if not hex.isSea:
                    continue
                # If it's not even inside the path's bounding box, it can't be inside the path itself.
                if not hex.isInsideBoundingBox(boundingBox):
                    continue
                partlyInside, completelyInside = hex.isInsidePolygon(polygon)
                if partlyInside:
                    hex.isLand = True
                    if completelyInside:
                        hex.isSea = False
                        hex.adjacentLandHexes = [True, True, True, True, True, True]
                        hex.adjacentSeaHexes = [False, False, False, False, False, False]
                    else:
                        vertexIsLand = []
                        for vertex in hex.vertices:
                            vertexIsLand.append(pointInsidePolygon(vertex, polygon))
                        for i in range(6):
                            landVertexCount = vertexIsLand[i] + vertexIsLand[i - 1] + pointInsidePolygon((hex.vertices[i] + hex.vertices[i - 1]) / 2, polygon)
                            if landVertexCount >= 1:
                                hex.adjacentLandHexes[i] = True
                                if landVertexCount >= 3:
                                    hex.adjacentSeaHexes[i] = False

    def parseLakes(this) -> None:
        """
        Parses the islands and continents and fills the hex objects with the information extracted from them.
        """
        lakes = this.layerFromName("Lakes")
        for lake in lakes:
            path = svg.path.parse_path(lake.attrib["d"])
            polygon, boundingBox = parsePath(path, this.resolution)
            for hex in this.hexes:
                if not hex.isInsideBoundingBox(boundingBox):
                    continue
                partlyInside, completelyInside = hex.isInsidePolygon(polygon)
                if partlyInside:
                    hex.isSea = True
                    if completelyInside:
                        hex.isLand = False
                        hex.adjacentSeaHexes = [True, True, True, True, True, True]
                        hex.adjacentLandHexes = [False, False, False, False, False, False]
                    else:
                        vertexIsSea = []
                        for vertex in hex.vertices:
                            vertexIsSea.append(pointInsidePolygon(vertex, polygon))
                        for i in range(6):
                            seaVertexCount = vertexIsSea[i] + vertexIsSea[(i - 1) % 6]
                            if seaVertexCount >= 1:
                                hex.adjacentSeaHexes[i] = True
                                if seaVertexCount >= 2:
                                    hex.adjacentLandHexes[i] = False

    def parseTerrain(this, terrainType: typing.Literal["Desert", "Forest", "Mountain", "TallMountain", "Icecap"]) -> None:
        """
        Parses terrain of the given type. For optimizations to work correctly, mountains must be parsed before tall mountains.
        """
        layer = this.layerFromName(terrainType)
        for terrain in layer:
            path = svg.path.parse_path(terrain.attrib["d"])
            polygon, boundingBox = parsePath(path, this.resolution)
            for hex in this.hexes:
                # Terrain can only exist in land hexes
                if not hex.isLand and terrainType != "Icecap":
                    continue
                # All tall mountains are above regular mountains, if this hex isn't then we already know it isn't a tall mountain
                if terrainType == "TallMountain":
                    if hex.terrain != "Mountain":
                        continue
                # If we already know the terrain, we don't need to check again
                else:
                    if hex.terrain != "Clear":
                        continue
                if not hex.isInsideBoundingBox(boundingBox):
                    continue
                if hex.isInsidePolygon(polygon)[0]:
                    hex.terrain = terrainType

    def parseRailways(this) -> None:
        """
        Parses the railways and fills the hex objects with the information extracted from them.
        """
        railways = this.layerFromName("Railways")
        for railway in railways:
            path = svg.path.parse_path(railway.attrib["d"])
            polygon, boundingBox = parsePath(path, this.resolution)
            for hex in this.hexes:
                if not hex.isLand:
                    continue
                if not hex.isInsideBoundingBox(boundingBox):
                    continue
                if hex.polygonPassesThrough(polygon):
                    hex.canUseRail = True

    def parseWeatherZones(this) -> None:
        """
        Parses the weather zones and fills the hex objects with the information extracted from them.
        """
        weatherPaths = this.weatherPaths()
        weatherPolygons = dict((weatherZone, [multilinePathToPolygon(path) for path in paths]) for weatherZone, paths in weatherPaths.items())
        for hex in this.hexes:
            for weatherZone, polygons in weatherPolygons.items():
                if hex.checkWeatherZone(weatherZone, polygons):
                    break

    def parseHexInfo(this) -> None:
        """
        Parses the information such as cities, countries, etc, and fills the hex objects with the information extracted from them.
        """
        layer = this.layerFromName("Hex info")
        labels = sorted(layer, key = lambda it:
            (float(it.attrib["x"]) - this.minX) // this.hexWidth +
            (float(it.attrib["y"]) - this.minY) / (this.hexHeight * this.height)
        )
        country: str | None = None
        info: str = ""
        for hex in this.hexes:
            if len(labels) > 0 and pointInsidePolygon(complex(float(labels[0].attrib["x"]), float(labels[0].attrib["y"])), hex.vertices):
                lines = list(labels[0].itertext())    # Contains one element for each line (tspan) in the hex info
                for line in lines:
                    # Lines starting with an upper case letter are for city hexes (the word starting with the uppercase letter is the name of the city).
                    # Lines starting with "null" are non-city resource hexes.
                    if line[0].isupper() or line.startswith("null"):
                        # Format of city labels: name, [alignment], [offset x, offset y], [hex-specific info]
                        cityLabel = line.split(",")
                        hex.city = cityLabel[0] if cityLabel[0] != "null" else None
                        cityLabel = cityLabel[1:]
                        if len(cityLabel) > 0 and cityLabel[0] in ["top", "bottom", "left", "right"]:
                            hex.cityAlignment = cityLabel[0]
                            cityLabel = cityLabel[1:]
                        try:
                            hex.cityOffset = (float(cityLabel[0]), float(cityLabel[1]))
                            cityLabel = cityLabel[2:]
                        except(IndexError, ValueError):
                            pass
                        cityInfo = cityLabel[0] if len(cityLabel) > 0 else ""
                        """
                        Valid city info letters (different from regular info below because they only apply to one hex, not to all hexes after):
                            e = enclave city (displays the country name in parentheses after the city name)
                            h = capital (as in huvudstad, since c already means colony)
                            m = resource hex (as in money, since r already means rail)
                            p = major port
                        """
                        if 'e' in cityInfo:
                            assert hex.city is not None, "An enclave city must be a city"
                            hex.isEnclaveCity = True
                        if 'h' in cityInfo:
                            hex.isCapital = True
                        if 'm' in cityInfo:
                            hex.isResourceHex = True
                        if 'p' in cityInfo:
                            hex.isMajorPort = True
                    # Lines starting with a lowercase letter (other than "null") indicate country info about the hex (the word starting with the lowercase letter is the Javascript name of the corresponding Country object).
                    elif line[0].islower():
                        label = line.split(",")
                        country = label[0]
                        info = label[1] if len(label) > 1 else ""
                    else:
                        raise AssertionError(f"Label line '{line}' starts with non-letter")
                labels = labels[1:]    # Go to the next label
                assert len(labels) == 0 or not pointInsidePolygon(complex(float(labels[0].attrib["x"]), float(labels[0].attrib["y"])), hex.vertices), f"Multiple hex info labels in the hex {hex.center}"    # The next label should not be in the same hex as this one
            if not hex.isLand:
                continue

            assert country is not None, "Found land hex before first hex info label"
            hex.country = country

            """
            Valid info letters:
                c = colony
                f = free France (controlled by UK if Vichy France is created)
                g = Greenland (controlled by US if Denmark is conquered)
                i = India (rail movement allowed, special rules for Indian units)
                j = controlled by Japan in 1939 (for Chinese hexes) or when Vichy France is created (for French hexes)
                o = occupied France (controlled by Germany if Vichy France is created)
                r = can use rail (implicit for some countries)
                s = controlled by Soviet Union if Germany attacks Poland (for all hexes except northernmost Finnish ones) or when Finland surrenders (for all Finnish hexes), implicit for Estonia, Latvia and Lithuania
                v = Vichy France
            """
            if 'c' in info:
                hex.isColony = True
            if 'e' in info:
                hex.isEnclaveCity = True
            if 'f' in info:
                hex.secondaryController = "unitedKingdom"
            if 'g' in info:
                hex.secondaryController = "unitedStates"
            if 'h' in info:
                hex.isResourceHex = True
            if 'i' in info:
                hex.isIndia = True
                if hex.terrain != "TallMountain":
                    hex.canUseRail = True
            if 'j' in info:
                hex.secondaryController = "japan"
            if 'o' in info:
                hex.secondaryController = "germany"
            if 'p' in info:
                hex.isMajorPort = True
            if 'r' in info or country == "japan" or (country == "china" and hex.terrain != "TallMountain") or (country == "argentina" and hex.weatherZone != "SouthTemperate") or (not hex.isColony and hex.terrain != "Icecap" and country in ["portugal", "spain", "france", "unitedKingdom", "ireland", "belgium", "netherlands", "luxemburg", "germany", "switzerland", "italy", "denmark", "sweden", "norway", "finland", "estonia", "latvia", "lithuania", "poland", "hungary", "romania", "bulgaria", "yugoslavia", "greece", "newZealand", "unitedStates"]):
                hex.canUseRail = True
            if 's' in info or country in ["estonia", "latvia", "lithuania"]:
                hex.secondaryController = "sovietUnion"
            if 'v' in info:
                hex.secondaryController = "france"

    def layerFromName(this, layerName: str) -> xml.Element:
        """
        Gets the layer with the given name.
        """
        for layer in this._svgTag:
            if layer.tag != "{http://www.w3.org/2000/svg}g":
                continue
            if layer.attrib["{http://www.inkscape.org/namespaces/inkscape}label"] == layerName:
                if layerName != "Country Names":
                    for element in layer:
                        if "transform" in element.attrib:
                            raise ValueError(f"Element in layer {layerName} has transform=\"{element.attrib['transform']}\" attribute, might not be parsed correctly.")
                return layer
        raise ValueError(f"Could not find layer {layerName}")

    def weatherPaths(this) -> dict[Mapsheet.WeatherZone, list[svg.path.Path]]:
        """
        Gets the paths for each weather zone.
        """
        weatherZones = this.layerFromName("Weather Zones")

        polarPaths: list[svg.path.Path] = []
        industrializedPaths: list[svg.path.Path] = []
        northernTemperatePaths: list[svg.path.Path] = []
        tropicalPaths: list[svg.path.Path] = []
        southernTemperatePaths: list[svg.path.Path] = []

        for weatherZone in weatherZones:
            path = svg.path.parse_path(weatherZone.attrib["d"])[1:]

            # Construct the polygon by iterating over the points. Weather zone paths only contain straight lines so there's no need to use `parsePath` which is slower.
            polygon: list[complex] = []
            for line in path:
                if len(polygon) == 0:
                    polygon.append(line.start)
                polygon.append(line.end)

            # Extract the color
            strokeMatch = re.search(r"stroke:#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})", weatherZone.attrib["style"])
            assert strokeMatch is not None
            r, g, b = [int(it, 16) for it in strokeMatch.groups()]

            # Use the color to determine which weather zone this is for
            # Red = tropical
            if r - g - b > 0:
                tropicalPaths.append(path)
            # Green = northern temperate
            elif g - r - b > 0:
                northernTemperatePaths.append(path)
            # Blue = polar
            elif b - r - g > 0:
                polarPaths.append(path)
            # Yellow = fair (everything outside of this is southern temperate)
            elif r + g - 4 * b > 0:
                southernTemperatePaths.append(path)
            # Gray = industrialized
            else:
                industrializedPaths.append(path)

        return {
            "Polar": polarPaths,
            "Industrialized": industrializedPaths,
            "NorthTemperate": northernTemperatePaths,
            "Tropical": tropicalPaths,
            "SouthTemperate": southernTemperatePaths
        }
