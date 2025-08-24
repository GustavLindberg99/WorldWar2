import copy
import math
import svg.path
import xml.etree.ElementTree as xml

from geometry_utils import lineEquation, lineIntersection, pointInsidePolygon
from mapsheet_parser import Mapsheet

class WorldXmlWriter:
    """
    Class allowing to write to the world.xml file, which will be downloaded using AJAX and appended to the DOM as SVG by assigning to innerHTML.
    """

    _mapsheet: Mapsheet

    def __init__(this, mapsheet: Mapsheet) -> None:
        this._mapsheet = mapsheet

    def writeTo(this, outputFileName: str) -> None:
        """
        Writes to the world.xml file based on the contents of the mapsheet.
        """
        rootElement = xml.Element("g")
        rootElement.attrib["transform"] = f"translate({-this._mapsheet.minX},{-this._mapsheet.minY})"

        rootElement.append(this._createOcean())
        rootElement.append(this._createTerrain("Islands and Continents", className="land"))
        rootElement.append(this._createTerrain("Lakes", className="sea", id="lakes"))
        rootElement.append(this._createTerrain("Desert", className="desert"))
        rootElement.append(this._createTerrain("Forest", className="forest"))
        rootElement.append(this._createTerrain("Mountain", className="mountain"))
        rootElement.append(this._createTerrain("TallMountain", className="tallMountain"))
        rootElement.append(this._createTerrain("Icecap", className="icecap"))
        rootElement.append(this._createCanals())
        rootElement.append(this._createTerrain("Railways", className="railway"))
        rootElement.append(this._createBorders())
        rootElement.append(this._createWeatherZones())
        rootElement.append(this._createCountryNames())

        file = open(outputFileName, "w", encoding="utf-8")
        file.write(xml.tostring(rootElement, encoding="unicode"))
        file.close()

    def _createOcean(this) -> xml.Element:
        """
        Creates an element for the ocean based on the mapsheet.
        """
        ocean = xml.Element("path")
        ocean.attrib["class"] = "sea"
        ocean.attrib["d"] = this._mapsheet.layerFromName("Ocean")[0].attrib["d"]
        return ocean

    def _createTerrain(this, layerName: str, *, className: str, id: str | None = None) -> xml.Element:
        """
        Creates a `<g>` element containing all the `<path>` elements of the given layer in the source SVG, but with only the `d` attribute kept. The `<g>` element's `class` attribute, will be set to `className`, and if specified, its `id` attribute will be set to `id`.
        """
        layer = xml.Element("g")
        layer.attrib["class"] = className
        if id is not None:
            layer.attrib["id"] = id
        for island in this._mapsheet.layerFromName(layerName):
            path = xml.Element("path")
            path.attrib["d"] = island.attrib["d"]
            layer.append(path)
        return layer

    def _createCanals(this) -> xml.Element:
        """
        Creates a `<g>` element containing the canals based on the mapsheet.
        """
        result = xml.Element("g")
        result.attrib["class"] = "canal"
        for g in this._mapsheet.layerFromName("Canals"):
            canalGroup = xml.Element("g")
            for path in g:
                canalPath = xml.Element("path")
                canalPath.attrib["d"] = path.attrib["d"]
                canalGroup.append(canalPath)
            result.append(canalGroup)
        return result

    def _createBorders(this) -> xml.Element:
        """
        Creates a `<g>` element containing the borders based on the mapsheet.
        """
        result = xml.Element("g")
        result.attrib["class"] = "border"
        for path in this._mapsheet.layerFromName("Borders"):
            originalCss = path.attrib["style"].replace(" ", "")
            isTemporary = originalCss.find("stroke-dasharray") != originalCss.find("stroke-dasharray:none")
            borderPath = xml.Element("path")
            borderPath.attrib["d"] = path.attrib["d"]
            if isTemporary:
                borderPath.attrib["class"] = "temporary"
            result.append(borderPath)
        return result

    def _createWeatherZones(this) -> xml.Element:
        """
        Creates a `<g>` element containing the weather zones based on the mapsheet.
        """
        result = xml.Element("g")
        result.attrib["class"] = "weather"

        weatherPaths = this._mapsheet.weatherPaths()

        # Get the boundaries between the fair weather zone and the tropical and northen temperate weather zones
        fairPaths: list[list[svg.path.Line]] = []
        northernTemperateLines, tropicalLines = [
            [svg.path.Line(line.start, line.end) for path in paths for line in path]    # Use Line(line.start, line.end) instead of just line so that we don't insert Close object into the fair polygon at random
            for paths in [weatherPaths["NorthTemperate"], weatherPaths["Tropical"]]
        ]
        epsilon = this._mapsheet.hexWidth / 100
        def linesAreEqual(l1: svg.path.Line, l2: svg.path.Line) -> bool:
            return (abs(l1.start - l2.start) < epsilon and abs(l1.end - l2.end) < epsilon) or (abs(l1.start - l2.end) < epsilon and abs(l1.end - l2.start) < epsilon)
        def lineInArray(line: svg.path.Line, array: list[svg.path.Line]) -> int | None:
            for i in range(len(array)):
                l = array[i]
                if linesAreEqual(line, l):
                    return i
            return None
        while startLine := next(filter(lambda it: lineInArray(it, tropicalLines) is None and lineInArray(it, [line for path in fairPaths for line in path]) is None, northernTemperateLines), None):
            currentLines, otherLines = northernTemperateLines, tropicalLines
            fairPath: list[svg.path.Line] = []
            i = northernTemperateLines.index(startLine)
            direction = 1
            while True:
                line = currentLines[i]
                if len(fairPath) > 0 and line is fairPath[0]:
                    break
                elif (otherIndex := lineInArray(line, otherLines)) is not None:
                    direction = 1 if linesAreEqual(otherLines[otherIndex - 1], currentLines[(i + direction) % len(currentLines)]) else -1
                    i = otherIndex + direction
                    currentLines, otherLines = otherLines, currentLines
                else:
                    fairPath.append(line)
                    i += direction
                    i %= len(currentLines)
            fairPaths.append(fairPath)
        weatherPaths["Fair"] = [svg.path.Path(*(it[:-1] + [svg.path.Close(it[-1].start, it[-1].end)])) for it in fairPaths]

        # Define the CSS class to be used for each weather zone
        innerCssClasses: dict[Mapsheet.WeatherZone, str] = {
            "Polar": "polar",
            "Industrialized": "industrialized",
            "NorthTemperate": "temperate",
            "Tropical": "tropical",
            "Fair": "fair",
            "SouthTemperate": "temperate"
        }

        # Define the CSS class to be used for the weather zone adjacent to each weather zone. For weather zones completely surrounded by another weather zone this is the other weather zone (since for example industrialized/polar "holes" aren't included in the northern temperate path). For more complicated weather zones this is None since the adjacent weather zone is drawn by that weather zone.
        # For Fair, "fair" is defined as both inner and outer since it's sometimes inner and sometimes outer. This is handled below.
        outerCssClasses: dict[Mapsheet.WeatherZone, str | None] = {
            "Polar": "temperate",
            "Industrialized": "temperate",
            "NorthTemperate": None,
            "Tropical": None,
            "Fair": "fair",
            "SouthTemperate": "fair"
        }

        # Draw the weather zones on the map
        for weatherZone, paths in weatherPaths.items():
            for path in paths:
                polygons: tuple[list[complex], list[complex]] = ([], [])
                hexSide = this._mapsheet.hexWidth * 2/3
                radius = hexSide / 3
                for i in range(len(path)):
                    for innerOrOuter in range(2):
                        # Copy the lines so that changes to them won't affect the original path
                        currentLine = copy.copy(path[i])
                        previousLine = copy.copy(path[i - 1])
                        assert isinstance(currentLine, svg.path.Linear), "Weather zone boundaries may not contain curves"
                        assert isinstance(previousLine, svg.path.Linear), "Weather zone boundaries may not contain curves"

                        # Find the x and y coordinates at which the line should be moved
                        currentSlope = lineEquation(currentLine)[0]
                        currentDy = (-1)**(i+innerOrOuter) * radius / math.sqrt(currentSlope**2 + 1)
                        currentDx = currentSlope * currentDy

                        # Move the line
                        currentLine.start += complex(currentDx, currentDy)
                        currentLine.end += complex(currentDx, currentDy)

                        # If this is the beginning of a non-closed line, simply append the start of it
                        if i == 0 and not isinstance(previousLine, svg.path.Close):
                            polygons[innerOrOuter].append(currentLine.start)
                            continue

                        # Do the same thing as above but for the previous line
                        previousSlope = lineEquation(previousLine)[0]
                        previousDy = (-1)**(i+innerOrOuter+1) * radius / math.sqrt(previousSlope**2 + 1)
                        previousDx = previousSlope * previousDy
                        previousLine.start += complex(previousDx, previousDy)
                        previousLine.end += complex(previousDx, previousDy)

                        # Append the intersection of this line and the previous one
                        polygons[innerOrOuter].append(lineIntersection(previousLine, currentLine))
                        # If this is the end of a non-closed line, append the end of it
                        if i == len(path) - 1 and not isinstance(currentLine, svg.path.Close):
                            polygons[innerOrOuter].append(currentLine.end)

                # Determine which polygon is inner and which one is outer
                if pointInsidePolygon(polygons[0][1], polygons[1]):
                    innerPolygon, outerPolygon = polygons
                else:
                    outerPolygon, innerPolygon = polygons

                # Determine the CSS classes
                innerCssClass: str | None = innerCssClasses[weatherZone]
                outerCssClass: str | None = outerCssClasses[weatherZone]
                if weatherZone == "Fair":
                    if pointInsidePolygon(weatherPaths["Polar"][0][0].start, outerPolygon):
                        innerCssClass = None
                        outerCssClass = "fair"
                    else:
                        outerCssClass = None
                        innerCssClass = "fair"

                # Draw the polygons
                for polygon, cssClass in [(innerPolygon, innerCssClass), (outerPolygon, outerCssClass)]:
                    if cssClass is None:
                        continue
                    d = ""
                    for point in polygon:
                        d += f"L{point.real} {point.imag}"
                    d = "M" + d[1:]
                    if isinstance(path[-1], svg.path.Close):
                        d += "Z"
                    pathElement = xml.Element("path")
                    pathElement.attrib["class"] = cssClass
                    pathElement.attrib["d"] = d
                    result.append(pathElement)

        return result

    def _createCountryNames(this) -> xml.Element:
        """
        Creates a `<g>` element that country names will be written to at runtime by JavaScript.
        """
        result = xml.Element("g")
        result.attrib["class"] = "countryNames"
        return result
