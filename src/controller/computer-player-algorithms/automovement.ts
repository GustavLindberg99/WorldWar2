import { SupplyLines } from "../../model/mapsheet.js";
import { Partnership } from "../../model/partnership.js";
import { SupplyUnit, TransportShip } from "../../model/units.js";

import UnitMarker from "../../view/markers/unit-marker.js";

namespace Automovement {
    /**
     * Automatically disembarks supply units where needed.
     *
     * @returns The units that were disembarked.
     */
    export function autoDisembarkSupplyUnits(partnership: Partnership): Set<SupplyUnit> {
        let result = new Set<SupplyUnit>();
        for(let transportShip of partnership.units().filter(it => it instanceof TransportShip)){
            const supplyUnit = transportShip.embarkedUnits().values().find(it => it instanceof SupplyUnit);
            if(supplyUnit === undefined || supplyUnit.hasMoved || supplyUnit.hasAttacked){
                continue;
            }
            if(transportShip.hex().controller()?.partnership() === partnership && !SupplyLines.canTraceSupplyLine(transportShip.hex(), supplyUnit.owner)){
                supplyUnit.disembark();
                result.add(supplyUnit);
                UnitMarker.get(supplyUnit).update();
                UnitMarker.get(transportShip).update();
            }
        }
        return result;
    }
}
export default Automovement;
