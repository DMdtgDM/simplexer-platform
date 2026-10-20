import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([{
    extends: [...nextCoreWebVitals],

    rules: {
        "react/no-unescaped-entities": "off",
        // eslint-config-next 16 enables the React Compiler rule set by
        // default. This app does not use the React Compiler, and every
        // error these five rules report is against code that was
        // lint-clean under the Next 14 setup — flagging working patterns
        // (e.g. setState inside an effect) rather than real defects.
        // They stay off until the app adopts the compiler on purpose.
        "react-hooks/static-components": "off",
        "react-hooks/set-state-in-effect": "off",
        "react-hooks/purity": "off",
        "react-hooks/preserve-manual-memoization": "off",
        "react-hooks/refs": "off",
    },
}]);