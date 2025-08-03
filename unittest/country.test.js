import { expect, test } from "vitest";

import { Hex } from "../build/model/mapsheet.js";
import { Partnership } from "../build/model/partnership.js";
import { Countries } from "../build/model/countries.js";
import { AirUnit, Infantry, Marine, TransportShip } from "../build/model/units.js";
import { date } from "../build/model/date.js";

test("Countries that can be invaded", () => {
    //Finland can't be invaded directly by anyone (instead it joins the partnership opposing the Soviet Union)
    expect(Countries.finland.canBeInvadedBy(Partnership.Axis)).toBe(false);
    expect(Countries.finland.canBeInvadedBy(Partnership.Allies)).toBe(false);

    //Countries that can't be invaded by the Allies
    expect(Countries.unitedKingdom.canBeInvadedBy(Partnership.Axis)).toBe(true);
    expect(Countries.unitedKingdom.canBeInvadedBy(Partnership.Allies)).toBe(false);
    expect(Countries.unitedStates.canBeInvadedBy(Partnership.Axis)).toBe(true);
    expect(Countries.unitedStates.canBeInvadedBy(Partnership.Allies)).toBe(false);
    expect(Countries.france.canBeInvadedBy(Partnership.Axis)).toBe(true);
    expect(Countries.france.canBeInvadedBy(Partnership.Allies)).toBe(false);
    expect(Countries.china.canBeInvadedBy(Partnership.Axis)).toBe(true);
    expect(Countries.china.canBeInvadedBy(Partnership.Allies)).toBe(false);
    expect(Countries.poland.canBeInvadedBy(Partnership.Axis)).toBe(true);
    expect(Countries.poland.canBeInvadedBy(Partnership.Allies)).toBe(false);

    //Non-neutral countries can't be invaded
    Countries.china.joinPartnership(Partnership.Allies);
    expect(Countries.china.canBeInvadedBy(Partnership.Axis)).toBe(false);

    //China can't declare war on just anyone
    expect(Countries.germany.canBeInvadedBy(Partnership.Allies)).toBe(false);
    Countries.unitedKingdom.joinPartnership(Partnership.Allies);
    expect(Countries.germany.canBeInvadedBy(Partnership.Allies)).toBe(true);

    //Countries that can't be invaded by the Axis
    expect(Countries.germany.canBeInvadedBy(Partnership.Axis)).toBe(false);
    expect(Countries.hungary.canBeInvadedBy(Partnership.Axis)).toBe(false);
    expect(Countries.hungary.canBeInvadedBy(Partnership.Allies)).toBe(true);
    expect(Countries.italy.canBeInvadedBy(Partnership.Axis)).toBe(false);
    expect(Countries.italy.canBeInvadedBy(Partnership.Allies)).toBe(true);

    //Countries that can be invaded by anyone
    expect(Countries.sovietUnion.canBeInvadedBy(Partnership.Allies)).toBe(true);
    expect(Countries.sovietUnion.canBeInvadedBy(Partnership.Axis)).toBe(true);
    expect(Countries.sweden.canBeInvadedBy(Partnership.Allies)).toBe(true);
    expect(Countries.sweden.canBeInvadedBy(Partnership.Axis)).toBe(true);
});

test("Join partnership", () => {
    //General rules
    const initialUnits = Countries.japan.availableUnits;
    Countries.japan.joinPartnership(Partnership.Axis);
    expect(Countries.japan.partnership()).toBe(Partnership.Axis);
    expect(Countries.japan.enteredWar).toBe(date.current);
    for(let unit of initialUnits){
        expect(Countries.japan.delayedUnits.get(date.current)).toContain(unit);
    }

    //Special rules for Poland
    Countries.germany.joinPartnership(Partnership.Axis);
    Countries.poland.joinPartnership(Partnership.Allies);
    expect(Countries.poland.partnership()).toBe(Partnership.Allies);
    expect(Countries.poland.enteredWar).toBe(date.current);
    const viborg = Hex.fromCoordinates(177, 168);
    const tallinn = Hex.allCityHexes.find(it => it.city === "Tallinn");
    const riga = Hex.allCityHexes.find(it => it.city === "Riga");
    const kaunas = Hex.allCityHexes.find(it => it.city === "Kaunas");
    const wilno = Hex.allCityHexes.find(it => it.city === "Wilno");
    const brzescNadBugiem = Hex.allCityHexes.find(it => it.city === "Brześć nad Bugiem");
    const chisinau = Hex.fromCoordinates(174, 183);
    const petsamo = Hex.fromCoordinates(183, 159);
    const helsinki = Hex.allCityHexes.find(it => it.city === "Helsinki");
    const warsaw = Hex.allCityHexes.find(it => it.city === "Warsaw");
    const danzig = Hex.allCityHexes.find(it => it.city === "Danzig");
    const poznan = Hex.allCityHexes.find(it => it.city === "Poznan");
    const lodz = Hex.allCityHexes.find(it => it.city === "Lodz");
    const krakow = Hex.allCityHexes.find(it => it.city === "Kraków");
    const bucharest = Hex.allCityHexes.find(it => it.city === "Bucharest");
    expect(viborg.controller().name()).toBe("Soviet Union");
    expect(tallinn.controller().name()).toBe("Soviet Union");
    expect(riga.controller().name()).toBe("Soviet Union");
    expect(kaunas.controller().name()).toBe("Soviet Union");
    expect(wilno.controller().name()).toBe("Soviet Union");
    expect(chisinau.controller().name()).toBe("Soviet Union");
    expect(petsamo.controller().name()).toBe("Finland");
    expect(helsinki.controller().name()).toBe("Finland");
    expect(warsaw.controller().name()).toBe("Poland");
    expect(bucharest.controller().name()).toBe("Romania");

    //Special rules for the Soviet Union
    Countries.sovietUnion.joinPartnership(Partnership.Allies);
    expect(Countries.sovietUnion.partnership()).toBe(Partnership.Allies);
    expect(Countries.finland.partnership()).toBe(Partnership.Axis);
    expect(Countries.sovietUnion.enteredWar).toBe(date.current);
    expect(Countries.finland.enteredWar).toBe(date.current);

    //Polish conquest (done here because it depends on the above, and the tests should be able to be run individually)
    warsaw.setController(Countries.germany);
    danzig.setController(Countries.germany);
    poznan.setController(Countries.germany);
    lodz.setController(Countries.germany);
    krakow.setController(Countries.germany);
    expect(wilno.controller().name()).toBe("Soviet Union");
    expect(brzescNadBugiem.controller().name()).toBe("Soviet Union");
    Countries.poland.conquerOrLiberate();
    expect(Countries.poland.conquered()).toBe(true);
    expect(Countries.poland.hasBeenConquered()).toBe(true);

    //Poland isn't liberated if the Soviet Union controls all Polish cities
    warsaw.setController(Countries.sovietUnion);
    danzig.setController(Countries.sovietUnion);
    poznan.setController(Countries.sovietUnion);
    lodz.setController(Countries.sovietUnion);
    krakow.setController(Countries.sovietUnion);
    Countries.poland.conquerOrLiberate();
    expect(Countries.poland.conquered()).toBe(true);
    expect(Countries.poland.hasBeenConquered()).toBe(true);

    //Poland is liberated if the Western Allies control at least one city, even if the Soviet Union controls the rest
    Countries.unitedKingdom.joinPartnership(Partnership.Allies);
    danzig.setController(Countries.unitedKingdom);
    Countries.poland.conquerOrLiberate();
    expect(Countries.poland.conquered()).toBe(false);
    expect(Countries.poland.hasBeenConquered()).toBe(true);
});

test("Conquest and liberation", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    Countries.denmark.joinPartnership(Partnership.Allies);
    Countries.unitedKingdom.joinPartnership(Partnership.Allies);

    const lubeck = Hex.allCityHexes.find(it => it.city === "Lübeck");
    const copenhagen = Hex.allCityHexes.find(it => it.city === "Copenhagen");
    const esbjerg = Hex.allCityHexes.find(it => it.city === "Esbjerg");
    const aalborg = Hex.allCityHexes.find(it => it.city === "Aalborg");
    const sonderborg = Hex.fromCoordinates(163, 168);
    const middelfart = Hex.fromCoordinates(164, 169);
    const aarhus = Hex.fromCoordinates(164, 168);
    const reykjavik = Hex.allCityHexes.find(it => it.city === "Reykjavik");
    const nuuk = Hex.allCityHexes.find(it => it.city === "Nuuk");

    Countries.denmark.money = 100;
    lubeck.setController(Countries.denmark);
    const danishInfantry = new Infantry(1, 3, Countries.denmark);
    danishInfantry.setHex(lubeck);
    const britishInfantry = new Infantry(1, 4, Countries.unitedKingdom);
    britishInfantry.setHex(middelfart);

    //Denmark shouldn't be conquered in the beginning
    expect(Countries.denmark.conquered()).toBe(false);
    expect(Countries.denmark.hasBeenConquered()).toBe(false);
    Countries.denmark.conquerOrLiberate();
    expect(Countries.denmark.conquered()).toBe(false);
    expect(Countries.denmark.hasBeenConquered()).toBe(false);

    //Invading some cities but not all shouldn't conquer the country
    copenhagen.setController(Countries.germany);
    Countries.denmark.conquerOrLiberate();
    expect(Countries.denmark.conquered()).toBe(false);
    expect(Countries.denmark.hasBeenConquered()).toBe(false);
    esbjerg.setController(Countries.germany);
    Countries.denmark.conquerOrLiberate();
    expect(Countries.denmark.conquered()).toBe(false);
    expect(Countries.denmark.hasBeenConquered()).toBe(false);

    //Invading the last city shouldn't conquere the country until conquerOrLiberate() is called
    aalborg.setController(Countries.germany);
    expect(Countries.denmark.conquered()).toBe(false);
    expect(Countries.denmark.hasBeenConquered()).toBe(false);

    //After conquerOrLiberate() is called when all cities are occupied, the country should be conquered
    Countries.denmark.conquerOrLiberate();
    expect(Countries.denmark.conquered()).toBe(true);
    expect(Countries.denmark.hasBeenConquered()).toBe(true);

    //General effects of conquest
    expect(Countries.denmark.money).toBe(0);
    expect(Countries.denmark.income()).toBe(0);
    expect(sonderborg.controller().name()).toBe("Germany");
    expect(aarhus.controller().name()).toBe("Germany");
    expect(lubeck.controller().name()).not.toBe("Denmark");
    expect(lubeck.controller().partnership()).toBe(Partnership.Allies);
    expect(danishInfantry.isAlive()).toBe(false);

    //The enemy shouldn't gain control of friendly occupied hexes
    expect(britishInfantry.isAlive()).toBe(true);
    expect(middelfart.controller().partnership()).toBe(Partnership.Allies);
    expect(middelfart.controller().name()).not.toBe("Denmark");

    //Special effects of conquest for Denmark
    expect(reykjavik.controller().name()).toBe("United Kingdom");
    expect(nuuk.controller().name()).toBe("United States");

    const germanInfantry = new Infantry(1, 3, Countries.germany);
    germanInfantry.setHex(sonderborg);

    //Liberating one city doesn't liberate the entire country
    Countries.unitedStates.joinPartnership(Partnership.Allies);
    esbjerg.setController(Countries.unitedStates);
    Countries.denmark.conquerOrLiberate();
    expect(Countries.denmark.conquered()).toBe(true);
    expect(Countries.denmark.hasBeenConquered()).toBe(true);

    //Liberating all cities only liberates the entire country after calling conquerOrLiberate()
    copenhagen.setController(Countries.unitedStates);
    aalborg.setController(Countries.unitedStates);
    expect(Countries.denmark.conquered()).toBe(true);
    expect(Countries.denmark.hasBeenConquered()).toBe(true);
    Countries.denmark.conquerOrLiberate();
    expect(Countries.denmark.conquered()).toBe(false);
    expect(Countries.denmark.hasBeenConquered()).toBe(true);

    //Hexes in the country should be returned to the original country
    expect(copenhagen.controller().name()).toBe("Denmark");
    expect(middelfart.controller().name()).toBe("Denmark");
    expect(aarhus.controller().name()).toBe("Denmark");

    //The enemy shouldn't gain control of friendly occupied hexes
    expect(germanInfantry.isAlive()).toBe(true);
    expect(sonderborg.controller().partnership()).toBe(Partnership.Axis);

    //Liberated forces (we don't know the exact number of strength points since we created new units in the unit tests, but it should be greater than 0 because Denmark has units from the beginning and less than 5 because that's always the maximum)
    const liberatedDanishStrengthPoints = Countries.denmark.delayedUnits.get(date.current).size;
    expect(liberatedDanishStrengthPoints).toBeGreaterThan(0);
    expect(liberatedDanishStrengthPoints).toBeLessThanOrEqual(5);
});

test("Income", () => {
    Countries.italy.joinPartnership(Partnership.Axis);
    Countries.germany.joinPartnership(Partnership.Axis);
    Countries.unitedStates.joinPartnership(Partnership.Allies);
    Countries.unitedKingdom.joinPartnership(Partnership.Allies);

    const italianResourceHex = Hex.allResourceHexes.find(it => it.country === Countries.italy && it.controller() === Countries.italy);
    const originalItalianIncome = Countries.italy.income();
    const originalAmericanIncome = Countries.unitedStates.income();
    const originalGermanIncome = Countries.germany.income();
    const originalBritishIncome = Countries.unitedKingdom.income();

    italianResourceHex.setController(Countries.unitedStates);

    //Affected countries should lose and gain income appropriately
    expect(Countries.italy.income()).toBe(originalItalianIncome - 50);
    expect(Countries.unitedStates.income()).toBe(originalAmericanIncome + 50);

    //Unaffected countries' income shouldn't change
    expect(Countries.germany.income()).toBe(originalGermanIncome);
    expect(Countries.unitedKingdom.income()).toBe(originalBritishIncome);
});

test("Chinese controlled hexes", () => {
    Countries.china.joinPartnership(Partnership.Allies);
    Countries.japan.joinPartnership(Partnership.Axis);

    const beijing = Hex.allCityHexes.find(it => it.city === "Beijing");
    const tianjin = Hex.allCityHexes.find(it => it.city === "Tianjin");
    const haikou = Hex.allCityHexes.find(it => it.city === "Haikou");
    const japaneseUnit = new Infantry(1, 4, Countries.japan);

    //If a Japanese unit enters a Chinese hex, Japan should gain control of it
    japaneseUnit.setHex(beijing);
    beijing.setController(Countries.japan);
    Countries.china.updateController();
    Countries.china.conquerOrLiberate();
    expect(beijing.controller().name()).toBe("Japan");
    expect(tianjin.controller().name()).toBe("China");
    expect(Countries.china.conquered()).toBe(false);
    expect(Countries.china.hasBeenConquered()).toBe(false);

    //If a Japanese unit moves within China, Japan should lose control of the old hex and gain control of the new hex.
    japaneseUnit.setHex(tianjin);
    tianjin.setController(Countries.japan);
    Countries.china.updateController();
    Countries.china.conquerOrLiberate();
    expect(beijing.controller().name()).toBe("China");
    expect(tianjin.controller().name()).toBe("Japan");
    expect(Countries.china.conquered()).toBe(false);
    expect(Countries.china.hasBeenConquered()).toBe(false);

    //If a Japanese unit dies in China leaving its hex vacant, Japan should lose control of the hex
    japaneseUnit.die();
    Countries.china.updateController();
    Countries.china.conquerOrLiberate();
    expect(beijing.controller().name()).toBe("China");
    expect(tianjin.controller().name()).toBe("China");
    expect(Countries.china.conquered()).toBe(false);
    expect(Countries.china.hasBeenConquered()).toBe(false);

    //Amphibious assault onto Chinese land units
    const chineseInfantry = new Infantry(3, 3, Countries.china);
    const japaneseMarine = new Marine(5, 3, Countries.japan);
    chineseInfantry.setHex(haikou);
    japaneseMarine.setHex(haikou);
    Countries.china.updateController();
    expect(haikou.controller().name()).toBe("China");

    //Amphibious assault onto Japanese land units in China
    haikou.setController(Countries.japan);
    Countries.china.updateController();
    expect(haikou.controller().name()).toBe("Japan");

    //Conquering China
    chineseInfantry.die();
    for(let hex of Countries.china.cities){
        const unit = new Infantry(1, 4, Countries.japan);
        unit.setHex(hex);
        hex.setController(Countries.japan);
    }
    Countries.china.updateController();
    Countries.china.conquerOrLiberate();
    expect(Countries.china.conquered()).toBe(true);
    expect(Countries.china.hasBeenConquered()).toBe(true);
    expect(Countries.china.money).toBe(0);
    expect(Countries.china.income()).toBe(0);
    const hangzhou = Hex.fromCoordinates(261, 153);    //The resource hex next to Shanghai, not a city in this game
    expect(hangzhou.controller().name()).toBe("China");    //Special rule for China: it can still control its own hexes even though it's conquered

    //If a Japanese unit leaves a Chinese city empty, China is liberated
    const [japaneseConqueringUnit] = beijing.landUnits();
    japaneseConqueringUnit.die();
    Countries.china.updateController();
    Countries.china.conquerOrLiberate();
    expect(Countries.china.conquered()).toBe(false);
    expect(Countries.china.hasBeenConquered()).toBe(true);
    expect(Countries.china.income()).toBeGreaterThan(0);

    //Chinese liberated forces (should always be 5 no matter how many extra Chinese units were created in the unit tests because China has more than 5 strength points in the real game anyway)
    expect(Countries.china.delayedUnits.get(date.current).size + Countries.china.availableUnits.size).toBeGreaterThan(5);
});

test("Italian surrender", () => {
    Countries.italy.joinPartnership(Partnership.Axis);
    Countries.unitedStates.joinPartnership(Partnership.Allies);
    Countries.germany.joinPartnership(Partnership.Axis);

    const palermo = Hex.allCityHexes.find(it => it.city === "Palermo");
    const venice = Hex.allCityHexes.find(it => it.city === "Venice");

    //Italy should surrender if all colony cities and one non-colony city are occupied
    for(let colonyCity of Countries.italy.cities.filter(it => it.isColony)){
        colonyCity.setController(Countries.unitedStates);
    }
    palermo.setController(Countries.unitedStates);
    Countries.italy.conquerOrLiberate();
    expect(Countries.italy.conquered()).toBe(true);
    expect(Countries.italy.hasBeenConquered()).toBe(true);
    expect(venice.controller().name()).not.toBe("Italy");
    expect(venice.controller().partnership()).toBe(Partnership.Axis);
    expect(palermo.controller().partnership()).toBe(Partnership.Allies);
    expect(Countries.italy.money).toBe(0);
    expect(Countries.italy.income()).toBe(0);

    //Italy can't be liberated
    for(let city of Countries.italy.cities){
        city.setController(Countries.germany);
    }
    Countries.italy.conquerOrLiberate();
    expect(Countries.italy.conquered()).toBe(true);
    expect(Countries.italy.hasBeenConquered()).toBe(true);
});

test("Finnish surrender", () => {
    Countries.sovietUnion.joinPartnership(Partnership.Allies);
    expect(Countries.finland.partnership()).toBe(Partnership.Axis);
    Countries.germany.joinPartnership(Partnership.Axis);
    Countries.unitedKingdom.joinPartnership(Partnership.Axis);

    expect(Countries.finland.canSurrender(Partnership.Axis)).toBe(false);
    expect(Countries.finland.canSurrender(Partnership.Allies)).toBe(false);

    const viborg = Hex.fromCoordinates(177, 168);
    const petsamo = Hex.fromCoordinates(183, 159);
    const kexholm = Hex.fromCoordinates(179, 168);
    const enso = Hex.fromCoordinates(178, 168);
    const helsinki = Hex.allCityHexes.find(it => it.city === "Helsinki");
    const turku = Hex.allCityHexes.find(it => it.city === "Turku");
    const sovietInfantries = new Array(4).fill(null).map(() => new Infantry(5, 3, Countries.sovietUnion));
    const britishInfantry = new Infantry(5, 3, Countries.unitedKingdom);
    const finnishInfantry = new Infantry(1, 3, Countries.finland);
    const germanBasedAirUnit = new AirUnit("ME-110C", Countries.germany);
    const germanUnbasedAirUnit = new AirUnit("ME-110C", Countries.germany);
    const germanShip = new TransportShip(Countries.germany);
    const germanEmbarkedUnit = new Infantry(1, 3, Countries.germany);
    sovietInfantries[0].setHex(viborg);
    sovietInfantries[1].setHex(viborg);
    viborg.setController(Countries.sovietUnion);
    sovietInfantries[2].setHex(petsamo);
    britishInfantry.setHex(petsamo);
    finnishInfantry.setHex(enso);
    germanBasedAirUnit.setHex(turku);
    germanBasedAirUnit.based = true;
    germanUnbasedAirUnit.setHex(helsinki);
    germanShip.setHex(turku);
    germanEmbarkedUnit.embarkOnto(germanShip);

    const konigsberg = Hex.allCityHexes.find(it => it.city === "Königsberg");
    konigsberg.setController(Countries.unitedKingdom);

    //Other allied countries don't affect Finnish surrender
    expect(Countries.finland.canSurrender(Partnership.Axis)).toBe(false);
    expect(Countries.finland.canSurrender(Partnership.Allies)).toBe(false);

    //Only the Soviet Union affects Finnish surrender
    konigsberg.setController(Countries.sovietUnion);
    sovietInfantries[3].setHex(kexholm);
    kexholm.setController(Countries.sovietUnion);
    expect(Countries.finland.canSurrender(Partnership.Axis)).toBe(false);
    expect(Countries.finland.canSurrender(Partnership.Allies)).toBe(true);

    //Effects of Finnish surrender
    sovietInfantries[3].setHex(helsinki);
    helsinki.setController(Countries.sovietUnion);
    kexholm.setController(Countries.finland);
    expect(Countries.finland.canSurrender(Partnership.Allies)).toBe(true);
    Countries.finland.surrender();
    expect(viborg.controller().name()).toBe("Soviet Union");
    expect(petsamo.controller().name()).toBe("Soviet Union");
    expect(kexholm.controller().name()).toBe("Soviet Union");
    expect(helsinki.controller().name()).toBe("Finland");
    expect(Countries.finland.partnership()).toBe(Partnership.Neutral);

    //Units in Soviet occupied Finland should be unaffected unless they're Finnish, units in the rest of Finland should be eliminated
    expect(britishInfantry.isAlive()).toBe(true);
    expect(sovietInfantries[0].isAlive()).toBe(true);
    expect(sovietInfantries[1].isAlive()).toBe(true);
    expect(sovietInfantries[2].isAlive()).toBe(true);
    expect(sovietInfantries[3].isAlive()).toBe(false);
    expect(finnishInfantry.isAlive()).toBe(false);

    //Air and naval units should still be alive but unbased/outside of ports
    expect(germanBasedAirUnit.isAlive()).toBe(false);
    expect(germanUnbasedAirUnit.isAlive()).toBe(false)
    expect(germanShip.isAlive()).toBe(false);
    expect(germanEmbarkedUnit.isAlive()).toBe(false);
});

test("Vichy France creation", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    Countries.japan.joinPartnership(Partnership.Axis);
    Countries.france.joinPartnership(Partnership.Allies);
    Countries.unitedKingdom.joinPartnership(Partnership.Allies);
    Countries.china.joinPartnership(Partnership.Allies);

    const paris = Hex.allCityHexes.find(it => it.city === "Paris");
    const lille = Hex.allCityHexes.find(it => it.city === "Lille");
    const leHavre = Hex.allCityHexes.find(it => it.city === "Le Havre");
    const bordeaux = Hex.allCityHexes.find(it => it.city === "Bordeaux");
    const strasbourg = Hex.allCityHexes.find(it => it.city === "Strasbourg");
    const brest = Hex.allCityHexes.find(it => it.city === "Brest");
    const vichy = Hex.allCityHexes.find(it => it.city === "Vichy");
    const marseille = Hex.allCityHexes.find(it => it.city === "Marseille");
    const tunis = Hex.allCityHexes.find(it => it.city === "Tunis");
    const haiphong = Hex.allCityHexes.find(it => it.city === "Haiphong");
    const hanoi = Hex.allCityHexes.find(it => it.city === "Hanoi");
    const saigon = Hex.allCityHexes.find(it => it.city === "Saigon");
    const noumea = Hex.allCityHexes.find(it => it.city === "Noumea");

    //Controlling one city isn't enough to create Vichy France
    lille.setController(Countries.germany);
    expect(Countries.france.canAttemptVichy(Partnership.Axis)).toBe(false);
    expect(Countries.france.canAttemptVichy(Partnership.Allies)).toBe(false);

    //Controlling Paris is enough to create Vichy France
    paris.setController(Countries.germany);
    expect(Countries.france.canAttemptVichy(Partnership.Axis)).toBe(true);
    expect(Countries.france.canAttemptVichy(Partnership.Allies)).toBe(false);

    //Effects of creating Vichy France
    const frenchInfantry = new Infantry(1, 3, Countries.france);
    const germanInfantry1 = new Infantry(1, 3, Countries.germany);
    const germanInfantry2 = new Infantry(1, 3, Countries.germany);
    const britishInfantry1 = new Infantry(1, 4, Countries.unitedKingdom);
    const britishInfantry2 = new Infantry(1, 4, Countries.unitedKingdom);
    const chineseInfantry = new Infantry(1, 3, Countries.china);
    const japaneseInfantry = new Infantry(1, 4, Countries.japan);
    const britishBasedAirUnit = new AirUnit("Spitfire", Countries.unitedKingdom);
    const britishUnbasedAirUnit = new AirUnit("Spitfire", Countries.unitedKingdom);
    const britishShipInPort = new TransportShip(Countries.unitedKingdom);
    const britishShipOutsidePort = new TransportShip(Countries.unitedKingdom);
    const britishEmbarkedInfantry = new Infantry(1, 4, Countries.unitedKingdom);

    frenchInfantry.setHex(bordeaux);
    germanInfantry1.setHex(paris);
    germanInfantry2.setHex(vichy);
    vichy.setController(Countries.germany);
    britishInfantry1.setHex(leHavre);
    britishInfantry2.setHex(marseille);
    chineseInfantry.setHex(hanoi);
    japaneseInfantry.setHex(haiphong);
    haiphong.setController(Countries.japan);
    britishBasedAirUnit.setHex(marseille);
    britishBasedAirUnit.based = true;
    britishUnbasedAirUnit.setHex(vichy);
    britishShipInPort.setHex(marseille);
    britishEmbarkedInfantry.embarkOnto(britishShipInPort);
    britishShipOutsidePort.setHex(marseille);

    expect(Countries.france.name()).toBe("France");
    Countries.france.createVichy();
    expect(Countries.france.name()).toBe("Vichy France");

    //French units should be eliminated
    expect(frenchInfantry.isAlive()).toBe(false);

    //Units in occupied France should survive
    expect(germanInfantry1.isAlive()).toBe(true);
    expect(britishInfantry1.isAlive()).toBe(true);

    //Land units in Vichy France should be returned for free next turn
    expect(germanInfantry2.isAlive()).toBe(false);
    expect(Countries.germany.delayedUnits.get(date.current)).toContain(germanInfantry2);
    expect(britishInfantry2.isAlive()).toBe(false);
    expect(Countries.unitedKingdom.delayedUnits.get(date.current)).toContain(britishInfantry2);

    //Air and naval units should still be alive but unbased/outside of ports
    expect(britishBasedAirUnit.isAlive()).toBe(false);
    expect(britishUnbasedAirUnit.isAlive()).toBe(false);
    expect(britishShipInPort.isAlive()).toBe(false);
    expect(britishShipOutsidePort.isAlive()).toBe(false);
    expect(britishEmbarkedInfantry.isAlive()).toBe(false);

    //Units in Indochina should be unaffected
    expect(chineseInfantry.isAlive()).toBe(true);
    expect(japaneseInfantry.isAlive()).toBe(true);

    //France should be neutral and have no money
    expect(Countries.france.partnership()).toBe(Partnership.Neutral);
    expect(Countries.france.money).toBe(0);

    //France should gain control of all hexes in Vichy France
    expect(vichy.controller().name()).toBe("Vichy France");
    expect(marseille.controller().name()).toBe("Vichy France");
    expect(tunis.controller().name()).toBe("Vichy France");

    //Germany should gain control of all hexes in occupied France except those occupied by non-French Allied units
    expect(paris.controller().name()).toBe("Germany");
    expect(lille.controller().name()).toBe("Germany");
    expect(bordeaux.controller().name()).toBe("Germany");
    expect(strasbourg.controller().name()).toBe("Germany");
    expect(brest.controller().name()).toBe("Germany");
    expect(leHavre.controller().name()).not.toBe("Vichy France");
    expect(leHavre.controller().partnership()).toBe(Partnership.Allies);

    //Japan should gain control of all hexes in Indochina except those occupied by non-French Allied units
    expect(haiphong.controller().name()).toBe("Japan");
    expect(saigon.controller().name()).toBe("Japan");
    expect(hanoi.controller().name()).not.toBe("Vichy France");
    expect(hanoi.controller().partnership()).toBe(Partnership.Allies);

    //The UK should gain control of certain French colonies
    expect(noumea.controller().name()).toBe("United Kingdom");

    //France should be considered conquered
    expect(Countries.france.conquered()).toBe(true);
    expect(Countries.france.hasBeenConquered()).toBe(true);
});
