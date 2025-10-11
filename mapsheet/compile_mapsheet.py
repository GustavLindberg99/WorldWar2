import os
import sys

from create_hexes_js_writer import CreateHexesJsWriter
from mapsheet_parser import Mapsheet
from world_xml_writer import WorldXmlWriter
from write_all_country_names_js_writer import WriteAllCountryNamesJsWriter

# Use paths relative to the current script
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# If the build files were modified later than the source file, skip compiling the mapsheet for performance reasons
mapsheetFile = "azimuthal_projection.svg"
worldXmlFile = "../build/world.xml"
createHexesJsFile = "../build/model/mapsheet/create-hexes.js"
writeAllCountryNamesJsFile = "../build/view/init/write-all-country-names.js"

sourceLastModified = os.path.getmtime(mapsheetFile)
buildLastModified = min(os.path.getmtime(worldXmlFile), os.path.getmtime(createHexesJsFile), os.path.getmtime(writeAllCountryNamesJsFile))
if sourceLastModified <= buildLastModified:
    print("Not compiling the mapsheet for performance reasons as the build files were modified later than the source SVG file.")
    exit()

mapsheet = Mapsheet(mapsheetFile)
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
WorldXmlWriter(mapsheet).writeTo(worldXmlFile)

print("Writing create-hexes.js")
CreateHexesJsWriter(mapsheet).writeTo(createHexesJsFile)

print("Writing write-all-country-names.js")
WriteAllCountryNamesJsWriter(mapsheet).writeTo(writeAllCountryNamesJsFile)
