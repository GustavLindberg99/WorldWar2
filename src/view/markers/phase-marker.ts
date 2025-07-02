import { Phase } from "../../model/phase.js";

namespace PhaseMarker {
    export function update(): void {
        const phaseMarkers: ReadonlyMap<Phase, HTMLImageElement> = new Map([
            [Phase.Income, document.querySelector<HTMLImageElement>("img#incomePhase")!!],
            [Phase.Deployment, document.querySelector<HTMLImageElement>("img#deploymentPhase")!!],
            [Phase.UnitBuild, document.querySelector<HTMLImageElement>("img#unitBuildPhase")!!],
            [Phase.AxisOverrun, document.querySelector<HTMLImageElement>("img#overrunPhase")!!],
            [Phase.AlliedOverrun, document.querySelector<HTMLImageElement>("img#overrunPhase")!!],
            [Phase.AxisFirstMovement, document.querySelector<HTMLImageElement>("img#firstMovementPhase")!!],
            [Phase.AlliedFirstMovement, document.querySelector<HTMLImageElement>("img#firstMovementPhase")!!],
            [Phase.AxisInterception, document.querySelector<HTMLImageElement>("img#interceptionPhase")!!],
            [Phase.AlliedInterception, document.querySelector<HTMLImageElement>("img#interceptionPhase")!!],
            [Phase.AxisAmphibiousParadrop, document.querySelector<HTMLImageElement>("img#amphibiousParadropPhase")!!],
            [Phase.AlliedAmphibiousParadrop, document.querySelector<HTMLImageElement>("img#amphibiousParadropPhase")!!],
            [Phase.AxisCombat, document.querySelector<HTMLImageElement>("img#combatPhase")!!],
            [Phase.AlliedCombat, document.querySelector<HTMLImageElement>("img#combatPhase")!!],
            [Phase.AxisSecondMovement, document.querySelector<HTMLImageElement>("img#secondMovementPhase")!!],
            [Phase.AlliedSecondMovement, document.querySelector<HTMLImageElement>("img#secondMovementPhase")!!],
            [Phase.Supply, document.querySelector<HTMLImageElement>("img#supplyPhase")!!],
            [Phase.WarDeclaration, document.querySelector<HTMLImageElement>("img#warDeclarationPhase")!!],
        ]);

        for(let marker of phaseMarkers.values()){
            marker.classList.remove("active");
            marker.src = marker.src.replace(/-activated\.svg$/, ".svg");
        }
        const marker = phaseMarkers.get(Phase.current)!!;
        marker.classList.add("active");
        marker.src = marker.src.replace(/\.svg$/, "-activated.svg");
        const phases = document.getElementById("phases")!!;
        phases.scrollTop = marker.parentElement!!.offsetTop - phases.clientHeight / 2;
    }
}
export default PhaseMarker;
