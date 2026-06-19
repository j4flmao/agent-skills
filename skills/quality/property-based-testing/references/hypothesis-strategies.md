# Hypothesis Strategies Reference

## Basic Strategies
```python
import hypothesis.strategies as st

# Primitives
st.integers(min_value=0, max_value=100)
st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)
st.decimals(min_value=0, max_value=100, places=2)
st.text(min_size=1, max_size=100, alphabet=st.characters(whitelist_categories='L'))
st.booleans()
st.none()

# Collections
st.lists(st.integers(), min_size=1, max_size=10)
st.dictionaries(st.text(min_size=1), st.integers(), min_size=1, max_size=5)
st.sets(st.integers(), min_size=1, max_size=10)
st.tuples(st.integers(), st.text())

# Strings
st.emails()
st.uuids()
st.text(alphabet=string.ascii_letters + string.digits)
st.from_regex(r'\d{3}-\d{3}-\d{4}', fullmatch=True)  # Phone numbers
```

## Composite Strategies
```python
@st.composite
def user_strategy(draw):
    name = draw(st.text(min_size=1, max_size=50))
    email = draw(st.emails())
    role = draw(st.sampled_from(["admin", "user", "viewer"]))
    return User(name=name, email=email, role=role)

@given(user=user_strategy())
def test_user_creation(user):
    assert user.email.count('@') == 1
```

## Filtering and Mapping
```python
# Filter
even_numbers = st.integers(min_value=0, max_value=100).filter(lambda x: x % 2 == 0)
non_empty_strings = st.text().filter(lambda x: len(x) > 0)

# Map
positive_ints = st.integers(min_value=0).map(lambda x: x + 1)
valid_dates = st.datetimes().map(lambda dt: dt.replace(tzinfo=timezone.utc))
```

## Assumptions (skipping invalid)
```python
from hypothesis import assume

@given(x=st.integers(), y=st.integers())
def test_division(x, y):
    assume(y != 0)  # Skip tests where y is 0
    assert x / y >= float('-inf')
```

## Statistics
```python
@given(st.integers())
def test_distribution(x):
    if x < 0:
        stat("negative")
    elif x > 100:
        stat("large")
    else:
        stat("normal range")
```

## Settings
```python
@given(st.integers())
@settings(max_examples=1000, deadline=500, verbosity=Verbosity.verbose)
def test_function(x):
    pass
```
