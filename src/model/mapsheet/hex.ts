import { Countries, Country } from "../countries.js";
import { currentMonth, date, Month } from "../date.js";
import { SupplyLines, TerrainType, WeatherCondition, WeatherZone } from "../mapsheet.js";
import { Partnership } from "../partnership.js";
import { AirUnit, AliveUnit, NavalUnit, SupplyUnit, Unit } from "../units.js";
import { hexHeight, hexWidth, mapHeight, mapWidth, svgHeight, svgWidth } from "./create-hexes.js";

import UnitContainer from "../unit-container.js";

class Hex extends UnitContainer {
    readonly x: number;
    readonly y: number;

    readonly terrain: TerrainType;
    readonly weatherZone: WeatherZone;
    readonly canUseRail: boolean;

    readonly country: Country | null;
    readonly isResourceHex: boolean;
    readonly isColony: boolean;
    readonly isIndia: boolean;
    readonly secondaryController: Country | null;

    readonly #adjacentLandHexes: ReadonlyArray<boolean>;
    readonly #adjacentSeaHexes: ReadonlyArray<boolean>;

    readonly city: string | null;
    readonly cityAlignment: "t" | "b" | "l" | "r";
    readonly cityOffsetX: number;
    readonly cityOffsetY: number;
    readonly isCapital: boolean;
    readonly isEnclaveCity: boolean;
    readonly #isMajorPort: boolean;

    resourceHexDestroyed: boolean = false;
    installationsDestroyed: boolean = false;
    destroyedByAtomicBomb: boolean = false;

    #controller: Country | null;
    #fortConstruction: number = 0;
    #airfieldConstruction: number = 0;

    static groundedAirUnits = new Set<WeatherZone>();

    static readonly mapWidth = mapWidth;
    static readonly mapHeight = mapHeight;
    static readonly hexWidth = hexWidth;
    static readonly hexHeight = hexHeight;
    static readonly svgWidth = svgWidth;
    static readonly svgHeight = svgHeight;

    static readonly allHexes: Array<Hex> = [];
    static readonly allCityHexes: Array<Hex> = [];
    static readonly allResourceHexes: Array<Hex> = [];
    static readonly #fromCoordinates: Array<Array<Hex>> = Array.from(new Array(mapWidth), () => new Array(mapHeight));

    /**
     * Constructs a hex. All hexes are constructed at the beginning of the game in Hex.createHexGrid(). To get hexes after that, fetch existing hexes with static methods.
     *
     * @param x                     The x coordinate of the hex on the hex grid.
     * @param y                     The y coordinate of the hex on the hex grid.
     * @param terrain               The terrain of the hex.
     * @param weatherZone           The weather zone that the hex is in.
     * @param canUseRail            True if rail movement is possible in the hex, false otherwise.
     * @param country               The country that the hex is in. Null if it's an all-sea hex.
     * @param isResourceHex         True if the hex is a resource hex, false otherwise.
     * @param isColony              True if the hex is a colony, false otherwise.
     * @param isIndia               True if the hex is in India, false otherwise.
     * @param secondaryController   If the hex is in France, the country that should gain control of the hex when Vichy France is created. If the hex is in China but controlled by Japan in 1939, Japan. If the hex should be given to the Soviet Union when Germany invades Poland, the Soviet Union. If the hex is in Greenland, the United States (which gains control of Greenland when Denmark is conquered).
     * @param adjacentLandHexes     An array of 6 elements where 0=top, 1=top left, 2=bottom left, 3=bottom, 4=bottom right, 5=top right, where true means the hex is adjacent by land and false means it's not.
     * @param adjacentSeaHexes      An array of 6 elements where 0=top, 1=top left, 2=bottom left, 3=bottom, 4=bottom right, 5=top right, where true means the hex is adjacent by sea and false means it's not.
     * @param city                  The name of the city in this hex, or null if there is no city.
     * @param cityAlignment         The side that the city label should be aligned on if there is any (otherwise has no effect).
     * @param cityOffsetX           The offset in the x direction that the city marker should be placed at.
     * @param cityOffsetY           The offset in the y direction that the city marker should be placed at.
     * @param isMajorPort           True if the hex is a major port, false otherwise.
     * @param isCapital             True if the hex is the capital of its country, false otherwise.
     * @param isEnclaveCity         True if the country name should be displayed next to the city name, false otherwise. Should only be true if city is not null.
     */
    constructor(
        x: number,
        y: number,
        terrain: TerrainType,
        weatherZone: WeatherZone,
        canUseRail: boolean,
        country: Country | null,
        isResourceHex: boolean,
        isColony: boolean,
        isIndia: boolean,
        secondaryController: Country | null,
        adjacentLandHexes: ReadonlyArray<boolean>,
        adjacentSeaHexes: ReadonlyArray<boolean>,
        city: string | null = null,
        cityAlignment: "t" | "b" | "l" | "r" = "r",
        cityOffsetX: number = 0,
        cityOffsetY: number = 0,
        isMajorPort: boolean = false,
        isCapital: boolean = false,
        isEnclaveCity: boolean = false
    ){
        super();

        this.x = x;
        this.y = y;
        this.terrain = terrain;
        this.weatherZone = weatherZone;
        this.canUseRail = canUseRail;
        this.country = country;
        this.#controller = country;
        this.isResourceHex = isResourceHex;
        this.isColony = isColony;
        this.isIndia = isIndia;
        this.secondaryController = secondaryController;
        this.#adjacentLandHexes = adjacentLandHexes;
        this.#adjacentSeaHexes = adjacentSeaHexes;

        this.city = city;
        this.cityAlignment = cityAlignment;
        this.cityOffsetX = cityOffsetX;
        this.cityOffsetY = cityOffsetY;
        this.isCapital = isCapital;
        this.isEnclaveCity = isEnclaveCity;
        this.#isMajorPort = isMajorPort;

        Hex.allHexes.push(this);
        country?.hexes.push(this);
        if(city !== null){
            Hex.allCityHexes.push(this);
            country?.cities.push(this);
        }
        if(isResourceHex){
            Hex.allResourceHexes.push(this);
        }
        Hex.#fromCoordinates[x][y] = this;
    }

    override units(): IteratorObject<AliveUnit & Unit> {
        return Unit.unitsInHex(this).values();
    }

    /**
     * Gets the x coordinate of the hex center.
     *
     * @returns The x coordinate of the hex in pixels relative to the SVG element.
     */
    centerX(): number {
        return (this.x + 2/3) * hexWidth;
    }

    /**
     * Gets the y coordinate of the hex center.
     *
     * @returns The y coordinate of the hex in pixels relative to the SVG element.
     */
    centerY(): number {
        return (this.y + (this.x % 2 ? 1 : 1/2)) * hexHeight;
    }

    /**
     * Gets the controller of the hex.
     */
    controller(): Country | null {
        return this.#controller;
    }

    /**
     * Sets the controller of the hex and makes sure any hexes behind a front also get the correct controller.
     *
     * @param controller                    The controller to set.
     * @param allowChangeWithinPartnership  If true, always sets the controller to newController regardless of the partnerships of the old and new controllers. If false, only changes the controller if the old and new controllers have different partnerships.
     */
    setController(newController: Country, allowChangeWithinPartnership: boolean = true){
        this.#setController(newController, allowChangeWithinPartnership);
        const newPartnership = newController.partnership();
        if(!allowChangeWithinPartnership && newPartnership !== Partnership.Neutral){
            //Each inner array contains a group of hexes controlled by the opponent of the new partnership such that none of the groups are adjacent to each other.
            let groups: Array<Array<Hex>> = [];
            const opponent = newPartnership.opponent();
            for(let hex of this.adjacentLandHexes()){
                if(hex.controller()!!.partnership() === opponent){
                    const existingGroup = groups.find(group => group.some(it => hex.adjacentLandHexes().includes(it)));
                    if(existingGroup === undefined){
                        groups.push([hex]);
                    }
                    else{
                        existingGroup.push(hex);
                    }
                }
            }

            //We iterated over the adjacent land hexes in order, but the first and last group could still be the same
            const lastGroup = groups.at(-1);
            if(lastGroup !== groups[0] && lastGroup?.at(-1)?.adjacentLandHexes().includes(groups[0]?.[0])){
                groups[0].push(...lastGroup);
                groups.pop();
            }

            //Check if each group should change controller for being behind a front
            if(groups.length > 1 || this.#canPreventControlBehindFront(opponent)){
                for(let group of groups){
                    const hex = group.find(it => it.country !== Countries.china);
                    if(hex !== undefined){
                        const pathPreventingControlBehindFront = SupplyLines.pathBetweenHexes(
                            hex,
                            it => it.#canPreventControlBehindFront(opponent) && it.controller()?.partnership() === opponent,
                            it => it.controller()?.partnership() === opponent
                        );
                        if(pathPreventingControlBehindFront === null){
                            hex.#setControllerBehindFront(newController);
                        }
                    }
                }
            }
        }
    }

    /**
     * Sets the controller of the hex without checking hexes behind front.
     *
     * @param controller                    The controller to set.
     * @param allowChangeWithinPartnership  If true, always sets the controller to newController regardless of the partnerships of the old and new controllers. If false, only changes the controller if the old and new controllers have different partnerships.
     */
    #setController(newController: Country, allowChangeWithinPartnership: boolean = true): void {
        const oldController = this.controller();
        if(oldController === null){
            throw new TypeError("Cannot set the controller of an all-sea hex");
        }
        const differentPartnerships = oldController.partnership() !== newController.partnership();
        if(differentPartnerships || allowChangeWithinPartnership){
            if(!allowChangeWithinPartnership && !this.country!!.conquered() && newController.partnership() === this.country!!.partnership()){
                this.#controller = this.country;
            }
            else{
                this.#controller = newController;
            }
            if(differentPartnerships){
                this.destroyFortification();
                for(let unit of this.airUnits()){
                    unit.based = false;
                }
            }
        }
        SupplyLines.clearCache();
    }

    /**
     * Recursive function that sets the controller of this hex and each adjacent hex controlled by the same partnership.
     *
     * @param newController The controller to set.
     */
    #setControllerBehindFront(newController: Country): void {
        this.#setController(newController, false);
        for(let hex of this.adjacentLandHexes()){
            if(hex.country !== Countries.china && hex.controller()!!.partnership() === newController.partnership()!!.opponent()){
                hex.#setControllerBehindFront(newController);
            }
        }
    }

    /**
     * Checks if this hex contains anything that can prevent surrounding hexes from changing controller for being behind a front.
     *
     * @param partnerhsip   The partnership opposing the one that could gain control of this hex.
     *
     * @returns True if it contains something special, false if it doesn't.
     */
    #canPreventControlBehindFront(partnerhsip: Partnership): boolean {
        return this.city !== null
            || this.isResourceHex
            || this.fortified()
            || this.airbaseCapacity() > 0
            || this.landUnits().some(it => it.owner.partnership() === partnerhsip);
    }

    /**
     * Calculates the distance between this hex and the other hex. Source: https://stackoverflow.com/a/74749970/4284627.
     *
     * @param hex   The hex to get the distance from.
     *
     * @returns The number of hexes between the two hexes (for example 1 for two adjacent hexes).
     */
    distanceFromHex(hex: Hex): number {
        //Translate x1,y1 to origin and fold left half over right side
        let rx = Math.abs(hex.x - this.x);
        let ry = hex.y - this.y - (rx % 2) * (this.x % 2);

        //Fold along 30deg downward
        if(ry <= -rx / 2){
            ry = Math.abs(ry) - rx % 2;
            //rx remains unchanged
        }
        else if(ry < rx / 2){
            const c = Math.floor(rx / 2) - ry;  //Steps down from 30deg line
            ry = Math.floor(rx / 2) + Math.floor((c + (rx % 2)) / 2);
            rx -= c;    //rx update must be after ry
        }

        return rx + ry - Math.floor(rx / 2);
    }

    /**
     * Calculates the distance between this hex and the closest hex in the given hex group.
     *
     * @param frontLine The hex group to get the distance from.
     *
     * @returns The number of hexes between this hex and the closest hex in the given hex group.
     */
    distanceFromHexGroup(frontLine: ReadonlyArray<Hex>): number {
        return Math.min(...frontLine.map(it => it.distanceFromHex(this)));
    }

    /**
     * Finds the hex in the given array that's closest to this hex.
     *
     * @param hexes The hexes to choose from. Should not be empty.
     *
     * @returns The hex in the given array closest to this hex.
     */
    closestHex(hexes: ReadonlyArray<Hex>): Hex {
        return hexes.toSorted((a, b) => this.distanceFromHex(a) - this.distanceFromHex(b))[0];
    }

    /**
     * Checks if this hex is in the given partnership's land control zone.
     *
     * @param partnership   The partnership whose control zone to check.
     *
     * @returns True if this hex is in the partnership's land control zone, false otherwise.
     */
    isInLandControlZone(partnership: Partnership){
        if(this.fortified() && partnership !== this.controller()?.partnership()){
            return false;
        }
        if(this.landUnits().some(it => it.owner.partnership() === partnership && !(it instanceof SupplyUnit))){
            return true;
        }
        for(let hex of this.adjacentLandHexes()){
            if(hex.controller()?.partnership() === partnership && hex.landUnits().some(it => it.owner.partnership() === partnership && it.owner !== this.#controlZoneExcludedCountry() && !(it instanceof SupplyUnit))){
                return true;
            }
        }
        return false;
    }

    /**
     * Checks if this hex is in the given partnership's naval control zone.
     *
     * @param partnership                   The partnership whose control zone to check.
     * @param checkForSubmarineControlZones If true, checks for control zones against submarines. If false, checks for control zones against surface naval units.
     *
     * @returns True if this hex is in the partnership's naval control zone, false otherwise.
     */
    isInNavalControlZone(partnership: Partnership, checkForSubmarineControlZones: boolean): boolean {
        for(let adjacentHex of [this, ...this.adjacentSeaHexes()]){
            if(adjacentHex.navalUnits().some(it => it.owner.partnership() === partnership && (checkForSubmarineControlZones ? it.submarineAttack > 0 : it.attack > 0))){
                return true;
            }
        }
        return false;
    }

    /**
     * Gets the country whose units can't have a control zone into this hex due to Japan and the Soviet Union not being at war, if any.
     *
     * @returns Japan if this hex is in the Soviet Union, the Soviet Union if this hex is in Japan, null otherwise or if Japan and the Soviet Union are at war with each other.
     */
    #controlZoneExcludedCountry(): Country | null {
        if(Countries.mongolia.partnership() === Partnership.Neutral && Countries.japan.partnership() !== Countries.sovietUnion.partnership()){
            if(this.country === Countries.japan){
                return Countries.sovietUnion;
            }
            if(this.country === Countries.sovietUnion){
                return Countries.japan;
            }
        }
        return null;
    }

    /**
     * Checks if the given unit can be placed in this hex during the deployment phase.
     *
     * @param unit  The unit to check.
     *
     * @returns True if it can be placed here, false if it can't.
     */
    unitCanBePlacedHere(unit: Unit): boolean {
        return unit.owner.partnership() === this.controller()?.partnership() && (
            unit.owner === this.country
            || (date.current === unit.owner.enteredWar && unit.owner === this.controller() && (unit.owner === Countries.japan || unit.owner === Countries.sovietUnion))
            || (unit instanceof NavalUnit && unit.owner === Countries.poland && this.country === Countries.unitedKingdom && !this.isColony)
            || (unit instanceof AirUnit && unit.owner === Countries.unitedStates && this.isPort() && (this.controller() === Countries.unitedKingdom || this.controller() === Countries.unitedStates) && !this.isInNavalControlZone(Partnership.Axis, false))
        ) && (
            unit.owner !== Countries.poland || this.controller() !== Countries.sovietUnion
        );
    }

    /**
     * Checks whether this hex is a port (does not include lake ports).
     *
     * @returns True if it's a port, false if it isn't.
     */
    isPort(): boolean {
        const lakePorts: ReadonlyArray<string | null> = ["Chicago", "Cleveland", "Toronto", "Astrakhan", "Baku", "Krasnovodsk", "Irkutsk", "Kampala"];
        return this.city !== null && !this.installationsDestroyed && this.isCoastal() && !this.isIcecap() && !lakePorts.includes(this.city);
    }

    /**
     * Checks whether this hex is a major port.
     *
     * @returns True if it's a major port, false if it isn't.
     */
    isMajorPort(): boolean {
        return this.isPort() && this.#isMajorPort;
    }

    /**
     * Checks if this hex is in the black sea. Used to improve performance when automoving Soviet ships while Turkey is neutral.
     *
     * @returns True if the hex is a sea hex in the black sea, false if it's a sea hex outside of the black sea. The behavior is unspecified if it's not a sea hex.
     */
    isBlackSea(): boolean {
        return this.x >= 171 && this.x <= 186 && this.y >= 182 && this.y <= 191;
    }

    /**
     * Checks whether this hex is fortified.
     *
     * @returns True if the hex is fortified, false if it isn't. If a fortification is under construction, returns false.
     */
    fortified(): boolean {
        return this.#fortConstruction >= 3;
    }

    /**
     * Checks whether a fortification is currently under construction in this hex.
     *
     * @returns True if a fortification is under construction, false if there is no fortification or if the fortification is finished.
     */
    fortUnderConstruction(): boolean {
        return this.#fortConstruction > 0 && !this.fortified();
    }

    /**
     * Gets the number of months until the fortification is finished.
     *
     * @returns The number of months until the fortification is finished if a fortification is under construction, or 0 if a fortification is already built. If no foritfication is under construction, returns the number of months it would take if the construction would start now.
     */
    monthsUntilFortFinished(): number {
        return 3 - this.#fortConstruction;
    }

    /**
     * Checks whether the construction of a fortification in this hex started this turn.
     *
     * @returns True if it started this turn, false if it didn't.
     */
    fortRecentlyBuilt(): boolean {
        return this.#fortConstruction === 1;
    }

    /**
     * Checks whether this hex has an airfield installation (only counts installations, not cities or resource hexes).
     *
     * @returns True if the hex has an airfield, false if it doesn't. If an airfield is under construction, returns false.
     */
    hasAirfield(): boolean {
        return this.#airfieldConstruction >= 3;
    }

    /**
     * Gets the total airbase capacity of this hex, including airfields, cities and resource hexes, excluding carriers.
     *
     * @returns The number of air units that can base in this hex.
     */
    airbaseCapacity(): number {
        if(this.destroyedByAtomicBomb){
            return 0;
        }

        let result = 0;
        if(this.city !== null && !this.installationsDestroyed){
            result += 2;
        }
        if(this.isResourceHex && !this.installationsDestroyed){
            result++;
        }
        if(this.hasAirfield()){
            result += 2;
        }
        return result;
    }

    /**
     * Gets the remaining airbase capacity of this hex, including airfields, cities and resource hexes, excluding carriers.
     *
     * @returns The number of additional air units that can base in this hex.
     */
    remainingAirbaseCapacity(): number {
        return this.airbaseCapacity() - [...this.basedAirUnits()].length;
    }

    /**
     * Checks whether an airfield is currently under construction in this hex.
     *
     * @returns True if an airfield is under construction, false if there is no airfield or if the airfield is finished.
     */
    airfieldUnderConstruction(): boolean {
        return this.#airfieldConstruction > 0 && this.#airfieldConstruction < 3;
    }

    /**
     * Gets the number of months until the airfield is finished.
     *
     * @returns The number of months until the airfield is finished if a airfield is under construction, or 0 if a airfield is already built. If no foritfication is under construction, returns the number of months it would take if the construction would start now.
     */
    monthsUntilAirfieldFinished(): number {
        return 3 - this.#airfieldConstruction;
    }

    /**
     * Checks whether the construction of an airfield in this hex started this turn.
     *
     * @returns True if it started this turn, false if it didn't.
     */
    airfieldRecentlyBuilt(): boolean {
        return this.#airfieldConstruction === 1;
    }

    /**
     * Destroys the installations in this hex (including cities' and resource hexes' airbase capacities).
     */
    destroyInstallations(): void {
        this.destroyFortification();
        this.destroyAirfield();
        this.installationsDestroyed = true;

        //Handle based air units and naval units in port
        for(let unit of this.basedAirUnits()){
            unit.based = false;
        }
    }

    /**
     * Destroys the fortification in this hex, leaving other installations as they are. Does nothing if the hex isn't fortified.
     */
    destroyFortification(): void {
        this.#fortConstruction = 0;
    }

    /**
     * Destroys the airfield in this hex, leaving other installations as they are. Does nothing if the hex doesn't have an airfield.
     */
    destroyAirfield(): void {
        this.#airfieldConstruction = 0;
    }

    /**
     * Repairs permanent installations and resource hex.
     */
    repairInstallations(): void {
        this.installationsDestroyed = false;
        this.resourceHexDestroyed = false;
    }

    /**
     * Starts building a fortification in this hex.
     */
    startBuildingFortification(): void {
        this.#fortConstruction = 1;
    }

    /**
     * Starts building an airfield in this hex.
     */
    startBuildingAirfield(): void {
        this.#airfieldConstruction = 1;
    }

    /**
     * Continues building an installation in this hex if the construction of an installation has already started, otherwise does nothing.
     */
    continueBuilding(): void {
        if(this.fortUnderConstruction()){
            this.#fortConstruction++;
        }
        if(this.airfieldUnderConstruction()){
            this.#airfieldConstruction++;
        }
    }

    /**
     * Gets the current weather condition in this hex.
     *
     * @returns The current weather condition in this hex.
     */
    weatherCondition(): WeatherCondition {
        if(this.weatherZone === WeatherZone.Polar && (currentMonth() === Month.December || currentMonth() === Month.January || currentMonth() === Month.February)){
            return WeatherCondition.SevereWinter;
        }
        else if((this.weatherZone === WeatherZone.NorthTemperate && (currentMonth() === Month.December || currentMonth() === Month.January || currentMonth() === Month.February)) || (this.weatherZone === WeatherZone.Polar && currentMonth() >= Month.September && currentMonth() <= Month.November) || (this.weatherZone === WeatherZone.SouthTemperate && currentMonth() >= Month.June && currentMonth() <= Month.August)){
            return WeatherCondition.MildWinter;
        }
        else if(((this.weatherZone === WeatherZone.NorthTemperate || this.weatherZone === WeatherZone.Polar) && currentMonth() >= Month.March && currentMonth() <= Month.May) || (this.weatherZone === WeatherZone.SouthTemperate && currentMonth() >= Month.September && currentMonth() <= Month.November)){
            return WeatherCondition.Spring;
        }
        else if(this.weatherZone === WeatherZone.Tropical && currentMonth() >= Month.June && currentMonth() <= Month.August){
            return WeatherCondition.Monsoon;
        }
        return WeatherCondition.None;
    }

    /**
     * Checks if this is a forest hex.
     *
     * @returns True if it's a forest hex, false if it isn't.
     */
    isForest(): boolean {
        return this.terrain === TerrainType.Forest || this.terrain === TerrainType.CoastalForest;
    }

    /**
     * Checks if this is a desert hex.
     *
     * @returns True if it's a desert hex, false if it isn't.
     */
    isDesert(): boolean {
        return this.terrain === TerrainType.Desert || this.terrain === TerrainType.CoastalDesert;
    }

    /**
     * Checks if this is a mountain hex (not including tall mountains).
     *
     * @returns True if it's a mountain hex, false if it isn't.
     */
    isMountain(): boolean {
        return this.terrain === TerrainType.Mountain || this.terrain === TerrainType.CoastalMountain;
    }

    /**
     * Checks if this is a tall mountain hex.
     *
     * @returns True if it's a tall mountain hex, false if it isn't.
     */
    isTallMountain(): boolean {
        return this.terrain === TerrainType.TallMountain || this.terrain === TerrainType.CoastalTallMountain;
    }

    /**
     * Checks if this is an icecap hex (regardless of whether it's over land or over sea).
     *
     * @returns True if it's an icecap hex, false if it isn't.
     */
    isIcecap(): boolean {
        return this.terrain === TerrainType.LandIce || this.terrain === TerrainType.CoastalIce || this.terrain === TerrainType.SeaIce;
    }

    /**
     * Checks if this is a coastal hex.
     *
     * @returns True if it's a coastal hex, false if it isn't.
     */
    isCoastal(): boolean {
        return this.terrain === TerrainType.Coastal || this.terrain === TerrainType.CoastalMountain || this.terrain === TerrainType.CoastalTallMountain || this.terrain === TerrainType.CoastalForest;
    }

    /**
     * Checks if this is a land hex.
     *
     * @returns True if it's a land hex, false if it isn't.
     */
    isLand(): boolean {
        return this.terrain !== TerrainType.Sea && this.terrain !== TerrainType.SeaIce;
    }

    /**
     * Checks if this is a sea hex.
     *
     * @returns True if it's a sea hex, false if it isn't.
     */
    isSea(): boolean {
        return this.terrain === TerrainType.Sea || this.isCoastal();
    }

    /**
     * Gets the hexes adjacent to this hex in the order needed for adjacentLandHexes() and adjacentSeaHexes() to work.
     *
     * @returns The hexes in the necessary order.
     */
    #orderedAdjacentHexes(): Array<Hex | undefined> {
        return this.x % 2 ? [
            Hex.fromCoordinates(this.x, this.y - 1),
            Hex.fromCoordinates(this.x - 1, this.y),
            Hex.fromCoordinates(this.x - 1, this.y + 1),
            Hex.fromCoordinates(this.x, this.y + 1),
            Hex.fromCoordinates(this.x + 1, this.y + 1),
            Hex.fromCoordinates(this.x + 1, this.y)
        ] : [
            Hex.fromCoordinates(this.x, this.y - 1),
            Hex.fromCoordinates(this.x - 1, this.y - 1),
            Hex.fromCoordinates(this.x - 1, this.y),
            Hex.fromCoordinates(this.x, this.y + 1),
            Hex.fromCoordinates(this.x + 1, this.y),
            Hex.fromCoordinates(this.x + 1, this.y - 1)
        ];
    }

    /**
     * Gets the hexes adjacent to this hex.
     *
     * @returns The adjacent hexes.
     */
    adjacentHexes(): Array<Hex> {
        return this.#orderedAdjacentHexes().filter(it => it !== undefined);
    }

    /**
     * Gets the hexes adjacent to this hex by land.
     *
     * @returns The adjacent land hexes.
     */
    adjacentLandHexes(): Array<Hex> {
        let result = [];
        for(let i = 0; i < 6; i++){
            const hex = this.#orderedAdjacentHexes()[i];
            if(hex !== undefined && (this.#adjacentLandHexes[i] || (this.weatherCondition() === WeatherCondition.SevereWinter && this.isIcecap() && hex.isIcecap() && this.isLand() && hex.isLand()))){
                result.push(hex);
            }
        }
        return result;
    }

    /**
     * Gets the hexes adjacent to this hex by sea.
     *
     * @param canalOwner If this is a canal hex, only returns the adjacent canal hex if the given partnerhsip controls both hexes.
     *
     * @returns The adjacent sea hexes.
     */
    adjacentSeaHexes(canalOwner: Partnership | null = null): Array<Hex> {
        if(this.isIcecap()){
            return [];
        }

        const canals = [
            [Hex.fromCoordinates(105, 86), Hex.fromCoordinates(106, 86)],    //Panama Canal
            [Hex.fromCoordinates(162, 169), Hex.fromCoordinates(163, 169)],  //Kiel Canal
            [Hex.fromCoordinates(173, 200), Hex.fromCoordinates(173, 201)]   //Suez Canal
        ];
        const interestingCanal = canals.find(it => it.includes(this));

        let result: Array<Hex> = [];
        if(canalOwner !== null && interestingCanal?.every(it => it.controller()!!.partnership() === canalOwner)){
            result.push(interestingCanal.find(it => it !== this)!!);
        }
        for(let i = 0; i < 6; i++){
            const hex = this.#orderedAdjacentHexes()[i];
            if(hex !== undefined && this.#adjacentSeaHexes[i] && !hex.isIcecap()){
                result.push(hex);
            }
        }
        return result;
    }

    /**
     * Checks if air units are grounded in this hex.
     *
     * @returns True if air units are grounded, false if they aren't.
     */
    airUnitsGrounded(): boolean {
        return Hex.groundedAirUnits.has(this.weatherZone);
    }

    /**
     * Gets the movement point cost for a land unit to enter this hex.
     *
     * @returns The number of movement points it costs for the land unit to enter the hex.
     */
    landMovementPointCost(): number {
        let result = 1;
        if(this.weatherCondition() === WeatherCondition.Spring || this.weatherCondition() === WeatherCondition.MildWinter || this.weatherCondition() === WeatherCondition.Monsoon){
            result++;
        }
        if(this.isTallMountain()){
            result++;
        }
        return result;
    }

    /**
     * Checks if air units are grounded in the given weather zone.
     *
     * @param weatherZone   The weather zone to check.
     *
     * @returns True if air units are grounded, false if they aren't.
     */
    static airUnitsGrounded(weatherZone: WeatherZone): boolean {
        return Hex.groundedAirUnits.has(weatherZone);
    }

    /**
     * Chooses which weahter zones should have grounded air units.
     */
    static chooseGroundedAirUnits(): void {
        Hex.groundedAirUnits = new Set();
        if(currentMonth() === Month.December || currentMonth() <= Month.February){
            if(Math.random() <= 0.6){
                Hex.groundedAirUnits.add(WeatherZone.Polar);
            }
            if(Math.random() <= 0.3){
                Hex.groundedAirUnits.add(WeatherZone.NorthTemperate);
            }
        }
        else if(currentMonth() <= Month.May){
            if(Math.random() <= 0.3){
                Hex.groundedAirUnits.add(WeatherZone.Polar);
            }
            if(Math.random() <= 0.3){
                Hex.groundedAirUnits.add(WeatherZone.NorthTemperate);
            }
        }
        else if(currentMonth() <= Month.August){
            if(Math.random() <= 0.3){
                Hex.groundedAirUnits.add(WeatherZone.SouthTemperate);
            }
            if(Math.random() <= 0.6){
                Hex.groundedAirUnits.add(WeatherZone.Tropical);
            }
        }
        else{
            if(Math.random() <= 0.3){
                Hex.groundedAirUnits.add(WeatherZone.SouthTemperate);
            }
            if(Math.random() <= 0.3){
                Hex.groundedAirUnits.add(WeatherZone.Polar);
            }
        }
        if(Hex.groundedAirUnits.has(WeatherZone.NorthTemperate)){
            Hex.groundedAirUnits.add(WeatherZone.Industrialized);
        }
    }

    /**
     * Gets a hex from its coordinates on the hex grid.
     *
     * @param x The x coordinate of the hex on the hex grid.
     * @param y The y coordinate of the hex on the hex grid.
     *
     * @returns The hex.
     */
    static fromCoordinates(x: number, y: number): Hex {
        return Hex.#fromCoordinates[x]?.[y];
    }

    /**
     * Serializes the hex to a JSON object.
     *
     * @returns An object containing information about this hex that can be stringified to JSON.
     */
    toJson(): Hex.Json {
        let json: Hex.Json = {
            x: this.x,
            y: this.y,
            resourceHexDestroyed: this.resourceHexDestroyed || undefined,
            installationsDestroyed: this.installationsDestroyed || undefined,
            destroyedByAtomicBomb: this.destroyedByAtomicBomb || undefined,
            fortConstruction: this.#fortConstruction || undefined,
            airfieldConstruction: this.#airfieldConstruction || undefined
        };
        if(this.controller() !== this.country){
            json.controller = this.controller()!!.name();
        }
        return json;
    }

    /**
     * Checks if the given JSON contains valid hex info.
     *
     * @param json  The JSON object to validate.
     *
     * @returns True if it does, false if it doesn't.
     */
    static validateJson(json: unknown): json is Hex.Json {
        if(typeof(json) !== "object" || json === null){
            console.warn("Invalid hex.");
            return false;
        }
        else if(!("x" in json) || typeof(json.x) !== "number"){
            console.warn("Invalid hex: invalid x.");
            return false;
        }
        else if(!("y" in json) || typeof(json.y) !== "number"){
            console.warn("Invalid hex: invalid y.");
            return false;
        }
        else if(Hex.fromCoordinates(json.x, json.y) === undefined){
            console.warn(`Invalid hex ${json.x}, ${json.y}: coordinates out of range.`);
            return false;
        }
        else if("resourceHexDestroyed" in json && typeof(json.resourceHexDestroyed) !== "boolean"){
            console.warn(`Invalid hex ${json.x}, ${json.y}: invalid resourceHexDestroyed.`);
            return false;
        }
        else if("installationsDestroyed" in json && typeof(json.installationsDestroyed) !== "boolean"){
            console.warn(`Invalid hex ${json.x}, ${json.y}: invalid installationsDestroyed.`);
            return false;
        }
        else if("destroyedByAtomicBomb" in json && typeof(json.destroyedByAtomicBomb) !== "boolean"){
            console.warn(`Invalid hex ${json.x}, ${json.y}: invalid destroyedByAtomicBomb.`);
            return false;
        }
        else if("fortConstruction" in json && !(typeof(json.fortConstruction) === "number" && json.fortConstruction >= 0 && json.fortConstruction <= 3)){
            console.warn(`Invalid hex ${json.x}, ${json.y}: invalid fortConstruction.`);
            return false;
        }
        else if("airfieldConstruction" in json && !(typeof(json.airfieldConstruction) === "number" && json.airfieldConstruction >= 0 && json.airfieldConstruction <= 3)){
            console.warn(`Invalid hex ${json.x}, ${json.y}: invalid airfieldConstruction.`);
            return false;
        }
        else if("controller" in json && Countries.fromName(json.controller) === null){
            console.warn(`Invalid hex ${json.x}, ${json.y}: invalid controller.`);
            return false;
        }
        else{
            return true;
        }
    }

    /**
     * Parses the given JSON object as hex info and updates this hex with that info.
     *
     * @param json  The JSON object to parse.
     */
    loadFromJson(json: Hex.Json): void {
        this.resourceHexDestroyed = json.resourceHexDestroyed ?? false;
        this.installationsDestroyed = json.installationsDestroyed ?? false;
        this.destroyedByAtomicBomb = json.destroyedByAtomicBomb ?? false;
        this.#fortConstruction = json.fortConstruction ?? 0;
        this.#airfieldConstruction = json.airfieldConstruction ?? 0;
        if(json.controller !== undefined){
            const controller = Countries.fromName(json.controller)!!;
            this.setController(controller);
        }
    }
}

namespace Hex {
    export type Json = {
        x: number,
        y: number,
        resourceHexDestroyed?: boolean,
        installationsDestroyed?: boolean,
        destroyedByAtomicBomb?: boolean,
        fortConstruction?: number,
        airfieldConstruction?: number,
        controller?: string
    };
}

export default Hex;
