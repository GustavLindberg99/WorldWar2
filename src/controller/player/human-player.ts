import Player from "./player.js";

import { Hex } from "../../model/mapsheet.js";
import { Partnership } from "../../model/partnership.js";
import { Countries, Country } from "../../model/countries.js";
import { AirUnit, NavalUnit, Unit } from "../../model/units.js";
import { Phase } from "../../model/phase.js";

import LeftPanel from "../../view/left-panel.js";
import RunCombat from "../../view/combat/run-combat.js";
import UnitMarker from "../../view/markers/unit-marker.js";

import HumanAmphibiousParadropPhase from "../human-phases/human-amphibious-paradrop-phase.js";
import HumanCombatPhase from "../human-phases/human-combat-phase.js";
import HumanDeploymentPhase from "../human-phases/human-deployment-phase.js";
import HumanInterceptionPhase from "../human-phases/human-interception-phase.js";
import HumanMoneyExchange from "../human-phases/human-money-exchange.js";
import HumanMovementPhase from "../human-phases/human-movement-phase.js";
import HumanUnitBuildPhase from "../human-phases/human-unit-build-phase.js";

export default class HumanPlayer extends Player {
    override async incomePhase(): Promise<void> {
        super.incomePhase();

        const humanMoneyExchange = new HumanMoneyExchange(this.partnership);
        await humanMoneyExchange.run();
    }

    /**
     * Runs the player's deployment phase. Async function that does not return until the phase is finished.
     */
    async deploymentPhase(): Promise<void> {
        const humanDeploymentPhase = new HumanDeploymentPhase(this.partnership);
        await humanDeploymentPhase.run();
    }

    override async unitBuildPhase(): Promise<void> {
        const humanUnitBuildPhase = new HumanUnitBuildPhase(this.partnership);
        await humanUnitBuildPhase.run();
    }

    override async overrunPhase(): Promise<void> {
        const humanCombatPhase = new HumanCombatPhase(this.partnership, true);
        await humanCombatPhase.run();
        for(let unit of this.partnership.landUnits().filter(it => it.hasAttacked)){
            unit.hasAttacked = false;
            UnitMarker.get(unit).update();
        }
    }

    override async firstMovementPhase(): Promise<Map<Unit, ReadonlyArray<Hex>>> {
        LeftPanel.clear();
        const humanMovementPhase = new HumanMovementPhase(this.partnership);
        await humanMovementPhase.run("To interception phase");
        return humanMovementPhase.passedHexes;
    }

    override async interceptionPhase(passedHexesByUnit: Map<Unit, ReadonlyArray<Hex>>, interceptions: Array<[AirUnit, AirUnit | NavalUnit]> | null): Promise<void> {
        interceptions ??= [];

        const startIndex = interceptions.length;
        const humanInterceptionPhase = new HumanInterceptionPhase(this.partnership, passedHexesByUnit, interceptions);
        await humanInterceptionPhase.run("To opponent's interception");

        if(humanInterceptionPhase.passedHexes.size > 0){
            for(let [newUnit, newPassedHexes] of humanInterceptionPhase.passedHexes){
                passedHexesByUnit.set(newUnit, newPassedHexes);
            }
            await this.opponent().interceptionPhase(passedHexesByUnit, interceptions);
            await RunCombat.runInterceptions(interceptions, startIndex, passedHexesByUnit);
        }
    }

    override async amphibiousParadropPhase(): Promise<void> {
        const humanAmphibiousParadropPhase = new HumanAmphibiousParadropPhase(this.partnership);
        await humanAmphibiousParadropPhase.run();
    }

    override async combatPhase(): Promise<void> {
        const humanCombatPhase = new HumanCombatPhase(this.partnership, false);
        await humanCombatPhase.run();
    }

    override async secondMovementPhase(): Promise<void> {
        LeftPanel.clear();
        const humanMovementPhase = new HumanMovementPhase(this.partnership);
        let nextPhase: string;
        if((this.partnership === Partnership.Allies && Phase.current === Phase.AlliedSecondMovement) || (this.partnership === Partnership.Axis && Phase.current === Phase.AxisSecondMovement)){
            nextPhase = "To opponent landing air units";
        }
        else if(this.partnership === Partnership.Axis){
            nextPhase = "To supply phase";
        }
        else{
            nextPhase = "To your main phase";
        }
        await humanMovementPhase.run(nextPhase);
    }

    override async warDeclarationPhase(): Promise<void> {
        LeftPanel.clear();

        const invadeableCountries = Countries.all().filter(it => it.canBeInvadedBy(this.partnership));
        const activateableCountries = Countries.all().filter(it => it.canBeActivated(this.partnership));

        if(invadeableCountries.length === 0 && activateableCountries.length === 0 && !Countries.france.canAttemptVichy(this.partnership) && !Countries.finland.canSurrender(this.partnership)){
            LeftPanel.appendParagraph("You can't invade any countries. Click Next to continue.");
        }

        //Vichy France and Finnish surrender
        let vichyCheckbox: HTMLInputElement | null = null;
        if(Countries.france.canAttemptVichy(this.partnership)){
            LeftPanel.appendParagraph("Do you want to attempt to create Vichy France? If you do, you have a 75% chance to succeed. If you fail or if you don't want to attempt to create Vichy France, you won't be able to do it again.");
            vichyCheckbox = LeftPanel.appendCheckbox("Attempt to create Vichy France (75% chance of succeeding)");
        }

        let finnishSurrenderCheckbox: HTMLInputElement | null = null;
        if(Countries.finland.canSurrender(this.partnership)){
            LeftPanel.appendParagraph("Do you want to attempt to have Finland surrender? If you do, Finland will be considered conquered and all hexes in Finland west of the temporary border will become neutral territory, and all units in those hexes will be eliminated. The Soviet Union will gain control of all hexes in Finland east of the temporary border. If you don't, you won't be able to do it in the future.");
            finnishSurrenderCheckbox = LeftPanel.appendCheckbox("Have Finland surrender");
        }

        //Activation of friendly countries
        let activationCheckboxes: Map<Country, HTMLInputElement> = new Map();
        if(activateableCountries.length > 0 || invadeableCountries.includes(Countries.sovietUnion)){
            LeftPanel.appendParagraph("Click on the countries you want to enter the war on your side. If you don't want to do anything, click Pass.");
            for(let country of activateableCountries){
                activationCheckboxes.set(country, LeftPanel.appendCheckbox(country.name()));
            }
        }
        if(invadeableCountries.includes(Countries.sovietUnion)){
            const text = Countries.finland.name() + " (will enter the war on your side if you attack the Soviet Union)";
            const finlandCheckbox = LeftPanel.appendCheckbox(text);
            finlandCheckbox.disabled = true;
            activationCheckboxes.set(Countries.finland, finlandCheckbox);
        }

        //Create checkboxes for invading countries
        let invasionCheckboxes: Map<Country, HTMLInputElement> = new Map();
        if(invadeableCountries.length > 0){
            LeftPanel.appendParagraph("Click on the neutral countries you want to declare war on. If you don't want to declare war on any neutral country, click Pass.");
            for(let country of invadeableCountries){
                let text = country.name();
                if(country === Countries.mongolia && Countries.sovietUnion.partnership() !== Partnership.Axis){
                    text += " (will allow Japan and the Soviet Union to attack each other)";
                }
                if(country === Countries.poland && this.partnership === Partnership.Axis && Countries.germany.partnership() === Partnership.Axis && Countries.sovietUnion.partnership() === Partnership.Neutral){
                    text += " (the Soviet Union will gain control of hexes in eastern Poland, eastern Romania, southeastern Finland and the Baltics)";
                }
                invasionCheckboxes.set(country, LeftPanel.appendCheckbox(country.name()));
            }
        }

        //Force checkboxes to be checked when countries must be invaded
        for(let [changedCountry, changedCheckbox] of invasionCheckboxes){
            changedCheckbox.onchange = () => {
                for(let [country, checkbox] of invasionCheckboxes){
                    if(country === changedCountry){
                        continue;
                    }
                    const mustBeInvaded = invasionCheckboxes.entries().some(it =>
                        it[1].checked
                        && !it[1].disabled
                        && it[0].additionalInvadedCountries(this.partnership).includes(country)
                    );
                    if(checkbox.disabled || !checkbox.checked){
                        checkbox.checked = mustBeInvaded;
                    }
                    checkbox.disabled = mustBeInvaded;
                }
                const finlandCheckbox = activationCheckboxes.get(Countries.finland);
                if(finlandCheckbox !== undefined){
                    finlandCheckbox.checked = invasionCheckboxes.get(Countries.sovietUnion)?.checked ?? false;
                }
            };
        }

        await LeftPanel.waitForNextButtonPressed("To result of war declaration phase");

        let unitsToUpdate: Array<Unit> = [];
        if(vichyCheckbox?.checked){
            unitsToUpdate.push(...Unit.allAliveUnits().filter(it => it.owner === Countries.france || it.hex().country === Countries.france));
            Countries.france.attemptVichy();
        }
        if(finnishSurrenderCheckbox?.checked){
            unitsToUpdate.push(...Unit.allAliveUnits().filter(it => it.owner === Countries.finland || it.hex().country === Countries.finland));
            Countries.finland.surrender();
        }
        for(let unit of unitsToUpdate){
            UnitMarker.get(unit).update();
        }
        for(let [country, checkbox] of activationCheckboxes){
            if(checkbox.checked){
                if(country === Countries.spain && Math.random() >= 0.25){
                    Countries.spain.hasAttemptedActivation = true;
                    continue;
                }
                country.joinPartnership(this.partnership);
            }
        }
        for(let [country, checkbox] of invasionCheckboxes){
            if(checkbox.checked){
                country.joinPartnership(this.opponent().partnership);
            }
        }
    }
}
