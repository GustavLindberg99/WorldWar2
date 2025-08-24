from hex import Hex
from mapsheet_parser import Mapsheet

class CreateHexesJsWriter:
    """
    Class allowing to write to the create-hexes.js file.
    """

    _mapsheet: Mapsheet

    def __init__(this, mapsheet: Mapsheet) -> None:
        this._mapsheet = mapsheet

    def writeTo(this, outputFileName: str) -> None:
        """
        Writes to the JavaScript file based on the contents of the mapsheet.
        """
        file = open(outputFileName, "w", encoding="utf-8")

        file.write("import {Hex,TerrainType as t,WeatherZone as w} from \"../mapsheet.js\";")
        file.write("import {Countries as c} from \"../countries.js\";")
        file.write(f"export const mapWidth={this._mapsheet.width},mapHeight={this._mapsheet.height},hexWidth={this._mapsheet.hexWidth},hexHeight={this._mapsheet.hexHeight},svgWidth={this._mapsheet.hexWidth * (this._mapsheet.width + 1/3)},svgHeight={this._mapsheet.hexHeight * (this._mapsheet.height + 1/2)};")
        file.write("export function createHexes(){")
        file.write("let i=0;")
        file.write("const h=(...p)=>{new Hex(...p);i++;},l=(...p)=>{new LandHex(...p);i++;}")
        file.write(",a=[!0,!0,!0,!0,!0,!0],f=[!1,!1,!1,!1,!1,!1];")    # Defining a and f as these arrays will make several Hex object share references to the same arrays, but that doesn't matter because these are read-only (it's even a good thing because it saves memory)

        previousHexes: list[Hex] = []
        for hex in this._mapsheet.hexes:
            if not this._canBeInSameLoop(hex, previousHexes):
                file.write(this._dumpHexes(previousHexes))
                previousHexes = []
            previousHexes.append(hex)
        file.write(this._dumpHexes(previousHexes))

        file.write("}")
        file.close()

        file.close()

    def _dumpHexes(this, hexes: list[Hex]) -> str:
        """
        Generates JavaScript code that will create new Hex objects corresponding to the given hexes.
        """
        # If there are no hexes, there's nothing to do, so return an empty string
        if len(hexes) == 0:
            return ""
        # If there's only one hex, no need for a loop, just stringify that hex
        if len(hexes) == 1:
            return f"h({hexes[0].x},{hexes[0].y},{this._hexConstructorParams(hexes[0])});"
        # If there's more than one hex, loop over them at runtime in JavaScript so that the .js file isn't too big
        else:
            return f"for(let y={hexes[0].y};y<{hexes[-1].y + 1};y++)h({hexes[0].x},y,{this._hexConstructorParams(hexes[0])});"

    def _hexConstructorParams(this, hex: Hex) -> str:
        """
        Gets a string that can be passed to the Hex constructor in JavaScript, with each parameter separated by the comma. For example, to make `new Hex(x, y, 1, 2, 3)`, returns `"1,2,3"`.
        """
        cityParams = ""
        if hex.isEnclaveCity:
            cityParams = ",!0"
        if cityParams != "" or hex.isCapital:
            cityParams = f",{this._booleanToMinifiedString(hex.isCapital)}" + cityParams
        if cityParams != "" or hex.isMajorPort:
            cityParams = f",{this._booleanToMinifiedString(hex.isMajorPort)}" + cityParams
        if cityParams != "" or hex.cityOffset != (0, 0):
            cityParams = f",{hex.cityOffset[0]},{hex.cityOffset[1]}" + cityParams
        if cityParams != "" or hex.cityAlignment != "right":
            cityParams = f",\"{hex.cityAlignment[0]}\"" + cityParams
        if cityParams != "" or hex.city is not None:
            if hex.city is not None:
                cityParams = f",\"{hex.city}\"" + cityParams
            else:
                cityParams = ",null" + cityParams
        return "t.{},w.{},{},{},{},{},{},{},{},{}".format(
            hex.completeTerrain(),
            hex.weatherZone,
            this._booleanToMinifiedString(hex.canUseRail),
            hex.completeCountry(),
            this._booleanToMinifiedString(hex.isResourceHex),
            this._booleanToMinifiedString(hex.isColony),
            this._booleanToMinifiedString(hex.isIndia),
            hex.completeSecondaryController(),
            this._booleanListToMinifiedString(hex.adjacentLandHexes),
            this._booleanListToMinifiedString(hex.adjacentSeaHexes)
        ) + cityParams

    def _canBeInSameLoop(this, hex: Hex, otherHexes: list[Hex]) -> bool:
        """
        Checks if the given hex can be constructed in the same for loop as all the other hexes in the JavaScript code.
        """
        return len(otherHexes) == 0 or (hex.x == otherHexes[0].x and this._hexConstructorParams(hex) == this._hexConstructorParams(otherHexes[0]))

    def _booleanToMinifiedString(this, b: bool) -> str:
        """
        Converts a boolean to a minified JavaScript string.
        """
        return "!0" if b else "!1"

    def _booleanListToMinifiedString(this, bl: list[bool]) -> str:
        """
        Converts a boolean list to a minified JavaScript string.
        """
        if bl == [True] * 6:
            return "a"    # a and f are defined as these arrays in the Javascript function to save space
        elif bl == [False] * 6:
            return "f"
        result = "["
        for b in bl:
            result += this._booleanToMinifiedString(b) + ","
        result = result[:-1]    # Remove the extra comma at the end
        result += "]"
        return result
