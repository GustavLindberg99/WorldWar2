import os
import sys

from create_hexes_js_writer import CreateHexesJsWriter
from mapsheet_parser import Mapsheet
from world_xml_writer import WorldXmlWriter
from write_all_country_names_js_writer import WriteAllCountryNamesJsWriter

# Use paths relative to the current script
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# When running `npm run build`, only compile the mapsheet if `--all` is passed
npmAllArg = next(filter(lambda it: it.startswith("--npm-all"), sys.argv), None)
if npmAllArg is not None and npmAllArg != "--npm-all=true":
    print("Not compiling the mapsheet for performance reasons. To compile the mapsheet, run `npm run build --all` or `npm run build -a`.")
    exit()

mapsheet = Mapsheet("azimuthal_projection.svg")
print("Parsing islands and continents")
mapsheet.parseIslandsAndContinents()
print("Parsing lakes")
mapsheet.parseLakes()
print("Parsing deserts")
mapsheet.parseTerrain("Desert")
print("Parsing forests")
mapsheet.parseTerrain("Forest")
print("Parsing mountains")
mapsheet.parseTerrain("Mountain")
print("Parsing tall mountains")
mapsheet.parseTerrain("TallMountain")
print("Parsing icecaps")
mapsheet.parseTerrain("Icecap")
print("Parsing railways")
mapsheet.parseRailways()
print("Parsing weather zones")
mapsheet.parseWeatherZones()
print("Parsing hex info")
mapsheet.parseHexInfo()

print("Writing world.xml")
WorldXmlWriter(mapsheet).writeTo("../build/world.xml")

print("Writing create-hexes.js")
CreateHexesJsWriter(mapsheet).writeTo("../build/model/mapsheet/create-hexes.js")

print("Writing write-all-country-names.js")
WriteAllCountryNamesJsWriter(mapsheet).writeTo("../build/view/init/write-all-country-names.js")
