import lodash from "https://cdn.jsdelivr.net/npm/lodash@4.17.21/+esm";
import { addToMapOfSets, joinIterables, sortNumber } from "../../utils.js";

import Player from "./player.js";

import { Hex, SupplyLines } from "../../model/mapsheet.js";
import { Partnership } from "../../model/partnership.js";
import { Countries, Country } from "../../model/countries.js";
import { AirUnit, AliveUnit, Armor, Convoy, Infantry, LandUnit, NavalUnit, Paratrooper, Submarine, SupplyUnit, TransportShip, Unit } from "../../model/units.js";
import { date, Month } from "../../model/date.js";
import { Phase } from "../../model/phase.js";
import { UnitCombat } from "../../model/combat.js";

import HexMarker from "../../view/markers/hex-marker.js";
import LeftPanel from "../../view/left-panel.js";
import RunCombat from "../../view/combat/run-combat.js";
import UnitMarker from "../../view/markers/unit-marker.js";

import AirNavalAutoplacement from "../computer-player-algorithms/autoplace/air-naval-unit-autoplacement.js";
import ComputerCombatPhase from "../computer-player-algorithms/computer-combat-phase.js";
import ComputerMovementPhase from "../computer-player-algorithms/computer-movement-phase.js";
import FrontLine from "../computer-player-algorithms/front-line.js";
import LandAutoplacement from "../computer-player-algorithms/autoplace/land-unit-autoplacement.js";

export default class ComputerPlayer extends Player {
    #hasDecidedOnSwedenInvasion: boolean = true;

    override async incomePhase(): Promise<void> {
        super.incomePhase();

        //Send lend lease to the Soviet Union if needed
        if(this.partnership === Partnership.Allies && Countries.sovietUnion.cities.find(it => it.city === "Murmansk")!!.controller() === Countries.sovietUnion){
            const baseMaxMoneyToSovetUnion = 4000 - Countries.sovietUnion.money + 1000;
            this.#putMoneyOnConvoys(Countries.unitedStates, Countries.sovietUnion, baseMaxMoneyToSovetUnion * Math.random());
            this.#putMoneyOnConvoys(Countries.unitedKingdom, Countries.sovietUnion, baseMaxMoneyToSovetUnion * Math.random());
            this.#putMoneyOnConvoys(Countries.canada, Countries.sovietUnion, baseMaxMoneyToSovetUnion * Math.random());
        }

        //Send money on convoys across the Atlantic
        if(this.partnership === Partnership.Allies){
            this.#putMoneyOnConvoys(Countries.canada, Countries.unitedKingdom);
        }
    }

    /**
     * Puts money on convoys so that it can be sent to the receiver.
     *
     * @param sender    The country sending the money (where the convoys are).
     * @param receiver  The country to send the money to.
     * @param maxAmount The max amount to send. Will never send more than this, and will never send more than sender.maxMoneyExchange().
     */
    #putMoneyOnConvoys(sender: Country, receiver: Country, maxAmount: number = Infinity): void {
        if(
            sender.partnership() === this.partnership
            && receiver.partnership() === this.partnership
            && !receiver.conquered()
            && receiver.cities.some(it => it.isPort() && it.controller()!!.partnership() === this.partnership)
        ){
            const max = Math.floor(Math.min(sender.maxMoneyExchange(), maxAmount) / 10) * 10;
            let totalAmount = 0;
            for(let convoy of this.partnership.convoys(sender)){
                convoy.destination = receiver;
                const amount = Math.min(Convoy.maxMoney, max - totalAmount);
                convoy.money = amount;
                totalAmount += amount;
            }
            sender.money -= totalAmount;
        }
    }

    /**
     * Runs the player's deployment phase. Async function that does not return until both players' deployement phases are finished.
     *
     * @param opponentDeploymentPhase   A promise resolving at the end of the human player's deployment phase. Used to determine when the units should be shown.
     */
    async deploymentPhase(opponentDeploymentPhase: Promise<void>): Promise<void> {
        //Lock the next button
        const nextButtonLockReason = "Your opponent is placing their units...";
        LeftPanel.addNextButtonLock(nextButtonLockReason);

        //Show a progress bar
        let progress = 0;
        const placementText = document.createElement("p");
        placementText.textContent = "Your opponent is placing their units...";
        LeftPanel.appendElement(placementText);
        LeftPanel.appendProgressBar(() => progress);

        //Update front line
        FrontLine.update(it => progress = it / 4);

        //Decide where to place the units
        let availableLandUnits = this.partnership.currentDelayedUnits().filter(it => it instanceof LandUnit);
        let availableNavalUnits = lodash.shuffle(this.partnership.currentDelayedUnits().filter(it => it instanceof NavalUnit));
        let availableAirUnits = lodash.shuffle(this.partnership.currentDelayedUnits().filter(it => it instanceof AirUnit)).sort((a, b) => a.movementAllowance - b.movementAllowance);
        const navalPlacements = await AirNavalAutoplacement.getNavalUnitAutoplacement(this.partnership, availableNavalUnits, it => progress = 1/4 + it / 4);
        const landPlacements = await LandAutoplacement.getLandUnitAutoplacement(this.partnership, availableLandUnits, it => progress = 1/2 + it / 4);
        const airPlacements = await AirNavalAutoplacement.getAirUnitAutoplacement(this.partnership, availableAirUnits, it => progress = 3/4 + it / 4);
        progress = 1;

        //Release the next button lock (must be done before waiting for the human player's deployment phase)
        LeftPanel.releaseNextButtonLock(nextButtonLockReason);
        placementText.textContent = "Your opponent is done placing their units.";

        //Wait for the human player to be done placing their units before showing where the units are placed
        await opponentDeploymentPhase;

        //Place the units
        LandAutoplacement.placeLandUnits(landPlacements);
        AirNavalAutoplacement.placeAirNavalUnits(airPlacements);
        AirNavalAutoplacement.placeAirNavalUnits(navalPlacements);

        //Add units that could not be placed to the available units
        for(let unit of availableLandUnits){
            if(!landPlacements.has(unit)){
                unit.owner.availableUnits.add(unit);
            }
        }
        for(let unit of availableAirUnits){
            if(!airPlacements.has(unit)){
                unit.owner.availableUnits.add(unit);
            }
        }
        for(let unit of availableNavalUnits){
            if(!navalPlacements.has(unit)){
                unit.owner.availableUnits.add(unit);
            }
        }

        //Transfer as much strength as possible to the strongest land unit in each hex
        for(let unit of this.partnership.landUnits()){
            if(unit.embarkedOn() !== null || !unit.isAlive() || unit.maxStrength() <= 1 || unit.outOfSupply()){
                continue;
            }
            const otherUnit = unit.hex().landUnits().find(it => it !== unit && it.sameType(unit));
            while(otherUnit?.isAlive() && unit.strength < unit.maxStrength()){
                unit.strength++;
                if(otherUnit.strength === 1){
                    otherUnit.delete();
                }
                else{
                    otherUnit.strength--;
                }
                UnitMarker.get(unit).update();
                UnitMarker.get(otherUnit).update();
            }
        }

        //Repair installations and air units
        for(let hex of Hex.allHexes){
            const controller = hex.controller();
            if((hex.resourceHexDestroyed || hex.installationsDestroyed) && controller?.partnership() === this.partnership && controller.money >= 200 + Math.random() * 10000){
                controller.money -= 200;
                hex.repairInstallations();
            }
        }

        //Remove the units that have already been placed
        for(let country of this.partnership.countries()){
            country.delayedUnits.delete(date.current);
        }
    }

    override async unitBuildPhase(): Promise<void> {    //This function does not contain any await, but is async so that it can override the async function in the parent class
        for(let unit of joinIterables<AliveUnit & (AirUnit | NavalUnit)>(this.partnership.airUnits(), this.partnership.navalUnits().filter(it => it.inPort()))){
            if(unit.damaged() && unit.owner.money >= 200){
                unit.owner.money -= 200;
                unit.repair();
                UnitMarker.get(unit).update();
            }
        }
        const ownerIsInvaded = (unitToBuy: Unit) => unitToBuy.owner.cities.some(it => !it.isColony && it.controller()!!.partnership() !== it.country!!.partnership());
        const canUseConvoys = this.partnership.countries().some(a => !a.conquered() && this.partnership.countries().some(b => !b.conquered() && a.canSendMoneyWithConvoys().includes(b)));
        const orderedAvailableUnits =   //The available units ordered so that the ones he wants most are first
            lodash.shuffle([...this.partnership.availableUnits()])
            .sort((a, b) =>
                sortNumber(b, a, unitToBuy => unitToBuy instanceof Infantry && ownerIsInvaded(unitToBuy))
                || sortNumber(b, a, unitToBuy => unitToBuy instanceof Armor && ownerIsInvaded(unitToBuy))
            ).filter(it => canUseConvoys || !(it instanceof Convoy));
        for(let unit of orderedAvailableUnits){
            if(unit.owner.money < unit.price()){
                continue;
            }
            unit.owner.availableUnits.delete(unit);
            unit.owner.money -= unit.price();
            addToMapOfSets(unit.owner.delayedUnits, date.current + unit.delay(), unit);
        }
    }

    override async overrunPhase(): Promise<void> {
        const computerCombatPhase = new ComputerCombatPhase(this.partnership, true);
        await computerCombatPhase.run();
        for(let unit of this.partnership.landUnits().filter(it => it.hasAttacked)){
            unit.hasAttacked = false;
            UnitMarker.get(unit).update();
        }
    }

    override async firstMovementPhase(): Promise<Map<Unit, ReadonlyArray<Hex>>> {
        const computerMovementPhase = new ComputerMovementPhase(this.partnership);
        await computerMovementPhase.run("To interception phase");
        return computerMovementPhase.passedHexes;
    }

    override async interceptionPhase(passedHexesByUnit: Map<Unit, ReadonlyArray<Hex>>, interceptions: Array<[AirUnit, AirUnit | NavalUnit]> | null): Promise<void> {
        const topLevel = interceptions === null;
        interceptions ??= [];
        const startIndex = interceptions.length;
        for(let [enemyUnit, passedHexes] of passedHexesByUnit.entries().filter(it => it[0].owner.partnership() !== this.partnership)){
            //Checking for instanceof LandUnit is very important because bombers can attack land units but not alone, so canAttack() below would return true otherwise
            if((!(enemyUnit instanceof AirUnit) && !(enemyUnit instanceof NavalUnit)) || enemyUnit instanceof Submarine || passedHexes.length <= 1 || passedHexes.every(it => it.airUnitsGrounded())){
                continue;
            }
            const alreadyPassedHexes = passedHexes.slice(0, passedHexes.indexOf(enemyUnit.hex()!!) + 1);
            const interceptor = this.partnership.airUnits().find(friendlyUnit =>
                //The intercepting unit must be able to attack the enemy unit
                friendlyUnit.canAttack(enemyUnit)
                //The intercepting unit shouldn't already be occupied doing something else
                && !passedHexesByUnit.has(friendlyUnit)
                //The intercepting unit needs to be able to reach the enemy unit
                && alreadyPassedHexes.some(it => it.distanceFromHex(friendlyUnit.hex()) <= friendlyUnit.movementAllowance / 2)
                //The interception unit shouldn't be grounded
                && !friendlyUnit.hex().airUnitsGrounded()
            );
            if(interceptor === undefined){
                continue;
            }
            const interceptorPassedHexes = SupplyLines.simplifiedPathBetweenHexes(interceptor.hex(), it => alreadyPassedHexes.includes(it), it => !it.airUnitsGrounded(), true, true);
            //This needs to be checked for because it can happen for example that there's a neutral country in the way
            if(interceptorPassedHexes === null || interceptorPassedHexes.length - 1 > interceptor.movementAllowance / 2 || !interceptor.validateMovement(interceptorPassedHexes, false)){
                continue;
            }
            passedHexesByUnit.set(interceptor, interceptorPassedHexes);
            interceptions.push([interceptor, enemyUnit]);
            const interceptionHex = interceptorPassedHexes.at(-1)!!;
            interceptor.setHex(interceptionHex);
            enemyUnit.setHex(interceptionHex);
            UnitMarker.get(interceptor).update();
            UnitMarker.get(enemyUnit).update();
        }

        if(interceptions.length > 0){
            await this.opponent().interceptionPhase(passedHexesByUnit, interceptions);
            await RunCombat.runInterceptions(interceptions, startIndex, passedHexesByUnit);
        }
        else{
            LeftPanel.clear();
            LeftPanel.appendParagraph("Your opponent didn't intercept any of your units. Click Next to continue.");
            await LeftPanel.waitForNextButtonPressed(topLevel ? "To amphibious and paradrop phase" : "To interception combat");
        }
    }

    override async amphibiousParadropPhase(): Promise<void> {
        const assaultHexes: ReadonlySet<Hex> = new Set(
            this.partnership.landUnits()
                .filter(it => it.embarkedOn() !== null && it.hex().controller()?.partnership() === this.opponent().partnership)
                .map(it => it.hex())
        );
        for(let hex of assaultHexes){
            HexMarker.colorHex(hex, "purple");
            HexMarker.scrollToHex(hex);

            //Choose units within stacking limits
            const eligibleAmphibiousUnits: ReadonlyArray<AliveUnit & LandUnit> = [...
                hex.navalUnits()
                    .filter(it => it.owner.partnership() === this.partnership)
                    .flatMap(it => it.embarkedUnits())
                    .filter(it => it instanceof LandUnit)
            ].sort((a, b) => b.strength - a.strength);
            const eligibleParadropUnits: ReadonlyArray<AliveUnit & Paratrooper> = [...
                hex.airUnits()
                    .filter(it => it.owner.partnership() === this.partnership)
                    .flatMap(it => it.embarkedUnits())
                    .filter(it => it instanceof Paratrooper)
            ].sort((a, b) => b.strength - a.strength);
            let amphibiousUnits = new Set<AliveUnit & LandUnit>();
            let paradropUnits = new Set<AliveUnit & Paratrooper>();
            if(eligibleParadropUnits.length > 0){
                //First do a paradrop with one paratrooper
                paradropUnits.add(eligibleParadropUnits[0]);
            }
            for(let unit of eligibleAmphibiousUnits){
                //Then put in as many amphibious units as there's room for, prioritizing the strongest ones
                if(unit.canEnterHexWithinStackingLimits(hex, joinIterables(amphibiousUnits, paradropUnits))){
                    amphibiousUnits.add(unit);
                }
            }
            for(let unit of eligibleParadropUnits.slice(1)){
                //Then put in more paratroopers if there's room
                if(unit.canEnterHexWithinStackingLimits(hex, joinIterables(amphibiousUnits, paradropUnits))){
                    amphibiousUnits.add(unit);
                }
            }

            //Cancel if it's a bad idea
            const friendlyStrength = joinIterables(amphibiousUnits, paradropUnits).reduce((a, b) => a + b.strength, 0);
            const enemyStrength = hex.landUnits().filter(it => it.owner.partnership() !== this.partnership).reduce((a, b) => a + b.strength, 0);
            if(friendlyStrength < enemyStrength){
                continue;
            }

            const successProbability = UnitCombat.amphibiousParadropSuccessProbability(amphibiousUnits, paradropUnits);

            LeftPanel.clear();
            if(amphibiousUnits.size > 0){
                LeftPanel.appendParagraph("Units doing amphibious assault:");
                const amphibiousUnitContainer = document.createElement("div");
                for(let unit of amphibiousUnits){
                    amphibiousUnitContainer.appendChild(UnitMarker.get(unit).createCopyImage(true));
                }
                LeftPanel.appendElement(amphibiousUnitContainer);
            }
            if(paradropUnits.size > 0){
            LeftPanel.appendParagraph("Units doing paradrop:");
                const paradropUnitContainer = document.createElement("div");
                for(let unit of paradropUnits){
                    paradropUnitContainer.appendChild(UnitMarker.get(unit).createCopyImage(true));
                }
                LeftPanel.appendElement(paradropUnitContainer);
            }

            LeftPanel.appendParagraph(`Probability for succes: ${Math.round(successProbability * 100)}%`);
            await LeftPanel.waitForNextButtonPressed("To results");

            LeftPanel.clear();
            const success = UnitCombat.runAmphibiousParadrop(amphibiousUnits, paradropUnits);
            if(success){
                LeftPanel.appendParagraph("Assault succeeded.");
            }
            else{
                LeftPanel.appendParagraph("Assault failed.");
            }
            for(let unit of hex.units()){
                UnitMarker.get(unit).update();
            }

            await LeftPanel.waitForNextButtonPressed("Continue amphibious/paradrop phase");
            HexMarker.uncolorHex(hex);
        }
        LeftPanel.clear();
        LeftPanel.appendParagraph("Your opponent is done doing amphibious assaults and paradrops. Click Next to continue.");
        await LeftPanel.waitForNextButtonPressed("To combat");
    }

    override async combatPhase(): Promise<void> {
        const computerCombatPhase = new ComputerCombatPhase(this.partnership, false);
        await computerCombatPhase.run();
    }

    override async secondMovementPhase(): Promise<void> {
        const computerMovementPhase = new ComputerMovementPhase(this.partnership);
        let nextPhase: string;
        if((this.partnership === Partnership.Allies && Phase.current === Phase.AlliedSecondMovement) || (this.partnership === Partnership.Axis && Phase.current === Phase.AxisSecondMovement)){
            nextPhase = "To you landing air units";
        }
        else if(this.partnership === Partnership.Axis){
            nextPhase = "To supply phase";
        }
        else{
            nextPhase = "To opponent's main phase";
        }
        await computerMovementPhase.run(nextPhase);
    }

    override async warDeclarationPhase(): Promise<void> {
        const invadedCountries: Array<Country> = [];
        const activatedCountries: Array<Country> = Countries.all().filter(it => it.canBeActivated(this.partnership));
        if(Math.random() > 0.2){
            lodash.pull(activatedCountries, Countries.mongolia);
        }

        if(this.partnership === Countries.sovietUnion.partnership() && Countries.poland.partnership() !== Partnership.Neutral && Countries.latvia.cities[0].controller() === Countries.latvia){
            //If the Soviet Union hasn't invaded the Baltic states yet, do it now
            invadedCountries.push(Countries.estonia);
            invadedCountries.push(Countries.latvia);
            invadedCountries.push(Countries.lithuania);
        }
        else if(this.partnership === Partnership.Axis){
            //If Germany has entered the war and doesn't have any unconquered enemies
            if(Countries.germany.partnership() === Partnership.Axis && [Countries.belgium, Countries.poland, Countries.denmark, Countries.norway, Countries.switzerland, Countries.yugoslavia, Countries.greece].every(country => country.partnership() !== Partnership.Allies || country.conquered())){
                //If mainland Denmark is conquered, invade Norway
                if(Countries.denmark.conquered() && Countries.norway.partnership() === Partnership.Neutral){
                    invadedCountries.push(Countries.norway);
                }

                //If Norway is conquered, maybe invade Sweden
                if(date.current === date(1943, Month.January)){
                    this.#hasDecidedOnSwedenInvasion = false;    //Germany could have invaded Sweden 1943, see https://www.expressen.se/andra-varldskriget/operation-polarrav--hitlers-detaljerade-plan-for-att-invadera-sverige/
                }
                if(Countries.norway.conquered() && Countries.sweden.partnership() === Partnership.Neutral && !this.#hasDecidedOnSwedenInvasion){
                    this.#hasDecidedOnSwedenInvasion = true;
                    if(Math.random() < 0.2){
                        invadedCountries.push(Countries.sweden);
                    }
                }

                //Invade Poland or start with some other country
                else if(Countries.poland.partnership() === Partnership.Neutral){
                    if(Countries.denmark.partnership() === Partnership.Neutral && Math.random() < 0.1){
                        invadedCountries.push(Countries.denmark);
                    }
                    else if(Countries.switzerland.partnership() === Partnership.Neutral && Math.random() < 0.1){
                        invadedCountries.push(Countries.switzerland);
                    }
                    else{
                        invadedCountries.push(Countries.poland);
                    }
                }

                //Invade Denmark
                else if(Countries.denmark.partnership() === Partnership.Neutral && Math.random() < 0.8){
                    invadedCountries.push(Countries.denmark);
                }

                //Germany invades Benelux to make it easier to attack France
                else if(Countries.germany.partnership() === Partnership.Axis && Countries.france.partnership() === Partnership.Allies){
                    invadedCountries.push(Countries.netherlands);
                    invadedCountries.push(Countries.belgium);
                    invadedCountries.push(Countries.luxemburg);
                }

                //Germany invades the Soviet Union
                else if(date.current >= date(1941, Month.January) && Math.random() < 0.2 && Countries.france.conquered()){
                    invadedCountries.push(Countries.sovietUnion);
                }
            }

            //Italy invades Greece and Yugoslavia
            if(date.current >= date(1940, Month.January) && Math.random() < 0.1){
                invadedCountries.push(Countries.greece);
            }
            if(date.current >= date(1940, Month.January) && Math.random() < 0.05){
                invadedCountries.push(Countries.yugoslavia);
            }

            //Japan invades the United States and British and French colonies
            if(date.current >= date(1941, Month.January) && Math.random() < 0.2){
                invadedCountries.push(Countries.unitedStates);
            }
            if(date.current >= date(1940, Month.January) && Math.random() < 0.1){
                invadedCountries.push(Countries.unitedKingdom);
                invadedCountries.push(Countries.france);
            }
        }

        //Create Vichy France
        let unitsToUpdate: Array<Unit> = [];
        if(Countries.france.canAttemptVichy(this.partnership)){
            unitsToUpdate.push(...Unit.allAliveUnits().filter(it => it.owner === Countries.france || it.hex().country === Countries.france));
            Countries.france.attemptVichy();
        }

        //Make Finland surrender
        if(Countries.finland.canSurrender(this.partnership)){
            unitsToUpdate.push(...Unit.allAliveUnits().filter(it => it.owner === Countries.finland || it.hex().country === Countries.finland));
            Countries.finland.surrender();
        }
        for(let unit of unitsToUpdate){
            UnitMarker.get(unit).update();
        }

        //Apply the changes
        for(let country of invadedCountries){
            country.joinPartnership(this.opponent().partnership);
        }
        for(let country of activatedCountries){
            country.joinPartnership(this.partnership);
        }
    }
}
