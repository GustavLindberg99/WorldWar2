import { expect, test } from "vitest";

import { Hex } from "../build/model/mapsheet.js";
import { Partnership } from "../build/model/partnership.js";
import { Countries } from "../build/model/countries.js";
import { AirUnit, Battleship, Infantry, SupplyUnit } from "../build/model/units.js";
import { date, Month } from "../build/model/date.js";
import { AirNavalCombat, AtomicBombing, InstallationBombing, LandCombat, StrategicBombing } from "../build/model/combat.js";

test("Land combat", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    Countries.denmark.joinPartnership(Partnership.Allies);

    const esbjerg = Hex.allCityHexes.find(it => it.city === "Esbjerg");
    const cuxhaven = Hex.fromCoordinates(162, 169);
    const holstebro = Hex.fromCoordinates(163, 167);
    const sonderborg = Hex.fromCoordinates(163, 168);
    const lubeck = Hex.allCityHexes.find(it => it.city === "Lübeck");
    const hamburg = Hex.allCityHexes.find(it => it.city === "Hamburg");
    const bremen = Hex.fromCoordinates(161, 169);
    const bremerhaven = Hex.allCityHexes.find(it => it.city === "Bremerhaven");

    /*
     * Setup:
     *  - Two German units in Cuxhaven and one Danish unit in Esbjerg participating in combat.
     *  - Two German units in Bremerhaven and one German unit each in Bremen and Lübeck to test stacking limits.
     *  - No units in Hamburg.
     */
    const germanUnit1 = new Infantry(5, 3, Countries.germany);
    germanUnit1.setHex(cuxhaven);
    const germanUnit2 = new Infantry(5, 3, Countries.germany);
    germanUnit2.setHex(cuxhaven);
    const germanUnit3 = new Infantry(5, 3, Countries.germany);
    germanUnit3.setHex(lubeck);
    const germanUnit4 = new Infantry(5, 3, Countries.germany);
    germanUnit4.setHex(bremen);
    const germanUnit5 = new Infantry(5, 3, Countries.germany);
    germanUnit5.setHex(bremerhaven);
    const germanUnit6 = new Infantry(5, 3, Countries.germany);
    germanUnit6.setHex(bremerhaven);
    const danishUnit = new Infantry(3, 3, Countries.denmark);
    danishUnit.setHex(esbjerg);

    const germanAttack = new LandCombat([germanUnit1, germanUnit2], [danishUnit]);

    //Retreats
    const danishRetreats = germanAttack.retreatableHexes();
    expect(danishRetreats.length).toBe(1);
    expect(danishRetreats[0].get(danishUnit)).toBe(holstebro);

    //Losses
    expect(germanAttack.attackerLossProbability(3)).toBeGreaterThan(0);
    expect(germanAttack.attackerLossProbability(4)).toBe(0);
    expect(germanAttack.attackerEliminationProbability()).toBe(0);
    expect(germanAttack.defenderLossProbability(1)).toBeGreaterThan(0);

    const danishAttack = new LandCombat([danishUnit], [germanUnit1, germanUnit2]);

    //Retreats
    const germanRetreats = danishAttack.retreatableHexes();
    expect(germanRetreats.some(retreat => [...retreat.values()].includes(bremen))).toBe(true);
    expect(germanRetreats.some(retreat => [...retreat.values()].includes(lubeck))).toBe(true);
    expect(germanRetreats.some(retreat => [...retreat.values()].includes(hamburg))).toBe(true);
    expect(germanRetreats.some(retreat => [...retreat.values().filter(it => it === hamburg)].length === 2)).toBe(true);
    for(let retreat of germanRetreats){
        expect(retreat.size).toBe(2);
        expect(retreat.keys()).toContain(germanUnit1);
        expect(retreat.keys()).toContain(germanUnit2);
        expect(retreat.values()).not.toContain(sonderborg);     //Because of control zones
        expect(retreat.values()).not.toContain(bremerhaven);    //Because of stacking limits
        expect(retreat.values()).not.toContain(esbjerg);        //Because it's occupied by an enemy unit
        expect([...retreat.values().filter(it => it === bremen)].length).toBeLessThanOrEqual(1);    //Because of stacking limits
        expect([...retreat.values().filter(it => it === lubeck)].length).toBeLessThanOrEqual(1);    //Because of stacking limits
    }

    //Losses
    expect(danishAttack.attackerLossProbability(3)).toBeGreaterThan(0);
    expect(danishAttack.attackerLossProbability(4)).toBe(0);
    expect(danishAttack.attackerEliminationProbability()).toBeGreaterThan(0);
    expect(danishAttack.defenderLossProbability(1)).toBeGreaterThan(0);
});

test("Combat against supply units", () => {
    Countries.japan.joinPartnership(Partnership.Axis);
    Countries.china.joinPartnership(Partnership.Allies);

    const beijing = Hex.allCityHexes.find(it => it.city === "Beijing");
    const tianjin = Hex.allCityHexes.find(it => it.city === "Tianjin");

    const chineseInfantry = new Infantry(3, 3, Countries.china);
    chineseInfantry.setHex(beijing);
    const japaneseSupplyUnit = new SupplyUnit(4, Countries.japan);
    japaneseSupplyUnit.setHex(tianjin);

    const chineseAttack = new LandCombat([chineseInfantry], [japaneseSupplyUnit]);
    expect(chineseAttack.attackerEliminationProbability()).toBe(0);
    expect(chineseAttack.attackerLossProbability(1)).toBe(0);
    expect(chineseAttack.defenderEliminationProbability()).toBe(1);
    expect(chineseAttack.defenderLossProbability(1)).toBe(1);
});

test("Naval combat", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    Countries.unitedKingdom.joinPartnership(Partnership.Allies);
    Countries.denmark.joinPartnership(Partnership.Allies);    //So that it isn't neutral to be able to test retreats correctly

    const cuxhaven = Hex.fromCoordinates(162, 169);
    const bremerhaven = Hex.allCityHexes.find(it => it.city === "Bremerhaven");
    const sea = Hex.fromCoordinates(161, 167);

    const germanShip = new Battleship("Schlesien", 3, 2, 26, Countries.germany);
    germanShip.setHex(bremerhaven);
    const britishShip = new Battleship("Rodney", 8, 7, 33, Countries.unitedKingdom);
    britishShip.setHex(sea);

    const combat = new AirNavalCombat([britishShip], [germanShip]);
    const retreats = combat.retreatableHexes();

    //Retreats
    expect(retreats.length).toBe(1);
    expect(retreats[0].get(germanShip)).toBe(cuxhaven);

    //Losses
    expect(combat.defenderCancelOrRetreatProbability()).toBeGreaterThan(0);
    expect(combat.damageProbability(germanShip)).toBeGreaterThan(0);
    expect(combat.damageProbability(britishShip)).toBeGreaterThan(0);
    expect(combat.eliminationProbability(germanShip)).toBeGreaterThan(0);
    expect(combat.eliminationProbability(britishShip)).toBeGreaterThan(0);
});

test("Air-naval combat", () => {
    Countries.japan.joinPartnership(Partnership.Axis);
    Countries.unitedStates.joinPartnership(Partnership.Allies);

    const pearlHarbor = Hex.allCityHexes.find(it => it.city === "Pearl Harbor");

    const americanShip = new Battleship("Nevada", 4, 5, 29, Countries.unitedStates);
    americanShip.setHex(pearlHarbor);

    const japaneseAirUnit = new AirUnit("A5M", Countries.japan);
    japaneseAirUnit.setHex(pearlHarbor);

    const combat = new AirNavalCombat([japaneseAirUnit], [americanShip]);

    //Regular attacks
    expect(combat.defenderCancelOrRetreatProbability()).toBeGreaterThan(0);    //Needed for interception (not in this specific case, but in general)
    expect(combat.damageProbability(americanShip)).toBeGreaterThan(0);
    expect(combat.damageProbability(japaneseAirUnit)).toBe(0);
    expect(combat.eliminationProbability(americanShip)).toBeGreaterThan(0);
    expect(combat.eliminationProbability(japaneseAirUnit)).toBe(0);

    //Kamikaze
    const initialSuccessProbabillity = combat.defenderCancelOrRetreatProbability();
    const initialDamageProbability = combat.damageProbability(americanShip);
    const initialEliminationProbability = combat.eliminationProbability(japaneseAirUnit);
    combat.kamikaze = true;
    expect(combat.defenderCancelOrRetreatProbability()).toBeGreaterThan(initialSuccessProbabillity);
    expect(combat.damageProbability(americanShip)).toBeGreaterThan(initialDamageProbability);
    expect(combat.damageProbability(japaneseAirUnit)).toBe(0);    //It will be eliminated, not damaged
    expect(combat.eliminationProbability(americanShip)).toBeGreaterThan(initialEliminationProbability);
    expect(combat.eliminationProbability(japaneseAirUnit)).toBe(1);
});

test("Air combat", () => {
    Countries.germany.joinPartnership(Partnership.Axis);
    Countries.unitedKingdom.joinPartnership(Partnership.Allies);

    const london = Hex.allCityHexes.find(it => it.city === "London");

    const germanAirUnit = new AirUnit("ME-110C", Countries.germany);
    germanAirUnit.setHex(london);
    const britishFighter = new AirUnit("Spitfire", Countries.unitedKingdom);
    britishFighter.setHex(london);
    const britishBomber = new AirUnit("Blenheim", Countries.unitedKingdom);
    britishBomber.setHex(london);

    const fighterAttack = new AirNavalCombat([germanAirUnit], [britishFighter]);
    expect(fighterAttack.defenderCancelOrRetreatProbability()).toBeGreaterThan(0);
    expect(fighterAttack.damageProbability(britishFighter)).toBeGreaterThan(0);
    expect(fighterAttack.damageProbability(germanAirUnit)).toBeGreaterThan(0);
    expect(fighterAttack.eliminationProbability(britishFighter)).toBeGreaterThan(0);
    expect(fighterAttack.eliminationProbability(germanAirUnit)).toBeGreaterThan(0);

    const bomberAttack = new AirNavalCombat([germanAirUnit], [britishBomber]);
    expect(bomberAttack.defenderCancelOrRetreatProbability()).toBeGreaterThan(0);
    expect(bomberAttack.damageProbability(britishBomber)).toBeGreaterThan(0);
    expect(bomberAttack.damageProbability(germanAirUnit)).toBe(0);
    expect(bomberAttack.eliminationProbability(britishBomber)).toBeGreaterThan(0);
    expect(bomberAttack.eliminationProbability(germanAirUnit)).toBe(0);
});

test("Bombing", () => {
    Countries.japan.joinPartnership(Partnership.Axis);
    Countries.unitedStates.joinPartnership(Partnership.Allies);

    date.current = date(1945, Month.August);

    const hiroshima = Hex.allCityHexes.find(it => it.city === "Hiroshima");

    const americanAirUnit = new AirUnit("B-29 Superfortress", Countries.unitedStates);
    americanAirUnit.setHex(hiroshima);

    //Installation bombing
    const installationBombing = new InstallationBombing([americanAirUnit]);
    expect(installationBombing.successProbability()).toBeGreaterThan(0);
    expect(installationBombing.successProbability()).toBeLessThan(1);
    expect(installationBombing.attackerDamageProbability()).toBeGreaterThan(0);
    expect(installationBombing.attackerDamageProbability()).toBeLessThan(1);
    expect(americanAirUnit.canDoInstallationBombing(hiroshima)).toBe(null);
    hiroshima.destroyInstallations();
    expect(americanAirUnit.canDoInstallationBombing(hiroshima)).not.toBe(null);

    //Strategic bombing
    const strategicBombing = new StrategicBombing([americanAirUnit]);
    expect(strategicBombing.successProbability()).toBeGreaterThan(0);
    expect(strategicBombing.successProbability()).toBeLessThan(1);
    expect(strategicBombing.attackerDamageProbability()).toBeGreaterThan(0);
    expect(strategicBombing.attackerDamageProbability()).toBeLessThan(1);
    expect(americanAirUnit.canDoStrategicBombing(hiroshima)).toBe(null);
    hiroshima.resourceHexDestroyed = true;
    expect(americanAirUnit.canDoStrategicBombing(hiroshima)).not.toBe(null);

    //Atomic bombing
    const atomicBombing = new AtomicBombing([americanAirUnit]);
    expect(atomicBombing.successProbability()).toBe(1);
    expect(atomicBombing.attackerDamageProbability()).toBe(0);
    expect(atomicBombing.surrenderProbability()).toBeGreaterThan(0);
    expect(atomicBombing.surrenderProbability()).toBeLessThan(1);
    const initialSurrenderProbability = atomicBombing.surrenderProbability();
    Countries.japan.atomicBombCount++;
    expect(atomicBombing.surrenderProbability()).toBeGreaterThan(initialSurrenderProbability);

    //Effects of atomic bombing
    hiroshima.repairInstallations();
    expect(hiroshima.airbaseCapacity()).toBeGreaterThan(0);
    expect(americanAirUnit.canDoAtomicBombing(hiroshima)).toBe(null);
    hiroshima.destroyedByAtomicBomb = true;
    expect(hiroshima.airbaseCapacity()).toBe(0);
    expect(americanAirUnit.canDoAtomicBombing(hiroshima)).not.toBe(null);

    //Atomic bomb surrender
    Countries.japan.surrenderedFromAtomicBomb = true;
    expect(Countries.japan.conquered()).toBe(false);
    Countries.japan.conquerOrLiberate();
    expect(Countries.japan.conquered()).toBe(true);
});
