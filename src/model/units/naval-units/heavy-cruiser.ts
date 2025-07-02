import HeavyShip from "./heavy-ship.js";

export default class HeavyCruiser extends HeavyShip {
    override type(): string {
        return "Naval unit (Heavy Cruiser)";
    }
}
