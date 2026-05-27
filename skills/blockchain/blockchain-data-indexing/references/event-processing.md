# Blockchain Event Processing

## Event Parsing

### Event Decoder
```typescript
class EventDecoder {
  private abiCache: Map<string, Interface> = new Map();

  constructor(private contractRegistry: ContractRegistry) {}

  async decodeLog(log: Log): Promise<ParsedEvent | null> {
    const topic0 = log.topics[0];
    const contract = await this.contractRegistry.getContract(log.address);

    if (!contract) return null;

    const iface = this.getOrLoadABI(contract.address, contract.abi);
    const eventSignature = iface.getEvent(topic0);

    if (!eventSignature) return null;

    const decoded = iface.decodeEventLog(
      eventSignature,
      log.data,
      log.topics
    );

    return {
      name: eventSignature.name,
      signature: topic0,
      contract: log.address,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      args: this.formatArgs(decoded, eventSignature),
      timestamp: log.timestamp,
    };
  }

  private formatArgs(
    decoded: Result,
    event: EventFragment
  ): Record<string, any> {
    const args: Record<string, any> = {};

    for (let i = 0; i < event.inputs.length; i++) {
      const input = event.inputs[i];
      const value = decoded[i];

      args[input.name] = this.formatValue(value, input.type);
    }

    return args;
  }

  private formatValue(value: any, type: string): any {
    if (type === 'address') return value.toLowerCase();
    if (type.startsWith('uint') || type.startsWith('int')) return value.toString();
    if (type === 'bool') return Boolean(value);
    return value;
  }
}
```

## Key Points
- Use ABI definitions to decode raw event logs into typed values
- Cache ABI interfaces to avoid repeated loading
- Index common event signatures for all tracked contracts
- Handle indexed vs non-indexed event parameters correctly
- Store raw log data alongside parsed values for reprocessing
- Process events in block order to maintain chronological consistency
- Handle reorgs by reverting events from orphaned blocks
- Monitor contract registry for new deployments
- Support multiple contract versions with different ABI versions
- Track event processing progress for failover and recovery
