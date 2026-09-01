# C++ Testing (Google Test & GMock)

## 1. Google Test (gtest)
Google Test is the most widely used C++ testing framework. It uses macros for assertions and test case definition.

```cpp
#include <gtest/gtest.h>

int multiply(int a, int b) { return a * b; }

// TEST(TestSuiteName, TestName)
TEST(MathTest, MultiplyTwoPositiveNumbers) {
    EXPECT_EQ(multiply(2, 3), 6); // Non-fatal assertion
    ASSERT_EQ(multiply(5, 5), 25); // Fatal assertion (stops test if fails)
}

int main(int argc, char **argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
```

## 2. Test Fixtures (Setup/Teardown)
Use `TEST_F` instead of `TEST` to share common state across multiple tests via a fixture class.

```cpp
class DatabaseTest : public ::testing::Test {
protected:
    Database* db;

    void SetUp() override {
        db = new Database("in-memory");
    }

    void TearDown() override {
        delete db;
    }
};

TEST_F(DatabaseTest, ConnectsSuccessfully) {
    EXPECT_TRUE(db->connect());
}
```

## 3. Google Mock (gmock)
Used to mock virtual functions in C++.

```cpp
#include <gmock/gmock.h>

class Logger {
public:
    virtual ~Logger() = default;
    virtual void log(const std::string& msg) = 0;
};

class MockLogger : public Logger {
public:
    MOCK_METHOD(void, log, (const std::string& msg), (override));
};

TEST(AppTest, LogsOnStartup) {
    MockLogger mockLogger;
    
    // Expect the log method to be called exactly once with "Started"
    EXPECT_CALL(mockLogger, log("Started")).Times(1);
    
    App myApp(&mockLogger);
    myApp.start();
}
```
