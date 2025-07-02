import { expect, test } from "vitest";

import { Hex } from "../build/model/mapsheet.js";
import { Partnership } from "../build/model/partnership.js";
import { Countries } from "../build/model/countries.js";
import { Infantry } from "../build/model/units.js";
import { date } from "../build/model/date.js";

test("Vichy France liberation", () => {
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
    const haiphong = Hex.allCityHexes.find(it => it.city === "Haiphong");
    const hanoi = Hex.allCityHexes.find(it => it.city === "Hanoi");
    const saigon = Hex.allCityHexes.find(it => it.city === "Saigon");
    const noumea = Hex.allCityHexes.find(it => it.city === "Noumea");

    //Create Vichy France
    paris.setController(Countries.germany);
    const japaneseUnit = new Infantry(1, 4, Countries.japan);
    japaneseUnit.setHex(haiphong);
    haiphong.setController(Countries.japan);
    Countries.france.createVichy();

    //France should be considered conquered
    expect(Countries.france.conquered()).toBe(true);
    expect(Countries.france.hasBeenConquered()).toBe(true);

    //Gaining control of one city isn't enough to liberate Vichy France
    paris.setController(Countries.unitedKingdom);
    Countries.france.conquerOrLiberate();
    expect(Countries.france.conquered()).toBe(true);
    expect(Countries.france.hasBeenConquered()).toBe(true);

    //Liberating Vichy France
    lille.setController(Countries.unitedKingdom);
    leHavre.setController(Countries.unitedKingdom);
    bordeaux.setController(Countries.unitedKingdom);
    strasbourg.setController(Countries.unitedKingdom);
    brest.setController(Countries.unitedKingdom);
    Countries.france.conquerOrLiberate();
    expect(Countries.france.conquered()).toBe(false);
    expect(Countries.france.hasBeenConquered()).toBe(true);
    expect(Countries.france.name()).toBe("France");
    expect(lille.controller().name()).toBe("France");
    expect(leHavre.controller().name()).toBe("France");
    expect(hanoi.controller().name()).toBe("France");
    expect(noumea.controller().name()).toBe("France");
    expect(saigon.controller().name()).toBe("France");
    expect(haiphong.controller().name()).toBe("Japan");    //Because there's a Japanese land unit there

    //Liberated forces
    expect(Countries.france.delayedUnits.get(date.current).size).toBe(5);
});
