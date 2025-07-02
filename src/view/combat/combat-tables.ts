import { unionProbability } from "../../utils.js";

import { NavalUnit } from "../../model/units.js";
import { Phase } from "../../model/phase.js";
import { AirNavalCombat, AtomicBombing, Bombing, Combat, LandCombat } from "../../model/combat.js";

import UnitMarker from "../markers/unit-marker.js";

namespace CombatTables {
    /**
     * Creates a table with information about land combat.
     *
     * @param combat    The Combat object.
     *
     * @returns The table so that it can be added to the DOM.
     */
    export function createCombatTable(combat: Combat): HTMLTableElement {
        const table = document.createElement("table");

        const headerRow = document.createElement("tr");
        headerRow.appendChild(document.createElement("td"));
        table.appendChild(headerRow);

        if(combat instanceof LandCombat){
            const attackerLabel = document.createElement("th");
            attackerLabel.textContent = "Attackers";
            headerRow.appendChild(attackerLabel);
            const defenderLabel = document.createElement("th");
            defenderLabel.textContent = "Defenders";
            headerRow.appendChild(defenderLabel);

            table.appendChild(createRow("Units", [
                combat.attackers.map(it => UnitMarker.get(it).createCopyImage(true)),
                combat.defenders.map(it => UnitMarker.get(it).createCopyImage(true))
            ]));

            table.appendChild(createRow("Modified strength", [
                combat.modifiedAttackStrength().toString(),
                combat.modifiedDefenseStrength().toString()
            ]));

            table.appendChild(createRow("Loss probability", [
                `${Math.round(combat.attackerLossProbability(1) * 100)}%`,
                `${Math.round(combat.defenderLossProbability(1) * 100)}%`
            ]));

            const attackerEliminationProbability = unionProbability(combat.attackerEliminationProbability(), combat.attackerLossProbability(combat.unmodifiedAttackStrength()));
            const eliminationRow = createRow("Elimination probability", [
                `${Math.round(attackerEliminationProbability * 100)}%`,
                `${Math.round(combat.defenderEliminationProbability() * 100)}%`
            ])
            table.appendChild(eliminationRow);

            if(attackerEliminationProbability > 0){
                const attackerEliminationCell = eliminationRow.querySelector("td")!!;
                attackerEliminationCell.style.color = "red";
                attackerEliminationCell.style.fontWeight = "bold";
            }
        }
        else if(combat instanceof AirNavalCombat){
            const damageLabel = document.createElement("th");
            damageLabel.textContent = "Damage probability";
            headerRow.appendChild(damageLabel);
            const eliminationLabel = document.createElement("th");
            eliminationLabel.textContent = "Elimination probability";
            headerRow.appendChild(eliminationLabel);

            for(let unit of [...combat.attackers, ...combat.defenders]){
                const damageProbability = combat.damageProbability(unit);
                const pureEliminationProbability = combat.eliminationProbability(unit);
                const damageEliminationProbability = unit.canTakeDamage() ? 0 : damageProbability;
                table.appendChild(createRow(UnitMarker.get(unit).createCopyImage(true), [
                    unit.canTakeDamage() ? `${Math.round(damageProbability * 100)}%` : "Will be eliminated directly if damaged",
                    `${Math.round(unionProbability(pureEliminationProbability, damageEliminationProbability) * 100)}%`
                ]));
            }

            const retreatRow = document.createElement("tr");
            const retreatCell = document.createElement("td");
            retreatCell.colSpan = 3;
            if(combat.attackers.some(it => it instanceof NavalUnit) && combat.retreatableHexes().length > 0){
                retreatCell.textContent = `Probability for defender to retreat: ${Math.round(combat.defenderCancelOrRetreatProbability() * 100)}%`;
            }
            else if(Phase.current === Phase.AxisInterception || Phase.current === Phase.AlliedInterception){
                retreatCell.textContent = `Probability for defender mission to be canceled: ${Math.round(combat.defenderCancelOrRetreatProbability() * 100)}%`;
            }
            retreatRow.appendChild(retreatCell);
            table.appendChild(retreatRow);
        }
        else if(combat instanceof Bombing){
            table.appendChild(createRow("Success probability", [`${Math.round(combat.successProbability() * 100)}%`]));
            table.appendChild(createRow("Probability for attacker to be damaged", [`${Math.round(combat.attackerDamageProbability() * 100)}%`]));
            if(combat instanceof AtomicBombing){
                table.appendChild(createRow(`Probability for ${combat.combatHex.country!!.name()} to surrender`, [`${Math.round(combat.surrenderProbability() * 100)}%`]))
            }
        }
        else{
            throw new TypeError("Unknown combat type");
        }

        return table;
    }

    /**
     * Creates a table row.
     *
     * @param title The title of the row.
     * @param cells The contents of the cells to add.
     *
     * @returns The row so that it can be appended to the table.
     */
    function createRow(title: string | Node, cellContents: ReadonlyArray<string | ReadonlyArray<Element>>): HTMLTableRowElement {
        const row = document.createElement("tr");
        const titleCell = document.createElement("th");
        if(typeof(title) === "string"){
            titleCell.textContent = title;
        }
        else{
            titleCell.appendChild(title);
        }
        row.appendChild(titleCell);
        for(let cellContent of cellContents){
            const cell = document.createElement("td");
            if(typeof(cellContent) === "string"){
                cell.textContent = cellContent;
            }
            else for(let element of cellContent){
                cell.appendChild(element);
            }
            row.appendChild(cell);
        }
        return row;
    }
}
export default CombatTables;
