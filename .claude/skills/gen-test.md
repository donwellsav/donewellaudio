---
name: gen-test
description: Generate vitest tests for a given file using project conventions
---

# Generate Tests

Generate a vitest test file for the specified source file.

## Arguments

The user provides a file path: `/gen-test <file-path>`

## Instructions

1. Read the target source file completely
2. Find existing tests in the project for similar files to learn conventions:
   - API routes: see `app/api/companion/proxy/__tests__/route.test.ts`
   - DSP modules: see `lib/dsp/__tests__/`
   - Hooks: see `hooks/__tests__/`
   - Contexts: see `contexts/__tests__/`
3. Generate a test file following these conventions:
   - Use vitest (`import { describe, it, expect, vi } from 'vitest'`)
   - Co-locate tests in `__tests__/` directory next to the source
   - Use `vi.mock()` for external dependencies
   - For API routes: use `NextRequest` helper pattern, test status codes and response shapes
   - For DSP modules: test with realistic numeric inputs, verify mathematical properties
   - For hooks: use `@testing-library/react` renderHook pattern
   - For pure functions: test edge cases, boundary values, error paths
4. Write the test file
5. Run `pnpm test -- <test-file-path>` to verify all tests pass
6. If any fail, fix them

## Quality Bar

- Every public export should have at least one test
- Test the happy path, error path, and at least one edge case
- Use descriptive test names that explain the expected behavior
- Don't test implementation details — test behavior
