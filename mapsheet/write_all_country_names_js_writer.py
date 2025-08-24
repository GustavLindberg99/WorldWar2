import re

from mapsheet_parser import Mapsheet

class WriteAllCountryNamesJsWriter:
    """
    Class allowing to write to the write-all-country-names.js file.
    """

    _mapsheet: Mapsheet

    def __init__(this, mapsheet: Mapsheet) -> None:
        this._mapsheet = mapsheet

    def writeTo(this, outputFileName: str) -> None:
        """
        Writes to the JavaScript file based on the contents of the mapsheet.
        """
        file = open(outputFileName, "w", encoding="utf-8")

        file.write("import {writeCountryName as n} from \"./write-country-name.js\";")
        file.write("import {Countries as c} from \"../../model/countries.js\";")
        file.write("export function writeAllCountryNames(){")

        layer = this._mapsheet.layerFromName("Country Names")
        for textElement in layer:
            text = '\n'.join(list(textElement.itertext()))
            tokens = re.findall(r"(?:^|\s)(?:[a-zA-Z]+|tr\(\"[^\"]+\"\)|\"[^\"]+\")(?=$|\s)", text)
            css = textElement.attrib["style"]
            fontSizeMatch = re.search(r"font-size\s*:\s*([0-9\.]+)px", css)
            assert fontSizeMatch is not None
            fontSize = float(fontSizeMatch.group(1))
            textAnchorMatch = re.search(r"text-anchor\s*:\s*([^;]+)(?:;|$)", css)
            textAnchor: str = "right" if textAnchorMatch is None else textAnchorMatch.group(1)
            transform: str | None = None
            if "transform" in textElement.attrib:
                transform = textElement.attrib["transform"]
            x = float(textElement.attrib["x"])
            y = float(textElement.attrib["y"])
            lines = ["["]
            for token in tokens:
                if token[0] == '\n':
                    lines.append("[")
                if '"' not in token:
                    if len(lines) > 1 or len(tokens) > 1:
                        lines[-1] += "'(',"
                    lines[-1] += "c."
                lines[-1] += token.strip() + ","
                if '"' not in token and (len(lines) > 1 or len(tokens) > 1):
                    lines[-1]+= "')',"
            lines = [line[:-1] + "]" for line in lines]
            for i, line in enumerate(lines):
                file.write("n({},{},{},{},{},{});".format(
                    line,
                    x,
                    y + i * fontSize,
                    fontSize,
                    f"\"{textAnchor}\"",
                    "null" if transform is None else f"\"{transform}\""
                ))

        file.write("}")
        file.close()
