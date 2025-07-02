/**
 * Waits the specified amount of time, then returns from the async function.
 *
 * @param ms    The time to wait in milliseconds.
 */
export async function wait(ms: number): Promise<void> {
    await new Promise(r => setTimeout(r, ms));
}

/**
 * Waits the least amount of time needed for the UI to refresh, then returns from the async function.
 *
 * @param refreshFrequency  The frequency in ms to refresh the UI.
 */
let uiLastRefreshed = performance.now();
let worker: Worker;    //Always use the same worker otherwise Firefox will freeze when the developer tools are open
export async function refreshUI(refreshFrequency: number = 20): Promise<void> {
    if(performance.now() > uiLastRefreshed + refreshFrequency){
        uiLastRefreshed = performance.now();
        //Use a worker instead of using setTimeout in the main thread so that it's possible to do something else in another window while waiting, see https://stackoverflow.com/a/75828547/4284627
        worker ??= new Worker(
            `data:text/javascript,
            onmessage = () => {
                setTimeout(() => postMessage(null), 0);
            };
            `
        );
        const promise = new Promise<void>(resolvePromise => worker.addEventListener("message", () => resolvePromise()));
        worker.postMessage(null);
        await promise;
    }
}

/**
 * Joins several iterables into one.
 *
 * @param iterables The iterables to join.
 *
 * @returns A single iterator that iterates over all the elements in the iterables passed as argument.
 */
export function* joinIterables<T>(...iterables: Array<Iterable<T>>): Generator<T> {
    for(let iterator of iterables){
        yield* iterator;
    }
}

/**
 * Adds an element to a map of sets.
 *
 * @param map   The map to add the element to.
 * @param key   The key of the map corresponding to the set to add the value to.
 * @param value The value to add.
 */
export function addToMapOfSets<K, V>(map: Map<K, Set<V>>, key: K, value: V): void {
    const set = map.get(key) ?? new Set();
    set.add(value);
    map.set(key, set);
}

/**
 * Calculates the total probability of at least one of several indepenent events occurring.
 *
 * @param p1            The probability of one of the events. Interchangeable with probabilities, only its own parameter to make sure at least one parameter is passed.
 * @param probabilities The probabilities of each individual independent event.
 *
 * @returns The union probability..
 */
export function unionProbability(p1: number, ...probabilities: ReadonlyArray<number>): number {
    if(probabilities.length === 0){
        return p1;
    }
    const p2 = unionProbability(probabilities[0], ...probabilities.slice(1));
    return p1 + p2 - p1 * p2;
}

/**
 * Shows an xdialog confirmation dialog.
 *
 * @param title The title of the dialog.
 * @param body  The body text of the dialog.
 *
 * @returns True if the Yes button was clicked, false if the No button was clicked.
 */
export function xdialogConfirm(title: string, body: string): Promise<boolean> {
    return new Promise(resolvePromise => xdialog.confirm(
        body,
        () => resolvePromise(true),
        {
            title: title,
            oncancel: () => resolvePromise(false)
        }
    ))
}

/**
 * Gets a number that can be returned by the callback for `Array.sort` based on the given callback.
 *
 * Useage: `someArray.sort((a, b) => sortNumber(a, b, f))` sorts the array so that if `f` called on each element in the result, the elements will be in ascending order. If the `f` returns a boolean and elements returning true should be first, use `someArray.sort((a, b) => sortNumber(b, a, f))`.
 *
 * @param a The first element to compare.
 * @param b The second element to compare.
 * @param f The callback used to compare them.
 *
 * @returns A number that can be returned by the callback for `Array.sort`.
 */
export function sortNumber<T>(a: T, b: T, f: (it: T) => number | boolean): number {
    return Number(f(a)) - Number(f(b));
}
