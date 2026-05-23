# Shrinking Strategy Guide

## How Shrinking Works
1. Find smallest failing input
2. Try simpler versions (smaller numbers, shorter strings, fewer elements)
3. Report the minimal failing case

## Custom Shrinker Example
`	ypescript
const positiveInt = fc.integer({ min: 1, max: 1000 });

// Custom shrinker that tries powers of 2 first
const binarySearchInt = fc.integer({ min: 1, max: 1000 })
    .map((n) => n)
    .noShrink(); // Disable default, implement custom

// Or use existing combinators
fc.assert(fc.property(fc.array(fc.integer()), (arr) => {
    // fast-check handles shrinking automatically
}));
`

## Debugging Shrunk Failures
- The shrunk output is the most useful failing case
- Focus on what makes the test fail, not edge-case inputs
- Use .verboseShrink() to see the shrinking path
- Add .map() to generate domain-specific inputs
