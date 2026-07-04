# Data Lake: S3 Partition Strategies

## Overview
This is a highly detailed reference document.


## S3 Partition Strategies

Optimal partition layout minimizes the number of S3 prefixes scanned during Athena/Presto queries.

### Hourly Time-Series Data
`s3://my-lake/events/year=YYYY/month=MM/day=DD/hour=HH/`

### Multi-Tenant Data
`s3://my-lake/tenant/tenant_id=XYZ/year=YYYY/month=MM/day=DD/`

### Anti-Patterns
1. Too granular: `s3://.../minute=MM/second=SS/` -> results in small file problem.
2. High cardinality leading: `s3://.../user_id=123/` -> Too many prefixes to scan if not filtering by user_id.


## Extended Details & Logs

### Detail Section 1

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 2

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 3

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 4

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 5

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 6

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 7

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 8

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 9

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 10

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 11

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 12

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 13

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 14

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 15

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 16

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 17

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 18

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 19

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 20

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 21

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 22

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 23

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 24

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 25

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 26

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 27

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 28

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 29

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 30

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 31

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 32

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 33

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 34

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 35

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 36

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 37

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 38

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 39

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 40

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 41

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 42

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 43

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 44

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 45

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 46

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 47

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 48

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 49

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 50

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 51

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 52

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 53

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 54

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 55

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 56

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 57

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 58

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 59

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 60

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 61

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 62

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 63

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 64

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 65

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 66

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 67

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 68

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 69

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 70

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 71

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 72

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 73

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 74

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 75

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 76

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 77

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 78

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 79

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 80

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 81

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 82

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 83

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 84

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 85

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 86

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 87

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 88

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 89

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 90

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 91

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 92

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 93

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 94

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 95

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 96

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 97

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 98

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 99

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 100

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 101

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 102

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 103

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 104

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 105

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 106

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 107

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 108

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 109

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 110

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 111

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 112

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 113

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 114

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 115

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 116

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 117

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 118

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 119

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 120

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 121

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 122

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 123

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 124

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 125

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 126

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 127

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 128

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 129

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 130

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 131

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 132

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 133

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 134

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 135

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 136

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 137

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 138

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 139

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 140

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 141

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 142

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 143

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 144

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 145

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 146

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 147

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 148

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 149

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 150

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 151

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 152

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 153

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 154

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 155

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 156

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 157

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 158

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 159

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 160

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 161

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 162

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 163

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 164

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 165

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 166

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 167

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 168

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 169

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 170

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 171

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 172

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 173

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 174

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 175

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 176

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 177

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 178

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 179

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 180

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 181

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 182

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 183

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 184

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 185

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 186

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 187

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 188

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 189

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 190

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 191

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 192

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 193

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 194

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 195

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 196

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 197

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 198

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 199

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 200

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 201

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 202

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 203

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 204

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 205

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 206

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 207

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 208

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 209

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 210

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 211

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 212

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 213

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 214

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 215

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 216

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 217

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 218

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 219

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 220

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 221

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 222

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 223

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 224

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 225

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 226

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 227

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 228

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 229

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 230

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 231

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 232

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 233

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 234

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 235

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 236

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 237

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 238

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 239

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 240

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 241

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 242

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 243

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 244

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 245

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 246

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 247

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 248

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 249

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 250

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 251

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 252

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 253

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 254

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 255

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 256

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 257

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 258

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 259

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 260

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 261

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 262

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 263

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 264

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 265

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 266

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 267

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 268

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 269

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 270

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 271

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 272

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 273

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 274

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


### Detail Section 275

Partition Audit Log:
Prefix: s3://data-lake/prod/events/year=2025/month=10/day=15/hour=14/
Files: 145
Avg Size: 125 MB
Format: Parquet (Snappy compressed)
Stats: RowCount=14500000, ColumnCount=54


