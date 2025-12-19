import { defineConfig, globalIgnores } from "eslint/config";
import { fixupConfigRules, fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import jest from "eslint-plugin-jest";
import globals from "globals";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    globalIgnores(["**/dist/", "**/lib/", "**/node_modules/", "**/jest.config.js"]),
    {
        extends: fixupConfigRules(
            compat.extends("eslint:recommended", "plugin:import/recommended", "prettier"),
        ),

        plugins: {
            jest,
        },

        languageOptions: {
            globals: {
                ...globals.node,
                ...jest.environments.globals.globals,
            },
        },

        rules: {
            "consistent-return": "error",
            "sort-imports": "off",

            "import/order": ["error", {
                alphabetize: {
                    order: "asc",
                },
            }],
        },
    },
    {
        files: ["**/*.ts"],

        extends: fixupConfigRules(compat.extends(
            "plugin:@typescript-eslint/eslint-recommended",
            "plugin:@typescript-eslint/recommended",
            "plugin:import/typescript",
        )),

        plugins: {
            "@typescript-eslint": fixupPluginRules(typescriptEslint),
        },

        languageOptions: {
            parser: tsParser,
            ecmaVersion: 5,
            sourceType: "module",

            parserOptions: {
                project: "./tsconfig.json",
            },
        },

        rules: {
            "@typescript-eslint/no-empty-function": ["off"],
        },
    },
]);