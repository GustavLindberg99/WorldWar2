import HeavyShip from "./heavy-ship.js";

export default class Battleship extends HeavyShip {
    override type(): string {
        return "Naval unit (Battleship)";
    }
}
