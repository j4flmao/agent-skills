---
name: iot-protocols
description: >
  Use this skill when the user says 'MQTT', 'CoAP', 'LwM2M', 'IoT protocol', 'QoS 1', 'retained message', 'last will', 'MQTT 5', 'device telemetry', 'BLE GATT', 'LoRaWAN', 'Matter', 'Thread', 'device provisioning'. Chooses and implements device-to-cloud and device-to-device protocols: MQTT 3.1.1/5 topic and QoS design, CoAP for constrained UDP networks, LwM2M device management, radio/link choices, security (TLS/DTLS, certificates) and offline behaviour. Do NOT use for: cloud backend stream processing (use data/streaming), general web APIs (use backend/universal/api-design), firmware driver code (use c-cpp-patterns).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [embedded, iot, mqtt, coap, lwm2m, ble, lorawan]
---

# IoT Protocols

## Purpose
Constrained devices run on batteries, lossy radios and tiny RAM. This skill picks the protocol stack that fits the link and power budget, designs MQTT topics/QoS or CoAP resources correctly, and secures and provisions devices so a fleet can be managed for years.

## Agent Protocol

### Trigger
"MQTT", "CoAP", "LwM2M", "IoT protocol", "QoS", "retained message", "last will", "MQTT 5", "BLE GATT", "LoRaWAN", "Matter", "Thread", "device provisioning".

### Input Context
- Device class (MCU RAM/flash, battery or mains), link (Wi-Fi, Ethernet, cellular LTE-M/NB-IoT, BLE, 802.15.4/Thread, LoRaWAN)
- Message rates and sizes, latency needs, command/downlink needs
- Cloud/broker (Mosquitto, EMQX, HiveMQ, AWS IoT Core, Azure IoT Hub) and security requirements

### Output Artifact
Protocol choice, topic/resource design, QoS and session settings, client code. No file unless requested.

### Response Format
```
Link: {radio/network}
Protocol: {MQTT 3.1.1 | MQTT 5 | CoAP | LwM2M | BLE GATT | LoRaWAN}
Design: {topics/resources and payload format}
Delivery: {QoS / confirmable, retries, session expiry}
Security: {TLS/DTLS, cert/PSK, provisioning}
Offline: {buffering and reconnect strategy}
```

## 1. Choosing the Stack
| Situation | Choice | Why |
|-----------|--------|-----|
| IP device, always-on-ish, cloud telemetry + commands | MQTT over TLS (TCP 8883) | Broker fan-out, persistent sessions, huge ecosystem |
| Very constrained IP device, UDP/6LoWPAN, sleepy nodes | CoAP (RFC 7252) over DTLS or OSCORE | 4-byte header, UDP, REST semantics, Observe |
| Fleet management (firmware update, config, standard objects) | LwM2M (OMA) over CoAP | Standard object model, FOTA, bootstrap |
| Phone/gateway companion, short range | BLE GATT | Low power, phone native |
| Smart-home interoperability | Matter (over Wi-Fi/Thread/Ethernet) | Multi-vendor ecosystem |
| Long range, few bytes per hour | LoRaWAN | km range, duty-cycle and payload limits |
| Non-IP sensor nets to a gateway | MQTT-SN, Zigbee, proprietary | gateway translates to MQTT |

## 2. MQTT Essentials
- Pub/sub through a broker; clients connect over TCP (1883 plain, 8883 TLS) or WebSocket.
- QoS per message, between each client and the broker (not end to end):
  - **QoS 0** at most once — no ack.
  - **QoS 1** at least once — PUBLISH/PUBACK; duplicates possible → consumers must be idempotent.
  - **QoS 2** exactly once between two hops — PUBLISH/PUBREC/PUBREL/PUBCOMP; more round trips and state. Rarely worth it; prefer QoS 1 + idempotent handling.
- **Retained** message: broker keeps the last message on a topic and delivers it to new subscribers (device state, config). Clear by publishing an empty retained payload.
- **Last Will and Testament**: broker publishes it if the client disconnects ungracefully — pair with a retained `online` status for presence.
- **Persistent session** (`cleanSession=false` in 3.1.1 / `Clean Start=false` + Session Expiry in 5) queues QoS 1/2 messages while the client is offline.
- Keep-alive: choose with the NAT/cellular idle timeout in mind (often 60–300 s); too short drains batteries.

### MQTT 5 additions worth using
Reason codes on acks, session and message expiry intervals, user properties (metadata without payload changes), topic aliases (save bytes), request/response (`Response Topic` + `Correlation Data`), shared subscriptions (`$share/<group>/<topic>`) for load-balanced backend consumers, flow control (`Receive Maximum`).

### Topic design
```
{tenant}/{deviceType}/{deviceId}/telemetry       device -> cloud, QoS 0/1
{tenant}/{deviceType}/{deviceId}/state           retained, device -> cloud
{tenant}/{deviceType}/{deviceId}/cmd/{name}      cloud -> device, QoS 1
{tenant}/{deviceType}/{deviceId}/cmd/{name}/res  device -> cloud, correlation id
```
- Put the device ID in the topic and enforce per-device ACLs on the broker (a device may publish/subscribe only under its own ID).
- No leading `/`, no wildcards in published topics; subscribers use `+` (one level) and `#` (multi-level, last).
- Version payloads (`"v": 2`) and keep them compact (CBOR or Protobuf on constrained links, JSON when bandwidth allows).

## 3. CoAP Essentials
- UDP request/response with methods GET/POST/PUT/DELETE and response codes (2.05 Content, 4.04 Not Found ...).
- Message types: Confirmable (CON, retransmitted with exponential back-off until ACK), Non-confirmable (NON), ACK, RST.
- **Observe** (RFC 7641): client registers on a resource and gets notifications on change — the CoAP analogue of subscribe.
- **Block-wise transfer** (RFC 7959) for payloads larger than a datagram (firmware images).
- Security: DTLS 1.2/1.3 (PSK, raw public keys or certificates) or OSCORE (RFC 8613) for end-to-end protection through proxies.
- Discovery via `/.well-known/core` (CoRE Link Format).

## 4. Security and Provisioning
- TLS 1.2+ (prefer 1.3) with server certificate validation on the device — pin the CA, not the leaf, so certificates can rotate.
- Unique per-device identity: X.509 client certificate (mutual TLS) with the private key in a secure element/TrustZone when available; never a fleet-wide shared password.
- Provisioning: factory-injected certs or just-in-time provisioning (AWS IoT JITP/fleet provisioning, Azure DPS).
- Signed firmware updates with rollback protection; updates delivered over MQTT/HTTPS/LwM2M.
- Plan certificate expiry and revocation for devices that live 10+ years.

## 5. Power and Unreliable Links
- Batch telemetry and send on a schedule; radio-on time dominates energy.
- Sleepy devices: CoAP/LwM2M with queue mode, or MQTT with persistent sessions + wake windows; cellular PSM/eDRX on LTE-M/NB-IoT.
- Store-and-forward: a bounded on-device queue (flash ring buffer) with timestamps; drop oldest or downsample when full.
- Reconnect with exponential back-off + jitter to avoid thundering herds after a broker outage.

## 6. Anti-Patterns
| Anti-pattern | Consequence | Fix |
|--------------|-------------|-----|
| QoS 2 everywhere | latency, broker state, battery | QoS 1 + idempotent consumers |
| One shared credential for all devices | one leak compromises the fleet | per-device certs + ACLs |
| Wildcard subscribe `#` on devices | receive other devices' traffic | per-device topics + ACL |
| JSON with long keys over NB-IoT | data cost, airtime | CBOR/Protobuf, topic aliases |
| Synchronized reconnect after outage | broker overload | jittered back-off |
| No message timestamp from device | wrong ordering after buffering | device timestamp + sequence number |

## 7. Checklist
- [ ] Link and protocol chosen from power/payload/latency needs
- [ ] Topic or resource tree documented with direction, QoS, retain flag, payload schema version
- [ ] Per-device identity, TLS/DTLS with validation, broker ACLs
- [ ] Persistent session / offline buffer behaviour defined and bounded
- [ ] Reconnect back-off with jitter; keep-alive tuned to the network
- [ ] Signed OTA path tested end to end
