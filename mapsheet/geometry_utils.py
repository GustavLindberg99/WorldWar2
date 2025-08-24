import numpy as np
import svg.path

def lineEquation(line: svg.path.Linear) -> tuple[float, float]:
    """
    Gets the equation of the given line. Returns `(a, b)`, where the line equation is `y = ax + b`.
    """
    slope = (line.start.imag - line.end.imag) / (line.start.real - line.end.real)
    intercept = line.start.imag - slope * line.start.real
    return slope, intercept

def lineIntersection(l1: svg.path.Linear, l2: svg.path.Linear) -> complex:
    """
    Gets the intersection of the two given lines.
    """
    slope1, intercept1 = lineEquation(l1)
    slope2, intercept2 = lineEquation(l2)
    matrix = np.array([[-slope1, 1],
                       [-slope2, 1]])
    interceptVector = np.array([intercept1, intercept2])
    solutionVector = np.linalg.inv(matrix) @ interceptVector
    return complex(solutionVector[0], solutionVector[1])

def multilinePathToPolygon(path: svg.path.Path) -> list[complex]:
    """
    Converts a multiline path to a polygon. The path must be a multiline (i.e. no curves), otherwise the slower but more flexible `parsePath` function should be used instead.
    """
    polygon: list[complex] = []
    for line in path:
        if len(polygon) == 0:
            polygon.append(line.start)
        polygon.append(line.end)
    return polygon

def parsePath(path: svg.path.Path, resolution: float) -> tuple[list[complex], tuple[float, float, float, float]]:
    """
    Converts an SVG path to a polygon with the given resolution. Returns both the polygon and its bounding box as `(minX, maxX, minY, maxY)`.
    """
    polygon: list[complex] = []
    minX = np.inf
    maxX = -np.inf
    minY = np.inf
    maxY = -np.inf
    for i in np.arange(0.0, 1.0, resolution / path.length(resolution / 2)):
        point = path.point(float(i), resolution / 2)
        if(point.real < minX):
            minX = point.real
        if(point.real > maxX):
            maxX = point.real
        if(point.imag < minY):
            minY = point.imag
        if(point.imag > maxY):
            maxY = point.imag
        polygon.append(point)
    return polygon, (minX, maxX, minY, maxY)

def pointInsidePolygon(point: complex, polygon: list[complex]) -> bool:
    """
    Checks if the given point is inside the given polygon.
    """
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
