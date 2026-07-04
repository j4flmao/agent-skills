# Data Quality: Metrics Definitions

## Overview
This is a highly detailed reference document.


## Great Expectations Python Code Examples

```python
import great_expectations as ge
from great_expectations.core.expectation_configuration import ExpectationConfiguration
import pandas as pd

# Initialize data context
context = ge.data_context.DataContext()

# Create a suite
suite = context.create_expectation_suite("my_suite", overwrite_existing=True)

# Add expectations
config1 = ExpectationConfiguration(
    expectation_type="expect_column_values_to_not_be_null",
    kwargs={"column": "user_id"}
)
suite.add_expectation(expectation_configuration=config1)

config2 = ExpectationConfiguration(
    expectation_type="expect_column_values_to_be_between",
    kwargs={"column": "age", "min_value": 0, "max_value": 120}
)
suite.add_expectation(expectation_configuration=config2)

# Save suite
context.save_expectation_suite(suite, "my_suite")
```


## Extended Details & Logs

### Detail Section 1

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 2

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 3

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 4

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 5

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 6

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 7

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 8

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 9

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 10

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 11

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 12

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 13

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 14

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 15

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 16

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 17

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 18

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 19

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 20

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 21

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 22

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 23

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 24

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 25

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 26

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 27

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 28

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 29

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 30

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 31

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 32

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 33

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 34

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 35

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 36

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 37

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 38

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 39

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 40

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 41

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 42

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 43

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 44

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 45

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 46

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 47

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 48

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 49

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 50

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 51

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 52

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 53

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 54

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 55

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 56

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 57

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 58

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 59

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 60

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 61

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 62

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 63

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 64

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 65

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 66

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 67

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 68

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 69

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 70

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 71

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 72

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 73

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 74

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 75

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 76

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 77

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 78

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 79

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 80

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 81

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 82

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 83

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 84

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 85

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 86

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 87

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 88

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 89

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 90

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 91

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 92

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 93

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 94

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 95

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 96

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 97

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 98

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 99

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 100

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 101

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 102

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 103

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 104

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 105

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 106

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 107

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 108

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 109

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 110

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 111

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 112

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 113

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 114

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 115

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 116

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 117

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 118

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 119

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 120

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 121

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 122

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 123

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 124

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 125

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 126

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 127

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 128

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


### Detail Section 129

- Metric: unexpected_count
  Value: 0
- Metric: element_count
  Value: 15430
- Status: SUCCESS
```json
{
  "success": true,
  "expectation_config": {
    "expectation_type": "expect_column_values_to_not_be_null",
    "kwargs": {
      "column": "transaction_id"
    }
  }
}
```


