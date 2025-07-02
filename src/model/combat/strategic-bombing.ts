import Bombing from "./bombing.js";

export default class StrategicBombing extends Bombing {
    protected override damageOnSuccess(): void {
        this.combatHex.resourceHexDestroyed = true;
    }
}
