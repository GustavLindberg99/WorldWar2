export enum Phase {
    Deployment, Income, UnitBuild,
    AxisOverrun, AxisFirstMovement, AxisInterception, AxisAmphibiousParadrop, AxisCombat, AxisSecondMovement,
    AlliedOverrun, AlliedFirstMovement, AlliedInterception, AlliedAmphibiousParadrop, AlliedCombat, AlliedSecondMovement,
    Supply, WarDeclaration
}

export namespace Phase {
    export let current = Phase.WarDeclaration;
}
