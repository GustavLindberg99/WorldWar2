import { refreshUI } from "./utils.js";

import { Hex } from "./model/mapsheet.js";
import { Partnership } from "./model/partnership.js";
import { Countries } from "./model/countries.js";
import { Unit } from "./model/units.js";
import { date, Month } from "./model/date.js";
import { SavedGames } from "./model/saved-games.js";

import CountryList from "./view/info/country-list.js";
import HexMarker from "./view/markers/hex-marker.js";
import InitView from "./view/init/init-view.js";
import PanZoom from "./view/pan-zoom.js";
import UnitMarker from "./view/markers/unit-marker.js";

import ComputerPlayer from "./controller/player/computer-player.js";
import HumanPlayer from "./controller/player/human-player.js";
import runGame from "./controller/run-game.js";

/**
 * Places installations that are already built at the beginning of the game. Should be called when starting a new game, but not when opening a saved game.
 */
function placePrebuiltInstallations(): void {
    for(let hex of Hex.allHexes){
        if(hex.city === "Gibraltar" || hex.city === "Malta" || hex.city === "Sevastopol" || (hex.country === Countries.france && hex.adjacentLandHexes().some(it => it.country === Countries.germany))){
            hex.startBuildingFortification();
            hex.continueBuilding();
            hex.continueBuilding();
            HexMarker.updateMarkers(hex);
        }
    }
    const okinawa = Hex.fromCoordinates(269, 146);
    okinawa.startBuildingAirfield();
    okinawa.continueBuilding();
    okinawa.continueBuilding();
    HexMarker.updateMarkers(okinawa);
}

/**
 * Adds units that came between 1937 and 1939 and sets the current date to August 1939. Should be called when starting a new game in the 1939 scenario.
 */
function fastForwardTo1939(){
    for(; date.current < date(1939, Month.September); date.current++){
        for(let country of Countries.all()){
            country.addNewAvailableUnits();
        }
    }
    for(let hex of Countries.china.hexes){
        if(hex.secondaryController === Countries.japan){
            hex.setController(Countries.japan);
        }
    }
}

/**
 * Starts a new game. Returns when the game is opened.
 *
 * @param humanPartnership  The partnership that the human player should have.
 */
async function startGame(humanPartnership: Partnership, is1939: boolean): Promise<void> {
    document.getElementById("loadingView")!!.style.visibility = "visible";
    await refreshUI();
    if(is1939){
        fastForwardTo1939();
    }

    //Initialize Japan and China (no need to do this for Germany in the 1939 scenario beacause Germany enters the war then anyway)
    Countries.china.joinPartnership(Partnership.Allies);
    Countries.japan.joinPartnership(Partnership.Axis);
    Countries.japan.enteredWar = Countries.china.enteredWar = date.current;

    //Initialize GUI
    await InitView.drawHexGrid();
    InitView.enableButtons();
    placePrebuiltInstallations();
    document.getElementById("loadingView")!!.style.visibility = "hidden";

    //Initialize pan zoom
    PanZoom.initialize();
    if(is1939){
        PanZoom.instance().zoom(5);
        HexMarker.scrollToHex(Hex.fromCoordinates(200, 160));
    }
    else{
        PanZoom.instance().zoom(10);
        HexMarker.scrollToHex(Hex.allCityHexes.find(it => it.city === "Beijing")!!);
    }

    //Run the game
    const humanPlayer = new HumanPlayer(humanPartnership);
    const computerPlayer = new ComputerPlayer(humanPartnership.opponent());
    runGame(humanPlayer, computerPlayer);

    //Delete the autosaved game because otherwise it can be confusing what "last played game" refers to
    try{
        localStorage?.removeItem("autosave");
    }
    catch{}
}

/**
 * Opens a saved game and stargs that game. Returns when the game is opened.
 *
 * @param json  The JSON object containing the game.
 */
async function openSavedGame(json: SavedGames.Json): Promise<void> {
    //Show the loading view
    document.getElementById("loadingView")!!.style.visibility = "visible";
    await refreshUI();

    //Load the game
    SavedGames.loadGameFromJson(json);

    //Draw the hex grid
    await InitView.drawHexGrid();

    //Create the players (must be done before drawing the unit markers so that the unit markers are correctly marked as friendly or enemy)
    const humanPlayer = new HumanPlayer(Partnership[json.humanPartnership]);
    const computerPlayer = new ComputerPlayer(humanPlayer.partnership.opponent());

    //Create the unit markers and update the hex markers
    for(let hexJson of json.hexes){
        HexMarker.updateMarkers(Hex.fromCoordinates(hexJson.x, hexJson.y));
        await refreshUI();
    }
    for(let unit of Unit.allAliveUnits()){
        UnitMarker.get(unit).update();
        await refreshUI();
    }

    //Enable the buttons
    InitView.enableButtons();

    //Hide the loading view
    document.getElementById("loadingView")!!.style.visibility = "hidden";

    //Initialize pan zoom
    PanZoom.initialize();
    if("zoom" in json && typeof(json.zoom) === "number"){
        PanZoom.setAbsoluteZoom(json.zoom);
    }
    if("panX" in json && "panY" in json && typeof(json.panX) === "number" && typeof(json.panY) === "number"){
        const [x, y] = PanZoom.svgPixelToClientPixel(json.panX, json.panY);
        PanZoom.instance().pan({x: x, y: y});
    }

    //Run the game
    runGame(humanPlayer, computerPlayer);
}

async function main(): Promise<void> {
    //Initialize tippy
    tippy.setDefaultProps({
        allowHTML: true,
        placement: "right",
        showOnCreate: true,
        trigger: "manual",
        hideOnClick: true
    });

    //Initialize toastify
    Toastify.defaults.style = {background: "red"};
    Toastify.defaults.close = true;
    Toastify.defaults.duration = 10000;

    //Initialize new game buttons
    document.getElementById("startGameAllies1937")!!.onclick = () => startGame(Partnership.Allies, false);
    document.getElementById("startGameAxis1937")!!.onclick = () => startGame(Partnership.Axis, false);
    document.getElementById("startGameAllies1939")!!.onclick = () => startGame(Partnership.Allies, true);
    document.getElementById("startGameAxis1939")!!.onclick = () => startGame(Partnership.Axis, true);

    //Initialize open last played game button
    const continueLastPlayedGameButton = document.getElementById("continueLastPlayedGameButton")!!;
    let autosavedGame: unknown;
    try{
        autosavedGame = JSON.parse(localStorage?.getItem("autosave")!!);
    }
    catch{
        autosavedGame = null;
    }
    if(autosavedGame !== null){
        if(SavedGames.validateJson(autosavedGame)){
            continueLastPlayedGameButton.onclick = async () => {
                await openSavedGame(autosavedGame);
            }
            continueLastPlayedGameButton.style.display = "";
        }
        else{
            console.error("Invalid autosaved game.");
        }
    }

    //Initialize the open game button
    const openSavedGameButton = document.querySelector<HTMLInputElement>("input#openSavedGameButton")!!;
    openSavedGameButton.onchange = async () => {
        const file = openSavedGameButton.files?.[0];
        if(file === undefined){
            return;
        }

        document.getElementById("loadingView")!!.style.visibility = "visible";

        const reader = new FileReader();
        await new Promise(resolvePromise => {
            reader.onload = resolvePromise;
            reader.readAsText(file, "UTF-8");
        });

        const jsonString = reader.result;
        let json: unknown;
        try{
            json = JSON.parse(jsonString as string);
        }
        catch{
            json = null;
        }
        if(!SavedGames.validateJson(json)){
            document.getElementById("loadingView")!!.style.visibility = "hidden";
            Toastify({text: "This file is not a valid saved game."}).showToast();
            return;
        }
        await openSavedGame(json);

        document.getElementById("loadingView")!!.style.visibility = "hidden";
    };

    //Initialize about button
    let version: string;
    try{
        version = (await (await fetch("package.json")).json()).version;
    }
    catch{}
    document.getElementById("aboutButton")!!.onclick = () => {
        xdialog.open({
            title: "About WorldWar2",
            body: `
                <p>Version ${version}</p>
                <p>Copyright &copy; Gustav Lindberg</p>
                <p>
                    <a href="LICENSE" rel="license">Terms of Use</a> •
                    <a href="PRIVACY.md">Privacy Policy</a> •
                    <a href="https://github.com/GustavLindberg99/WorldWar2/issues/new">Contact Us</a>
                </p>
                <p>Icons made by <a href="https://www.iconfinder.com/paomedia" rel="external">Paomedia</a>, <a href="https://www.iconfinder.com/webalys" rel="external">Webalys</a>, <a href="https://www.iconfinder.com/Chanut-is" rel="external">Chanut is Industries</a>, <a href="https://www.iconfinder.com/iconfinder" rel="external">Iconfinder</a>, <a href="https://www.iconfinder.com/kmgdesignid" rel="external">Kmg Design</a>, <a href="https://www.iconfinder.com/iconsets/ionicons" rel="external">Ionicons</a>, <a href="https://www.iconfinder.com/Mr-hopnguyen" rel="external">Hopnguyen Mr</a>, <a href="https://www.iconfinder.com/webhostingmedia" rel="external">David Cross</a>, <a href="https://www.iconfinder.com/pocike" rel="external">Alpár-Etele Méder</a>, <a href="https://www.iconfinder.com/iconsets/circle-icons-1" rel="external">Nick Roach</a>, <a href="https://www.iconfinder.com/fluent-designsystem" rel="external">Microsoft</a>, <a href="https://www.iconfinder.com/webkul" rel="external">Webkul Software</a>, <a href="https://www.iconfinder.com/iconsets/ios-7-icons" rel="external">Visual Pharm</a>, <a href="https://www.iconfinder.com/goodware" rel="external">goodware std.</a>, <a href="https://www.iconfinder.com/font-awesome" rel="external">Font Awesome</a>, <a href="https://www.iconfinder.com/graphiqa" rel="external">Graphiqa Studio</a>, <a href="https://www.iconfinder.com/kucingklawu" rel="external">Kucingklawu Std.</a>, <a href="https://www.iconfinder.com/bendavis" rel="external">Creaticca Ltd</a>, <a href="https://www.iconfinder.com/iconsets/google-material-design-3-0" rel="external">Google</a> and <a href="https://www.iconfinder.com/olivetty" rel="external">Smashicons</a> from <a href="https://www.iconfinder.com/" rel="external">www.iconfinder.com</a> are licensed under <a href="http://creativecommons.org/licenses/by/3.0/" rel="external">CC 3.0 BY</a>. Some of the icons have been modified.</p>
                <p><a href="https://apvarun.github.io/toastify-js/" rel="external">ToastifyJS</a>, <a href="https://lodash.com/" rel="external">Lodash</a>, <a href="https://colorjs.io/" rel="external">Color.js</a>, <a href="https://kimmobrunfeldt.github.io/progressbar.js/" rel="external">ProgressBar.js</a> and <a href="https://atomiks.github.io/tippyjs/" rel="external">Tippy.js</a> are licensed under the <a href="https://tldrlegal.com/license/mit-license" rel="external">MIT License</a>. <a href="https://xxjapp.github.io/xdialog/" rel="external">Xdialog</a> is licensed under the <a href="https://www.apache.org/licenses/LICENSE-2.0" rel="external">Apache License 2.0</a>. <a href="https://github.com/bumbu/svg-pan-zoom" rel="external">Svg-pan-zoom</a> is licensed under the <a href="https://github.com/bumbu/svg-pan-zoom/blob/master/LICENSE" rel="external">BSD-2-Clause license</a>.</p>
                <p>World map from <a href="https://simplemaps.com/resources/svg-world" rel="external">simplemaps.com</a>.</p>`,
            buttons: null,
            style: "width: 400px"
        });
    };

    //Initialize the country list button
    document.getElementById("countryButton")!!.onclick = () => {
        new CountryList().show();
    };

    //Hide the loading view when the page is finished loading
    document.getElementById("loadingView")!!.style.visibility = "hidden";
}

function errorHandler(): void {
    xdialog.error(
        `<p>An unexpected error occurred. We apologize for the inconvenience. This means that if you continue playing, things might not work as expected. If you experience any issues, try refreshing the page.</p>
        <p>If this error persists, please <a href="https://github.com/GustavLindberg99/WorldWar2/issues">contact us</a>. Please include as much information as possible, including what you were doing before you got this error and any information available in the browser's developer tools (accessible by pressing the F12 key and going to Console).</p>`,
        {style: "width:400px"}
    );
}

window.onerror = window.onunhandledrejection = errorHandler;
window.addEventListener("load", main);
