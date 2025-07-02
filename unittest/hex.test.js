import { expect, test } from "vitest";

import { Hex, SupplyLines } from "../build/model/mapsheet.js";
import { Partnership } from "../build/model/partnership.js";
import { Countries } from "../build/model/countries.js";
import { AirUnit, Destroyer, HeavyCruiser, Infantry, LightCruiser, Submarine, SupplyUnit } from "../build/model/units.js";
import { date } from "../build/model/date.js";

const paris = Hex.allCityHexes.find(it => it.city === "Paris");
const lille = Hex.allCityHexes.find(it => it.city === "Lille");
const malmo = Hex.allCityHexes.find(it => it.city === "Malmö");
const helsingborg = Hex.fromCoordinates(166, 169);
const copenhagen = Hex.allCityHexes.find(it => it.city === "Copenhagen");
const hamburg = Hex.allCityHexes.find(it => it.city === "Hamburg");
const lubeck = Hex.allCityHexes.find(it => it.city === "Lübeck");
const cuxhaven = Hex.fromCoordinates(162, 169);
const esbjerg = Hex.allCityHexes.find(it => it.city === "Esbjerg");
const sonderborg = Hex.fromCoordinates(163, 168);
const middelfart = Hex.fromCoordinates(164, 169);
const ajaccio = Hex.allCityHexes.find(it => it.city === "Ajaccio");
const rotterdam = Hex.allCityHexes.find(it => it.city === "Rotterdam");
const chicago = Hex.allCityHexes.find(it => it.city === "Chicago");
const pearlHarbor = Hex.allCityHexes.find(it => it.city === "Pearl Harbor");
const portSaid = Hex.allCityHexes.find(it => it.city === "Port Said");
const suez = Hex.allCityHexes.find(it => it.city === "Suez");
const alexandria = Hex.allCityHexes.find(it => it.city === "Alexandria");
const danzig = Hex.allCityHexes.find(it => it.city === "Danzig");
const wilno = Hex.allCityHexes.find(it => it.city === "Wilno");
const riga = Hex.allCityHexes.find(it => it.city === "Riga");
const newcastle = Hex.allCityHexes.find(it => it.city === "Newcastle");
const leningrad = Hex.allCityHexes.find(it => it.city === "Leningrad");
const beijing = Hex.allCityHexes.find(it => it.city === "Beijing");

test("Distance between hexes", () => {
    expect(paris.distanceFromHex(paris)).toBe(0);
    expect(malmo.distanceFromHex(copenhagen)).toBe(1);
    expect(malmo.distanceFromHex(helsingborg)).toBe(1);
    expect(paris.distanceFromHex(lille)).toBe(2);
    expect(paris.distanceFromHex(malmo)).toBe(13);
    expect(lille.distanceFromHex(copenhagen)).toBe(10);
    expect(paris.distanceFromHex(ajaccio)).toBe(10);
});

test("Distance from front line", () => {
    const frontLine = Countries.germany.hexes.filter(it =>
        it.adjacentLandHexes().some(adjacent =>
            adjacent.country === Countries.france
            || adjacent.country === Countries.poland
        )
    );

    expect(malmo.distanceFromHexGroup(frontLine)).toBe(3);
    expect(helsingborg.distanceFromHexGroup(frontLine)).toBe(4);
    expect(copenhagen.distanceFromHexGroup(frontLine)).toBe(4);
    expect(rotterdam.distanceFromHexGroup(frontLine)).toBe(3);
    expect(lille.distanceFromHexGroup(frontLine)).toBe(4);
    expect(paris.distanceFromHexGroup(frontLine)).toBe(5);
    expect(ajaccio.distanceFromHexGroup(frontLine)).toBe(8);
});

test("Closest hex", () => {
    expect(paris.closestHex([lille, malmo, copenhagen, ajaccio, chicago])).toBe(lille);
    expect(malmo.closestHex([paris, lille, copenhagen, ajaccio, chicago])).toBe(copenhagen);
    expect(paris.closestHex([paris, lille, malmo, copenhagen, ajaccio, chicago])).toBe(paris);
});

test("Ports", () => {
    //Ports
    expect(malmo.isPort()).toBe(true);
    expect(copenhagen.isPort()).toBe(true);
    expect(ajaccio.isPort()).toBe(true);
    expect(chicago.isPort()).toBe(false);
    expect(rotterdam.isPort()).toBe(true);
    expect(pearlHarbor.isPort()).toBe(true);
    expect(portSaid.isPort()).toBe(true);
    expect(suez.isPort()).toBe(true);

    //Cities not by the sea
    expect(paris.isPort()).toBe(false);
    expect(lille.isPort()).toBe(false);

    //Hexes by the sea that aren't city hexes
    expect(helsingborg.isPort()).toBe(false);
    expect(sonderborg.isPort()).toBe(false);
    expect(middelfart.isPort()).toBe(false);
});

test("Major ports", () => {
    expect(malmo.isMajorPort()).toBe(false);
    expect(copenhagen.isMajorPort()).toBe(false);
    expect(ajaccio.isMajorPort()).toBe(false);
    expect(paris.isMajorPort()).toBe(false);
    expect(lille.isMajorPort()).toBe(false);
    expect(helsingborg.isMajorPort()).toBe(false);
    expect(suez.isMajorPort()).toBe(false);
    expect(chicago.isMajorPort()).toBe(false);
    expect(rotterdam.isMajorPort()).toBe(true);
    expect(pearlHarbor.isMajorPort()).toBe(true);
    expect(portSaid.isMajorPort()).toBe(true);
});

test("Adjacent hexes", () => {
    expect(malmo.adjacentHexes()).toContain(helsingborg);
    expect(malmo.adjacentHexes()).toContain(copenhagen);
    expect(copenhagen.adjacentHexes()).toContain(malmo);
    expect(copenhagen.adjacentHexes()).toContain(helsingborg);
    expect(malmo.adjacentHexes()).not.toContain(paris);
    expect(malmo.adjacentHexes()).not.toContain(malmo);
    expect(paris.adjacentHexes()).not.toContain(malmo);
    expect(paris.adjacentHexes()).not.toContain(lille);
});

test("Adjacent land hexes", () => {
    expect(malmo.adjacentLandHexes()).toContain(helsingborg);
    expect(malmo.adjacentLandHexes()).not.toContain(copenhagen);
    expect(copenhagen.adjacentLandHexes()).not.toContain(malmo);
    expect(copenhagen.adjacentLandHexes()).not.toContain(helsingborg);
    expect(malmo.adjacentLandHexes()).not.toContain(malmo);
    expect(malmo.adjacentLandHexes()).not.toContain(paris);
    expect(portSaid.adjacentLandHexes()).toContain(suez);
    expect(paris.adjacentLandHexes().length).toBe(6);
    expect(pearlHarbor.adjacentLandHexes().length).toBe(0);
});

test("Adjacent sea hexes", () => {
    expect(malmo.adjacentSeaHexes()).toContain(helsingborg);
    expect(malmo.adjacentSeaHexes()).toContain(copenhagen);
    expect(paris.adjacentSeaHexes().length).toBe(0);
    expect(pearlHarbor.adjacentSeaHexes().length).toBe(6);
});

test("Canals", () => {
    //As long as the UK is neutral, nobody may use the Suez canal (since Egypt is a British colony)
    expect(portSaid.adjacentSeaHexes()).not.toContain(suez);
    expect(portSaid.adjacentSeaHexes(Partnership.Axis)).not.toContain(suez);
    expect(portSaid.adjacentSeaHexes(Partnership.Allies)).not.toContain(suez);

    //If the UK enters the war, only the Allies may use the Suez canal
    Countries.unitedKingdom.joinPartnership(Partnership.Allies);
    expect(portSaid.adjacentSeaHexes()).not.toContain(suez);
    expect(portSaid.adjacentSeaHexes(Partnership.Axis)).not.toContain(suez);
    expect(portSaid.adjacentSeaHexes(Partnership.Allies)).toContain(suez);

    //If the Axis gains control of one of the Suez canal hexes, nobody may use the Suez canal
    Countries.italy.joinPartnership(Partnership.Axis);
    portSaid.setController(Countries.italy);
    expect(portSaid.adjacentSeaHexes()).not.toContain(suez);
    expect(portSaid.adjacentSeaHexes(Partnership.Axis)).not.toContain(suez);
    expect(portSaid.adjacentSeaHexes(Partnership.Allies)).not.toContain(suez);

    //If the Axis gains control of both of the Suez canal hexes, only the Axis may use the Suez canal
    suez.setController(Countries.italy);
    expect(portSaid.adjacentSeaHexes()).not.toContain(suez);
    expect(portSaid.adjacentSeaHexes(Partnership.Axis)).toContain(suez);
    expect(portSaid.adjacentSeaHexes(Partnership.Allies)).not.toContain(suez);
});

test("Naval control zones", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    Countries.denmark.joinPartnership(Partnership.Allies);

    const danishShip = new LightCruiser("Hekla", 1, 3, 24, Countries.denmark);
    const germanShip = new HeavyCruiser("Admiral Graf Spee", 4, 5, 41, Countries.germany);
    const germanUBoat = new Submarine("IIA", 3, 2, 18, Countries.germany);

    //Naval control zones should extend across sea hexsides
    danishShip.setHex(sonderborg);
    expect(lubeck.isInNavalControlZone(Partnership.Allies, false)).toBe(true);
    expect(middelfart.isInNavalControlZone(Partnership.Allies, false)).toBe(true);

    //Naval control zones shouldn't extend across all land hexsides
    expect(esbjerg.isInNavalControlZone(Partnership.Allies, false)).toBe(false);

    //Light cruisers shouldn't have submarine control zones
    expect(lubeck.isInNavalControlZone(Partnership.Allies, true)).toBe(false);
    expect(middelfart.isInNavalControlZone(Partnership.Allies, true)).toBe(false);

    //Units shouldn't have enemy control zones
    expect(lubeck.isInNavalControlZone(Partnership.Axis, false)).toBe(false);
    expect(middelfart.isInNavalControlZone(Partnership.Axis, false)).toBe(false);

    //Friendly units shouldn't negate enemy control zones
    germanShip.setHex(lubeck);
    expect(sonderborg.isInNavalControlZone(Partnership.Axis, false)).toBe(true);
    expect(lubeck.isInNavalControlZone(Partnership.Allies, false)).toBe(true);

    //Submarines should have submarine control zones
    germanUBoat.setHex(lubeck);
    expect(sonderborg.isInNavalControlZone(Partnership.Axis, true)).toBe(true);
    expect(middelfart.isInNavalControlZone(Partnership.Axis, true)).toBe(true);

    //Naval control zones shouldn't extend across canals
    expect(cuxhaven.isInNavalControlZone(Partnership.Axis, false)).toBe(false);
    expect(cuxhaven.isInNavalControlZone(Partnership.Axis, true)).toBe(false);
});

test("Land control zones", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    Countries.denmark.joinPartnership(Partnership.Allies);

    const germanInfantry = new Infantry(1, 3, Countries.germany);
    const germanSupplyUnit = new SupplyUnit(3, Countries.germany);
    const danishInfantry = new Infantry(1, 3, Countries.denmark);

    //Supply units shouldn't have control zones
    germanSupplyUnit.setHex(lubeck);
    expect(sonderborg.isInLandControlZone(Partnership.Axis)).toBe(false);
    expect(hamburg.isInLandControlZone(Partnership.Axis)).toBe(false);

    //Infantry units should have control zones
    germanInfantry.setHex(lubeck);
    expect(sonderborg.isInLandControlZone(Partnership.Axis)).toBe(true);
    expect(hamburg.isInLandControlZone(Partnership.Axis)).toBe(true);

    //Units shouldn't have enemy control zones
    expect(sonderborg.isInLandControlZone(Partnership.Allies)).toBe(false);
    expect(hamburg.isInLandControlZone(Partnership.Allies)).toBe(false);

    //Land control zones shouldn't extend over all sea hexsides
    expect(middelfart.isInLandControlZone(Partnership.Axis)).toBe(false);

    //Friendly units shouldn't negate enemy control zones
    danishInfantry.setHex(sonderborg);
    expect(sonderborg.isInLandControlZone(Partnership.Axis)).toBe(true);
    expect(lubeck.isInLandControlZone(Partnership.Allies)).toBe(true);

    //Control zones should extend into unfinished fortifications
    lubeck.startBuildingFortification();
    expect(lubeck.isInLandControlZone(Partnership.Allies)).toBe(true);
    lubeck.continueBuilding();
    expect(lubeck.isInLandControlZone(Partnership.Allies)).toBe(true);

    //Control zones shouldn't extend into finished fortifications
    lubeck.continueBuilding();
    expect(lubeck.isInLandControlZone(Partnership.Allies)).toBe(false);

    //Not even if they're not occupied by land units
    germanInfantry.die();
    expect(lubeck.isInLandControlZone(Partnership.Allies)).toBe(false);

    //Units that have done an amphibous assault into a hex with an enemy unit should have a control zone in that hex but not in adjacent hexes
    expect(sonderborg.isInLandControlZone(Partnership.Axis)).toBe(false);
    germanInfantry.setHex(sonderborg);
    expect(sonderborg.isInLandControlZone(Partnership.Axis)).toBe(true);
    for(let hex of sonderborg.adjacentHexes()){
        expect(hex.isInLandControlZone(Partnership.Axis)).toBe(false);
    }
});

test("Unit placement allowance", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    Countries.japan.joinPartnership(Partnership.Axis);
    Countries.unitedKingdom.joinPartnership(Partnership.Allies);
    Countries.unitedStates.joinPartnership(Partnership.Allies);
    Countries.poland.joinPartnership(Partnership.Allies);
    Countries.sovietUnion.joinPartnership(Partnership.Allies);
    Countries.china.joinPartnership(Partnership.Allies);

    const polishShip = new Destroyer("Grom", 1, 2, 56, Countries.poland);
    const americanPlane = new AirUnit("P-40 Warhawk", Countries.unitedStates);
    const sovietPlane = new AirUnit("I-16", Countries.sovietUnion);
    const germanInfantry = new Infantry(1, 3, Countries.germany);
    const japaneseInfantry = new Infantry(1, 4, Countries.japan);
    const britishInfantry = new Infantry(1, 4, Countries.unitedKingdom);
    const polishInfantry = new Infantry(1, 3, Countries.poland);
    const sovietInfantry = new Infantry(1, 3, Countries.sovietUnion);
    const chineseInfantry = new Infantry(1, 3, Countries.china);

    //Normal places where they can be
    expect(hamburg.unitCanBePlacedHere(germanInfantry)).toBe(true);
    expect(danzig.unitCanBePlacedHere(polishInfantry)).toBe(true);
    expect(danzig.unitCanBePlacedHere(polishShip)).toBe(true);
    expect(newcastle.unitCanBePlacedHere(britishInfantry)).toBe(true);
    expect(alexandria.unitCanBePlacedHere(britishInfantry)).toBe(true);
    expect(chicago.unitCanBePlacedHere(americanPlane)).toBe(true);
    expect(pearlHarbor.unitCanBePlacedHere(americanPlane)).toBe(true);
    expect(leningrad.unitCanBePlacedHere(sovietInfantry)).toBe(true);

    //Normal places where they can't be
    expect(hamburg.unitCanBePlacedHere(japaneseInfantry)).toBe(false);
    expect(danzig.unitCanBePlacedHere(chineseInfantry)).toBe(false);
    expect(newcastle.unitCanBePlacedHere(polishInfantry)).toBe(false);
    expect(alexandria.unitCanBePlacedHere(sovietInfantry)).toBe(false);
    expect(chicago.unitCanBePlacedHere(britishInfantry)).toBe(false);
    expect(hamburg.unitCanBePlacedHere(polishInfantry)).toBe(false);
    expect(pearlHarbor.unitCanBePlacedHere(japaneseInfantry)).toBe(false);
    expect(leningrad.unitCanBePlacedHere(americanPlane)).toBe(false);
    expect(lubeck.unitCanBePlacedHere(americanPlane)).toBe(false);

    //Exceptions for Polish naval units
    expect(newcastle.unitCanBePlacedHere(polishShip)).toBe(true);

    //Exceptions for American air units
    expect(newcastle.unitCanBePlacedHere(americanPlane)).toBe(true);
    expect(alexandria.unitCanBePlacedHere(americanPlane)).toBe(true);

    //Exceptions due to the Soviet Union invading Poland
    expect(wilno.unitCanBePlacedHere(sovietInfantry)).toBe(true);
    expect(wilno.unitCanBePlacedHere(sovietPlane)).toBe(true);
    expect(riga.unitCanBePlacedHere(sovietInfantry)).toBe(true);
    expect(wilno.unitCanBePlacedHere(polishInfantry)).toBe(false);

    //The exception for Japanese land units in China doesn't apply here since it's 1937 by default
    //Unit tests for the 1939 scenario are more complicated and not really necessary since the start of the 1939 scenario can easily be manually tested
    expect(beijing.unitCanBePlacedHere(japaneseInfantry)).toBe(false);
    expect(beijing.unitCanBePlacedHere(chineseInfantry)).toBe(true);

    //The Soviet Union can only place units in eastern Poland the turn they enter the war (but Poland still can't place its units in Soviet occupied territory)
    date.current++;
    expect(wilno.unitCanBePlacedHere(sovietInfantry)).toBe(false);
    expect(wilno.unitCanBePlacedHere(sovietPlane)).toBe(false);
    expect(riga.unitCanBePlacedHere(sovietInfantry)).toBe(false);
    expect(wilno.unitCanBePlacedHere(polishInfantry)).toBe(false);
});

test("Fortification construction and destruction", () => {
    expect(paris.fortified()).toBe(false);
    expect(paris.fortUnderConstruction()).toBe(false);
    paris.startBuildingFortification();
    expect(paris.fortified()).toBe(false);
    expect(paris.fortUnderConstruction()).toBe(true);
    paris.continueBuilding();
    expect(paris.fortified()).toBe(false);
    expect(paris.fortUnderConstruction()).toBe(true);
    paris.continueBuilding();
    expect(paris.fortified()).toBe(true);
    expect(paris.fortUnderConstruction()).toBe(false);
    paris.destroyFortification();
    expect(paris.fortified()).toBe(false);
    expect(paris.fortUnderConstruction()).toBe(false);
});

test("Airbase construction and destruction", () => {
    expect(paris.hasAirfield()).toBe(false);
    expect(paris.airfieldUnderConstruction()).toBe(false);
    expect(paris.airbaseCapacity()).toBe(3);
    paris.startBuildingAirfield();
    expect(paris.hasAirfield()).toBe(false);
    expect(paris.airfieldUnderConstruction()).toBe(true);
    expect(paris.airbaseCapacity()).toBe(3);
    paris.continueBuilding();
    expect(paris.hasAirfield()).toBe(false);
    expect(paris.airfieldUnderConstruction()).toBe(true);
    expect(paris.airbaseCapacity()).toBe(3);
    paris.continueBuilding();
    expect(paris.hasAirfield()).toBe(true);
    expect(paris.airfieldUnderConstruction()).toBe(false);
    expect(paris.airbaseCapacity()).toBe(5);
    paris.destroyAirfield();
    expect(paris.hasAirfield()).toBe(false);
    expect(paris.airfieldUnderConstruction()).toBe(false);
    expect(paris.airbaseCapacity()).toBe(3);
});

test("Destroy and repair installations", () => {
    expect(copenhagen.airbaseCapacity()).toBe(3);
    expect(copenhagen.installationsDestroyed).toBe(false);
    expect(copenhagen.resourceHexDestroyed).toBe(false);
    copenhagen.startBuildingFortification();
    copenhagen.startBuildingAirfield();
    copenhagen.continueBuilding();
    copenhagen.continueBuilding();
    expect(copenhagen.fortified()).toBe(true);
    expect(copenhagen.hasAirfield()).toBe(true);
    expect(copenhagen.airbaseCapacity()).toBe(5);

    copenhagen.destroyInstallations();
    expect(copenhagen.airbaseCapacity()).toBe(0);
    expect(copenhagen.installationsDestroyed).toBe(true);
    expect(copenhagen.resourceHexDestroyed).toBe(false);
    expect(copenhagen.fortified()).toBe(false);
    expect(copenhagen.hasAirfield()).toBe(false);

    copenhagen.resourceHexDestroyed = true;
    copenhagen.repairInstallations();
    expect(copenhagen.airbaseCapacity()).toBe(3);
    expect(copenhagen.installationsDestroyed).toBe(false);
    expect(copenhagen.resourceHexDestroyed).toBe(false);
    expect(copenhagen.fortified()).toBe(false);
    expect(copenhagen.hasAirfield()).toBe(false);
});

test("Set controller", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    Countries.sweden.joinPartnership(Partnership.Allies);
    Countries.unitedStates.joinPartnership(Partnership.Allies);

    const swedishAirUnit = new AirUnit("J-22", Countries.sweden);
    const swedishNavalUnit = new Destroyer("Ehrensköld", 1, 1, 52, Countries.sweden);

    malmo.startBuildingFortification();
    malmo.continueBuilding();
    malmo.continueBuilding();
    expect(malmo.fortified()).toBe(true);
    swedishAirUnit.setHex(malmo);
    swedishAirUnit.based = true;
    swedishNavalUnit.setHex(malmo);
    swedishNavalUnit.inPort = true;

    malmo.setController(Countries.unitedStates, false);
    expect(malmo.controller().name()).toBe("Sweden");
    expect(malmo.fortified()).toBe(true);
    expect(swedishAirUnit.based).toBe(true);
    expect(swedishNavalUnit.inPort).toBe(true);

    malmo.setController(Countries.unitedStates, true);
    expect(malmo.controller().name()).toBe("United States");
    expect(malmo.fortified()).toBe(true);
    expect(swedishAirUnit.based).toBe(true);
    expect(swedishNavalUnit.inPort).toBe(true);

    malmo.setController(Countries.germany, false);
    expect(malmo.controller().name()).toBe("Germany");
    expect(malmo.fortified()).toBe(false);
    expect(swedishAirUnit.based).toBe(false);
    expect(swedishNavalUnit.inPort).toBe(false);
});

test("Path between hexes", () => {
    Countries.france.joinPartnership(Partnership.Allies);
    Countries.unitedStates.joinPartnership(Partnership.Allies);

    //The computer player's algorithm for moving air units assumes that if there are no obstacles the shortest path is returned
    //The +1 is because pathBetweenHexes returns an array containing both the origin and the destination
    expect(SupplyLines.simplifiedPathBetweenHexes(lille, it => it === ajaccio, () => true, true, true)?.length).toBe(lille.distanceFromHex(ajaccio) + 1);
    expect(SupplyLines.simplifiedPathBetweenHexes(chicago, it => it === pearlHarbor, () => true, true, true)?.length).toBe(chicago.distanceFromHex(pearlHarbor) + 1);
});

test("Control hexes behind front", () => {
    const palermo = Hex.allCityHexes.find(it => it.city === "Palermo");
    const trapani = Hex.fromCoordinates(154, 186);
    const marsala = Hex.fromCoordinates(154, 187);
    const agrigento = Hex.fromCoordinates(155, 187);
    const milazzo = Hex.fromCoordinates(156, 186);
    const catania = Hex.fromCoordinates(156, 187);
    const pachino = Hex.fromCoordinates(156, 188);
    const messina = Hex.fromCoordinates(157, 186);
    const santEufemia = Hex.fromCoordinates(158, 186);
    const catanzaro = Hex.fromCoordinates(158, 187);
    const crotone = Hex.fromCoordinates(159, 186);
    const taranto = Hex.allCityHexes.find(it => it.city === "Taranto");

    Countries.italy.joinPartnership(Partnership.Axis);
    Countries.unitedStates.joinPartnership(Partnership.Allies);

    //Sicily isn't behind a front yet since Palermo is a city hex
    messina.setController(Countries.unitedStates, false);
    expect(messina.controller().name()).toBe("United States");
    expect(palermo.controller().name()).toBe("Italy");
    expect(trapani.controller().name()).toBe("Italy");
    expect(marsala.controller().name()).toBe("Italy");
    expect(agrigento.controller().name()).toBe("Italy");
    expect(milazzo.controller().name()).toBe("Italy");
    expect(catania.controller().name()).toBe("Italy");
    expect(pachino.controller().name()).toBe("Italy");
    expect(santEufemia.controller().name()).toBe("Italy");
    expect(catanzaro.controller().name()).toBe("Italy");
    expect(crotone.controller().name()).toBe("Italy");
    expect(taranto.controller().name()).toBe("Italy");

    //Gaining control of the last city behind the front
    //When the United States gains control of Palermo, the rest of Sicily is behind a front
    palermo.setController(Countries.unitedStates, false);
    expect(messina.controller().name()).toBe("United States");
    expect(palermo.controller().name()).toBe("United States");
    expect(trapani.controller().name()).toBe("United States");
    expect(marsala.controller().name()).toBe("United States");
    expect(agrigento.controller().name()).toBe("United States");
    expect(milazzo.controller().name()).toBe("United States");
    expect(catania.controller().name()).toBe("United States");
    expect(pachino.controller().name()).toBe("United States");
    expect(santEufemia.controller().name()).toBe("Italy");
    expect(catanzaro.controller().name()).toBe("Italy");
    expect(crotone.controller().name()).toBe("Italy");
    expect(taranto.controller().name()).toBe("Italy");

    //This isn't enough to create a front across the southern part of the Italian mainland
    santEufemia.setController(Countries.unitedStates, false);
    expect(messina.controller().name()).toBe("United States");
    expect(palermo.controller().name()).toBe("United States");
    expect(trapani.controller().name()).toBe("United States");
    expect(marsala.controller().name()).toBe("United States");
    expect(agrigento.controller().name()).toBe("United States");
    expect(milazzo.controller().name()).toBe("United States");
    expect(catania.controller().name()).toBe("United States");
    expect(pachino.controller().name()).toBe("United States");
    expect(santEufemia.controller().name()).toBe("United States");
    expect(catanzaro.controller().name()).toBe("Italy");
    expect(crotone.controller().name()).toBe("Italy");
    expect(taranto.controller().name()).toBe("Italy");

    //Gaining control of hexes between a city and the front
    crotone.setController(Countries.unitedStates, false);
    expect(messina.controller().name()).toBe("United States");
    expect(palermo.controller().name()).toBe("United States");
    expect(trapani.controller().name()).toBe("United States");
    expect(marsala.controller().name()).toBe("United States");
    expect(agrigento.controller().name()).toBe("United States");
    expect(milazzo.controller().name()).toBe("United States");
    expect(catania.controller().name()).toBe("United States");
    expect(pachino.controller().name()).toBe("United States");
    expect(santEufemia.controller().name()).toBe("United States");
    expect(crotone.controller().name()).toBe("United States");
    expect(catanzaro.controller().name()).toBe("United States");
    expect(taranto.controller().name()).toBe("Italy");
});
