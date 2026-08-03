# Project quality gates

Treat frontend finish as part of correctness, not as optional polish.

For every change that can affect rendered UI:

1. Run the functional checks first.
2. Run `pnpm test:e2e`.
3. Run `pnpm test:visual` last.
4. Inspect every generated actual/diff image when the visual gate fails.
5. Verify PT-BR, English and Spanish at desktop, mobile and narrow widths.

Do not consider a UI task complete while text is clipped, controls overflow, horizontal scrolling
appears, or a primary interactive target is smaller than 44 pixels.

Never run `pnpm test:visual:update` only to make a failure disappear. Update visual references only
after inspecting the new rendering and confirming the change is intentional. Commit the reviewed
reference images with the UI change.

Use `pnpm check:full` as the final local quality gate before handing off a completed change.
