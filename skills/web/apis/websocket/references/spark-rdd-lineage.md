# Distributed Compute: Spark RDD Lineage

## Overview
This is a highly detailed reference document.


## Spark RDD Lineage Graphs

```text
Stage 1 (Map) -> Stage 2 (ReduceByKey)

+-------------------+
|  textFile (HDFS)  |  (Partition 1..N)
+---------+---------+
          |
          v (map)
+---------+---------+
|  MappedRDD        |
+---------+---------+
          |
          v (flatMap)
+---------+---------+
|  FlatMappedRDD    |
+---------+---------+
          |
          v (SHUFFLE BOUNDARY)
=====================
+-------------------+
|  ShuffledRDD      |
+---------+---------+
          |
          v (reduce)
+---------+---------+
|  ReducedRDD       |
+-------------------+
```


## Extended Details & Logs

### Detail Section 1

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 2

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 3

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 4

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 5

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 6

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 7

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 8

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 9

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 10

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 11

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 12

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 13

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 14

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 15

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 16

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 17

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 18

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 19

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 20

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 21

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 22

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 23

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 24

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 25

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 26

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 27

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 28

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 29

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 30

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 31

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 32

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 33

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 34

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 35

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 36

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 37

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 38

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 39

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 40

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 41

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 42

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 43

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 44

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 45

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 46

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 47

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 48

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 49

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 50

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 51

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 52

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 53

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 54

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 55

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 56

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 57

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 58

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 59

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 60

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 61

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 62

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 63

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 64

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 65

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 66

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 67

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 68

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 69

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 70

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 71

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 72

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 73

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 74

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 75

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 76

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 77

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 78

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 79

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 80

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 81

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 82

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 83

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 84

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 85

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 86

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 87

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 88

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 89

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 90

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 91

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 92

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 93

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 94

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 95

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 96

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 97

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 98

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 99

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 100

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 101

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 102

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 103

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 104

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 105

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 106

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 107

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 108

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 109

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 110

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 111

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 112

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 113

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 114

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 115

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 116

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 117

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 118

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 119

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 120

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 121

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 122

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 123

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 124

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 125

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 126

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 127

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 128

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 129

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 130

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 131

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 132

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 133

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 134

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 135

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 136

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 137

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 138

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 139

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 140

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 141

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 142

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 143

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 144

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 145

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 146

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 147

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 148

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 149

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 150

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 151

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 152

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 153

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 154

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 155

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 156

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 157

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 158

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 159

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 160

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 161

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 162

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 163

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 164

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 165

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 166

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 167

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 168

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 169

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 170

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 171

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 172

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 173

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 174

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 175

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 176

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 177

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 178

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 179

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 180

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 181

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 182

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 183

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 184

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 185

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 186

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 187

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 188

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 189

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 190

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 191

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 192

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 193

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 194

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 195

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 196

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 197

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 198

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 199

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 200

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 201

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 202

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 203

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 204

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 205

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 206

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 207

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 208

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 209

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 210

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 211

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 212

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 213

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 214

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 215

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 216

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 217

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 218

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 219

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 220

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 221

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 222

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 223

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 224

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 225

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 226

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 227

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 228

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 229

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 230

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 231

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 232

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 233

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 234

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 235

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 236

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 237

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 238

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 239

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 240

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 241

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 242

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 243

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 244

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 245

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 246

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 247

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 248

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 249

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 250

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 251

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 252

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 253

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 254

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 255

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 256

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 257

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 258

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 259

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 260

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 261

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 262

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 263

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 264

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 265

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 266

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 267

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 268

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 269

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 270

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 271

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 272

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 273

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 274

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 275

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 276

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 277

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 278

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 279

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 280

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 281

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 282

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 283

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 284

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 285

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 286

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 287

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 288

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 289

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 290

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 291

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 292

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 293

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 294

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 295

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 296

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 297

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 298

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 299

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 300

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 301

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 302

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 303

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 304

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 305

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 306

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 307

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


### Detail Section 308

Task Execution Log:
TaskSetManager: Starting task 1.0 in stage 2.0 (TID 50)
Executor 14: Running task 1.0
ShuffleBlockFetcherIterator: Getting 1500 shuffle blocks
TaskSetManager: Finished task 1.0 in stage 2.0 (TID 50) in 234 ms


