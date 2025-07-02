from __future__ import annotations

import numpy as np
import os
import re
import xml.etree.ElementTree as XML

from copy import copy
from svg.path import parse_path, Line, Close    #If this doesn't work, do pip install svg.path

#Don't use typechecking for performance reasons (otherwise to typecheck use from typeguard import typechecked and then add @typechecked before each function and class)

#Use paths relative to the current script
os.chdir(os.path.dirname(os.path.abspath(__file__)))

zoom = 3    #When changing this, also change it in mapsheet.css

def pointInsidePolygon(point: complex, polygon: list[complex]) -> bool:
    x = point.real
    y = point.imag
    inside = False
    for i in range(len(polygon)):
        j = i - 1
        xi = polygon[i].real
        yi = polygon[i].imag
        xj = polygon[j].real
        yj = polygon[j].imag
        intersect = ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
        if intersect:
            inside = not inside
    return inside

def lineEquation(line: Line) -> tuple[float, float]:
    slope = (line.start.imag - line.end.imag) / (line.start.real - line.end.real)
    intercept = line.start.imag - slope * line.start.real
    return slope, intercept

def lineIntersection(l1: Line, l2: Line) -> complex:
    slope1, intercept1 = lineEquation(l1)
    slope2, intercept2 = lineEquation(l2)
    matrix = np.array([[-slope1, 1],
                       [-slope2, 1]])
    interceptVector = np.array([intercept1, intercept2])
    solutionVector = np.linalg.inv(matrix) @ interceptVector
    return complex(solutionVector[0], solutionVector[1])

def booleanToMinifiedString(b: bool) -> str:
    return "!0" if b else "!1"

def booleanListToMinifiedString(bl: list[bool]) -> str:
    if bl == [True] * 6:
        return "a"    #a and f are defined as these arrays in the Javascript function to save space
    elif bl == [False] * 6:
        return "f"
    result = "["
    for b in bl:
        result += booleanToMinifiedString(b) + ","
    result = result[:-1]    #Remove the extra comma at the end
    result += "]"
    return result

class Hex:
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

    def __init__(this, x: int, y: int):
        this.x = x
        this.y = y
        #0=top, 1=top left, 2=bottom left, 3=bottom, 4=bottom right, 5=top right
        this.adjacentLandHexes = [False] * 6
        this.adjacentSeaHexes = [True] * 6
        #0=top left, 1=left, 2=bottom left, 3=bottom right, 4=right, 5=top right
        yOffset = (this.x % 2) * 0.5
        this.vertices = [
            complex(minX + (this.x + 1/3) * hexWidth, minY + (this.y + yOffset) * hexHeight),
            complex(minX + this.x * hexWidth, minY + (this.y + yOffset + 0.5) * hexHeight),
            complex(minX + (this.x + 1/3) * hexWidth, minY + (this.y + yOffset + 1) * hexHeight),
            complex(minX + (this.x + 1) * hexWidth, minY + (this.y + yOffset + 1) * hexHeight),
            complex(minX + (this.x + 4/3) * hexWidth, minY + (this.y + yOffset + 0.5) * hexHeight),
            complex(minX + (this.x + 1) * hexWidth, minY + (this.y + yOffset) * hexHeight)
        ]
        this.center = complex(minX + (this.x + 2/3) * hexWidth, minY + (this.y + 1) * hexHeight)

    def completeTerrain(this) -> str:
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
        if not this.isLand:
            return "null"
        return "c." + this.country

    def completeSecondaryController(this) -> str:
        if not this.isLand or this.secondaryController == None:
            return "null"
        return "c." + this.secondaryController

    def toJavascriptConstructorParams(this) -> str:
        cityParams = ""
        if this.isEnclaveCity:
            cityParams = ",!0"
        if cityParams != "" or this.isCapital:
            cityParams = f",{booleanToMinifiedString(this.isCapital)}" + cityParams
        if cityParams != "" or this.isMajorPort:
            cityParams = f",{booleanToMinifiedString(this.isMajorPort)}" + cityParams
        if cityParams != "" or this.cityOffset != (0, 0):
            cityParams = f",{this.cityOffset[0]},{this.cityOffset[1]}" + cityParams
        if cityParams != "" or this.cityAlignment != "right":
            cityParams = f",\"{this.cityAlignment[0]}\"" + cityParams
        if cityParams != "" or this.city != None:
            if this.city != None:
                cityParams = f",\"{this.city}\"" + cityParams
            else:
                cityParams = ",null" + cityParams
        return "t.{},w.{},{},{},{},{},{},{},{},{}".format(
            this.completeTerrain(),
            this.weatherZone,
            booleanToMinifiedString(this.canUseRail),
            this.completeCountry(),
            booleanToMinifiedString(this.isResourceHex),
            booleanToMinifiedString(this.isColony),
            booleanToMinifiedString(this.isIndia),
            this.completeSecondaryController(),
            booleanListToMinifiedString(this.adjacentLandHexes),
            booleanListToMinifiedString(this.adjacentSeaHexes)
        ) + cityParams

    def canBeInSameLoop(this, otherHexes: list[Hex]) -> bool:
        return len(otherHexes) == 0 or (this.x == otherHexes[0].x and this.toJavascriptConstructorParams() == otherHexes[0].toJavascriptConstructorParams())

    def polygonPassesThrough(this, polygon: list[complex]) -> bool:
        for point in polygon:
            if abs(point - this.center) < hexHeight and pointInsidePolygon(point, this.vertices):    #Theoretically the second condition is enough, but the second condition won't be true if the first one isn't and the first condition is a lot faster
                return True
        return False

    def isInsidePolygon(this, polygon: list[complex]) -> tuple[bool, bool]:
        passesThrough = this.polygonPassesThrough(polygon)
        centerInside = pointInsidePolygon(this.center, polygon)
        partlyInside = centerInside or passesThrough
        completelyInside = centerInside and not passesThrough
        return (partlyInside, completelyInside)

    def checkWeatherZone(this, weatherZoneName: str, weatherZonePolygons: list[list[complex]]) -> bool:
        for polygon in weatherZonePolygons:
            if pointInsidePolygon(this.center, polygon):
                this.weatherZone = weatherZoneName
                return True
        return False

    def __repr__(this):
        return "Hex({},{})".format(this.x, this.y)

class Path:
    polygon: list[complex]
    minX: float
    maxX: float
    minY: float
    maxY: float

    def __init__(this, xmlElement: XML.Element):
        this.polygon = []
        this.minX = np.inf
        this.maxX = -np.inf
        this.minY = np.inf
        this.maxY = -np.inf
        path = parse_path(xmlElement.attrib["d"])
        for i in np.arange(0.0, 1.0, resolution / path.length(resolution / 2)):
            point = path.point(i, resolution / 2)
            if(point.real < this.minX):
                this.minX = point.real
            if(point.real > this.maxX):
                this.maxX = point.real
            if(point.imag < this.minY):
                this.minY = point.imag
            if(point.imag > this.maxY):
                this.maxY = point.imag
            this.polygon.append(point)

    def hexIsNearby(this, hex: Hex) -> bool:
        vertices = hex.vertices
        return this.minX <= vertices[4].real and this.maxX >= vertices[1].real and this.minY <= vertices[3].imag and this.maxY >= vertices[0].imag

class CountryName:
    tokens: list[str]
    x: float
    y: float
    fontSize: float
    textAnchor: str
    transform: str | None

    def __init__(this, tokens: list[str], x: float, y: float, fontSize: float, textAnchor: str, transform: str | None):
        this.tokens = tokens
        this.x = float(x)
        this.y = float(y)
        this.fontSize = float(fontSize)
        this.textAnchor = textAnchor
        this.transform = transform

svgTag = XML.parse("azimuthal_projection.svg").getroot()
includableSvg = open("world.xml", "w", encoding="utf-8")
countryNames = []

for layer in svgTag:
    if layer.tag != "{http://www.w3.org/2000/svg}g":
        continue
    layerName = layer.attrib["{http://www.inkscape.org/namespaces/inkscape}label"]

    if layerName != "Country Names":
        for element in layer:
            if "transform" in element.attrib:
                raise ValueError("Element in layer {} has transform=\"{}\" attribute, might not be parsed correctly.".format(layerName, element.attrib["transform"]))

    if layerName == "Ocean":
        #Initialize some variables
        background = parse_path(layer[0].attrib["d"])
        x = [point.end.real for point in background]
        y = [point.end.imag for point in background]
        minX = min(x)
        minY = min(y)
        hexWidth = abs(x[y.index(minY) - 1] - x[y.index(minY) + 1])    #The distance between the far left of one hex and the far left of the next hex. The total width of the hex is this times 4/3 (proof: each angle in a hex is 120°, use this to divide the hex into six equilateral triangles).
        hexHeight = abs(y[x.index(max(x)) + 1] - y[x.index(max(x))]) * 2    #The total height of a hex
        resolution = hexHeight / 5
        width = round((x[x.index(max(x)) + 1] - minX) / hexWidth)
        height = round((min(y[y.index(max(y)) + 1], y[y.index(max(y)) - 1]) - minY) / hexHeight)
        print("Map dimensions parsed")

        #Create the hex grid
        hexes = [Hex(x, y) for x in range(width) for y in range(height)]
        print("Hex grid created")

        #Translate the map so that it starts at zero
        includableSvg.write("<g transform=\"scale({}) translate({},{})\">".format(zoom, -minX, -minY))

        #Draw the sea
        includableSvg.write("<path class=\"sea\" d=\"{}\"/>".format(layer[0].attrib["d"]))

    elif layerName == "Islands and Continents":
        includableSvg.write("<g class=\"land\">")
        numberOfContinents = len(list(filter(lambda path: len(Path(path).polygon) >= 1000, layer)))
        numberOfIslands = len(layer) - numberOfContinents
        islandProgress = 0
        continentProgress = 0
        for island in sorted(layer, key = lambda path: len(path.attrib["d"])):    #Take the shortest paths first so that the if(not hex.isSea) optimization works as effictively as possible
            includableSvg.write("<path d=\"{}\"/>".format(island.attrib["d"]))
            path = Path(island)
            isContinent = len(path.polygon) >= 1000
            for hex in hexes:
                if isContinent:
                    percentage = ((continentProgress := continentProgress + 1) / (numberOfContinents * len(hexes)) * 100)
                    if continentProgress % 1000 == 0 or percentage == 100:
                        print("\rParsing continents: {:0.0f}%".format(percentage), end = None if percentage == 100 else "")
                if not hex.isSea:    #If we already know this is an all land hex, we don't need to check again. We do need to check again for coastal hexes though, because there might be more adjacent land hexes.
                    continue
                if not path.hexIsNearby(hex):
                    continue
                (partlyInside, completelyInside) = hex.isInsidePolygon(path.polygon)
                if partlyInside:
                    hex.isLand = True
                    if completelyInside:
                        hex.isSea = False
                        hex.adjacentLandHexes = [True, True, True, True, True, True]
                        hex.adjacentSeaHexes = [False, False, False, False, False, False]
                    else:
                        vertexIsLand = []
                        for vertex in hex.vertices:
                            vertexIsLand.append(pointInsidePolygon(vertex, path.polygon))
                        for i in range(6):
                            landVertexCount = vertexIsLand[i] + vertexIsLand[i - 1] + pointInsidePolygon((hex.vertices[i] + hex.vertices[i - 1]) / 2, path.polygon)
                            if landVertexCount >= 1:
                                hex.adjacentLandHexes[i] = True
                                if landVertexCount >= 3:
                                    hex.adjacentSeaHexes[i] = False
            if not isContinent:
                percentage = (islandProgress := islandProgress + 1) * 100 // numberOfIslands
                print("\rParsing islands: {}%".format(percentage), end = None if percentage == 100 else "")
        includableSvg.write("</g>")

    elif layerName == "Lakes":
        includableSvg.write("<g id=\"lakes\" class=\"sea\">")
        progress = 0
        for lake in layer:
            includableSvg.write("<path d=\"{}\"/>".format(lake.attrib["d"]))
            path = Path(lake)
            for hex in hexes:
                if not path.hexIsNearby(hex):
                    continue
                (partlyInside, completelyInside) = hex.isInsidePolygon(path.polygon)
                if partlyInside:
                    hex.isSea = True
                    if completelyInside:
                        hex.isLand = False
                        hex.adjacentSeaHexes = [True, True, True, True, True, True]
                        hex.adjacentLandHexes = [False, False, False, False, False, False]
                    else:
                        vertexIsSea = []
                        for vertex in hex.vertices:
                            vertexIsSea.append(pointInsidePolygon(vertex, path.polygon))
                        for i in range(6):
                            seaVertexCount = vertexIsSea[i] + vertexIsSea[(i - 1) % 6]
                            if seaVertexCount >= 1:
                                hex.adjacentSeaHexes[i] = True
                                if seaVertexCount >= 2:
                                    hex.adjacentLandHexes[i] = False
            percentage = (progress := progress + 1) * 100 // len(layer)
            print("\rParsing lakes: {}%".format(percentage), end="")
        print()    #To start a new line when each terrain type is done
        includableSvg.write("</g>")

    elif layerName == "Desert" or layerName == "Forest" or layerName == "Mountain" or layerName == "TallMountain" or layerName == "Icecap":
        includableSvg.write("<g class=\"{}\">".format(layerName[0].lower() + layerName[1:]))
        progress = 0
        for terrain in layer:
            includableSvg.write("<path d=\"{}\"/>".format(terrain.attrib["d"]))
            path = Path(terrain)
            for hex in hexes:
                if not hex.isLand and layerName != "Icecap":    #Terrain can only exist in land hexes
                    continue
                if layerName == "TallMountain":
                    if hex.terrain != "Mountain":    #All tall mountains are above regular mountains, if this hex isn't then we already know it isn't a tall mountain
                        continue
                else:
                    if hex.terrain != "Clear":    #If we already know the terrain, we don't need to check again
                        continue
                if not path.hexIsNearby(hex):
                    continue
                if hex.isInsidePolygon(path.polygon)[0]:
                    hex.terrain = layerName
            percentage = (progress := progress + 1) * 100 // len(layer)
            print("\rParsing {}s: {}%".format(layerName, percentage), end="")
        print()    #To start a new line when each terrain type is done
        includableSvg.write("</g>")

    elif layerName == "Canals":
        includableSvg.write("<g class=\"canal\">")
        for g in layer:
            includableSvg.write("<g>")
            for path in g:
                includableSvg.write("<path d=\"{}\"/>".format(path.attrib["d"]))
            includableSvg.write("</g>")
        includableSvg.write("</g>")
        print("Canals parsed")

    elif layerName == "Railways":
        includableSvg.write("<g class=\"railway\">")
        progress = 0
        for railway in layer:
            includableSvg.write("<path d=\"{}\"/>".format(railway.attrib["d"]))
            path = Path(railway)
            for hex in hexes:
                if not hex.isLand:
                    continue
                if not path.hexIsNearby(hex):
                    continue
                if hex.polygonPassesThrough(path.polygon):
                    hex.canUseRail = True
        includableSvg.write("</g>")

    elif layerName == "Borders":
        includableSvg.write("<g class=\"border\">")
        for border in layer:
            originalCss = border.attrib["style"].replace(" ", "")
            isTemporary = originalCss.find("stroke-dasharray") != originalCss.find("stroke-dasharray:none")
            includableSvg.write(("<path class=\"temporary\" d=\"{}\"/>" if isTemporary else "<path d=\"{}\"/>").format(border.attrib["d"]))
        includableSvg.write("</g>")
        print("Borders drawn")

    elif layerName == "Weather Zones":
        #Get the weather zone data
        polarPolygons = []
        industrializedPolygons = []
        northernTemperatePolygons = []
        tropicalPolygons = []
        southernTemperatePolygons = []
        polarPaths = []
        industrializedPaths = []
        northernTemperatePaths = []
        tropicalPaths = []
        southernTemperatePaths = []
        for weatherZone in layer:
            path = parse_path(weatherZone.attrib["d"])[1:]
            polygon = []
            for line in path:
                if len(polygon) == 0:
                    polygon.append(line.start)
                polygon.append(line.end)
            r, g, b = re.search(r"stroke:#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})", weatherZone.attrib["style"]).groups()
            r, g, b = int(r, 16), int(g, 16), int(b, 16)
            if r - g - b > 0:
                tropicalPaths.append(path)
                tropicalPolygons.append(polygon)
            elif g - r - b > 0:
                northernTemperatePaths.append(path)
                northernTemperatePolygons.append(polygon)
            elif b - r - g > 0:
                polarPaths.append(path)
                polarPolygons.append(polygon)
            elif r + g - 4 * b > 0:
                southernTemperatePaths.append(path)
                southernTemperatePolygons.append(polygon)
            else:
                industrializedPaths.append(path)
                industrializedPolygons.append(polygon)

        #Get the boundaries between the fair weather zone and the tropical and northen temperate weather zones
        fairPaths = []
        northernTemperateLines, tropicalLines = [
            [Line(line.start, line.end) for path in paths for line in path]    #Use Line(line.start, line.end) instead of just line so that we don't insert Close object into the fair polygon at random
            for paths in [northernTemperatePaths, tropicalPaths]
        ]
        epsilon = hexWidth / 100
        def linesAreEqual(l1: Line, l2: Line) -> bool:
            return (abs(l1.start - l2.start) < epsilon and abs(l1.end - l2.end) < epsilon) or (abs(l1.start - l2.end) < epsilon and abs(l1.end - l2.start) < epsilon)
        def lineInArray(line: Line, array: list[Line]) -> int | None:
            for i in range(len(array)):
                l = array[i]
                if linesAreEqual(line, l):
                    return i
            return None
        while startLine := next(filter(lambda l: lineInArray(l, tropicalLines) == None and lineInArray(l, [line for path in fairPaths for line in path]) == None, northernTemperateLines), None):
            currentLines, otherLines = northernTemperateLines, tropicalLines
            path = []
            i = northernTemperateLines.index(startLine)
            direction = 1
            while True:
                line = currentLines[i]
                if len(path) > 0 and line is path[0]:
                    break
                elif (otherIndex := lineInArray(line, otherLines)) != None:
                    direction = 1 if linesAreEqual(otherLines[otherIndex - 1], currentLines[(i + direction) % len(currentLines)]) else -1
                    i = otherIndex + direction
                    currentLines, otherLines = otherLines, currentLines
                else:
                    path.append(line)
                    i += direction
                    i %= len(currentLines)
            fairPaths.append(path)
        for path in fairPaths:
            path[-1] = Close(path[-1].start, path[-1].end)


        #Draw the weather zones on the map
        includableSvg.write("<g class=\"weather\">")
        for paths, innerCssClass, outerCssClass in [
            (polarPaths, "polar", "temperate"),
            (industrializedPaths, "industrialized", "temperate"),
            (northernTemperatePaths, "temperate", "none"),
            (tropicalPaths, "tropical", "none"),
            (fairPaths, "fair", "fair"),
            (southernTemperatePaths, "temperate", "fair")
        ]:
            for path in paths:
                polygons = ([], [])
                hexSide = hexWidth * 2/3
                r = hexSide / 3
                for i in range(len(path)):
                    for j in range(2):
                        #Copy the lines so that changes to them won't affect the original path
                        currentLine = copy(path[i])
                        previousLine = copy(path[i - 1])

                        #Find the x and y coordinates at which the line should be moved
                        currentSlope = lineEquation(currentLine)[0]
                        currentDy = (-1)**(i+j) * r / np.sqrt(currentSlope**2 + 1)
                        currentDx = currentSlope * currentDy

                        #Move the line
                        currentLine.start += complex(currentDx, currentDy)
                        currentLine.end += complex(currentDx, currentDy)

                        #If this is the beginning of a non-closed line, simply append the start of it
                        if i == 0 and not isinstance(previousLine, Close):
                            polygons[j].append(currentLine.start)
                            continue

                        #Do the same thing as above but for the previous line
                        previousSlope = lineEquation(previousLine)[0]
                        previousDy = (-1)**(i+j+1) * r / np.sqrt(previousSlope**2 + 1)
                        previousDx = previousSlope * previousDy
                        previousLine.start += complex(previousDx, previousDy)
                        previousLine.end += complex(previousDx, previousDy)

                        #Append the intersection of this line and the previous one
                        polygons[j].append(lineIntersection(previousLine, currentLine))
                        #If this is the end of a non-closed line, append the end of it
                        if i == len(path) - 1 and not isinstance(currentLine, Close):
                            polygons[j].append(currentLine.end)

                if pointInsidePolygon(polygons[0][1], polygons[1]):
                    innerPolygon, outerPolygon = polygons
                else:
                    outerPolygon, innerPolygon = polygons
                if paths is fairPaths:
                    if pointInsidePolygon(polarPolygons[0][0], outerPolygon):
                        innerCssClass = "none"
                        outerCssClass = "fair"
                    else:
                        outerCssClass = "none"
                        innerCssClass = "fair"
                for polygon, cssClass in [(innerPolygon, innerCssClass), (outerPolygon, outerCssClass)]:
                    if cssClass == "none":
                        continue
                    d = ""
                    for point in polygon:
                        d += "L{} {}".format(point.real, point.imag)
                    d = "M" + d[1:]
                    if isinstance(path[-1], Close):
                        d += "Z"
                    includableSvg.write("<path class=\"{}\" d=\"{}\"/>".format(cssClass, d))

        includableSvg.write("</g>")

        #Set the weather zones for each hex
        percentage = 100 / len(hexes)
        for hex in hexes:
            (hex.checkWeatherZone("Polar", polarPolygons) or
            hex.checkWeatherZone("Industrialized", industrializedPolygons) or
            hex.checkWeatherZone("NorthTemperate", northernTemperatePolygons) or
            hex.checkWeatherZone("Tropical", tropicalPolygons) or
            hex.checkWeatherZone("SouthTemperate", southernTemperatePolygons))
            if int(percentage) != int(percentage := percentage + 100 / len(hexes)):
                print("\rParsing weather zones: {:0.0f}%".format(percentage), end="")
        print()    #To start a new line since this isn't done automatically above

    elif layerName == "Hex grid":
        pass    #Don't do anything with the hex grid, it will be created dynamically in Javascript

    elif layerName == "Country Names":
        includableSvg.write("<g class=\"countryNames\">")
        for textElement in layer:
            text = '\n'.join(list(textElement.itertext()))
            tokens = re.findall(r"(?:^|\s)(?:[a-zA-Z]+|tr\(\"[^\"]+\"\)|\"[^\"]+\")(?=$|\s)", text)
            css = textElement.attrib["style"]
            fontSize = re.search(r"font-size\s*:\s*([0-9\.]+)px", css)[1]
            textAnchor = (re.search(r"text-anchor\s*:\s*([^;]+)(?:;|$)", css) or [None, "right"])[1]
            transform = None
            if "transform" in textElement.attrib:
                transform = textElement.attrib["transform"]
            countryNames.append(CountryName(tokens, textElement.attrib["x"], textElement.attrib["y"], fontSize, textAnchor, transform))
        includableSvg.write("</g>")
        print("Country names drawn")

    elif layerName == "Hex info":
        labels = sorted(layer, key = lambda t: (float(t.attrib["x"]) - minX) // hexWidth + (float(t.attrib["y"]) - minY) / (hexHeight * height))
        country: str | None = None
        info = ""
        for hex in hexes:
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
                            assert hex.city != None, "An enclave city must be a city"
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
                assert len(labels) == 0 or not pointInsidePolygon(complex(float(labels[0].attrib["x"]), float(labels[0].attrib["y"])), hex.vertices), "Multiple hex info labels in the hex {}".format(hex.center)    # The next label should not be in the same hex as this one
            if not hex.isLand:
                continue

            assert country != None, "Found land hex before first hex info label"
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
        print("Hex info parsed")

    else:
        print("Warning: Ignoring unknown layer {}".format(layerName))

includableSvg.write("</g>")
includableSvg.close()

createHexesScript = open("../build/model/mapsheet/create-hexes.js", "w", encoding="utf-8")
createHexesScript.write("import {Hex,TerrainType as t,WeatherZone as w} from \"../mapsheet.js\";")
createHexesScript.write("import {Countries as c} from \"../countries.js\";")
createHexesScript.write(f"export const mapWidth={width},mapHeight={height},hexWidth={hexWidth * zoom},hexHeight={hexHeight * zoom},svgWidth={hexWidth * zoom * (width + 1/3)},svgHeight={hexHeight * zoom * (height + 1/2)};")
createHexesScript.write("export function createHexes(){")
createHexesScript.write("let i=0;")
createHexesScript.write("const h=(...p)=>{new Hex(...p);i++;},l=(...p)=>{new LandHex(...p);i++;}")
createHexesScript.write(",a=[!0,!0,!0,!0,!0,!0],f=[!1,!1,!1,!1,!1,!1];")    #Defining a and f as these arrays will make several Hex object share references to the same arrays, but that doesn't matter because these are read-only (it's even a good thing because it saves memory)
previousHexes: list[Hex] = []
def emptyPreviousHexes() -> None:
    if len(previousHexes) <= 1:
        for previousHex in previousHexes:
            createHexesScript.write(f"h({previousHex.x},{previousHex.y},{previousHex.toJavascriptConstructorParams()});")
    else:
        createHexesScript.write(f"for(let y={previousHexes[0].y};y<{previousHexes[-1].y + 1};y++)h({previousHexes[0].x},y,{previousHexes[0].toJavascriptConstructorParams()});")
    previousHexes.clear()
for hex in hexes:
    #if hex.y == 0:
    #    script.write("await refreshUI();")
    if not hex.canBeInSameLoop(previousHexes):
        emptyPreviousHexes()
    previousHexes.append(hex)
emptyPreviousHexes()
createHexesScript.write("}")
createHexesScript.close()
writeCountryNamesScript = open("../build/view/init/write-all-country-names.js", "w", encoding="utf-8")
writeCountryNamesScript.write("import {writeCountryName as n} from \"./write-country-name.js\";")
writeCountryNamesScript.write("import {Countries as c} from \"../../model/countries.js\";")
writeCountryNamesScript.write("export function writeAllCountryNames(){")
for countryName in countryNames:
    lines = ["["]
    for token in countryName.tokens:
        if token[0] == '\n':
            lines.append("[")
        if '"' not in token:
            if len(lines) > 1 or len(countryName.tokens) > 1:
                lines[-1] += "'(',"
            lines[-1] += "c."
        lines[-1] += token.strip() + ","
        if '"' not in token and (len(lines) > 1 or len(countryName.tokens) > 1):
            lines[-1]+= "')',"
    lines = [line[:-1] + "]" for line in lines]
    for i in range(len(lines)):
        writeCountryNamesScript.write("n({},{},{},{},{},{});".format(lines[i], countryName.x, countryName.y + i * countryName.fontSize, countryName.fontSize, "\"{}\"".format(countryName.textAnchor), "null" if countryName.transform == None else "\"{}\"".format(countryName.transform)))
writeCountryNamesScript.write("}")
writeCountryNamesScript.close()
