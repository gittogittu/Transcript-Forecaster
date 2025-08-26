import { axe, toHaveNoViolations } from 'jest-axe'
import { RenderResult } from '@testing-library/react'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

/**
 * Test accessibility of a rendered component
 */
export const testAccessibility = async (container: HTMLElement) => {
  const results = await axe(container)
  expect(results).toHaveNoViolations()
}

/**
 * Test accessibility with custom rules
 */
export const testAccessibilityWithRules = async (
  container: HTMLElement,
  rules: Record<string, { enabled: boolean }>
) => {
  const results = await axe(container, {
    rules,
  })
  expect(results).toHaveNoViolations()
}

/**
 * Common accessibility test for form components
 */
export const testFormAccessibility = async (renderResult: RenderResult) => {
  await testAccessibilityWithRules(renderResult.container, {
    'label': { enabled: true },
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
  })
}

/**
 * Common accessibility test for interactive components
 */
export const testInteractiveAccessibility = async (renderResult: RenderResult) => {
  await testAccessibilityWithRules(renderResult.container, {
    'button-name': { enabled: true },
    'link-name': { enabled: true },
    'aria-roles': { enabled: true },
    'keyboard-navigation': { enabled: true },
  })
}