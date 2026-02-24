# Wildvine Protocol: Comprehensive Specification & System Architecture (v2.0)

This document provides a single, cohesive blueprint integrating the project's vision, strategic alignment, and technical requirements for a human-first, robot-resistant network.

---

## I. The Strategic Manifesto: A Human-First Fork

**Vision:** Wildvine is the **Human-First Fork**—a Benefit Corporation (B-Corp) dedicated to building the **Physical Registry** and **Human Layer** for Emad Mostaque’s **Intelligent Internet (II)**. Its purpose is to solve the **Metabolic Rift** by creating a viable economic successor to the "extraction economy," allowing humans to find meaning and trade in a post-AI world.

### Core Principles (The Veria Standard)

- **Sovereign Humanity:** Every node is a verified human being; the system is robot-resistant.
- **The Veria Standard:** Prioritize authentic, verified, in-real-life (IRL) interactions.
- **Local-First Architecture:** Digital tools amplify physical outcomes (meetings, trades, collaboration).
- **Mutual Sovereignty:** Users own their data, private keys, and reputation (Vine Vitality).
- **Collective Stewardship:** Structured as a Benefit Corporation (The Steward) to legally protect the mission, rather than a centralized CEO model.

### The Wildvine Guardrail (Core Governance)

|    Feature     |        Protocol         | Specification                                                           |
| :------------: | :---------------------: | :---------------------------------------------------------------------- |
| **Governance** |    Quadratic Voting     | Prevents outsized influence from the richest or loudest voices.         |
|   **Entry**    | Vouching (Web-of-Trust) | Requires an existing, verified member to stake their reputation.        |
|    **Exit**    |  Right to be Forgotten  | User data is removed from the network upon leaving.                     |
|   **Money**    |      Mutual Credit      | A non-speculative, community-based "I owe you" system for local trades. |

---

## II. Technical Architecture: The Rust Shield

The application core is built with **Rust** to provide zero-jitter performance, memory safety, and cross-platform reliability, establishing the **Hardened Core** for a high-performance, security-critical network.

### Core Technical Stack

|       Layer       |          Component           | Specification                                                              |
| :---------------: | :--------------------------: | :------------------------------------------------------------------------- |
| **Core Language** |             Rust             | For backend/logic; compiled to WASM for future-proofing.                   |
| **Intelligence**  |         II-Agent SDK         | Local-first LLM (e.g., Llama 3.2 equivalent) operating in the app sandbox. |
|   **Identity**    |        Nostr (NIP-05)        | Decentralized public/private key pairs; no central user database.          |
|  **Audio/Music**  |       Rust cpal + kira       | Sub-millisecond buffer management for real-time collaborative human games. |
|  **Security/ID**  | Schnorr Signature, secp256k1 | Bitcoin-grade security for private keys; eliminates memory-based exploits. |

### Core Functional Modules

#### 1\. The Human Vouching Engine

- **Protocol:** Web-of-Trust (WoT) via Physical Handshake.
- **Execution:** A Voucher (User A) generates a **Zero-Knowledge Proof (ZKP)** invite link, verified by a new member (User B) scanning the link via the Wildvine app. The II-Agent verifies proximity via the **NFC/Secure Element jewelry**.
- **Outcome:** The vouch is cryptographically signed and published to a **Nostr Relay** (custom Kind 1984 event).

#### 2\. The Veria Flagging System

- **Objective:** Anonymous, retaliation-resistant reporting of corruption or bot-activity.
- **Mechanism:** Reports are encrypted with a **(3, 5) Threshold Scheme**. The reporter's ID is masked by the II-Agent using an **Ephemeral Key**.
- **Resolution:** Decryption and visibility occur only once a **Threshold of Witnesses** (3+ independent peers) flag the same entity. The Rust compiler enforces that a flag cannot be sent without a jewelry-authorized signature.

#### 3\. Collaborative Music & Games

- **Performance:** Uses Rust’s deterministic execution and **NTP-synchronized clocks** to achieve **\<10ms latency** for collaborative modules.
- **Function:** Enables **Human Games**—real-time digital instruments and art canvases that require proximity and the **Human Keys** (Jewelry) to unlock, proving genuine human "Presence."

---

## III. Economic & Physical Integration

### 1\. Hardware Integration: The Jewelry Spec

- **Purpose:** The **Physical Vault** for the private keys, identity, and the **Proof of Presence** anchor.
- **Specification:** NFC/Secure Element jewelry (rings/pendants) using a **NXP NTAG 424 DNA** chipset.
- **Security:** Every "tap" generates a **SUN (Secure Unique NFC)** message—a unique cryptographic signature that prevents replay attacks by bots. The jewelry must be used for Vouching and large-scale Governance votes.

### 2\. The Economic & Legal Layer

- **The Treasury:** Seeded with **2/3 BTC** as collateral (trust). It is held in a **2-of-3 Multi-sig Bitcoin wallet** controlled by The Steward, a Rotating Member, and a Legal Arbiter.
- **Dual-Currency System:**
  - **Foundation Coin (FC):** Layer 1 settlement currency for global value against the Intelligent Internet.
  - **Culture Credits (CC):** Layer 2 internal token for the **Trade Vine**. Baseline value is **1 Credit = 1 Hour of Human Service**.
- **Regulatory Alignment:** Structured as a **Benefit Corporation** to provide legal standing and act as a regulatory shield for the community.

---

## IV. Deployment Roadmap

|          Phase           |                     Task                     | Objective                                                                                      |
| :----------------------: | :------------------------------------------: | :--------------------------------------------------------------------------------------------- |
|  **Milestone 1 (Seed)**  | Finalize Rust Core and Nostr Key Generation. | Establish the foundational, hardened technical architecture.                                   |
| **Milestone 2 (Sprout)** |  Launch the "First 100" invite-only pilot.   | Test the core Rust App, Human Vouching, and Jewelry tap-logic in a closed group.               |
| **Milestone 3 (Bloom)**  |      Open the **Trade Vine** directory.      | Launch the verified directory of human services, enabling the internal Culture Credit economy. |
