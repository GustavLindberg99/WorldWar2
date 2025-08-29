import lodash from "https://cdn.jsdelivr.net/npm/lodash@4.17.21/+esm";
import { addToMapOfSets, joinIterables, sortNumber } from "../../utils.js";

import { Partnership } from "../../model/partnership.js";
import { Country } from "../../model/countries.js";
import { AirUnit, AliveUnit, Armor, Carrier, Convoy, Infantry, NavalUnit, Submarine, Unit } from "../../model/units.js";
import { date } from "../../model/date.js";

import UnitMarker from "../../view/markers/unit-marker.js";

export default class ComputerUnitBuildPhase {
    readonly #partnership: Partnership;

    /**
     * Constructs a ComputerUnitBuildPhase object. Does not run it, use run() for that.
     *
     * @param partnership   The partnership that the computer player is playing as.
     */
    constructor(partnership: Partnership){
        this.#partnership = partnership;
    }

    /**
     * Runs the unit build phase.
     */
    run(): void {
        this.#repairUnits(true);
        this.#buyUnits();
        this.#repairUnits(false);
    }

    /**
     * Repairs as many damaged units as he can afford.
     *
     * @param onlyIfNotInvaded  Only repairs units belonging to countries that aren't invaded.
     */
    #repairUnits(onlyIfNotInvaded: boolean): void {
        for(let unit of joinIterables<AliveUnit & (AirUnit | NavalUnit)>(this.#partnership.airUnits(), this.#partnership.navalUnits().filter(it => it.inPort()))){
            if(unit.damaged() && unit.owner.money >= 200 && (!onlyIfNotInvaded || !this.#ownerIsInvaded(unit))){
                unit.owner.money -= 200;
                unit.repair();
                UnitMarker.get(unit).update();
            }
        }
    }

    /**
     * Buys as many units as he can afford.
     */
    #buyUnits(): void {
        const canUseConvoys = this.#partnership.countries().some(a => !a.conquered() && this.#partnership.countries().some(b => !b.conquered() && a.canSendMoneyWithConvoys().includes(b)));
        const orderedAvailableUnits =   //The available units ordered so that the ones he wants most are first
            lodash.shuffle([...this.#partnership.availableUnits()])
            .sort((a, b) =>
                //Concentrate on land units if the country is having problems
                sortNumber(b, a, unitToBuy => unitToBuy instanceof Infantry && this.#ownerIsInvaded(unitToBuy))
                || sortNumber(b, a, unitToBuy => unitToBuy instanceof Armor && this.#ownerIsInvaded(unitToBuy))
                //Don't waste money on naval units if one of the sides is a lot stronger than the other
                || sortNumber(a, b, unitToBuy => unitToBuy instanceof NavalUnit && !(unitToBuy instanceof Submarine) && !(unitToBuy instanceof Carrier) && this.#partnershipWithMostNavalUnitsByCountry(unitToBuy.owner) !== null)
                //Don't waste money on carriers if the opponent is much stronger, otherwise the carriers will just be destroyed anyway
                || sortNumber(a, b, unitToBuy => unitToBuy instanceof Carrier && this.#partnershipWithMostNavalUnitsByCountry(unitToBuy.owner) === this.#partnership.opponent())
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

    /**
     * Checks if the given unit's owner has cities that are controlled by the enemy.
     *
     * @param unitToBuy The unit to check.
     *
     * @returns True if at least one non-colony city in the unit's home country is invaded, false otherwise.
     */
    #ownerIsInvaded(unitToBuy: Unit): boolean {
        return unitToBuy.owner.cities.some(it => !it.isColony && it.controller()!!.partnership() !== it.country!!.partnership())
    }

    /**
     * Counts the number of naval units the given partnership has, where units that are closer to the given country are weighted higher.
     *
     * @param country       The country the naval units are close to.
     * @param partnership   The partnership that owns the naval units.
     *
     * @returns A number representing the given partnership's naval strength nearby the given country.
     */
    #nearbyNavalUnits(country: Country, partnership: Partnership): number {
        return partnership.navalUnits().reduce((a, b) => a - 1 / (b.hex().distanceFromHexGroup(country.cities) + 1), 0);
    }

    /**
     * Gets the partnership that's much stronger in naval units close to the given country.
     *
     * @param country   The country the naval units are close to.
     *
     * @returns The partnership that's much stronger in naval units close to the given country, or null if they're about the same.
     */
    #partnershipWithMostNavalUnitsByCountry(country: Country): Partnership | null {
        const difference = this.#nearbyNavalUnits(country, this.#partnership) - this.#nearbyNavalUnits(country, this.#partnership.opponent());
        if(difference > 5){
            return this.#partnership;
        }
        else if(difference < -5){
            return this.#partnership.opponent();
        }
        else{
            return null;
        }
    }
}
