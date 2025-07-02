import Bombing from "./bombing.js";

export default class InstallationBombing extends Bombing {
    protected override damageOnSuccess(): void {
        this.combatHex.destroyInstallations();
    }
}
