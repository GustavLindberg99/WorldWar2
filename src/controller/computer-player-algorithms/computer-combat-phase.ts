import lodash from "https://cdn.jsdelivr.net/npm/lodash@4.17.21/+esm";

import { Hex } from "../../model/mapsheet.js";
import { Partnership } from "../../model/partnership.js";
import { Countries } from "../../model/countries.js";
import { AirUnit, AliveUnit, Armor, Carrier, LandUnit, NavalUnit, Submarine, TransportShip, Unit } from "../../model/units.js";
import { AirNavalCombat, AtomicBombing, Bombing, Combat, InstallationBombing, LandCombat, StrategicBombing, UnitCombat } from "../../model/combat.js";

import CombatTables from "../../view/combat/combat-tables.js";
import HexMarker from "../../view/markers/hex-marker.js";
import LeftPanel from "../../view/left-panel.js";
import RunCombat from "../../view/combat/run-combat.js";
import UnitMarker from "../../view/markers/unit-marker.js";

export default class ComputerCombatPhase {
    readonly #partnership: Partnership;
    readonly #overrun: boolean;
    #attackableHexes: Array<Hex>;

    /**
     * Constructs a ComputerCombatPhase object. Does not run it, use run() for that.
     *
     * @param partnership   The partnership that the human player is playing as.
     * @param overrun       True if this is the overrun phase, false if it's the main combat phase.
     */
    constructor(partnership: Partnership, overrun: boolean){
        this.#partnership = partnership;
        this.#overrun = overrun;
        this.#attackableHexes = [...this.#partnership.units().flatMap(it => [it.hex(), ...it.hex().adjacentHexes()])];
    }

    /**
     * Runs the combat phase. Returns when the combat phase is finished.
     */
    async run(): Promise<void> {
        let attackableHexes = new Map();
        for(let unit of this.#partnership.landUnits()){
            if(this.#overrun && !unit.canDoOverrun()){
                continue;
            }
            for(let hex of unit.hex().adjacentLandHexes()){
                if(hex.landUnits().some(it => it instanceof LandUnit && it.owner.partnership() !== this.#partnership)){
                    if(!attackableHexes.has(hex)){
                        attackableHexes.set(hex, []);
                    }
                    attackableHexes.get(hex).push(unit);
                }
            }
        }

        let combat: Combat | null;
        while((combat = this.#selectCombat()) !== null){
            HexMarker.scrollToHex(combat.combatHex);
            HexMarker.colorHex(combat.combatHex, "purple");

            this.#updateCombatTable(combat);
            await LeftPanel.waitForNextButtonPressed("To combat results");

            const nextButtonLockReason = "Attack is ongoing...";
            LeftPanel.addNextButtonLock(nextButtonLockReason);

            const combatResults = await RunCombat.runCombat(combat);

            HexMarker.uncolorHex(combat.combatHex);
            if(combat instanceof UnitCombat){
                for(let hex of combat.defenders.map(it => it.hex()).filter(it => it !== null)){
                    HexMarker.uncolorHex(hex);
                }
            }
            LeftPanel.clear();
            LeftPanel.appendElement(combatResults);
            LeftPanel.releaseNextButtonLock(nextButtonLockReason);
            await LeftPanel.waitForNextButtonPressed("Continue combat phase");

            this.#advanceAfterCombat(combat);
        }

        LeftPanel.clear();
        LeftPanel.appendParagraph("Your opponent is done attacking. Click Next to continue.");
        await LeftPanel.waitForNextButtonPressed("To movement phase");
    }

    /**
     * Randomly selects a combat to run.
     *
     * @returns The combat, or null if the computer player is ready to end the combat phase.
     */
    #selectCombat(): Combat | null {
        const hex = lodash.sample(this.#attackableHexes);
        if(hex === undefined){
            return null;
        }

        const enemyLandUnits: ReadonlyArray<AliveUnit & LandUnit> = [...hex.landUnits().filter(it => it.owner.partnership() !== this.#partnership)];
        const enemyAirUnit: (AliveUnit & AirUnit) | undefined = lodash.sample([...hex.airUnits().filter(it => it.owner.partnership() !== this.#partnership)]);
        const enemyNavalUnits: ReadonlyArray<AliveUnit & NavalUnit> = [...hex.navalUnits().filter(it => it.owner.partnership() !== this.#partnership)];
        const friendlyUnits: ReadonlyArray<AliveUnit & Unit> = [hex, ...hex.adjacentHexes()].flatMap(it => [...it.units()]).filter(it => it.owner.partnership() === this.#partnership && (!this.#overrun || it instanceof Armor));
        const friendlyAirUnits: ReadonlyArray<AliveUnit & AirUnit> = this.#overrun ? [] : [...hex.airUnits().filter(it => it.owner.partnership() === this.#partnership)];

        const landAttackPossible: boolean = enemyLandUnits.length > 0 && friendlyUnits.some(it => it instanceof LandUnit && it.canAttackInHex(enemyLandUnits[0]) && (!this.#overrun || it.canDoOverrun()));
        const airAttackers: ReadonlyArray<AliveUnit & AirUnit> = enemyAirUnit !== undefined ? friendlyAirUnits.filter(it => it.canAttackInHex(enemyAirUnit)) : [];
        const navalAttackers: ReadonlyArray<AliveUnit & (AirUnit | NavalUnit)> = enemyNavalUnits.length > 0 ? friendlyUnits.filter(it => it instanceof AirUnit || it instanceof NavalUnit).filter(it => it.canAttackInHex(enemyNavalUnits[0])) : [];
        const installationBombingUnits: ReadonlyArray<AliveUnit & AirUnit> = friendlyAirUnits.filter(it => it.canDoInstallationBombing(hex) === null);
        const strategicBombingUnits: ReadonlyArray<AliveUnit & AirUnit> = friendlyAirUnits.filter(it => it.canDoStrategicBombing(hex) === null);
        const atomicBombingUnits: ReadonlyArray<AliveUnit & AirUnit> = friendlyAirUnits.filter(it => it.canDoAtomicBombing(hex) === null);

        if(!this.#overrun){
            //If atomic bombing is possible, always do that first
            if(atomicBombingUnits.length > 0){
                return new AtomicBombing(atomicBombingUnits);
            }

            //If the hex is fortified and a land attack is possible, bomb the fortification before doing a land attack
            if(landAttackPossible && hex.fortified() && installationBombingUnits.length > 0){
                return new InstallationBombing(installationBombingUnits);
            }

            //Do naval and air attacks before land attacks so that the naval units don't contribute to land unit defense strength
            let airNavalCombat: AirNavalCombat | null = null;
            if(navalAttackers.length > 0){
                const defenders: ReadonlyArray<AliveUnit & NavalUnit> = [...hex.navalUnits().filter(defender => navalAttackers.every(attacker => attacker.canAttackInHex(defender)))];
                airNavalCombat = new AirNavalCombat(navalAttackers.filter(it => (it instanceof AirUnit && it.canDoKamikaze()) === (navalAttackers[0] instanceof AirUnit && navalAttackers[0].canDoKamikaze())), defenders);
            }
            if(enemyAirUnit !== undefined && airAttackers.length > 0){
                airNavalCombat = new AirNavalCombat(airAttackers, [enemyAirUnit]);
            }
            if(airNavalCombat !== null){
                if(airNavalCombat.attackers.every(it => it instanceof AirUnit && it.canDoKamikaze())){
                    airNavalCombat.kamikaze = true;
                    return airNavalCombat;
                }

                //To decide if the combat is worth it, simulate a combat and see which units are eliminated. This is good because it adds some randomness to the computer player's decisions while still keeping them reasonable in most cases.
                const willBeEliminated: (it: AirUnit | NavalUnit) => boolean = it => (it.damaged() ? airNavalCombat.damageProbability(it) : airNavalCombat.eliminationProbability(it)) >= Math.random();
                const estimatedLostAttackers = airNavalCombat.attackers.filter(willBeEliminated).reduce((a, b) => a + ComputerCombatPhase.#navalAirUnitValue(b), 0) / airNavalCombat.attackers.length;
                const estimatedLostDefenders = airNavalCombat.defenders.filter(willBeEliminated).reduce((a, b) => a + ComputerCombatPhase.#navalAirUnitValue(b), 0) / airNavalCombat.defenders.length;
                if(estimatedLostAttackers <= estimatedLostDefenders){
                    return airNavalCombat;
                }
            }
        }

        //Do land attacks before non-fortification bombing in order to not bomb hexes that it will gain control of
        if(landAttackPossible){
            const attackers: ReadonlyArray<AliveUnit & Unit> = friendlyUnits.filter(it => it.canAttackInHex(enemyLandUnits[0]) && (!this.#overrun || it.canDoOverrun()));
            const defenders: ReadonlyArray<AliveUnit & LandUnit> = enemyLandUnits.filter(defender => attackers.every(attacker => attacker.canAttackInHex(defender)));
            const combat = new LandCombat(attackers, defenders);
            if(combat.attackerEliminationProbability() === 0 || combat.attackers.some(it => it.hex()!!.controller()?.partnership() === this.#partnership.opponent())){
                return combat;
            }
        }

        //If nothing else is possible do bombing (first strategic bombing then installation bombing)
        if(!this.#overrun){
            if(strategicBombingUnits.length > 0){
                return new StrategicBombing(strategicBombingUnits);
            }
            if(installationBombingUnits.length > 0){
                return new InstallationBombing(installationBombingUnits);
            }
        }

        //If no combat is possible in the hex, remove it and recursively choose another hex. Don't remove it if a combat is possible because he might want to do several attacks.
        lodash.pull(this.#attackableHexes, hex);
        return this.#selectCombat();
    }

    /**
     * Updates the combat table in the left panel.
     *
     * @param combat    The combat to get the information from.
     */
    #updateCombatTable(combat: Combat): void {
        LeftPanel.clear();
        if(combat instanceof AtomicBombing){
            LeftPanel.appendParagraph("Your opponent is dropping an atomic bomb.");
        }
        else if(combat instanceof InstallationBombing){
            LeftPanel.appendParagraph("Your opponent is bombing installations.");
        }
        else if(combat instanceof StrategicBombing){
            LeftPanel.appendParagraph("Your opponent is doing strategic bombing.");
        }
        else{
            LeftPanel.appendParagraph("Your opponent is attacking the following units.");
        }
        if(combat instanceof Bombing){
            LeftPanel.appendParagraph("Attackers:");
            const attackers = document.createElement("div");
            for(let unit of combat.attackers){
                attackers.appendChild(UnitMarker.get(unit).createCopyImage(true));
            }
            LeftPanel.appendElement(attackers);
        }
        LeftPanel.appendElement(CombatTables.createCombatTable(combat));

        if(combat instanceof LandCombat){
            const doubleLossesLabel = document.createElement("label");
            const doubleLossesCheckbox = document.createElement("input");
            doubleLossesCheckbox.type = "checkbox";
            if(combat.retreatableHexes().length === 0){
                doubleLossesCheckbox.checked = true;
                doubleLossesCheckbox.disabled = true;
            }
            else{
                doubleLossesCheckbox.checked = !combat.willingToRetreat;
                doubleLossesCheckbox.onchange = () => {
                    combat.willingToRetreat = !doubleLossesCheckbox.checked;
                    this.#updateCombatTable(combat);
                };
            }
            doubleLossesLabel.appendChild(doubleLossesCheckbox);
            doubleLossesLabel.appendChild(document.createTextNode("Double losses instead of retreating"));
            LeftPanel.appendElement(doubleLossesLabel);
        }
    }

    /**
     * Selects which unit to advance after combat with and advances after combat.
     *
     * @param combat    The combat to advance after.
     */
    #advanceAfterCombat(combat: Combat): void {
        if(combat instanceof LandCombat){
            const defendersRemainingInHex: ReadonlyArray<LandUnit> = [...combat.combatHex.landUnits()];
            if(defendersRemainingInHex.length === 0){
                const attackers: ReadonlyArray<AliveUnit & LandUnit> = combat.attackers
                    .filter(it => it instanceof LandUnit).filter(it => it.isAlive())
                    .sort((a, b) => b.strength - a.strength);
                for(let attacker of attackers.slice(0, 2)){
                    if(this.#partnership === Partnership.Axis && attacker.hex().country === Countries.china && !attacker.hex().landUnits().some(it => it !== attacker && it.owner.partnership() === this.#partnership)){
                        continue;
                    }
                    if(attacker instanceof Armor && (combat.combatHex.isDesert() || combat.combatHex.isIcecap())){
                        continue;
                    }
                    attacker.setHex(combat.combatHex);
                    UnitMarker.get(attacker).update();
                    combat.combatHex.setController(attacker.owner, false);
                }
            }
        }
        else if(combat instanceof AirNavalCombat){
            const defendersRemainingInHex: ReadonlyArray<NavalUnit> = [...combat.combatHex.navalUnits()];
            if(defendersRemainingInHex.length === 0){
                const attackers: ReadonlyArray<NavalUnit> = lodash.shuffle(
                    combat.attackers.filter(it => it instanceof NavalUnit).filter(it => it.isAlive())
                );
                for(let attacker of attackers.slice(0, 5)){
                    attacker.setHex(combat.combatHex);
                    UnitMarker.get(attacker).update();
                }
            }
        }
        HexMarker.updateMarkers(combat.combatHex);
    }

    /**
     * Gets the value that the computer player thinks that the given air or naval unit has.
     *
     * @param unit  The unit to check.
     *
     * @returns The number of empty transport ships that the given unit is worth.
     */
    static #navalAirUnitValue(unit: AirUnit | NavalUnit): number {
        if(unit instanceof AirUnit){
            return 5;
        }
        else if(unit instanceof Carrier){
            return 15;
        }
        else if(unit instanceof TransportShip && unit.embarkedUnits().size === 0){
            return 1;
        }
        else if(unit instanceof Submarine){
            return 5;
        }
        else{
            return 4;
        }
    }
}
