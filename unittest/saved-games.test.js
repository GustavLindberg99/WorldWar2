import { expect, test } from "vitest";

import { joinIterables } from "../build/utils.js";

import { Hex, WeatherZone } from "../build/model/mapsheet.js";
import { Partnership } from "../build/model/partnership.js";
import { Countries } from "../build/model/countries.js";
import { Armor, Infantry, TransportShip } from "../build/model/units.js";
import { date, Month } from "../build/model/date.js";
import { Phase } from "../build/model/phase.js";
import { SavedGames } from "../build/model/saved-games.js";

test("Save game", () => {
    Countries.japan.joinPartnership(Partnership.Axis);
    Countries.china.joinPartnership(Partnership.Allies);

    const beijing = Hex.allCityHexes.find(it => it.city === "Beijing");
    const tianjin = Hex.allCityHexes.find(it => it.city === "Tianjin");
    const tokyo = Hex.allCityHexes.find(it => it.city === "Tokyo");

    date.current = date(1937, Month.October);
    Phase.current = Phase.AxisCombat;
    Hex.groundedAirUnits = new Set([WeatherZone.NorthTemperate, WeatherZone.Industrialized]);
    Countries.japan.money = 5000;
    Countries.china.money = 100;

    const japaneseInfantry = new Infantry(5, 4, Countries.japan);
    const chineseInfantry = new Infantry(3, 3, Countries.china);

    const japaneseTransportShip = new TransportShip(Countries.japan);
    const japaneseEmbarkedInfantry = new Infantry(5, 4, Countries.japan);

    japaneseInfantry.setHex(beijing);
    beijing.setController(Countries.japan);
    chineseInfantry.setHex(tianjin);
    chineseInfantry.hasAttacked = true;

    japaneseTransportShip.setHex(tokyo);
    japaneseTransportShip.inPort = true;
    japaneseEmbarkedInfantry.embarkOnto(japaneseTransportShip);
    expect(Countries.japan.units()).toContain(japaneseEmbarkedInfantry);

    tianjin.resourceHexDestroyed = true;
    beijing.startBuildingFortification();

    const savedGame = JSON.parse(JSON.stringify(SavedGames.gameToJson(Partnership.Allies)));

    expect(SavedGames.validateJson(savedGame)).toBe(true);

    expect(savedGame.date).toBe(date.current);
    expect(savedGame.phase).toBe(Phase.current);
    expect(savedGame.groundedAirUnits.length).toBe(2);
    expect(savedGame.groundedAirUnits).toContain("NorthTemperate");
    expect(savedGame.groundedAirUnits).toContain("Industrialized");
    expect(savedGame.humanPartnership).toBe("Allies");
    expect(savedGame.hexes.length).toBe(2);    //Only save hexes that don't have their default values

    const beijingJson = savedGame.hexes.find(it => it.x === beijing.x && it.y === beijing.y);
    const tianjinJson = savedGame.hexes.find(it => it.x === tianjin.x && it.y === tianjin.y);
    expect(beijingJson?.controller).toBe("Japan");
    expect(beijingJson?.fortConstruction).toBe(1);
    expect(tianjinJson?.resourceHexDestroyed).toBe(true);

    const japanJson = savedGame.countries.find(it => it.name === "Japan");
    const chinaJson = savedGame.countries.find(it => it.name === "China");
    expect(japanJson?.money).toBe(5000);
    expect(japanJson?.partnership).toBe("Axis");
    expect(japanJson?.preferredPartnership).toBe("Axis");
    expect(japanJson?.units?.length).toBe(2);
    expect(chinaJson?.money).toBe(100);
    expect(chinaJson?.partnership).toBe("Allies");
    expect(chinaJson?.preferredPartnership).toBe("Allies");
    expect(chinaJson?.units?.length).toBe(1);

    const [japaneseInfantryJson, japaneseTransportShipJson] = japanJson.units;
    const [chineseInfantryJson] = chinaJson.units;
    expect(japaneseInfantryJson.type).toBe("Infantry");
    expect(japaneseInfantryJson.owner).toBe("Japan");
    expect(japaneseInfantryJson.movementAllowance).toBe(4);
    expect(japaneseInfantryJson.strength).toBe(5);
    expect(japaneseInfantryJson.hex?.x).toBe(beijing.x);
    expect(japaneseInfantryJson.hex?.y).toBe(beijing.y);
    expect(japaneseTransportShipJson.type).toBe("TransportShip");
    expect(japaneseTransportShipJson.owner).toBe("Japan");
    expect(japaneseTransportShipJson.movementAllowance).toBe(50);
    expect(japaneseTransportShipJson.hex?.x).toBe(tokyo.x);
    expect(japaneseTransportShipJson.hex?.y).toBe(tokyo.y);
    expect(japaneseTransportShipJson.inPort).toBe(true);
    expect(japaneseTransportShipJson.remainingSupply).toBe(3);
    expect(japaneseTransportShipJson.damaged).toBe(false);
    expect(japaneseTransportShipJson.embarkedUnits?.length).toBe(1);
    const [japaneseEmbarkedInfantryJson] = japaneseTransportShipJson.embarkedUnits;
    expect(japaneseEmbarkedInfantryJson.type).toBe("Infantry");
    expect(japaneseEmbarkedInfantryJson.owner).toBe("Japan");
    expect(japaneseEmbarkedInfantryJson.movementAllowance).toBe(4);
    expect(japaneseEmbarkedInfantryJson.strength).toBe(5);
    expect(chineseInfantryJson.type).toBe("Infantry");
    expect(chineseInfantryJson.owner).toBe("China");
    expect(chineseInfantryJson.movementAllowance).toBe(3);
    expect(chineseInfantryJson.strength).toBe(3);
    expect(chineseInfantryJson.hex?.x).toBe(tianjin.x);
    expect(chineseInfantryJson.hex?.y).toBe(tianjin.y);
    expect(chineseInfantryJson.hasAttacked).toBe(true);
});

test("Load saved game", () => {
    const mulhouse = Hex.fromCoordinates(156, 174);
    const colmar = Hex.fromCoordinates(157, 173);
    const strasbourg = Hex.allCityHexes.find(it => it.city === "Strasbourg");
    const metz = Hex.fromCoordinates(157, 172);
    const thionville = Hex.fromCoordinates(156, 172);
    const charlevilleMezieres = Hex.fromCoordinates(156, 171);
    const leHavre = Hex.allCityHexes.find(it => it.city === "Le Havre");
    const narvik = Hex.allCityHexes.find(it => it.city === "Narvik");
    const malta = Hex.allCityHexes.find(it => it.city === "Malta");

    const frenchInfantryJson = {
        type: "Infantry",
        owner: "France",
        hasAttacked: false,
        movementAllowance: 3,
        strength: 6
    };
    const germanArmorJson = {
        type: "Armor",
        owner: "Germany",
        hasAttacked: true,
        hasDoneSuccessfulOverrun: true,
        movementAllowance: 5,
        strength: 10
    };
    const polishInfantryJson = {
        type: "Infantry",
        owner: "Poland",
        movementAllowance: 3,
        strength: 1
    };
    const britishInfantryJson = {
        type: "Infantry",
        owner: "United Kingdom",
        movementAllowance: 4,
        strength: 6
    };
    const britishTransportShipJson = {
        type: "TransportShip",
        owner: "United Kingdom",
        name: "",
        defense: 2,
        movementAllowance: 50,
        remainingSupply: 3,
        embarkedUnits: [britishInfantryJson]
    };

    const savedGame = {
        date: date(1940, Month.May),
        phase: Phase.AlliedFirstMovement,
        humanPartnership: Partnership.Axis,
        groundedAirUnits: ["Polar"],
        hexes: [
            {x: mulhouse.x, y: mulhouse.y, fortConstruction: 3},
            {x: colmar.x, y: colmar.y, controller: "Germany"},
            {x: strasbourg.x, y: strasbourg.y, controller: "Germany", installationsDestroyed: true},
            {x: metz.x, y: metz.y, fortConstruction: 3},
            {x: thionville.x, y: thionville.y, fortConstruction: 2},
            {x: charlevilleMezieres.x, y: charlevilleMezieres.y, fortConstruction: 1}
        ],
        countries: [
            {
                name: "France",
                money: 200,
                partnership: "Allies",
                preferredPartnership: "Allies",
                delayedUnits: [[date(1940, Month.June), [{...frenchInfantryJson, strength: 1}]]],
                availableUnits: [{...frenchInfantryJson, strength: 1}, {...frenchInfantryJson, strength: 1}],
                units: [
                    {...frenchInfantryJson, hex: {x: mulhouse.x, y: mulhouse.y}},
                    {...frenchInfantryJson, hex: {x: metz.x, y: metz.y}},
                    {...frenchInfantryJson, hex: {x: metz.x, y: metz.y}}
                ],
                enteredWar: date(1939, Month.September)
            },
            {
                name: "Germany",
                money: 3000,
                partnership: "Axis",
                preferredPartnership: "Axis",
                delayedUnits: [[date(1940, Month.June), [{...germanArmorJson, strength: 1}, {...germanArmorJson, strength: 1}, {...germanArmorJson, strength: 1}]]],
                availableUnits: [{...germanArmorJson, strength: 1}, {...germanArmorJson, strength: 1}],
                units: [
                    {...germanArmorJson, hex: {x: strasbourg.x, y: strasbourg.y}},
                    {...germanArmorJson, hex: {x: strasbourg.x, y: strasbourg.y}},
                    {...germanArmorJson, hex: {x: colmar.x, y: colmar.y}}
                ],
                enteredWar: date(1939, Month.September)
            },
            {
                name: "Poland",
                money: 0,
                partnership: "Allies",
                preferredPartnership: "Allies",
                liberatedForces: [polishInfantryJson, polishInfantryJson, polishInfantryJson, polishInfantryJson, polishInfantryJson],
                enteredWar: date(1939, Month.September),
                conquered: true,
                hasBeenConquered: true
            },
            {
                name: "United Kingdom",
                money: 500,
                partnership: "Allies",
                preferredPartnership: "Allies",
                availableUnits: [{...britishInfantryJson, strength: 1}],
                units: [
                    {...britishTransportShipJson, hex: {x: leHavre.x, y: leHavre.y}, inPort: true}
                ],
                gotMoneyFromConvoys: true,
                enteredWar: date(1939, Month.September)
            }
        ]
    };

    expect(SavedGames.validateJson(savedGame)).toBe(true);
    SavedGames.loadGameFromJson(savedGame);

    expect(date.current).toBe(date(1940, Month.May));
    expect(Phase.current).toBe(Phase.AlliedFirstMovement);
    expect(narvik.airUnitsGrounded()).toBe(true);
    expect(strasbourg.airUnitsGrounded()).toBe(false);
    expect(malta.airUnitsGrounded()).toBe(false);
    expect(mulhouse.fortified()).toBe(true);
    expect(colmar.controller().name()).toBe("Germany");
    expect(strasbourg.controller().name()).toBe("Germany");
    expect(strasbourg.installationsDestroyed).toBe(true);
    expect(metz.fortified()).toBe(true);
    expect(thionville.fortUnderConstruction()).toBe(true);
    expect(charlevilleMezieres.fortUnderConstruction()).toBe(true);
    expect(malta.fortified()).toBe(false);

    expect(Countries.france.money).toBe(200);
    expect(Countries.france.partnership()).toBe(Partnership.Allies);
    expect(Countries.france.delayedUnits.get(date(1940, Month.June)).size).toBe(1);
    expect(Countries.france.availableUnits.size).toBe(2);
    expect(Countries.france.availableUnits.values().some(it => it.isAlive())).toBe(false);
    expect(Countries.france.enteredWar).toBe(date(1939, Month.September));

    expect(Countries.germany.money).toBe(3000);
    expect(Countries.germany.partnership()).toBe(Partnership.Axis);
    expect(Countries.germany.delayedUnits.get(date(1940, Month.June)).size).toBe(3);
    expect(Countries.germany.availableUnits.size).toBe(2);
    expect(Countries.germany.availableUnits.values().some(it => it.isAlive())).toBe(false);
    expect(Countries.germany.enteredWar).toBe(date(1939, Month.September));

    expect(Countries.poland.money).toBe(0);
    expect(Countries.poland.partnership()).toBe(Partnership.Allies);
    expect(Countries.poland.delayedUnits.size).toBe(0);
    expect(Countries.poland.availableUnits.size).toBe(0);
    expect(Countries.poland.enteredWar).toBe(date(1939, Month.September));
    expect(Countries.poland.conquered()).toBe(true);
    expect(Countries.poland.hasBeenConquered()).toBe(true);

    expect(Countries.unitedKingdom.money).toBe(500);
    expect(Countries.unitedKingdom.partnership()).toBe(Partnership.Allies);
    expect(Countries.unitedKingdom.delayedUnits.size).toBe(0);
    expect(Countries.unitedKingdom.availableUnits.size).toBe(1);
    expect(Countries.unitedKingdom.availableUnits.values().some(it => it.isAlive())).toBe(false);
    expect(Countries.unitedKingdom.gotMoneyFromConvoys).toBe(true);
    expect(Countries.unitedKingdom.enteredWar).toBe(date(1939, Month.September));

    expect([...Countries.france.units()].length).toBe(3);
    expect([...mulhouse.units()].length).toBe(1);
    expect([...metz.units()].length).toBe(2);
    for(let frenchUnit of joinIterables(mulhouse.units(), metz.units())){
        expect(frenchUnit).toBeInstanceOf(Infantry);
        expect(frenchUnit.isAlive()).toBe(true);
        expect(frenchUnit.owner.name()).toBe("France");
        expect(frenchUnit.hasAttacked).toBe(false);
        expect(frenchUnit.movementAllowance).toBe(3);
        expect(frenchUnit.strength).toBe(6);
    }

    expect([...Countries.germany.units()].length).toBe(3);
    expect([...colmar.units()].length).toBe(1);
    expect([...strasbourg.units()].length).toBe(2);
    for(let germanUnit of joinIterables(colmar.units(), strasbourg.units())){
        expect(germanUnit).toBeInstanceOf(Armor);
        expect(germanUnit.isAlive()).toBe(true);
        expect(germanUnit.owner.name()).toBe("Germany");
        expect(germanUnit.hasAttacked).toBe(true);
        expect(germanUnit.hasDoneSuccessfulOverrun).toBe(true);
        expect(germanUnit.movementAllowance).toBe(5);
        expect(germanUnit.strength).toBe(10);
    }

    expect([...Countries.unitedKingdom.units()].length).toBe(2);
    expect([...leHavre.units()].length).toBe(1);
    const britishUnit = [...leHavre.units()][0];
    expect(britishUnit).toBeInstanceOf(TransportShip);
    expect(britishUnit.isAlive()).toBe(true);
    expect(britishUnit.inPort).toBe(true);
    expect(britishUnit.owner.name()).toBe("United Kingdom");
    expect(britishUnit.defense).toBe(2);
    expect(britishUnit.movementAllowance).toBe(50);
    expect(britishUnit.embarkedUnits().size).toBe(1);
    const [britishEmbarkedUnit] = britishUnit.embarkedUnits();
    expect(britishEmbarkedUnit).toBeInstanceOf(Infantry);
    expect(britishEmbarkedUnit.isAlive()).toBe(true);
    expect(britishEmbarkedUnit.embarkedOn()).toBe(britishUnit);
    expect(britishEmbarkedUnit.owner.name()).toBe("United Kingdom");
    expect(britishEmbarkedUnit.movementAllowance).toBe(4);
    expect(britishEmbarkedUnit.strength).toBe(6);
});
