import { expect, test } from "vitest";

import { Hex } from "../build/model/mapsheet.js";
import { Partnership } from "../build/model/partnership.js";
import { Countries } from "../build/model/countries.js";
import { date } from "../build/model/date.js";

test("Vichy France attacked by Allies", () => {
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
    const lyon = Hex.allCityHexes.find(it => it.city === "Lyon");
    const marseille = Hex.allCityHexes.find(it => it.city === "Marseille");

    //Create Vichy France
    paris.setController(Countries.germany);
    Countries.france.createVichy();

    //France should be considered conquered
    expect(Countries.france.conquered()).toBe(true);
    expect(Countries.france.hasBeenConquered()).toBe(true);

    //Gaining control of one city isn't enough to liberate Vichy France
    expect(Countries.france.canBeInvadedBy(Partnership.Allies)).toBe(true);
    Countries.france.joinPartnership(Partnership.Axis);
    expect(Countries.france.name()).toBe("Vichy France");

    //France should no longer be considered conquered after joining the Axis
    expect(Countries.france.conquered()).toBe(false);
    expect(Countries.france.hasBeenConquered()).toBe(true);

    //Vichy France gets no liberated forces when joining the Axis
    expect(Countries.france.delayedUnits.get(date.current)?.size ?? 0).toBe(0);

    //The Allies can conquer France by conquering both Vichy France, occupied France and French colonies
    paris.setController(Countries.unitedKingdom);
    lille.setController(Countries.unitedKingdom);
    leHavre.setController(Countries.unitedKingdom);
    bordeaux.setController(Countries.unitedKingdom);
    strasbourg.setController(Countries.unitedKingdom);
    brest.setController(Countries.unitedKingdom);
    Countries.france.conquerOrLiberate();
    expect(Countries.france.conquered()).toBe(false);
    expect(Countries.france.hasBeenConquered()).toBe(true);
    strasbourg.setController(Countries.germany);
    vichy.setController(Countries.unitedKingdom);
    lyon.setController(Countries.unitedKingdom);
    marseille.setController(Countries.unitedKingdom);
    Countries.france.conquerOrLiberate();
    expect(Countries.france.conquered()).toBe(false);
    expect(Countries.france.hasBeenConquered()).toBe(true);
    strasbourg.setController(Countries.unitedKingdom);
    Countries.france.conquerOrLiberate();
    expect(Countries.france.conquered()).toBe(false);    //Colonies aren't controlled yet
    expect(Countries.france.hasBeenConquered()).toBe(true);
    for(let city of Countries.france.cities){
        city.setController(Countries.unitedKingdom);
    }
    Countries.france.conquerOrLiberate();
    expect(Countries.france.conquered()).toBe(true);
    expect(Countries.france.hasBeenConquered()).toBe(true);

    //The Axis can then liberate Vichy France, but doesn't get any liberated forces
    for(let city of Countries.france.cities){
        city.setController(Countries.germany);
    }
    Countries.france.conquerOrLiberate();
    expect(Countries.france.conquered()).toBe(false);
    expect(Countries.france.hasBeenConquered()).toBe(true);
    expect(Countries.france.delayedUnits.get(date.current)?.size ?? 0).toBe(0);
});
