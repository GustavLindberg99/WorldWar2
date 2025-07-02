The imports should be divided into groups that are in the following order:

- Third party libraries and utils (vitest for unit tests, lodash, utils).
- Base class of the class being declared in this file (should always be imported directly from the file declaring that class, for example `import Unit from "./unit.js";`).
- Model imports (should always be imported from a file located in the model folder, for example `import { Unit } from "../units.js";`).
- View imports.
- Controller imports.
- Imports from the same folder that aren't supposed to be exposed to other folders.

Within each group, each import is in alphabetical order, except for model imports where they need to be in a specific order to avoid issues with classes being accessed before initialization:

- mapsheet.js
- partnership.js
- countries.js
- units.js
- date.js
- phase.js
- combat.js
- saved-games.js
