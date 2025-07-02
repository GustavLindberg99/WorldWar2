import { Country } from "../model/countries.js";

namespace ErrorMessages {
    export function showNotEnoughMoneyError(country: Country, amountNeeded: number): void {
        Toastify({text: `${country.name()} does not have enough money to do this, $${amountNeeded.toLocaleString()}B required, only $${country.money.toLocaleString()}B available.`}).showToast();
    }
}
export default ErrorMessages;
