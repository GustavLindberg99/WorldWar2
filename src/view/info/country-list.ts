import { Partnership } from "../../model/partnership.js";
import { Countries, Country } from "../../model/countries.js";

import InfoBubble from "./info-bubble.js";

export default class CountryList {
    /**
     * Shows the dialog with the country list.
     */
    show(): void {
        xdialog.open({
            title: "Countries",
            body: `
                <p>
                    Partnership:
                    <label><input type="checkbox" id="CountryList.alliedCountries" checked/> Allies</label>
                    <label><input type="checkbox" id="CountryList.axisCountries" checked/> Axis</label>
                    <label><input type="checkbox" id="CountryList.neutralCountries" checked/> Neutral</label>
                </p>
                <p>
                    Conquered status:
                    <label><input type="checkbox" id="CountryList.unconqueredCountries" checked/> Unconquered</label>
                    <label><input type="checkbox" id="CountryList.conqueredCountries" checked/> Conquered</label>
                </p>
                <table id="CountryList.countryList">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Partnership</th>
                            <th>Conquered</th>
                            <th>Money</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>`,
            buttons: null,
            style: "width: 400px"
        });

        this.#updateList();
        document.getElementById("CountryList.alliedCountries")!!.onclick = () => this.#updateList();
        document.getElementById("CountryList.axisCountries")!!.onclick = () => this.#updateList();
        document.getElementById("CountryList.neutralCountries")!!.onclick = () => this.#updateList();
        document.getElementById("CountryList.unconqueredCountries")!!.onclick = () => this.#updateList();
        document.getElementById("CountryList.conqueredCountries")!!.onclick = () => this.#updateList();
    }

    /**
     * Updates the countries in the list based on which checkboxes are checked.
     */
    #updateList(): void {
        const alliedCountries = document.getElementById("CountryList.alliedCountries") as HTMLInputElement;
        const axisCountries = document.getElementById("CountryList.axisCountries") as HTMLInputElement;
        const neutralCountries = document.getElementById("CountryList.neutralCountries") as HTMLInputElement;
        const unconqueredCountries = document.getElementById("CountryList.unconqueredCountries") as HTMLInputElement;
        const conqueredCountries = document.getElementById("CountryList.conqueredCountries") as HTMLInputElement;

        const rows: ReadonlyArray<HTMLTableRowElement> = Countries.all().filter(it =>
            (alliedCountries.checked || it.partnership() !== Partnership.Allies)
            && (axisCountries.checked || it.partnership() !== Partnership.Axis)
            && (neutralCountries.checked || it.partnership() !== Partnership.Neutral)
            && (unconqueredCountries.checked || it.conquered())
            && (conqueredCountries.checked || !it.conquered())
        ).map(it => this.#createCountryRow(it));

        document.getElementById("CountryList.countryList")!!.querySelector("tbody")!!.replaceChildren(...rows);
    }

    #createCountryRow(country: Country): HTMLTableRowElement {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = country.name();
        row.appendChild(nameCell);

        const partnershipCell = document.createElement("td");
        partnershipCell.textContent = country.partnership()?.name ?? "Neutral";
        row.appendChild(partnershipCell);

        const conqueredCell = document.createElement("td");
        conqueredCell.textContent = country.conquered() ? "Yes" : "No";
        row.appendChild(conqueredCell);

        const moneyCell = document.createElement("td");
        moneyCell.textContent = `$${country.money}B`;
        row.appendChild(moneyCell);

        row.onclick = () => InfoBubble.showCountryInfo(country);

        return row;
    }
}
