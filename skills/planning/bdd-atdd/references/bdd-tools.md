# BDD Tools

## Tool Comparison

| Tool | Language | Platform | Key Features |
|------|----------|----------|-------------|
| **Cucumber** | Java, JS, Ruby, Go, .NET, Python | Cross-platform | Original BDD tool, wide ecosystem |
| **SpecFlow** | C#, .NET | .NET Framework/.NET Core/5+ | Cucumber for .NET, Visual Studio integration |
| **Behave** | Python | Python 3 | Python-native BDD, pytest integration |
| **JBehave** | Java | JVM | Java BDD with story files (not .feature) |
| **Karate** | Java | JVM | API testing + BDD, no step definition code needed |
| **Lettuce** | Python | Python | Django integration, Django test runner support |
| **Behat** | PHP | PHP | PHP BDD framework, Mink for browser testing |
| **Gauge** | Java, JS, Python, .NET | Cross-platform | Open source by ThoughtWorks, markdown specs |

## Cucumber (Primary Reference)

### Installation
```bash
# Java
<dependency>
  <groupId>io.cucumber</groupId>
  <artifactId>cucumber-java</artifactId>
  <version>7.14.0</version>
  <scope>test</scope>
</dependency>

# JavaScript
npm install @cucumber/cucumber --save-dev

# Ruby
gem install cucumber
```

### Project Structure
```
src/test/
├── resources/features/
│   ├── checkout/
│   │   └── payment.feature
│   └── account/
│       └── login.feature
└── java/
    └── stepdefinitions/
        ├── CheckoutSteps.java
        └── LoginSteps.java
```

### Step Definitions

```java
import io.cucumber.java.en.*;

public class CheckoutSteps {
    private CheckoutService checkout;
    private Order order;

    @Given("my cart contains {int} items")
    public void myCartContainsItems(int count) {
        checkout = new CheckoutService();
        for (int i = 0; i < count; i++) {
            checkout.addItem("Item " + i, 10.00);
        }
    }

    @Given("my cart total is ${double}")
    public void myCartTotalIs(double total) {
        checkout = new CheckoutService();
        // Setup cart with exact total
        checkout.addItem("Item", total);
    }

    @When("I apply the coupon code {string}")
    public void iApplyCoupon(String couponCode) {
        checkout.applyCoupon(couponCode);
    }

    @Then("the discount amount should be ${double}")
    public void verifyDiscount(double expectedDiscount) {
        assertEquals(expectedDiscount, checkout.getDiscount(), 0.01);
    }
}
```

### Hooks

```java
public class Hooks {
    @Before
    public void beforeScenario() {
        // Setup test data, start transaction, authenticate
        Database.startTransaction();
    }

    @After
    public void afterScenario() {
        // Cleanup test data
        Database.rollbackTransaction();
    }

    @Before("@smoke")
    public void beforeSmoke() {
        // Only run before smoke tests
    }

    @After(order = 1)
    public void takeScreenshotOnFailure(Scenario scenario) {
        if (scenario.isFailed()) {
            byte[] screenshot = ((TakesScreenshot) driver)
                .getScreenshotAs(OutputType.BYTES);
            scenario.attach(screenshot, "image/png", "failure");
        }
    }
}
```

### Tagged Hooks
```java
@Before("@requiresAuth and not @noauth")
public void ensureAuthenticated() {
    loginAsDefaultUser();
}
```

### Parameter Types

```java
import io.cucumber.java.ParameterType;

public class CustomParameters {
    @ParameterType("\\d+")
    public Integer count(String value) {
        return Integer.parseInt(value);
    }

    @ParameterType("(active|inactive|blocked)")
    public String accountStatus(String value) {
        return value;
    }
}
```

```gherkin
Scenario: Custom parameter types
  Given I have {count} items in my cart
  And my account status is {accountStatus}
  When I attempt checkout
  Then the result should match my account status
```

## SpecFlow (C# / .NET)

### Feature File
```gherkin
Feature: Order Discounts
  As a store owner
  I want to offer discounts to customers
  So that they can save money on their purchases
```

### Step Definitions
```csharp
using TechTalk.SpecFlow;

[Binding]
public class DiscountSteps
{
    private readonly CartService _cart = new();

    [Given(@"my cart subtotal is \$(.*)")]
    public void GivenCartSubtotal(decimal subtotal)
    {
        _cart.AddItem(new Item("Sample", subtotal));
    }

    [When(@"discounts are applied")]
    public void WhenDiscountsApplied()
    {
        _cart.ApplyDiscounts();
    }

    [Then(@"the discount amount should be \$(.*)")]
    public void ThenDiscountAmount(decimal expected)
    {
        Assert.Equal(expected, _cart.DiscountAmount);
    }
}
```

### Configuration
```xml
<!-- specflow.json -->
{
  "bindingCulture": { "name": "en-US" },
  "language": { "feature": "en-US" },
  "stepAssemblies": [
    { "assembly": "MyProject.Specs" }
  ]
}
```

## Behave (Python)

```python
# features/steps/checkout_steps.py
from behave import given, when, then
from hamcrest import assert_that, equal_to

@given('my cart contains {count:d} items')
def step_given_cart_items(context, count):
    context.checkout = CheckoutService()
    for i in range(count):
        context.checkout.add_item(f"Item {i}", 10.00)

@when('I apply the coupon code "{code}"')
def step_apply_coupon(context, code):
    context.checkout.apply_coupon(code)

@then('the discount amount should be ${amount:f}')
def step_verify_discount(context, amount):
    assert_that(context.checkout.discount, equal_to(amount))
```

### Behave Environment (environment.py)
```python
def before_all(context):
    context.config.setup_logging()

def before_scenario(context, scenario):
    context.database = TestDatabase()
    context.database.start_transaction()

def after_scenario(context, scenario):
    context.database.rollback()

def after_step(context, step):
    if step.status == "failed":
        print(f"FAILED: {step.name}")
```

## Reporting

### Cucumber HTML Report
```bash
cucumber --format html --out reports/cucumber.html
cucumber --format json --out reports/cucumber.json
```

### CI Integration
```yaml
# GitHub Actions
- name: Run BDD tests
  run: cucumber --format json --out reports/cucumber.json

- name: Publish report
  uses: deblockt/cucumber-report-annotations-action@v2
  with:
    access-token: ${{ secrets.GITHUB_TOKEN }}
    json-file: reports/cucumber.json
```

### Living Documentation Generation
```yaml
# Serenity BDD (Java)
- name: Run tests with Serenity
  run: mvn verify -Dserenity.outputDirectory=target/site/serenity

# Or with LivingDoc (SpecFlow)
- name: Generate living documentation
  run: dotnet specflow livingdoc assembly-path test-assembly.dll
```

## Best Practices

| Practice | Why |
|----------|-----|
| Keep step definitions small | Steps should delegate to domain helpers, not contain complex logic |
| Use data tables for structured input | Avoid long step strings; use tables for readability |
| Parameterize, don't duplicate | Reuse step definitions across features |
| Tag thoughtfully | Tags should reflect business priority, not test execution details |
| Run in CI | BDD tests must run in CI and block merges on failure |
| Review with stakeholders | Living documentation is for the business, not just the team |
| Keep scenarios fast | If scenarios are slow, they won't be run frequently enough |

## References
- Cucumber Documentation — https://cucumber.io/docs/
- SpecFlow Documentation — https://docs.specflow.org/
- Behave Documentation — https://behave.readthedocs.io/
- Karate Documentation — https://github.com/karatelabs/karate
- Gauge Documentation — https://docs.gauge.org/
