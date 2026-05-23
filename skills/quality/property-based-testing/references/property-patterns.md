# External Service Mocking with WireMock

## WireMock Setup
`java
// Start WireMock server
WireMockServer wireMockServer = new WireMockServer(8089);
wireMockServer.start();

// Stub a response
stubFor(get(urlEqualTo("/api/users"))
    .willReturn(aResponse()
        .withStatus(200)
        .withHeader("Content-Type", "application/json")
        .withBody("[{\"id\":1,\"name\":\"Alice\"}]")));

// Verify interaction
verify(getRequestedFor(urlEqualTo("/api/users")));
`

## Advanced Stubbing
`json
{
    "request": {
        "method": "POST",
        "url": "/api/payments",
        "bodyPatterns": [{
            "matchesJsonPath": "$.amount"
        }]
    },
    "response": {
        "status": 201,
        "jsonBody": {
            "id": "pay_123",
            "status": "succeeded"
        }
    }
}
`

## Simulating Failures
`java
// Timeout
stubFor(get(urlEqualTo("/api/slow"))
    .willReturn(aResponse()
        .withFixedDelay(5000)));

// 500 error
stubFor(post(urlEqualTo("/api/orders"))
    .willReturn(aResponse()
        .withStatus(500)));

// Connection refused
wireMockServer.stop();
`
"@ | Set-Content -Path "D:\j4flmao-org\skills\quality\integration-testing\references\external-services.md" -Encoding UTF8

@"
# Property Types and Invariant Patterns

## Common Property Patterns
`	ypescript
// Idempotence: running twice is same as once
fc.assert(fc.property(fc.string(), (str) => {
    const once = str.trim();
    const twice = str.trim().trim();
    expect(once).toBe(twice);
}));

// Round-trip: serialize -> deserialize -> original
fc.assert(fc.property(fc.object(), (obj) => {
    const json = JSON.stringify(obj);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(obj);
}));

// Order independence: different orders should give same result
fc.assert(fc.property(fc.array(fc.integer()), (arr) => {
    const sortedAsc = [...arr].sort((a, b) => a - b);
    const sortedDesc = [...arr].sort((a, b) => b - a).reverse();
    expect(sortedAsc).toEqual(sortedDesc);
}));
`

## Property Categories
| Category | Description | Example |
|----------|-------------|---------|
| Algebraic | Obeys mathematical laws | a + b = b + a (commutative) |
| Oracle | Result matches alternative implementation | sort = bubbleSort = mergeSort |
| Symmetry | Operation inverse exists | encrypt/decrypt, compress/decompress |
| Metamorphic | Input transformation → output transformation | double input → double output |
