# CMMC combined verification — 11 September 2026

Result: core workflows pass, but the application cannot yet be described as issue-free. An evidence-lifecycle consistency defect remains across views.

## Environment and scope

Verified local source after removing the seven requested CMMC modules. Used an isolated PostgreSQL database, all 13 committed migrations, seeded framework data, the real Fastify application, and the React frontend connected to that API. Synthetic test accounts and evidence were used. No Azure production environment or existing customer database was tested or modified.

## Verified results

| Area | Result and evidence |
|---|---|
| Build and static checks | Frontend ESLint and production build; backend TypeScript check and production build passed. |
| Automated tests | 33 tests across six test files passed. |
| Catalogue | 110 unique controls, 14 domains; domain totals sum to 110. |
| Browser navigation | Overview, Scope, Requirements, Gap Wizard, Uploaded Evidence, POA&M, SSP, Policies, Calendar, SPRS, assessment record, domain summary, and auditor pages rendered. Audit-readiness correctly redirects to the shared audits page with the CMMC filter. No console errors captured during this navigation. |
| Removed modules | No removed tabs in the CMMC navigation. Their dedicated implementations remain deleted. |
| Scope and documents | Scope answers and SSP/POA&M fields persisted and were read back through the API. |
| Evidence and completion | Missing uploads and unapproved evidence blocked completion. Upload bytes, objective mappings, approval, completion, and authenticated download passed. |
| Scoring | Initial score -203. Approved evidence covering all six objectives of AC.L2-3.1.1 enabled completion and increased score to -198. Deleting the evidence returned score to -203 and completed count to zero. |
| Calendar | Saved a record linked to a real control and evidence. Stale version save rejected. |
| Policies | 110 policy-view rows derived from control/evidence data. Shared owner and in-progress status propagated in tests. CMMC's generic policies.json is empty; its dedicated policy view uses workspace data instead. |
| Tenant isolation | Other tenant denied access to the first tenant's evidence; its own workspace remained empty. |
| PDF primitive | Shared SSP/POA&M PDF generator produced an application/pdf payload. Full populated export rendering and downloads were not verified. |

## Fixes applied during verification

1. Shared domain filter now derives from the full domain catalogue, restoring Configuration Management and Identification and Authentication.
2. Added Not Applicable to the shared status filter.
3. SPRS page shows explicit loading and error states instead of displaying zero totals before a successful response.
4. SPRS refresh now ignores older overlapping responses and refreshes on session changes; absent sessions clear metrics.
5. Added connected catalogue/policy tests and a reusable isolated-database smoke script at backend/scripts/cmmc-smoke.ts. It requires CMMC_VERIFY_ISOLATED=true and must only be run with a disposable database.

## Remaining findings

### High priority: completion views disagree after evidence deletion

Reproduction:

1. Upload evidence mapped to every objective for AC.L2-3.1.1.
2. Approve evidence and mark the control Completed.
3. Delete the evidence.
4. Open SPRS and Requirements.

SPRS correctly reports no completed controls and -203. The Requirements table still shows AC.L2-3.1.1 checked and Completed, with the Access Control group showing 1/22, while its summary reports zero completed controls. The saved workspace status remains Completed. Policy status derives Published from this same saved value, so it is not evidence-validated publication status. The audit finding list also continues to treat that saved control as completed.

Relevant code: backend/src/modules/evidence/routes.ts (evidence lifecycle), backend/src/modules/workspace/routes.ts (raw saved state), spectramind/src/features/cmmc/pages/CMMCOrganizationPage.jsx (raw row status versus validated summary), and spectramind/src/features/cmmc/services/cmmcPolicyWorkflowService.js (Completed-to-Published mapping).

Recommended correction: give Requirements, policy/readiness views, and audit findings a shared evidence-validated effective status while retaining the user's saved implementation declaration separately. Cover deletion, rejection, and replacement-version events with regression tests. This change was not made during this verification pass.

### Additional review needed: different readiness measures

The same synthetic account showed 0% CMMC control readiness and 25% on the shared audit-readiness page. The pages use different calculation paths. This is not evidence that either arithmetic formula is wrong, but the labels and underlying measures need reconciliation before presenting them as one combined readiness result.

## Verification limits

This was a focused functional verification, not a guarantee that every edge case is covered. Full multi-browser concurrent editing, long-running session changes, all assessment edits, every document export, production configuration, and load/security testing remain outside the verified result. The existing large JavaScript bundle warning remains non-blocking. The dev server also captured Recharts container-size warnings on the general dashboard; responsive chart sizing needs a separate visual check.

The core evidence-to-SPRS flow passes. A clean combined-workflow sign-off should wait for the evidence-lifecycle status inconsistency above to be resolved.
