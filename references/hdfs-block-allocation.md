# Distributed Storage: HDFS Block Allocation

## Overview
This is a highly detailed reference document.


## HDFS Block Allocation Algorithms

```text
ALGORITHM: BlockPlacementPolicy
INPUT: File F, Block B, DataNodes N
OUTPUT: Selected Datanodes for replicas

1. Let R = ReplicationFactor
2. Let Target_N1 = LocalNode (if writing from datanode) OR RandomNode
3. Allocate B to Target_N1
4. If R > 1:
5.     Let Target_N2 = RandomNode in different Rack from Target_N1
6.     Allocate B to Target_N2
7. If R > 2:
8.     Let Target_N3 = RandomNode in same Rack as Target_N2
9.     Allocate B to Target_N3
10. For i = 4 to R:
11.    Let Target_Ni = RandomNode across all available nodes
12.    Allocate B to Target_Ni
13. Return Selected Nodes
```


## Extended Details & Logs

### Detail Section 1

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 2

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 3

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 4

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 5

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 6

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 7

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 8

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 9

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 10

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 11

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 12

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 13

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 14

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 15

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 16

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 17

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 18

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 19

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 20

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 21

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 22

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 23

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 24

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 25

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 26

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 27

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 28

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 29

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 30

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 31

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 32

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 33

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 34

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 35

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 36

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 37

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 38

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 39

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 40

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 41

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 42

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 43

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 44

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 45

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 46

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 47

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 48

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 49

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 50

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 51

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 52

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 53

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 54

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 55

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 56

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 57

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 58

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 59

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 60

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 61

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 62

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 63

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 64

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 65

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 66

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 67

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 68

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 69

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 70

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 71

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 72

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 73

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 74

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 75

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 76

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 77

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 78

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 79

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 80

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 81

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 82

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 83

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 84

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 85

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 86

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 87

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 88

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 89

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 90

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 91

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 92

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 93

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 94

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 95

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 96

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 97

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 98

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 99

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 100

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 101

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 102

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 103

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 104

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 105

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 106

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 107

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 108

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 109

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 110

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 111

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 112

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 113

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 114

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 115

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 116

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 117

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 118

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 119

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 120

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 121

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 122

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 123

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 124

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 125

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 126

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 127

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 128

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 129

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 130

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 131

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 132

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 133

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 134

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 135

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 136

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 137

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 138

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 139

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 140

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 141

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 142

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 143

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 144

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 145

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 146

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 147

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 148

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 149

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 150

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 151

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 152

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 153

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 154

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 155

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 156

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 157

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 158

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 159

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 160

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 161

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 162

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 163

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 164

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 165

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 166

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 167

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 168

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 169

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 170

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 171

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 172

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 173

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 174

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 175

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 176

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 177

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 178

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 179

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 180

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 181

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 182

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 183

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 184

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 185

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 186

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 187

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 188

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 189

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 190

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 191

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 192

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 193

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 194

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 195

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 196

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 197

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 198

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 199

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 200

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 201

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 202

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 203

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 204

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 205

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 206

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 207

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 208

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 209

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 210

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 211

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 212

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 213

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 214

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 215

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 216

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 217

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 218

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 219

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 220

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 221

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 222

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 223

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 224

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 225

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 226

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 227

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 228

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 229

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 230

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 231

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 232

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 233

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 234

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 235

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 236

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 237

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 238

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 239

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 240

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 241

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 242

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 243

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 244

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 245

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 246

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


### Detail Section 247

Rack Awareness Log Entry:
Node Datanode-10.0.1.4 (Rack-1) selected.
Node Datanode-10.0.2.7 (Rack-2) selected.
Node Datanode-10.0.2.9 (Rack-2) selected.
Network distance calculation:
Distance(Node1, Node2) = 2
Distance(Node2, Node3) = 1


