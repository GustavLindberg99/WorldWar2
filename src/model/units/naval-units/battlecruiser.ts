import HeavyShip from "./heavy-ship.js";

export default class Battlecruiser extends HeavyShip {
    override type(): string {
        return "Naval unit (Battlecruiser)";
    }
}
