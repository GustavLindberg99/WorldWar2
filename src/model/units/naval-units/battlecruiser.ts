import HeavyShip from "./heavy-ship.js";

export default class Battlecruiser extends HeavyShip {
    readonly #nominal = undefined;

    override type(): string {
        return "Naval unit (Battlecruiser)";
    }
}
