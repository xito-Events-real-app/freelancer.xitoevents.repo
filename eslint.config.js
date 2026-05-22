import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // ─────────────────────────────────────────────────────────────
      // Phase 2 RBAC guardrail.
      //
      // Every agency-owned table has a BEFORE INSERT trigger
      // (enforce_active_agency) that RAISES when a non-owner writes
      // without app.active_agency set. The only safe way for a staff
      // member to insert/update/delete on these tables is via the
      // withActiveAgency(agencyId, () => supabase.from(...).<op>(...))
      // wrapper exported from @/lib/withActiveAgency.
      //
      // This rule flags raw .insert/.update/.delete/.upsert chained
      // directly on supabase.from('<agency-table>') so PR reviewers
      // see the unwrapped call. If you must disable it on a line,
      // confirm in review that the call is inside a withActiveAgency
      // callback OR that the path is owner-only.
      // ─────────────────────────────────────────────────────────────
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "CallExpression[callee.property.name=/^(insert|update|delete|upsert)$/][callee.object.type='CallExpression'][callee.object.callee.property.name='from'][callee.object.arguments.0.value=/^(agency_clients|agency_client_payments|agency_client_events|agency_settings|agency_finance_banks|agency_finance_pins|agency_finance_sessions|bookings|booking_details|crew_assignments|lagan_dates|files_management|storage_devices)$/]",
          message:
            "Direct .insert/.update/.delete on agency-owned tables bypasses the staff active-agency guard. Wrap with withActiveAgency(agencyId, () => supabase.from(...).<op>(...)) from @/lib/withActiveAgency.",
        },
      ],
    },
  },
);
