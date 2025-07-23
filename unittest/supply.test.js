import { expect, test } from "vitest";

import { Hex } from "../build/model/mapsheet.js";
import { Partnership } from "../build/model/partnership.js";
import { Countries } from "../build/model/countries.js";
import { AirUnit, Armor, Carrier, Infantry, Paratrooper, SupplyUnit, TransportShip } from "../build/model/units.js";

test("Infantry supply", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    Countries.france.joinPartnership(Partnership.Allies);

    const leHavre = Hex.allCityHexes.find(it => it.city === "Le Havre");
    const cherbourg = Hex.fromCoordinates(152, 168);
    const brest = Hex.allCityHexes.find(it => it.city === "Brest");
    const quimper = Hex.fromCoordinates(149, 167);

    const frenchInfantry = new Infantry(5, 3, Countries.france);
    const germanInfantry = new Infantry(5, 3, Countries.germany);

    //It's not initially out of supply because all of France is friendly and contains lots of supply sources
    frenchInfantry.setHex(cherbourg);
    expect(frenchInfantry.outOfSupply()).toBe(false);

    //If Germany gains control of Le Havre without placing a unit there, the French unit can still trace supply lines around it to other supply sources
    leHavre.setController(Countries.germany);
    expect(frenchInfantry.outOfSupply()).toBe(false);

    //If Germany places a unit in Le Havre, the French unit is out of supply because the German control zone blocks the supply lines
    germanInfantry.setHex(leHavre);
    expect(frenchInfantry.outOfSupply()).toBe(true);

    //The German infantry is also out of supply because it's surrounded by hexes controlled by France
    expect(germanInfantry.outOfSupply()).toBe(true);

    //A unit in a friendly city resource hex is never out of supply
    frenchInfantry.setHex(brest);
    quimper.setController(Countries.germany);
    germanInfantry.setHex(quimper);
    expect(frenchInfantry.outOfSupply()).toBe(false);
    expect(germanInfantry.outOfSupply()).toBe(true);

    //Units that are in supply shouldn't get any supply losses
    frenchInfantry.updateSupply();
    expect(frenchInfantry.isAlive()).toBe(true);
    expect(frenchInfantry.strength).toBe(5);

    //Supply losses
    germanInfantry.updateSupply();
    expect(germanInfantry.isAlive()).toBe(true);
    expect(germanInfantry.strength).toBe(2);
    germanInfantry.updateSupply();
    expect(germanInfantry.isAlive()).toBe(true);
    expect(germanInfantry.strength).toBe(1);
    germanInfantry.updateSupply();
    expect(germanInfantry.isAlive()).toBe(false);
});

test("Infantry supply with supply units", () => {
    Countries.italy.joinPartnership(Partnership.Axis);
    Countries.france.joinPartnership(Partnership.Allies);

    const turin = Hex.allCityHexes.find(it => it.city === "Turin");
    const nice = Hex.fromCoordinates(153, 177);
    const ventimiglia = Hex.fromCoordinates(154, 178);

    const italianInfantry = new Infantry(5, 3, Countries.italy);
    const italianSupplyUnit = new SupplyUnit(3, Countries.italy);
    const frenchInfantry = new Infantry(5, 3, Countries.france);

    italianInfantry.setHex(nice);
    italianSupplyUnit.setHex(nice);
    nice.setController(Countries.italy);
    frenchInfantry.setHex(turin);
    turin.setController(Countries.france);
    ventimiglia.setController(Countries.france);

    //Land units can trace supply lines to supply units, but supply units themselves can't
    expect(italianInfantry.outOfSupply()).toBe(false);
    expect(italianSupplyUnit.outOfSupply()).toBe(false);
    italianSupplyUnit.updateSupply();
    expect(italianSupplyUnit.outOfSupply()).toBe(true);

    //Supply losses
    italianInfantry.updateSupply();
    italianSupplyUnit.updateSupply();
    expect(italianSupplyUnit.isAlive()).toBe(false);
    expect(italianInfantry.isAlive()).toBe(true);
    expect(italianInfantry.strength).toBe(5);
    expect(italianInfantry.outOfSupply()).toBe(true);

    //More supply losses without the supply unit
    italianInfantry.updateSupply();
    expect(italianInfantry.isAlive()).toBe(true);
    expect(italianInfantry.strength).toBe(2);
    italianInfantry.updateSupply();
    expect(italianInfantry.isAlive()).toBe(true);
    expect(italianInfantry.strength).toBe(1);
    italianInfantry.updateSupply();
    expect(italianInfantry.isAlive()).toBe(false);
});

test("Armor supply", () => {
    Countries.italy.joinPartnership(Partnership.Axis);
    Countries.unitedStates.joinPartnership(Partnership.Allies);

    const palermo = Hex.allCityHexes.find(it => it.city === "Palermo");
    const messina = Hex.fromCoordinates(157, 186);

    const italianArmor = new Armor(5, 5, Countries.italy);
    const italianInfantry = new Infantry(5, 3, Countries.italy);
    const americanInfantry = new Infantry(5, 3, Countries.unitedStates);

    italianArmor.setHex(palermo);
    italianInfantry.setHex(palermo);
    expect(italianArmor.outOfSupply()).toBe(false);
    expect(italianInfantry.outOfSupply()).toBe(false);

    //Armor should stay out of supply for the rest of the turn, but not infantry
    americanInfantry.setHex(messina);
    messina.setController(Countries.unitedStates);
    expect(italianArmor.outOfSupply()).toBe(false);
    expect(italianInfantry.outOfSupply()).toBe(true);

    //Supply losses
    italianArmor.updateSupply();
    italianInfantry.updateSupply();
    expect(italianArmor.isAlive());
    expect(italianArmor.outOfSupply()).toBe(true);
    expect(italianArmor.strength).toBe(5);
    expect(italianInfantry.isAlive());
    expect(italianInfantry.outOfSupply()).toBe(true);
    expect(italianInfantry.strength).toBe(2);

    //Regaining supply
    americanInfantry.die();
    messina.setController(Countries.italy);
    expect(italianArmor.outOfSupply()).toBe(false);
    expect(italianInfantry.outOfSupply()).toBe(false);
});

test("Embarked land units supply", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    Countries.denmark.joinPartnership(Partnership.Allies);

    const stettin = Hex.allCityHexes.find(it => it.city === "Stettin");
    const reykjavik = Hex.allCityHexes.find(it => it.city === "Reykjavik");
    const copenhagen = Hex.allCityHexes.find(it => it.city === "Copenhagen");
    reykjavik.setController(Countries.germany);

    //Air transport
    const germanAirUnit1 = new AirUnit("JU-52", Countries.germany);
    const germanParatrooper = new Paratrooper(1, 3, Countries.germany);
    const germanAirUnit2 = new AirUnit("JU-52", Countries.germany);
    const germanSupplyUnit = new SupplyUnit(3, Countries.germany);
    germanParatrooper.embarkOnto(germanAirUnit1);
    germanAirUnit1.setHex(stettin);
    germanAirUnit1.based = true;
    germanSupplyUnit.embarkOnto(germanAirUnit2);
    germanAirUnit2.setHex(stettin);
    germanAirUnit2.based = true;

    expect(germanAirUnit1.outOfSupply()).toBe(false);
    expect(germanParatrooper.outOfSupply()).toBe(false);
    expect(germanAirUnit2.outOfSupply()).toBe(false);
    expect(germanSupplyUnit.outOfSupply()).toBe(false);

    germanAirUnit1.setHex(reykjavik);
    germanAirUnit2.setHex(reykjavik);

    expect(germanAirUnit1.outOfSupply()).toBe(false);
    expect(germanParatrooper.outOfSupply()).toBe(false);
    expect(germanAirUnit2.outOfSupply()).toBe(false);
    expect(germanSupplyUnit.outOfSupply()).toBe(false);

    germanAirUnit1.updateSupply();
    germanAirUnit2.updateSupply();

    expect(germanAirUnit1.outOfSupply()).toBe(true);
    expect(germanParatrooper.isAlive()).toBe(false);
    expect(germanAirUnit2.outOfSupply()).toBe(true);
    expect(germanSupplyUnit.outOfSupply()).toBe(true);
    expect(germanSupplyUnit.isAlive()).toBe(true);

    //Naval transport
    const germanTransportShip = new TransportShip(Countries.germany);
    const germanInfantry = new Infantry(2, 3, Countries.germany);
    germanInfantry.embarkOnto(germanTransportShip);
    germanTransportShip.setHex(stettin);
    germanTransportShip.inPort = true;

    expect(germanTransportShip.outOfSupply()).toBe(false);
    expect(germanInfantry.outOfSupply()).toBe(false);

    germanTransportShip.setHex(copenhagen);

    expect(germanTransportShip.outOfSupply()).toBe(false);
    expect(germanInfantry.outOfSupply()).toBe(false);

    germanTransportShip.updateSupply();

    expect(germanTransportShip.outOfSupply()).toBe(false);
    expect(germanInfantry.outOfSupply()).toBe(false);

    germanTransportShip.updateSupply();

    expect(germanTransportShip.outOfSupply()).toBe(false);
    expect(germanInfantry.outOfSupply()).toBe(false);

    germanTransportShip.updateSupply();

    expect(germanTransportShip.outOfSupply()).toBe(true);
    expect(germanInfantry.outOfSupply()).toBe(true);

    germanTransportShip.updateSupply();

    expect(germanTransportShip.outOfSupply()).toBe(true);
    expect(germanInfantry.isAlive()).toBe(false);
});

test("Air unit supply", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    Countries.denmark.joinPartnership(Partnership.Allies);

    const copenhagen = Hex.allCityHexes.find(it => it.city === "Copenhagen");
    const stettin = Hex.allCityHexes.find(it => it.city === "Stettin");

    const germanAirUnit = new AirUnit("ME-110C", Countries.germany);

    germanAirUnit.setHex(stettin);
    germanAirUnit.based = true;
    expect(germanAirUnit.outOfSupply()).toBe(false);
    germanAirUnit.updateSupply();
    expect(germanAirUnit.outOfSupply()).toBe(false);
    germanAirUnit.setHex(copenhagen);
    germanAirUnit.based = true;
    expect(germanAirUnit.outOfSupply()).toBe(false);
    germanAirUnit.updateSupply();
    expect(germanAirUnit.outOfSupply()).toBe(true);
    germanAirUnit.setHex(stettin);
    expect(germanAirUnit.outOfSupply()).toBe(true);
    germanAirUnit.based = true;
    expect(germanAirUnit.outOfSupply()).toBe(false);
});

test("Naval unit and carrier supply", () => {
    Countries.unitedStates.joinPartnership(Partnership.Allies);
    Countries.japan.joinPartnership(Partnership.Axis);

    const pearlHarbor = Hex.allCityHexes.find(it => it.city === "Pearl Harbor");
    const anchorage = Hex.allCityHexes.find(it => it.city === "Anchorage");
    const ocean = Hex.fromCoordinates(213, 90);

    //Make sure Anchorage is out of supply
    for(let hex of anchorage.adjacentLandHexes()){
        hex.setController(Countries.japan);
    }

    const americanAirUnit = new AirUnit("F4F Wildcat", Countries.unitedStates);
    const americanCarrier = new Carrier("Lexington", 3, 47, Countries.unitedStates, americanAirUnit);

    //If it's in a supplied port, it's in supply
    americanCarrier.setHex(pearlHarbor);
    americanCarrier.inPort = true;
    expect(americanCarrier.outOfSupply()).toBe(false);
    expect(americanAirUnit.outOfSupply()).toBe(false);

    //If it's at sea, it can remain in supply for 3 months, going back into a port resets the counter
    americanCarrier.setHex(ocean);
    expect(americanCarrier.outOfSupply()).toBe(false);
    expect(americanAirUnit.outOfSupply()).toBe(false);
    americanCarrier.updateSupply();
    americanAirUnit.updateSupply();
    expect(americanCarrier.outOfSupply()).toBe(false);
    expect(americanAirUnit.outOfSupply()).toBe(false);
    americanCarrier.setHex(pearlHarbor);
    americanCarrier.inPort = true;
    expect(americanCarrier.outOfSupply()).toBe(false);
    expect(americanAirUnit.outOfSupply()).toBe(false);
    americanCarrier.setHex(ocean);
    expect(americanCarrier.outOfSupply()).toBe(false);
    expect(americanAirUnit.outOfSupply()).toBe(false);
    americanCarrier.updateSupply();
    americanAirUnit.updateSupply();
    expect(americanCarrier.outOfSupply()).toBe(false);
    expect(americanAirUnit.outOfSupply()).toBe(false);
    americanCarrier.updateSupply();
    americanAirUnit.updateSupply();
    expect(americanCarrier.outOfSupply()).toBe(true);
    expect(americanAirUnit.outOfSupply()).toBe(true);
    americanCarrier.updateSupply();
    americanAirUnit.updateSupply();
    expect(americanCarrier.outOfSupply()).toBe(true);
    expect(americanAirUnit.outOfSupply()).toBe(true);

    //Going into a port that's out of supply doesn't help
    americanCarrier.setHex(anchorage);
    americanCarrier.inPort = true;
    expect(americanCarrier.outOfSupply()).toBe(true);
    expect(americanAirUnit.outOfSupply()).toBe(true);

    //Going into a port that's in supply does help, but only if it actually enters the port
    americanCarrier.setHex(pearlHarbor);
    expect(americanCarrier.outOfSupply()).toBe(true);
    expect(americanAirUnit.outOfSupply()).toBe(true);
    americanCarrier.inPort = true;
    expect(americanCarrier.outOfSupply()).toBe(false);
    expect(americanAirUnit.outOfSupply()).toBe(false);

    //Entering a port that's out of supply is fine for 3 months
    americanCarrier.setHex(anchorage);
    americanCarrier.inPort = true;
    expect(americanCarrier.outOfSupply()).toBe(false);
    expect(americanAirUnit.outOfSupply()).toBe(false);

    //Naval air units and supply from land bases vs carriers
    americanAirUnit.setHex(anchorage);
    americanAirUnit.based = true;
    expect(americanAirUnit.outOfSupply()).toBe(false);
    americanCarrier.updateSupply();
    americanAirUnit.updateSupply();
    expect(americanCarrier.outOfSupply()).toBe(false);
    expect(americanAirUnit.outOfSupply()).toBe(true);
    americanAirUnit.embarkOnto(americanCarrier);
    expect(americanAirUnit.outOfSupply()).toBe(false);

    //Staying in an out of supply port too long should make the naval unit out of supply
    americanCarrier.updateSupply();
    americanAirUnit.updateSupply();
    expect(americanCarrier.outOfSupply()).toBe(false);
    expect(americanAirUnit.outOfSupply()).toBe(false);
    americanCarrier.updateSupply();
    americanAirUnit.updateSupply();
    expect(americanCarrier.outOfSupply()).toBe(true);
    expect(americanAirUnit.outOfSupply()).toBe(true);

    //For naval air units, out of supply carriers should count as out of supply bases
    americanCarrier.setHex(pearlHarbor);
    americanAirUnit.setHex(pearlHarbor);
    americanAirUnit.based = true;
    expect(americanCarrier.outOfSupply()).toBe(true);
    expect(americanAirUnit.outOfSupply()).toBe(false);
    americanAirUnit.embarkOnto(americanCarrier);
    expect(americanCarrier.outOfSupply()).toBe(true);
    expect(americanAirUnit.outOfSupply()).toBe(false);
    americanCarrier.updateSupply();
    americanAirUnit.updateSupply();
    expect(americanCarrier.outOfSupply()).toBe(true);
    expect(americanAirUnit.outOfSupply()).toBe(true);
    americanCarrier.inPort = true;
    expect(americanCarrier.outOfSupply()).toBe(false);
    expect(americanAirUnit.outOfSupply()).toBe(false);
});

test("Chinese supply", () => {
    Countries.china.joinPartnership(Partnership.Allies);
    Countries.japan.joinPartnership(Partnership.Axis);

    const dairen = Hex.allCityHexes.find(it => it.city === "Dairen");
    const rizhao = Hex.fromCoordinates(255, 153);    //Hex just south of Qingdao, blocks supply to Quingdao if occupied by a Japanese land unit
    const qingdao = Hex.allCityHexes.find(it => it.city === "Qingdao");

    const chineseInfantry = new Infantry(3, 3, Countries.china);
    const chineseAirUnit = new AirUnit("I-16", Countries.china);
    const japaneseInfantry = new Infantry(5, 4, Countries.japan);

    //Chinese units outside of China should be out of supply as usual
    chineseInfantry.setHex(dairen);
    dairen.setController(Countries.china);
    chineseAirUnit.setHex(dairen);
    chineseAirUnit.based = true;
    expect(chineseInfantry.outOfSupply()).toBe(true);
    expect(chineseAirUnit.outOfSupply()).toBe(false);
    chineseAirUnit.updateSupply();
    expect(chineseAirUnit.outOfSupply()).toBe(true);

    //Chinese units in China should never be out of supply
    chineseInfantry.setHex(qingdao);
    chineseAirUnit.setHex(qingdao);
    chineseAirUnit.based = true;
    expect(chineseInfantry.outOfSupply()).toBe(false);
    expect(chineseAirUnit.outOfSupply()).toBe(false);
    japaneseInfantry.setHex(rizhao);
    rizhao.setController(Countries.japan);
    expect(chineseInfantry.outOfSupply()).toBe(false);
    expect(chineseAirUnit.outOfSupply()).toBe(false);
    chineseInfantry.updateSupply();
    chineseAirUnit.updateSupply();
    expect(chineseInfantry.outOfSupply()).toBe(false);
    expect(chineseAirUnit.outOfSupply()).toBe(false);
});

test("Supply in fortifications", () => {
    Countries.unitedKingdom.joinPartnership(Partnership.Allies);

    const malta = Hex.allCityHexes.find(it => it.city === "Malta");

    const britishInfantry = new Infantry(6, 3, Countries.unitedKingdom);
    britishInfantry.setHex(malta);

    expect(britishInfantry.outOfSupply()).toBe(true);

    malta.startBuildingFortification();
    malta.continueBuilding();
    malta.continueBuilding();

    expect(britishInfantry.outOfSupply()).toBe(false);
});
