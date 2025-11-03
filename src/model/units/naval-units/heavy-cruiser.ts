import HeavyShip from "./heavy-ship.js";

export default class HeavyCruiser extends HeavyShip {
    readonly #nominal = undefined;

    override type(): string {
        return "Naval unit (Heavy Cruiser)";
    }
}
