import { expect, test } from "vitest";

import { Hex } from "../build/model/mapsheet.js";
import { Partnership } from "../build/model/partnership.js";
import { Countries } from "../build/model/countries.js";
import { date } from "../build/model/date.js";

test("Vichy France attacked by Axis", () => {
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

    //Create Vichy France
    paris.setController(Countries.germany);
    Countries.france.createVichy();

    //France should be considered conquered
    expect(Countries.france.conquered()).toBe(true);
    expect(Countries.france.hasBeenConquered()).toBe(true);

    //Gaining control of one city isn't enough to liberate Vichy France
    expect(Countries.france.canBeInvadedBy(Partnership.Axis)).toBe(true);
    Countries.france.joinPartnership(Partnership.Allies);
    expect(Countries.france.name()).toBe("France");

    //France is still considered conquered as long as the Allies haven't liberated the occupied part
    expect(Countries.france.conquered()).toBe(true);
    expect(Countries.france.hasBeenConquered()).toBe(true);
    expect(Countries.france.delayedUnits.get(date.current)?.size ?? 0).toBe(0);

    //It's not enough to liberate occupied france if the Axis has gained control of a city in Vichy France
    vichy.setController(Countries.germany);
    paris.setController(Countries.unitedKingdom);
    lille.setController(Countries.unitedKingdom);
    leHavre.setController(Countries.unitedKingdom);
    bordeaux.setController(Countries.unitedKingdom);
    strasbourg.setController(Countries.unitedKingdom);
    brest.setController(Countries.unitedKingdom);
    Countries.france.conquerOrLiberate();
    expect(Countries.france.conquered()).toBe(true);
    expect(Countries.france.hasBeenConquered()).toBe(true);

    //It should be possible to liberate France by liberating Vichy France as well
    vichy.setController(Countries.unitedKingdom);
    Countries.france.conquerOrLiberate();
    expect(Countries.france.conquered()).toBe(false);
    expect(Countries.france.hasBeenConquered()).toBe(true);

    //Liberated forces
    expect(Countries.france.delayedUnits.get(date.current).size).toBe(5);
});
