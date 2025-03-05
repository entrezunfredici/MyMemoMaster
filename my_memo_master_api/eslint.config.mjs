import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.js"], 
    languageOptions: {
      sourceType: "commonjs"
    }
  },
  {
    languageOptions: { 
      globals: { 
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
        ...globals.es6,
      }
    }
  },
  pluginJs.configs.recommended,
];