import HeavyShip from "./heavy-ship.js";

export default class Battleship extends HeavyShip {
    readonly #nominal = undefined;

    override type(): string {
        return "Naval unit (Battleship)";
    }
}
