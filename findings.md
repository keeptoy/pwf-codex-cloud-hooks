# Findings

- Repository file listing contains two explicit test files: `tests/installer.test.js` and `tests/hook-adapter.test.js`.
- Each file declares exactly two top-level `test(...)` calls, for 4 test cases total.
- `package.json` runs `node --test tests/*.test.js`, so both files are included.
- A sandboxed run could not spawn test workers and misleadingly reported `tests 2` (the two failed files).
- An unrestricted run successfully collected all cases and reported `tests 4`; all 4 failed for Windows/environment prerequisites (`python3` command and approved global skill location), not because a fifth case exists.
- Exact declarations are at `tests/installer.test.js:23`, `tests/installer.test.js:32`, `tests/hook-adapter.test.js:13`, and `tests/hook-adapter.test.js:19`.
- README describes several behaviors covered inside those cases; those behavior checks are assertions/scenarios, not separately registered Node tests.
