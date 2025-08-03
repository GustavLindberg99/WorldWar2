import { expect, test } from "vitest";

import { Hex, WeatherZone } from "../build/model/mapsheet.js";
import { Partnership } from "../build/model/partnership.js";
import { Countries } from "../build/model/countries.js";
import { AirUnit, Armor, Battlecruiser, Battleship, Carrier, Destroyer, DestroyerEscort, HeavyCruiser, Infantry, LandUnit, LightCruiser, Marine, Paratrooper, Submarine, SupplyUnit, TransportShip } from "../build/model/units.js";
import { currentYear, date } from "../build/model/date.js";
import { Phase } from "../build/model/phase.js";

const hamburg = Hex.allCityHexes.find(it => it.city === "Hamburg");
const berlin = Hex.allCityHexes.find(it => it.city === "Berlin");
const bremen = Hex.fromCoordinates(161, 169);
const bremerhaven = Hex.allCityHexes.find(it => it.city === "Bremerhaven");
const lubeck = Hex.allCityHexes.find(it => it.city === "Lübeck");
const newYork = Hex.allCityHexes.find(it => it.city === "New York");
const boston = Hex.allCityHexes.find(it => it.city === "Boston");
const capeCod = Hex.fromCoordinates(133, 114);
const sea = Hex.fromCoordinates(159, 166);

test("Set hex while iterating over units", () => {
    Countries.germany.joinPartnership(Partnership.Axis);

    for(let city of Countries.germany.cities){
        const germanInfantry = new Infantry(1, 3, Countries.germany);
        const germanAirUnit = new AirUnit("ME-110C", Countries.germany);
        germanInfantry.setHex(city);
        germanAirUnit.setHex(city);
        germanInfantry.based = true;
    }

    let processedUnits = new Set();
    for(let unit of Countries.germany.units()){
        expect(processedUnits).not.toContain(unit);
        const possibleHexes = Countries.germany.cities.filter(it => unit.canEnterHexWithinStackingLimits(it));
        const newHex = possibleHexes.findLast(it => unit.canEnterHexWithinStackingLimits(it));
        unit.setHex(newHex);
        processedUnits.add(unit);
    }
});

test("Get and set hex", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    const germanInfantry = new Infantry(1, 3, Countries.germany);

    expect(germanInfantry.isAlive()).toBe(false);
    expect(germanInfantry.hex()).toBe(null);

    germanInfantry.setHex(hamburg);
    expect(germanInfantry.isAlive()).toBe(true);
    expect(germanInfantry.hex()).toBe(hamburg);
    expect(hamburg.units()).toContain(germanInfantry);

    germanInfantry.setHex(berlin);
    expect(germanInfantry.isAlive()).toBe(true);
    expect(germanInfantry.hex()).toBe(berlin);
    expect(berlin.units()).toContain(germanInfantry);
    expect(hamburg.units()).not.toContain(germanInfantry);
});

test("Embarking and disembarking units", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    const germanInfantry = new Infantry(1, 3, Countries.germany);
    const germanTransportShip = new TransportShip(Countries.germany);
    const germanTransportShip2 = new TransportShip(Countries.germany);

    germanTransportShip.setHex(bremerhaven);
    germanTransportShip2.setHex(lubeck);
    germanInfantry.setHex(bremerhaven);
    expect(germanTransportShip.embarkedOn()).toBe(null);
    expect(germanInfantry.embarkedOn()).toBe(null);
    expect(germanTransportShip.embarkedUnits().size).toBe(0);
    expect(germanInfantry.embarkedUnits().size).toBe(0);
    expect(germanInfantry.isAlive()).toBe(true);
    expect(germanInfantry.hex()).toBe(bremerhaven);
    expect(bremerhaven.units()).toContain(germanTransportShip);
    expect(bremerhaven.units()).toContain(germanInfantry);
    expect(Countries.germany.units()).toContain(germanTransportShip);
    expect(Countries.germany.units()).toContain(germanInfantry);

    expect(germanInfantry.canEmbarkOnto(germanTransportShip)).toBe(true);
    expect(germanTransportShip.canEmbarkOnto(germanInfantry)).toBe(false);

    germanInfantry.embarkOnto(germanTransportShip);
    expect(germanTransportShip.embarkedOn()).toBe(null);
    expect(germanInfantry.embarkedOn()).toBe(germanTransportShip);
    expect(germanTransportShip.embarkedUnits()).toContain(germanInfantry);
    expect(germanInfantry.embarkedUnits().size).toBe(0);
    expect(germanInfantry.isAlive()).toBe(true);
    expect(germanInfantry.hex()).toBe(bremerhaven);
    expect(bremerhaven.units()).toContain(germanTransportShip);
    expect(bremerhaven.units()).not.toContain(germanInfantry);
    expect(Countries.germany.units()).toContain(germanTransportShip);
    expect(Countries.germany.units()).toContain(germanInfantry);

    germanTransportShip.setHex(lubeck);
    expect(germanTransportShip.embarkedOn()).toBe(null);
    expect(germanInfantry.embarkedOn()).toBe(germanTransportShip);
    expect(germanTransportShip.embarkedUnits()).toContain(germanInfantry);
    expect(germanInfantry.embarkedUnits().size).toBe(0);
    expect(germanInfantry.isAlive()).toBe(true);
    expect(germanInfantry.hex()).toBe(lubeck);
    expect(lubeck.units()).toContain(germanTransportShip);
    expect(lubeck.units()).not.toContain(germanInfantry);
    expect(Countries.germany.units()).toContain(germanTransportShip);
    expect(Countries.germany.units()).toContain(germanInfantry);

    germanInfantry.disembark();
    expect(germanTransportShip.embarkedOn()).toBe(null);
    expect(germanInfantry.embarkedOn()).toBe(null);
    expect(germanTransportShip.embarkedUnits().size).toBe(0);
    expect(germanInfantry.embarkedUnits().size).toBe(0);
    expect(germanInfantry.isAlive()).toBe(true);
    expect(germanInfantry.hex()).toBe(lubeck);
    expect(lubeck.units()).toContain(germanTransportShip);
    expect(lubeck.units()).toContain(germanInfantry);
    expect(Countries.germany.units()).toContain(germanTransportShip);
    expect(Countries.germany.units()).toContain(germanInfantry);

    germanInfantry.embarkOnto(germanTransportShip);
    germanInfantry.embarkOnto(germanTransportShip2);
    expect(germanInfantry.embarkedOn()).toBe(germanTransportShip2);
    expect(germanTransportShip2.embarkedUnits()).toContain(germanInfantry);
    expect(germanTransportShip.embarkedUnits()).not.toContain(germanInfantry);
});

test("Destroying land units", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    const germanInfantry = new Infantry(5, 3, Countries.germany);
    const germanSupplyUnit = new SupplyUnit(3, Countries.germany);
    const initialAvailableStrengthPoints = Countries.germany.availableUnits.values().filter(it => it instanceof LandUnit).reduce((a, b) => a + b.strength, 0);

    germanInfantry.setHex(hamburg);
    expect(germanInfantry.isAlive()).toBe(true);

    germanInfantry.die();
    expect(germanInfantry.isAlive()).toBe(false);
    expect(hamburg.units()).not.toContain(germanInfantry);
    expect(Countries.germany.availableUnits.values().filter(it => it instanceof LandUnit).reduce((a, b) => a + b.strength, 0)).toBe(initialAvailableStrengthPoints + 5);
    for(let unit of Countries.germany.availableUnits){
        if(unit instanceof LandUnit){
            expect(unit.strength).toBeLessThanOrEqual(1);
        }
    }

    germanSupplyUnit.setHex(hamburg);
    expect(germanSupplyUnit.isAlive()).toBe(true);

    germanSupplyUnit.die();
    expect(germanSupplyUnit.isAlive()).toBe(false);
    expect(hamburg.units()).not.toContain(germanSupplyUnit);
    expect(Countries.germany.availableUnits).toContain(germanSupplyUnit);
});

test("Destroying transport ships", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    const germanInfantry = new Infantry(5, 3, Countries.germany);
    const germanTransportShip = new TransportShip(Countries.germany);
    const initialAvailableStrengthPoints = Countries.germany.availableUnits.values().filter(it => it instanceof LandUnit).reduce((a, b) => a + b.strength, 0);

    germanTransportShip.setHex(bremerhaven);
    germanInfantry.embarkOnto(germanTransportShip);
    expect(germanTransportShip.isAlive()).toBe(true);
    expect(germanInfantry.isAlive()).toBe(true);

    germanTransportShip.die();
    expect(germanTransportShip.isAlive()).toBe(false);
    expect(germanInfantry.isAlive()).toBe(false);
    expect(bremerhaven.units()).not.toContain(germanInfantry);
    expect(bremerhaven.units()).not.toContain(germanTransportShip);
    expect(Countries.germany.availableUnits).toContain(germanTransportShip);
    expect(Countries.germany.availableUnits.values().filter(it => it instanceof LandUnit).reduce((a, b) => a + b.strength, 0)).toBe(initialAvailableStrengthPoints + 5);
    for(let unit of Countries.germany.availableUnits){
        if(unit instanceof LandUnit){
            expect(unit.strength).toBeLessThanOrEqual(1);
        }
    }
});

test("Destroying heavy ships", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    const germanBattleship = new Battleship("Scharnhorst", 4, 8, 44, Countries.germany);

    germanBattleship.setHex(sea);
    expect(germanBattleship.isAlive()).toBe(true);

    germanBattleship.die();
    expect(germanBattleship.isAlive()).toBe(false);
    expect(sea.units()).not.toContain(germanBattleship);
    expect(Countries.germany.availableUnits).not.toContain(germanBattleship);
});

test("Carriers", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    const germanAirUnit = new AirUnit("FI-167", Countries.germany);
    const germanCarrier = new Carrier("Graf Zeppelin", 3, 48, Countries.germany, germanAirUnit);

    expect(germanAirUnit.embarkedOn()).toBe(germanCarrier);
    expect(germanCarrier.embarkedUnits()).toContain(germanAirUnit);
    expect(germanAirUnit.isAlive()).toBe(false);
    expect(germanAirUnit.hex()).toBe(null);
    expect(germanCarrier.isAlive()).toBe(false);
    expect(germanCarrier.hex()).toBe(null);

    germanCarrier.setHex(bremerhaven);
    expect(germanAirUnit.embarkedOn()).toBe(germanCarrier);
    expect(germanCarrier.embarkedUnits()).toContain(germanAirUnit);
    expect(germanAirUnit.isAlive()).toBe(true);
    expect(germanAirUnit.hex()).toBe(bremerhaven);
    expect(germanAirUnit.based).toBe(true);
    expect(germanCarrier.isAlive()).toBe(true);
    expect(germanCarrier.hex()).toBe(bremerhaven);
    expect(bremerhaven.units()).toContain(germanCarrier);
    expect(bremerhaven.units()).not.toContain(germanAirUnit);

    germanAirUnit.setHex(bremerhaven);
    expect(germanAirUnit.embarkedOn()).toBe(null);
    expect(germanCarrier.embarkedUnits()).not.toContain(germanAirUnit);
    expect(germanAirUnit.isAlive()).toBe(true);
    expect(germanAirUnit.hex()).toBe(bremerhaven);
    expect(germanAirUnit.based).toBe(false);
    expect(germanCarrier.isAlive()).toBe(true);
    expect(germanCarrier.hex()).toBe(bremerhaven);
    expect(bremerhaven.units()).toContain(germanCarrier);
    expect(bremerhaven.units()).toContain(germanAirUnit);

    germanAirUnit.embarkOnto(germanCarrier);
    expect(germanAirUnit.embarkedOn()).toBe(germanCarrier);
    expect(germanCarrier.embarkedUnits()).toContain(germanAirUnit);
    expect(germanAirUnit.isAlive()).toBe(true);
    expect(germanAirUnit.hex()).toBe(bremerhaven);
    expect(germanAirUnit.based).toBe(true);
    expect(germanCarrier.isAlive()).toBe(true);
    expect(germanCarrier.hex()).toBe(bremerhaven);
    expect(bremerhaven.units()).toContain(germanCarrier);
    expect(bremerhaven.units()).not.toContain(germanAirUnit);

    germanCarrier.setHex(sea);
    germanCarrier.die();
    expect(germanCarrier.isAlive()).toBe(false);
    expect(germanAirUnit.isAlive()).toBe(false);
    expect(sea.units()).not.toContain(germanCarrier);
    expect(sea.units()).not.toContain(germanAirUnit);
    expect(Countries.germany.availableUnits).toContain(germanAirUnit);
    expect(Countries.germany.availableUnits).not.toContain(germanCarrier);
});

test("Moving air and naval units", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    const germanAirUnit = new AirUnit("ME-110C", Countries.germany);
    const germanBattleship = new Battleship("Scharnhorst", 4, 8, 44, Countries.germany);

    germanAirUnit.setHex(bremerhaven);
    germanAirUnit.based = true;
    germanAirUnit.setHex(hamburg);
    expect(germanAirUnit.based).toBe(false);

    germanBattleship.setHex(bremerhaven);
    expect(germanBattleship.inPort()).toBe(true);
    germanBattleship.setHex(sea);
    expect(germanBattleship.inPort()).toBe(false);
});

test("Land unit stacking limits", () => {
    Countries.unitedStates.joinPartnership(Partnership.Allies);
    const americanInfantry = new Infantry(1, 4, Countries.unitedStates);
    const americanArmor = new Armor(1, 5, Countries.unitedStates);
    const americanMarine = new Marine(1, 4, Countries.unitedStates);
    const americanParatrooper = new Paratrooper(1, 4, Countries.unitedStates);
    const americanParatrooper2 = new Paratrooper(1, 4, Countries.unitedStates);
    const americanSupplyUnit = new SupplyUnit(4, Countries.unitedStates);
    const americanSupplyUnit2 = new SupplyUnit(4, Countries.unitedStates);

    expect(americanInfantry.canEnterHexWithinStackingLimits(newYork)).toBe(true);
    americanInfantry.setHex(newYork);
    expect(americanArmor.canEnterHexWithinStackingLimits(newYork)).toBe(true);
    americanArmor.setHex(newYork);
    expect(americanMarine.canEnterHexWithinStackingLimits(newYork)).toBe(false);
    americanInfantry.setHex(boston);
    expect(americanMarine.canEnterHexWithinStackingLimits(newYork)).toBe(true);
    americanMarine.setHex(newYork);
    expect(americanInfantry.canEnterHexWithinStackingLimits(newYork)).toBe(false);
    expect(americanParatrooper.canEnterHexWithinStackingLimits(newYork)).toBe(true);
    americanParatrooper.setHex(newYork);
    expect(americanParatrooper2.canEnterHexWithinStackingLimits(newYork)).toBe(false);
    expect(americanSupplyUnit.canEnterHexWithinStackingLimits(newYork)).toBe(true);
    americanSupplyUnit.setHex(newYork);
    expect(americanSupplyUnit2.canEnterHexWithinStackingLimits(newYork)).toBe(false);
    americanMarine.setHex(boston);
    expect(americanParatrooper2.canEnterHexWithinStackingLimits(newYork)).toBe(true);
    expect(americanSupplyUnit2.canEnterHexWithinStackingLimits(newYork)).toBe(true);
    expect(americanMarine.canEnterHexWithinStackingLimits(newYork)).toBe(true);
    americanParatrooper2.setHex(newYork);
    expect(americanSupplyUnit2.canEnterHexWithinStackingLimits(newYork)).toBe(false);
    expect(americanMarine.canEnterHexWithinStackingLimits(newYork)).toBe(false);
});

test("Air unit stacking limits", () => {
    Countries.unitedStates.joinPartnership(Partnership.Allies);
    const p40 = new AirUnit("P-40 Warhawk", Countries.unitedStates);
    const b24 = new AirUnit("B-24 Liberator", Countries.unitedStates);
    const b17 = new AirUnit("B-17 Flying Fortress", Countries.unitedStates);
    const dc3 = new AirUnit("DC-3", Countries.unitedStates);

    //Stacking on an airbase
    expect(p40.canEnterHexWithinStackingLimits(newYork)).toBe(true);
    p40.setHex(newYork);
    p40.based = true;
    expect(b24.canEnterHexWithinStackingLimits(newYork)).toBe(true);
    b24.setHex(newYork);
    b24.based = true;
    expect(b17.canEnterHexWithinStackingLimits(newYork)).toBe(true);
    b17.setHex(newYork);
    b17.based = true;
    expect(dc3.canEnterHexWithinStackingLimits(newYork)).toBe(false);
    p40.based = false;
    expect(dc3.canEnterHexWithinStackingLimits(newYork)).toBe(true);

    //Stacking outside of airbases
    expect(dc3.canEnterHexWithinStackingLimits(capeCod)).toBe(false);
});

test("Naval unit stacking limits", () => {
    Countries.unitedStates.joinPartnership(Partnership.Allies);
    const transportShip = new TransportShip(Countries.unitedStates);
    const destroyer = new Destroyer("Fletcher", 1, 1, 52, Countries.unitedStates);
    const destroyerEscort = new DestroyerEscort("Buckley", 1, 1, 34, Countries.unitedStates);
    const battleship = new Battleship("North Carolina", 9, 9, 40, Countries.unitedStates);
    const battlecruiser = new Battlecruiser("Alaska", 6, 5, 46, Countries.unitedStates);
    const heavyCruiser = new HeavyCruiser("Baltimore", 4, 5, 47, Countries.unitedStates);

    //Minor ports
    expect(transportShip.canEnterHexWithinStackingLimits(boston)).toBe(true);
    transportShip.setHex(boston);
    expect(destroyer.canEnterHexWithinStackingLimits(boston)).toBe(true);
    destroyer.setHex(boston);
    expect(destroyerEscort.canEnterHexWithinStackingLimits(boston)).toBe(true);
    destroyerEscort.setHex(boston);
    expect(battleship.canEnterHexWithinStackingLimits(boston)).toBe(true);
    battleship.setHex(boston);
    expect(battlecruiser.canEnterHexWithinStackingLimits(boston)).toBe(true);
    battlecruiser.setHex(boston);
    expect(heavyCruiser.canEnterHexWithinStackingLimits(boston)).toBe(false);

    //Major ports
    expect(transportShip.canEnterHexWithinStackingLimits(newYork)).toBe(true);
    transportShip.setHex(newYork);
    expect(destroyer.canEnterHexWithinStackingLimits(newYork)).toBe(true);
    destroyer.setHex(newYork);
    expect(destroyerEscort.canEnterHexWithinStackingLimits(newYork)).toBe(true);
    destroyerEscort.setHex(newYork);
    expect(battleship.canEnterHexWithinStackingLimits(newYork)).toBe(true);
    battleship.setHex(newYork);
    expect(battlecruiser.canEnterHexWithinStackingLimits(newYork)).toBe(true);
    battlecruiser.setHex(newYork);
    expect(heavyCruiser.canEnterHexWithinStackingLimits(newYork)).toBe(true);

    //Outside of ports
    expect(heavyCruiser.canEnterHexWithinStackingLimits(capeCod)).toBe(true);
});

test("Land unit movement", () => {
    const cologne = Hex.allCityHexes.find(it => it.city === "Cologne");
    const koblenz = Hex.fromCoordinates(159, 171);
    const wetzlar = Hex.fromCoordinates(160, 172);
    const liege = Hex.fromCoordinates(158, 171);
    const namur = Hex.fromCoordinates(157, 170);
    const brussels = Hex.allCityHexes.find(it => it.city === "Brussels");
    const antwerp = Hex.allCityHexes.find(it => it.city === "Antwerp");
    const mons = Hex.fromCoordinates(156, 170);
    const gent = Hex.fromCoordinates(156, 169);
    const dover = Hex.fromCoordinates(157, 167);
    const luxemburg = Hex.allCityHexes.find(it => it.city === "Luxemburg");
    const lille = Hex.allCityHexes.find(it => it.city === "Lille");
    const charlevilleMezieres = Hex.fromCoordinates(156, 171);
    const cambrai = Hex.fromCoordinates(155, 170);

    Countries.germany.joinPartnership(Partnership.Axis);
    Countries.belgium.joinPartnership(Partnership.Allies);
    Countries.france.joinPartnership(Paratrooper.Allies);

    Phase.current = Phase.AxisFirstMovement;

    const germanArmor = new Armor(1, 5, Countries.germany);
    const belgianInfantry = new Infantry(1, 3, Countries.belgium);

    germanArmor.setHex(cologne);
    belgianInfantry.setHex(brussels);

    //Infantry movement
    expect(belgianInfantry.validateMovement([brussels, namur, liege], false)).toBe(true);
    expect(belgianInfantry.validateMovement([brussels, antwerp], false)).toBe(true);
    expect(belgianInfantry.validateMovement([brussels, antwerp, gent, mons], false)).toBe(true);
    expect(belgianInfantry.validateMovement([brussels, antwerp, gent, mons, namur], false)).toBe(false); //Movement allowance
    expect(belgianInfantry.validateMovement([brussels, antwerp, gent, mons, namur], true)).toBe(true);   //Movement allowance doesn't apply when moving by rail
    expect(belgianInfantry.validateMovement([brussels, liege], false)).toBe(false);                      //Can't skip hexes
    expect(belgianInfantry.validateMovement([brussels, antwerp, dover], false)).toBe(false);             //Can't cross all sea hexsides
    expect(belgianInfantry.validateMovement([brussels, namur, liege, koblenz], false)).toBe(false);      //Control zones
    expect(belgianInfantry.validateMovement([brussels, namur, luxemburg], false)).toBe(false);           //Can't enter neutral countries

    //Armor movement
    expect(germanArmor.validateMovement([cologne, liege, namur, mons], false)).toBe(true);                           //Armor can move one hex into control zones
    expect(germanArmor.validateMovement([cologne, liege, namur, mons], true)).toBe(false);                           //Unless they're moving by rail
    expect(germanArmor.validateMovement([cologne, liege, namur, mons, gent], false)).toBe(false);                    //But not more than one hex
    expect(germanArmor.validateMovement([cologne, liege, namur, mons, lille], false)).toBe(false);                   //Not even if the next hex is outside of a control zone
    expect(germanArmor.validateMovement([cologne, liege, namur, charlevilleMezieres, cambrai], false)).toBe(false);  //Not even only one hex on the way is in a control zone
    expect(germanArmor.validateMovement([cologne, liege, namur, charlevilleMezieres], false)).toBe(true);            //But it may go through one control zone to exit it and go one more hex
    germanArmor.hasDoneSuccessfulOverrun = true;
    expect(germanArmor.validateMovement([cologne, liege, namur, mons, gent], false)).toBe(true);                     //Armor can ignore control zones after successful overrun
    Phase.current = Phase.AxisSecondMovement;
    expect(germanArmor.validateMovement([cologne, liege, namur, mons, gent], false)).toBe(false);                    //But only during the first movement phase
    expect(germanArmor.validateMovement([cologne, liege, namur, mons, gent], true)).toBe(false);                     //Unless they're moving by rail
    expect(germanArmor.validateMovement([cologne, koblenz, liege, namur, mons, gent, antwerp], false)).toBe(false);  //Movement allowance still applies after overrun
    expect(germanArmor.validateMovement([cologne, liege, namur, brussels], false)).toBe(false);                      //Can't enter onto enemy land units

    //If the unit is initially in an enemy control zone
    belgianInfantry.setHex(liege);
    germanArmor.hasDoneSuccessfulOverrun = false;
    expect(belgianInfantry.validateMovement([liege, namur, brussels, antwerp]), false).toBe(true);   //Leaving enemy control zones should always be allowed
    expect(belgianInfantry.validateMovement([liege, koblenz], false)).toBe(false);                   //But not to enter directly into an enemy control zone
    expect(germanArmor.validateMovement([cologne, koblenz], false)).toBe(true);                      //Except for armor
    expect(germanArmor.validateMovement([cologne, koblenz], true)).toBe(false);                      //But not when moving by rail
    expect(germanArmor.validateMovement([cologne, koblenz, wetzlar], false)).toBe(false);            //And not to continue moving
});

test("Air unit movement", () => {
    const seaByBremerhaven = Hex.fromCoordinates(161, 167);
    const leeuwarden = Hex.fromCoordinates(160, 168);
    const seaByLeeuwarden = Hex.fromCoordinates(160, 167);
    const seaByIpswich = Hex.fromCoordinates(158, 166);
    const ipswich = Hex.allCityHexes.find(it => it.city === "Ipswich");
    const middelfart = Hex.fromCoordinates(164, 169);
    const helsingor = Hex.fromCoordinates(165, 168);
    const halmstad = Hex.fromCoordinates(166, 168);
    const varberg = Hex.fromCoordinates(167, 167);
    const jonkoping = Hex.fromCoordinates(168, 167);
    const motala = Hex.fromCoordinates(169, 166);
    const orebro = Hex.fromCoordinates(170, 166);

    Countries.germany.joinPartnership(Partnership.Axis);
    Countries.unitedKingdom.joinPartnership(Partnership.Allies);
    Countries.denmark.joinPartnership(Partnership.Allies);
    Countries.sweden.joinPartnership(Partnership.Allies);
    Hex.groundedAirUnits = new Set([WeatherZone.Polar]);

    const germanAirUnit = new AirUnit("ME-110C", Countries.germany);
    germanAirUnit.setHex(hamburg);
    germanAirUnit.based = true;

    //Normal flight
    expect(germanAirUnit.validateMovement([hamburg, bremen, bremerhaven, seaByBremerhaven, seaByLeeuwarden, sea, seaByIpswich, ipswich])).toBe(true);

    //Can't fly over neutral countries
    expect(germanAirUnit.validateMovement([hamburg, bremen, bremerhaven, leeuwarden, seaByLeeuwarden, sea, seaByIpswich, ipswich])).toBe(false);

    //Can't skip hexes
    expect(germanAirUnit.validateMovement([hamburg, ipswich])).toBe(false);

    //Can't fly over hexes where air units are grounded
    expect(germanAirUnit.validateMovement([hamburg, lubeck, middelfart, helsingor, halmstad, varberg, jonkoping, motala])).toBe(true);
    expect(germanAirUnit.validateMovement([hamburg, lubeck, middelfart, helsingor, halmstad, varberg, jonkoping, motala, orebro])).toBe(false);

    //Can't reuse movement points from previous phase
    germanAirUnit.based = false;
    germanAirUnit.usedMovementPoints = 7;
    expect(germanAirUnit.validateMovement([hamburg, bremen, bremerhaven, seaByBremerhaven, seaByLeeuwarden, sea])).toBe(true);
    expect(germanAirUnit.validateMovement([hamburg, bremen, bremerhaven, seaByBremerhaven, seaByLeeuwarden, sea, seaByIpswich])).toBe(false);
});

test("Naval unit movement", () => {
    const murmansk = Hex.allCityHexes.find(it => it.city === "Murmansk");
    const kirovsk = Hex.fromCoordinates(185, 161);
    const tumanny = Hex.fromCoordinates(186, 161);
    const ostrovnoy = Hex.fromCoordinates(187, 161);
    const chizha = Hex.fromCoordinates(188, 162);
    const zaozyorsk = Hex.fromCoordinates(184, 160);
    const petsamo = Hex.fromCoordinates(183, 159);
    const kirkenes = Hex.fromCoordinates(182, 159);
    const seaByMurmansk = Hex.fromCoordinates(185, 159);
    const seaFurtherNorth = Hex.fromCoordinates(185, 158);

    Countries.germany.joinPartnership(Partnership.Axis);
    Countries.sovietUnion.joinPartnership(Partnership.Allies);

    const germanBattleship = new Battleship("Gneisenau", 4, 8, 44, Countries.germany);
    const germanSubmarine = new Submarine("IIA", 3, 2, 18, Countries.germany);
    const germanTransportShip = new TransportShip(Countries.germany);
    const sovietBattleship = new Battleship("Parizskaya Kommuna", 4, 3, 34, Countries.sovietUnion);
    const sovietSubmarine = new Submarine("Srednyaya", 3, 2, 28, Countries.sovietUnion);

    germanBattleship.setHex(seaFurtherNorth);
    sovietBattleship.setHex(murmansk);
    sovietSubmarine.setHex(murmansk);

    expect(sovietBattleship.validateMovement([murmansk, zaozyorsk, petsamo])).toBe(true);
    expect(sovietBattleship.validateMovement([murmansk, seaByMurmansk])).toBe(true);
    expect(sovietBattleship.validateMovement([murmansk, zaozyorsk, petsamo, kirkenes])).toBe(false);     //Can't enter neutral countries
    expect(sovietBattleship.validateMovement([murmansk, petsamo])).toBe(false);                          //Can't skip hexes
    expect(sovietBattleship.validateMovement([murmansk, seaByMurmansk, zaozyorsk])).toBe(false);         //Control zones
    expect(sovietSubmarine.validateMovement([murmansk, seaByMurmansk, zaozyorsk, petsamo])).toBe(true);  //Submarines aren't affected by battleships
    expect(sovietSubmarine.validateMovement([murmansk, seaByMurmansk, seaFurtherNorth])).toBe(false);    //But they can't enter hexes occupied by enemy naval units
    expect(sovietBattleship.validateMovement([murmansk, kirovsk])).toBe(false);                          //Naval units can't enter all land hexes
    expect(sovietBattleship.validateMovement([murmansk, tumanny, ostrovnoy])).toBe(false);               //Can't enter partial icecap hexes
    expect(sovietBattleship.validateMovement([murmansk, tumanny, ostrovnoy, chizha])).toBe(false);       //Can't enter all icecap hexes
    expect(germanBattleship.validateMovement([seaFurtherNorth, seaByMurmansk, zaozyorsk])).toBe(false);  //Naval units in ports have control zones
    germanSubmarine.setHex(seaFurtherNorth);
    expect(sovietSubmarine.validateMovement([murmansk, seaByMurmansk, zaozyorsk])).toBe(true);           //Submarines can continue one hex after control zones
    expect(sovietSubmarine.validateMovement([murmansk, seaByMurmansk, zaozyorsk, petsamo])).toBe(false); //But not more than one hex
    germanTransportShip.setHex(seaByMurmansk);
    expect(sovietBattleship.validateMovement([murmansk, zaozyorsk, petsamo])).toBe(true);                //Transport ships don't have control zones
    expect(sovietBattleship.validateMovement([murmansk, seaByMurmansk])).toBe(false);                    //But it's not possible for enemy ships to enter the same hex as them
});

test("Can attack", () => {
    Countries.italy.joinPartnership(Partnership.Axis);
    Countries.france.joinPartnership(Partnership.Allies);

    const nice = Hex.fromCoordinates(153, 177);
    const marseille = Hex.allCityHexes.find(it => it.city === "Marseille");
    const sea = Hex.fromCoordinates(151, 177);
    const naples = Hex.allCityHexes.find(it => it.city === "Naples");
    const pozzuoli = Hex.fromCoordinates(157, 183);

    const frenchInfantry = new Infantry(6, 3, Countries.france);
    frenchInfantry.setHex(marseille);
    const italianInfantry = new Infantry(5, 3, Countries.italy);
    italianInfantry.setHex(nice);
    nice.setController(Countries.italy);
    const italianInfantry2 = new Infantry(5, 3, Countries.italy);
    italianInfantry2.setHex(naples);
    const italianInfantry3 = new Infantry(5, 3, Countries.italy);
    italianInfantry3.setHex(pozzuoli);
    const italianSupplyUnit = new SupplyUnit(3, Countries.italy);
    italianSupplyUnit.setHex(nice);

    const frenchTransportShip = new TransportShip(Countries.france);
    frenchTransportShip.setHex(marseille);
    const frenchEmbarkedInfantry = new Infantry(6, 3, Countries.france);
    frenchEmbarkedInfantry.embarkOnto(frenchTransportShip);
    const frenchAmphibiousInfantry = new Infantry(6, 3, Countries.france);
    frenchAmphibiousInfantry.setHex(naples);
    const frenchLightCruiser = new LightCruiser("Pluton", 1, 1, 43, Countries.france);
    frenchLightCruiser.setHex(marseille);
    const italianBattleship = new Battleship("Giulio Cesare", 4, 5, 30, Countries.italy);
    italianBattleship.setHex(sea);

    const italianHeavyCruiser = new HeavyCruiser("San Giorgio", 3, 3, 33, Countries.italy);
    italianHeavyCruiser.setHex(naples);
    const italianDestroyer = new Destroyer("Turbine", 1, 1, 47, Countries.italy);
    italianDestroyer.setHex(naples);    //Not in port
    const frenchBattleship = new Battleship("Courbet", 4, 4, 30, Countries.france);
    frenchBattleship.setHex(pozzuoli);

    const frenchFighter = new AirUnit("MS-406", Countries.france);
    frenchFighter.setHex(marseille);
    frenchFighter.based = true;
    const frenchBomber = new AirUnit("LeO-451", Countries.france);
    frenchBomber.setHex(naples);
    const italianBomber = new AirUnit("SM-79 Sparveiro", Countries.italy);
    italianBomber.setHex(marseille);
    const italianFighter = new AirUnit("CR-32", Countries.italy);
    italianFighter.setHex(marseille);

    //Can't attack friendly units
    expect(frenchInfantry.canAttack(frenchInfantry)).toBe(false);
    expect(italianInfantry.canAttack(italianInfantry2)).toBe(false);
    expect(italianBomber.canAttack(italianInfantry)).toBe(false);
    expect(frenchLightCruiser.canAttack(frenchTransportShip)).toBe(false);

    //Land attacks
    expect(frenchInfantry.canAttack(italianInfantry)).toBe(true);
    expect(italianInfantry.canAttack(frenchInfantry)).toBe(true);
    expect(frenchInfantry.canAttackInHex(italianInfantry)).toBe(true);
    expect(italianInfantry.canAttackInHex(frenchInfantry)).toBe(true);

    //Embarked land units
    expect(frenchEmbarkedInfantry.canAttack(italianInfantry)).toBe(true);
    expect(italianInfantry.canAttack(frenchEmbarkedInfantry)).toBe(true);
    expect(frenchEmbarkedInfantry.canAttackInHex(italianInfantry)).toBe(false);
    expect(italianInfantry.canAttackInHex(frenchEmbarkedInfantry)).toBe(false);

    //Land units that are too far away from each other
    expect(frenchInfantry.canAttack(italianInfantry2)).toBe(true);
    expect(italianInfantry2.canAttack(frenchInfantry)).toBe(true);
    expect(frenchInfantry.canAttackInHex(italianInfantry2)).toBe(false);
    expect(italianInfantry2.canAttackInHex(frenchInfantry)).toBe(false);

    //Supply units can't attack but can be attacked
    expect(frenchInfantry.canAttack(italianSupplyUnit)).toBe(true);
    expect(italianSupplyUnit.canAttack(frenchInfantry)).toBe(false);
    expect(frenchInfantry.canAttackInHex(italianSupplyUnit)).toBe(true);
    expect(italianSupplyUnit.canAttackInHex(frenchInfantry)).toBe(false);

    //Land attacks after amphibious assaults
    expect(frenchAmphibiousInfantry.canAttack(italianInfantry2)).toBe(true);
    expect(frenchAmphibiousInfantry.canAttack(italianInfantry3)).toBe(true);
    expect(frenchAmphibiousInfantry.canAttackInHex(italianInfantry2)).toBe(true);
    expect(frenchAmphibiousInfantry.canAttackInHex(italianInfantry3)).toBe(false);

    //Air attacks
    expect(italianFighter.canAttack(frenchFighter)).toBe(true);
    expect(frenchFighter.canAttack(italianFighter)).toBe(true);
    expect(italianBomber.canAttack(frenchFighter)).toBe(false);
    expect(frenchFighter.canAttack(italianBomber)).toBe(true);
    expect(italianBomber.canAttack(frenchTransportShip)).toBe(true);
    expect(frenchTransportShip.canAttack(italianBomber)).toBe(false);
    expect(italianFighter.canAttackInHex(frenchFighter)).toBe(true);
    expect(frenchFighter.canAttackInHex(italianFighter)).toBe(false);
    expect(italianBomber.canAttackInHex(frenchFighter)).toBe(false);
    expect(frenchFighter.canAttackInHex(italianBomber)).toBe(false);
    expect(italianBomber.canAttackInHex(frenchTransportShip)).toBe(true);
    expect(frenchTransportShip.canAttackInHex(italianBomber)).toBe(false);

    //Ground support
    expect(italianBomber.canAttack(frenchInfantry)).toBe(true);
    expect(frenchInfantry.canAttack(italianBomber)).toBe(false);
    expect(italianBomber.canAttack(frenchEmbarkedInfantry)).toBe(true);
    expect(frenchEmbarkedInfantry.canAttack(italianBomber)).toBe(false);
    expect(italianBomber.canAttackInHex(frenchInfantry)).toBe(true);
    expect(frenchInfantry.canAttackInHex(italianBomber)).toBe(false);
    expect(italianBomber.canAttackInHex(frenchEmbarkedInfantry)).toBe(false);
    expect(frenchEmbarkedInfantry.canAttackInHex(italianBomber)).toBe(false);

    //Fighters can't give ground support
    expect(italianFighter.canAttack(frenchInfantry)).toBe(false);
    expect(italianFighter.canAttackInHex(frenchInfantry)).toBe(false);

    //Air units that are too far away from each other
    expect(italianFighter.canAttack(frenchBomber)).toBe(true);
    expect(italianFighter.canAttackInHex(frenchBomber)).toBe(false);

    //Air attacks into major ports should be allowed
    expect(frenchBomber.canAttack(italianHeavyCruiser)).toBe(true);
    expect(italianHeavyCruiser.canAttack(frenchBomber)).toBe(false);
    expect(frenchBomber.canAttack(italianDestroyer)).toBe(true);
    expect(italianDestroyer.canAttack(frenchBomber)).toBe(false);
    expect(frenchBomber.canAttackInHex(italianHeavyCruiser)).toBe(true);
    expect(italianHeavyCruiser.canAttackInHex(frenchBomber)).toBe(false);
    expect(frenchBomber.canAttackInHex(italianDestroyer)).toBe(true);
    expect(italianDestroyer.canAttackInHex(frenchBomber)).toBe(false);

    //Naval attacks into major ports
    expect(italianBattleship.canAttack(frenchTransportShip)).toBe(true);
    expect(frenchTransportShip.canAttack(italianBattleship)).toBe(false);
    expect(italianBattleship.canAttack(frenchLightCruiser)).toBe(true);
    expect(frenchLightCruiser.canAttack(italianBattleship)).toBe(true);
    expect(italianBattleship.canAttackInHex(frenchTransportShip)).toBe(false);
    expect(frenchTransportShip.canAttackInHex(italianBattleship)).toBe(false);
    expect(italianBattleship.canAttackInHex(frenchLightCruiser)).toBe(false);
    expect(frenchLightCruiser.canAttackInHex(italianBattleship)).toBe(true);

    //Naval attacks into minor ports
    expect(frenchBattleship.canAttack(italianHeavyCruiser)).toBe(true);
    expect(italianHeavyCruiser.canAttack(frenchBattleship)).toBe(true);
    expect(frenchBattleship.canAttack(italianDestroyer)).toBe(true);
    expect(italianDestroyer.canAttack(frenchBattleship)).toBe(true);
    expect(frenchBattleship.canAttackInHex(italianHeavyCruiser)).toBe(true);
    expect(italianHeavyCruiser.canAttackInHex(frenchBattleship)).toBe(true);
    expect(frenchBattleship.canAttackInHex(italianDestroyer)).toBe(true);
    expect(italianDestroyer.canAttackInHex(frenchBattleship)).toBe(true);

    //Naval bombardment
    expect(frenchBattleship.canAttack(italianInfantry3)).toBe(true);
    expect(italianInfantry3.canAttack(frenchBattleship)).toBe(false);
    expect(frenchBattleship.canAttack(italianInfantry2)).toBe(true);
    expect(italianInfantry2.canAttack(frenchBattleship)).toBe(false);
    expect(frenchBattleship.canAttackInHex(italianInfantry3)).toBe(true);
    expect(italianInfantry3.canAttackInHex(frenchBattleship)).toBe(false);
    expect(frenchBattleship.canAttackInHex(italianInfantry2)).toBe(false);
    expect(italianInfantry2.canAttackInHex(frenchBattleship)).toBe(false);

    //Naval units that are too far away from each other
    expect(frenchBattleship.canAttack(italianBattleship)).toBe(true);
    expect(italianBattleship.canAttack(frenchBattleship)).toBe(true);
    expect(frenchBattleship.canAttackInHex(italianBattleship)).toBe(false);
    expect(italianBattleship.canAttackInHex(frenchBattleship)).toBe(false);
});

test("Japan/Soviet Union war", () => {
    const vladivostok = Hex.allCityHexes.find(it => it.city === "Vladivostok");
    const hunchun = Hex.fromCoordinates(248, 142);
    const ussuriysk = Hex.fromCoordinates(247, 140);
    const korol = Hex.fromCoordinates(246, 140);
    const mishan = Hex.fromCoordinates(245, 139);
    const harbin = Hex.allCityHexes.find(it => it.city === "Harbin");
    const shangzhi = Hex.fromCoordinates(245, 143);
    const mudanjiang = Hex.fromCoordinates(246, 143);
    const wangqing = Hex.fromCoordinates(247, 142);
    const zarubino = Hex.fromCoordinates(249, 141);
    const dongning = Hex.fromCoordinates(247, 141);
    const beijing = Hex.allCityHexes.find(it => it.city === "Beijing");
    const tianjin = Hex.allCityHexes.find(it => it.city === "Tianjin");

    Countries.japan.joinPartnership(Partnership.Axis);
    Countries.sovietUnion.joinPartnership(Partnership.Allies);
    Countries.unitedKingdom.joinPartnership(Partnership.Allies);
    Countries.china.joinPartnership(Partnership.Allies);

    const japaneseInfantry = new Infantry(1, 4, Countries.japan);
    japaneseInfantry.setHex(hunchun);
    const japaneseFighter = new AirUnit("Ki-27", Countries.japan);
    japaneseFighter.setHex(harbin);
    japaneseFighter.based = true;
    const japaneseBomber = new AirUnit("Ki-21", Countries.japan);
    japaneseBomber.setHex(harbin);
    japaneseBomber.based = true;
    const sovietInfantry = new Infantry(1, 3, Countries.sovietUnion);
    sovietInfantry.setHex(vladivostok);
    const sovietFighter = new AirUnit("Yak-9", Countries.sovietUnion);
    sovietFighter.setHex(vladivostok);
    sovietFighter.based = true;
    const japaneseInfantry2 = new Infantry(1, 4, Countries.japan);
    japaneseInfantry2.setHex(beijing);
    beijing.setController(Countries.japan);
    const sovietInfantry2 = new Infantry(1, 3, Countries.sovietUnion);
    sovietInfantry2.setHex(tianjin);
    const britishInfantry = new Infantry(1, 4, Countries.unitedKingdom);
    britishInfantry.setHex(zarubino);

    //Japan and the Soviet Union can't attack each other
    expect(sovietInfantry.canAttackInHex(japaneseInfantry)).toBe(false);
    expect(japaneseInfantry.canAttackInHex(sovietInfantry)).toBe(false);

    //Japan and the Soviet Union can't enter each other's hexes
    expect(sovietFighter.validateMovement([vladivostok, hunchun])).toBe(false);
    expect(sovietInfantry.validateMovement([vladivostok, ussuriysk, korol, mishan])).toBe(false);
    expect(japaneseBomber.validateMovement([harbin, shangzhi, mudanjiang, wangqing, hunchun, vladivostok])).toBe(false);

    //Japanese units can't attack into the Soviet Union, not even against non-Soviet units, but can attack Soviet units outside of the Soviet Union
    expect(japaneseInfantry.canAttack(britishInfantry)).toBe(true);
    expect(japaneseInfantry.canAttackInHex(britishInfantry)).toBe(false);
    expect(japaneseInfantry2.canAttack(sovietInfantry2)).toBe(true);
    expect(japaneseInfantry2.canAttackInHex(sovietInfantry2)).toBe(true);

    //Control zones
    expect(hunchun.isInLandControlZone(Partnership.Allies)).toBe(true);    //Because of the British unit
    expect(dongning.isInLandControlZone(Partnership.Allies)).toBe(false);
    expect(vladivostok.isInLandControlZone(Partnership.Axis)).toBe(false);
    expect(zarubino.isInLandControlZone(Partnership.Axis)).toBe(false);

    //When Mongolia enters the war, everything is normal
    Countries.mongolia.joinPartnership(Partnership.Allies);

    expect(sovietInfantry.canAttackInHex(japaneseInfantry)).toBe(true);
    expect(japaneseInfantry.canAttackInHex(sovietInfantry)).toBe(true);

    expect(sovietFighter.validateMovement([vladivostok, hunchun])).toBe(true);
    expect(sovietInfantry.validateMovement([vladivostok, ussuriysk, korol, mishan])).toBe(true);
    expect(japaneseBomber.validateMovement([harbin, shangzhi, mudanjiang, wangqing, hunchun, vladivostok])).toBe(true);

    expect(japaneseInfantry.canAttack(britishInfantry)).toBe(true);
    expect(japaneseInfantry.canAttackInHex(britishInfantry)).toBe(true);
    expect(japaneseInfantry2.canAttack(sovietInfantry2)).toBe(true);
    expect(japaneseInfantry2.canAttackInHex(sovietInfantry2)).toBe(true);

    expect(hunchun.isInLandControlZone(Partnership.Allies)).toBe(true);
    expect(dongning.isInLandControlZone(Partnership.Allies)).toBe(true);
    expect(vladivostok.isInLandControlZone(Partnership.Axis)).toBe(true);
    expect(zarubino.isInLandControlZone(Partnership.Axis)).toBe(true);
});

test("Available land units strength", () => {
    for(let country of Countries.all()){
        if([Countries.bulgaria, Countries.germany, Countries.hungary, Countries.italy, Countries.japan].includes(country)){
            country.joinPartnership(Partnership.Axis);
        }
        else if(country !== Countries.finland){
            country.joinPartnership(Partnership.Allies);
        }
    }
    while(currentYear() < 1947){
        for(let country of Countries.all()){
            country.addNewAvailableUnits();
        }
        date.current++;
    }
    for(let country of Countries.all()){
        for(let unit of country.availableUnits){
            if(unit instanceof LandUnit){
                expect(unit.strength).toBeLessThanOrEqual(1);
            }
        }
    }
});
