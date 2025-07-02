namespace LeftPanel {
    let nextButtonLocks = new Set<string>();
    let progressIntervals = new Set<number>();

    /**
     * Adds a lock so that the next button is disabled until the lock is released.
     *
     * @param reason    A reason to display when hovering over the next button, also used to release the lock.
     */
    export function addNextButtonLock(reason: string): void {
        nextButtonLocks.add(reason);
        const nextButton = document.querySelector<HTMLButtonElement>("button#nextButton")!!;
        nextButton.disabled = true;
        nextButton.classList.add("loading");
        nextButton.title = reason;
    }

    /**
     * Releases a lock from the next button, and enables it if all locks are released.
     *
     * @param reason    The reason used to lock it.
     */
    export function releaseNextButtonLock(reason: string): void {
        nextButtonLocks.delete(reason);
        const [newReason] = nextButtonLocks;
        const nextButton = document.querySelector<HTMLButtonElement>("button#nextButton")!!;
        if(newReason === undefined){
            nextButton.disabled = false;
            nextButton.classList.remove("loading");
            nextButton.title = "";
        }
        else{
            nextButton.title = newReason;
        }
    }

    /**
     * Sets the text to display on the next button.
     *
     * @param text  The text to display under the "Next" text.
     */
    export function setNextButtonText(text: string): void {
        document.querySelector("#nextButton p+p")!!.textContent = text;
    }

    /**
     * Async function that doesn't return until the next button is pressed.
     *
     * @param nextPhase The text to display under the "Next" text.
     * @param condition A callback that will be run when the next button is pressed. If the callback returns false, the promise won't be resolved, and if it returns true, it will.
     */
    export function waitForNextButtonPressed(nextPhase: string, condition: () => (boolean | Promise<boolean>) = () => true): Promise<void> {
        setNextButtonText(nextPhase);
        return new Promise(resolvePromise => {
            document.getElementById("nextButton")!!.onclick = async () => {
                if(await condition()){
                    resolvePromise();
                }
            };
        });
    }

    /**
     * Sets the next button onclick event.
     *
     * @param nextPhase The text to display under the "Next" text.
     * @param onclick   The callback to call when the next button is pressed.
     */
    export function setNextButtonClick(nextPhase: string, onclick: () => void): void {
        setNextButtonText(nextPhase);
        document.getElementById("nextButton")!!.onclick = onclick;
    }

    /**
     * Shows the cancel button.
     *
     * @param text      The text to display under the "Cancel" text.
     * @param onclick   The callback to call when the cancel button is pressed.
     */
    export function showCancelButton(text: string, onclick: () => void): void {
        const cancelButton = document.getElementById("cancelButton")!!;
        cancelButton.style.display = "";
        cancelButton.querySelector("p+p")!!.textContent = text;
        cancelButton.onclick = onclick;
    }

    /**
     * Hides the cancel button.
     */
    export function hideCancelButton(): void {
        document.getElementById("cancelButton")!!.style.display = "none";
    }

    /**
     * Clears the contents in the left panel (except for the next button).
     */
    export function clear(): void {
        document.getElementById("leftPanelContent")!!.replaceChildren();
        for(let interval of progressIntervals){
            clearInterval(interval);
        }
        progressIntervals = new Set();
    }

    /**
     * Appends a DOM element to the left panel.
     *
     * @param element   The element to append.
     */
    export function appendElement(element: Element): void {
        document.getElementById("leftPanelContent")!!.appendChild(element);
    }

    /**
     * Appends a ProgressBar.js progress bar to the left panel.
     *
     * @param getProgress   A callback returning the current progress as a number between 0 and 1.
     */
    export function appendProgressBar(getProgress: () => number): void {
        const container = document.createElement("div");
        const progressBar = new ProgressBar.Line(container, {
            strokeWidth: 10,
            trailWidth: 10,
            color: "#4b9c2e",
            trailColor: "#a4cd96"
        });
        progressBar.setText("0%");
        progressIntervals.add(setInterval(() => {
            const progress = getProgress();
            (progressBar as typeof progressBar & ProgressBar.AnimationSupport).animate(getProgress());
            progressBar.setText(Math.round(100 * progress).toString() + "%");
        }, 1000));
        LeftPanel.appendElement(container);
    }

    /**
     * Helper function to parse a string that can contain markdown links and create a `<p>` element from it.
     *
     * @param text  The string to parse.
     *
     * @returns The `<p>` element.
     */
    function stringToParagraph(text: string): HTMLParagraphElement {
        const paragraph = document.createElement("p");
        const textPortions: ReadonlyArray<string> = text.split(/\[([^\[]+)\]\(([^\(]+)\)/);    //Since the splitting regex contains two captures, this array will be of the form ["plain text", "link description", "url", "plain text"].
        for(let i = 0; i < textPortions.length; i++){
            if(i % 3 === 0){
                paragraph.appendChild(document.createTextNode(textPortions[i]));
            }
            else{
                const link = document.createElement("a");
                link.textContent = textPortions[i];
                i++;
                link.href = textPortions[i];
                paragraph.appendChild(link);
            }
        }
        return paragraph;
    }

    /**
     * Appends a paragraph to the left panel.
     *
     * @param text  The text to display in the paragraph. Links can be inserted with the markdown notation `[text](url)`.
     */
    export function appendParagraph(text: string): void {
        LeftPanel.appendElement(stringToParagraph(text));
    }

    /**
     * Appends a group box to the left panel.
     *
     * @param title     The title of the group box.
     * @param contents  The contents of the group box. HTML elements will be appended as is, strings will be parsed the same way as in appendParagraph and be appended as paragraphs.
     */
    export function appendBox(title: string, contents: ReadonlyArray<string | HTMLElement>): void {
        const box = document.createElement("div");
        box.className = "box";

        const titleElement = document.createElement("h3");
        titleElement.textContent = title;
        box.appendChild(titleElement);

        for(let element of contents){
            if(typeof(element) === "string"){
                box.appendChild(stringToParagraph(element));
            }
            else{
                box.appendChild(element);
            }
        }

        LeftPanel.appendElement(box);
    }

    /**
     * Appends a checkbox to the left panel.
     *
     * @param labelText The text that should be displayed next to the label.
     *
     * @returns The created checkbox to be able to see if it's checked.
     */
    export function appendCheckbox(labelText: string): HTMLInputElement {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(labelText));
        LeftPanel.appendElement(label);
        LeftPanel.appendElement(document.createElement("br"))
        return checkbox;
    }
}
export default LeftPanel;
