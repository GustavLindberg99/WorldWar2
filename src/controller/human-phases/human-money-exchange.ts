import { Partnership } from "../../model/partnership.js";
import { Countries, Country } from "../../model/countries.js";
import { Convoy } from "../../model/units.js";

import InfoBubble from "../../view/info/info-bubble.js";
import LeftPanel from "../../view/left-panel.js";
import UnitMarker from "../../view/markers/unit-marker.js";

type Exchange = {
    readonly amountInput: HTMLInputElement,
    readonly leftButton: HTMLButtonElement,
    readonly sender: Country,
    readonly receiverDropdown: HTMLSelectElement,
    readonly convoy: Convoy | null
};

export default class HumanMoneyExchange {
    readonly #partnership: Partnership;

    #exchanges: Array<Exchange> = [];

    /**
     * Constructs a HumanMoneyExchange object. Does not run it, use run() for that.
     *
     * @param partnership   The partnership that the human player is playing as.
     */
    constructor(partnership: Partnership){
        this.#partnership = partnership;
    }

    /**
     * Runs the combat phase. Returns when the combat phase is finished.
     */
    async run(): Promise<void> {
        LeftPanel.clear();
        LeftPanel.appendParagraph("All countries at war have received their monthly income.");

        //Two way (except for Japan and China)
        const allowedExchangesWithoutConvoys: ReadonlyMap<Country, ReadonlyArray<Country>> = new Map(
            [Countries.japan, Countries.germany, Countries.unitedStates, Countries.unitedKingdom, Countries.china]
            .filter(it => it.partnership() === this.#partnership)
            .map(key => [key, this.#partnership.countries().filter(value =>
                value.canSendMoneyWithoutConvoys().includes(key)
                && (key.canSendMoneyWithoutConvoys().includes(value) || key === Countries.japan || key === Countries.china)
            )])
        );

        //One way
        const allowedExchangesWithConvoys: ReadonlyMap<Country | null, ReadonlyArray<Country>> = new Map(
            Countries.all()
            .filter(it => it.partnership() === this.#partnership)
            .map(key => [key, Countries.all().filter(value => key.canSendMoneyWithConvoys().includes(value))])
        );

        if(allowedExchangesWithoutConvoys.size > 0){
            const table = document.createElement("table");
            table.className = "moneyExchange";
            let dropdownContainers: Array<HTMLElement> = [];    //Empty if there is no dropdown. If there is a dropdown, contains one element which is a div containing the dropdown and the Add button.
            for(let [sender, receivers] of allowedExchangesWithoutConvoys){
                //If there are more than two receivers, create a dropdown allowing to select one
                if(receivers.length > 2){
                    const dropdownContainer = document.createElement("p");
                    dropdownContainer.appendChild(document.createTextNode(`${sender.name()} can exchange money with the following countries: `));

                    const dropdown = this.#createCountriesDropdown(receivers);
                    dropdownContainer.appendChild(dropdown);

                    const addButton = document.createElement("button");
                    addButton.textContent = "Add";
                    addButton.onclick = () => {
                        const selectedOption = dropdown.selectedOptions[0];
                        const receiver = Countries.fromName(selectedOption?.textContent);
                        if(receiver === null){
                            Toastify({text: "You must select a country to exchange money with."}).showToast();
                            return;
                        }
                        table.appendChild(this.#createExchangeRow(sender, [receiver], null));
                        selectedOption.remove();
                        if(!dropdown.hasChildNodes()){
                            dropdownContainer.remove();
                        }
                    };
                    dropdownContainer.appendChild(addButton);

                    dropdownContainers.push(dropdownContainer);
                }
                //If there are two or fewer receivers, simply append them to the table
                else for(let receiver of receivers){
                    table.appendChild(this.#createExchangeRow(sender, [receiver], null));
                }
            }
            LeftPanel.appendBox("Money exchanges without convoys", ["The receiving country will receive this money directly at the end of this income phase.", table, ...dropdownContainers]);
        }
        if(allowedExchangesWithConvoys.size > 0){
            const table = document.createElement("table");
            table.className = "moneyExchange";
            for(let convoy of this.#partnership.convoys()){
                const sender = convoy.hex().country;
                const receivers = allowedExchangesWithConvoys.get(sender);
                if(sender === null || sender.partnership() !== this.#partnership || receivers === undefined || receivers.length === 0){
                    continue;
                }
                table.appendChild(this.#createExchangeRow(sender, receivers, convoy));
            }
            if(table.hasChildNodes()){
                LeftPanel.appendBox("Money exchanges with convoys", ["The sending country will pay this money directly, and the money will be placed on a convoy unit. The convoy unit will then have to move to a friendly port in the receiving country, after which the receiving country will be able to use it.", table]);
            }
        }

        await LeftPanel.waitForNextButtonPressed("To unit build phase");

        for(let exchange of this.#exchanges){
            const reversed = exchange.leftButton.classList.contains("selected");
            const rightCountry = Countries.fromName(exchange.receiverDropdown.selectedOptions[0]?.value);
            const amount = parseInt(exchange.amountInput.value);
            if(rightCountry === null || isNaN(amount)){
                continue;
            }
            const sender = reversed ? rightCountry : exchange.sender;
            const receiver = reversed ? exchange.sender : rightCountry;
            sender.money -= amount;
            if(exchange.convoy !== null){
                exchange.convoy.money = amount;
                exchange.convoy.destination = receiver;
            }
            else{
                receiver.money += amount;
            }
        }
    }

    /**
     * Creates a cell containing the name of the given country and the money it currently has.
     *
     * @param country   The country.
     *
     * @returns The cell so that it can be appended to the DOM.
     */
    #createCountryCell(country: Country): HTMLTableCellElement {
        const cell = document.createElement("td");

        cell.appendChild(InfoBubble.clickableCountryInfoLink(country));

        cell.appendChild(document.createElement("br"));
        cell.appendChild(document.createTextNode(`$${country.money.toLocaleString()}B`));

        return cell;
    }

    /**
     * Creates a dropdown list with the given countries.
     *
     * @param countries The countries.
     *
     * @returns The dropdown list so that it can be appended to the DOM.
     */
    #createCountriesDropdown(countries: ReadonlyArray<Country>): HTMLSelectElement {
        const dropdown = document.createElement("select");
        for(let country of countries){
            const option = document.createElement("option");
            option.textContent = country.name();
            dropdown.appendChild(option);
        }
        return dropdown;
    }

    /**
     * Filters the given number input to make sure that its value is valid. This is needed because it's possible to enter invalid numbers manually (the browser will often not allow arbitrary text, but it will still allow numbers that are out of range or too precise).
     *
     * @param input A number input.
     */
    #filterNumberInputValue(input: HTMLInputElement): void {
        if(parseInt(input.value) > parseInt(input.max)){
            input.value = input.max;
        }
        else if(parseInt(input.value) < parseInt(input.min)){
            input.value = input.min;
        }
        input.value = (parseInt(input.value) || 0).toString();
    }

    /**
     * Function to be called when the user clicks on an arrow to select the direction in which money is being sent.
     *
     * @param newSender         The new sender. The right country for the left button and the left country for the right button.
     * @param input             The number input where the amount of money being sent should be entered.
     * @param deselectedButton  The button that has been deselected.
     * @param selectedButton    The button that has been clicked on and selected.
     * @param convoy            True if the money is going on a convoy, false if it's sent directly.
     */
    #selectSender(newSender: Country, input: HTMLInputElement, deselectedButton: HTMLButtonElement, selectedButton: HTMLButtonElement, convoy: boolean): void {
        selectedButton.classList.add("selected");
        deselectedButton.classList.remove("selected");
        input.max = Math.min(newSender.maxMoneyExchange(), convoy ? Convoy.maxMoney : Infinity).toString();
        input.step = Math.min(50, newSender.money).toString();
        this.#filterNumberInputValue(input);
    }

    /**
     * Creates a table row allowing for money exchange.
     *
     * @param sender    The country sending the money.
     * @param receivers The countries receiving the money. If convoy is non-null, can contain several elements (all the countries that the convoy can send to). If convoy is null, will only contain one element, as the row will be created dynamically as a result of another dropdown. This is needed so that it's possible to do non-convoy exchanges with several countries. Must be an array and not a set because the order matters since a dropdown will be created containing the elements.
     * @param convoy    The convoy that will transport the money, or null if it's being sent directly.
     *
     * @returns The row so that it can be appended to the DOM.
     */
    #createExchangeRow(sender: Country, receivers: ReadonlyArray<Country>, convoy: Convoy | null): HTMLTableRowElement {
        const row = document.createElement("tr");

        //Create the input and buttons
        const leftButton = document.createElement("button");
        const input = document.createElement("input");
        const rightButton = document.createElement("button");
        const receiverDropdown = this.#createCountriesDropdown(receivers);

        leftButton.className = "moneyExchange";
        leftButton.textContent = '\u2190';    //\u2b60 looks nicer but isn't supported on Android
        leftButton.onclick = () => this.#selectSender(receivers[receiverDropdown.selectedIndex], input, rightButton, leftButton, convoy !== null);

        input.type = "number";
        input.min = "0";
        input.onchange = () => this.#filterNumberInputValue(input);

        rightButton.className = "moneyExchange";
        rightButton.textContent = '\u2192';    //\u2b62 looks nicer but isn't supported on Android
        rightButton.onclick = () => this.#selectSender(sender, input, leftButton, rightButton, convoy !== null);

        receiverDropdown.onchange = () => {
            //If the left button is selected, select it again to update according to the new sender's money
            if(leftButton.classList.contains("selected")){
                this.#selectSender(receivers[receiverDropdown.selectedIndex], input, rightButton, leftButton, convoy !== null);
            }
        };

        //Create and append the cells
        row.appendChild(this.#createCountryCell(sender));

        const leftButtonCell = document.createElement("td");
        if(convoy !== null){
            leftButtonCell.appendChild(UnitMarker.get(convoy).createCopyImage(true));
        }
        else{
            leftButtonCell.appendChild(leftButton);
        }
        row.appendChild(leftButtonCell);

        const inputCell = document.createElement("td");
        inputCell.appendChild(input);
        row.appendChild(inputCell);

        const rightButtonCell = document.createElement("td");
        rightButtonCell.appendChild(rightButton);
        row.appendChild(rightButtonCell);

        if(receivers.length === 1){
            row.appendChild(this.#createCountryCell(receivers[0]));
        }
        else{
            const receiverCell = document.createElement("td");
            receiverCell.appendChild(receiverDropdown);
            row.appendChild(receiverCell);
        }

        //Select a button initially so that something is selected
        if(convoy === null && !receivers.some(it => sender.canSendMoneyWithoutConvoys().includes(it))){
            rightButton.disabled = true;
            this.#selectSender(receivers[receiverDropdown.selectedIndex], input, rightButton, leftButton, convoy !== null);
        }
        else{
            this.#selectSender(sender, input, leftButton, rightButton, convoy !== null);
        }

        //Save the exchange so that we know where to send the money at the end of the phase
        this.#exchanges.push({
            amountInput: input,
            leftButton: leftButton,
            sender: sender,
            receiverDropdown: receiverDropdown,
            convoy: convoy
        });

        return row;
    }
}
