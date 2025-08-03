import Bombing from "./bombing.js";

import { Countries } from "../countries.js";
import { AirUnit, LandUnit, NavalUnit, Unit } from "../units.js";
import { Combat } from "../combat.js";

export default class AtomicBombing extends Bombing {
    override successProbability(): number {
        return 1;
    }

    override attackerDamageProbability(): number {
        return 0;
    }

    /**
     * Gets the probability for the country to surrender due to this atomic bombing.
     *
     * @returns The probability for the country to surrender.
     */
    surrenderProbability(): number {
        if(this.combatHex.isColony){
            return 0;
        }

        let countryModifier;
        switch(this.combatHex.country){
            case Countries.japan:
            case Countries.china:
                countryModifier = 0.5;
            case Countries.italy:
            case Countries.france:
                countryModifier = 2;
            default:
                countryModifier = 1;
        }
        const occupiedModifier = this.combatHex.country!!.cities.some(it => !it.isColony && it.controller() !== this.combatHex.country) ? 2 : 1;
        const previousAtomicBombsModifier = this.combatHex.country!!.atomicBombCount + 1;

        //Same function as in `LandCombat.defenderLossProbability()`, but with `strengthPoints` adjusted so that the default surrendering probability is 0.5.
        //This means that Japan has a probability of 0.25 to surrender due to Hiroshima and a probability of 0.5 to surrender due to Nagasaki, and if it still doesn't, this probability will increase with each atomic bomb.
        return 1 - 2 ** (-countryModifier * occupiedModifier * previousAtomicBombsModifier);
    }

    override inflictDamages(): Combat.Result {
        const eliminatedUnits = this.#unitsToEliminate();
        return {
            ...super.inflictDamages(),
            eliminatedUnits: eliminatedUnits
        };
    }

    protected override damageOnSuccess(): void {
        this.combatHex.destroyedByAtomicBomb = true;
        for(let attacker of this.attackers){
            attacker.owner.hasUsedAtomicBombThisTurn = true;
        }
        for(let unit of this.#unitsToEliminate()){
            unit.delete();
        }

        //Check if the country surrenders
        if(!this.combatHex.isColony){
            if(Math.random() < this.surrenderProbability()){
                this.combatHex.country!!.surrenderedFromAtomicBomb = this.attackers[0].owner;
            }
            this.combatHex.country!!.atomicBombCount++;
        }
    }

    /**
     * Gets the units to eliminate when the atomic bomb is dropped.
     *
     * @returns The units to eliminate.
     */
    #unitsToEliminate(): Set<Unit> {
        return new Set(this.combatHex.units().filter(it => it instanceof LandUnit || (it instanceof AirUnit && it.based) || (it instanceof NavalUnit && it.inPort())));
    }
}
