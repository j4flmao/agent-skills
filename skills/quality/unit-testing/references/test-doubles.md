# Test Doubles Guide

## Mocking Frameworks by Language
| Language | Framework |
|----------|-----------|
| TypeScript/JavaScript | Vitest, Jest, Sinon.js |
| Java | Mockito, EasyMock, WireMock |
| Python | unittest.mock, pytest-mock |
| Go | gomock, testify/mock |
| Rust | mockall, mockito |
| C# | Moq, NSubstitute, FakeItEasy |
| Kotlin | MockK, Mockito |
| Swift | Cuckoo, Mockingbird |

## When to Mock vs When to Use Real
| Scenario | Use |
|----------|-----|
| External HTTP API | Mock (WireMock) |
| Database | Real (TestContainers) |
| Time-dependent code | Mock (fake timer) |
| File system | Mock (in-memory FS) |
| Random/UUID | Mock (fixed values) |
| Complex algorithm | Real (test the logic) |

## Mocking Pitfalls
- Overspecification: testing implementation, not behavior
- Brittle mocks: changing internals breaks tests
- Canned responses: mocks that never fail hide bugs
- Mocking what you don't own: test the adapter, not the library
