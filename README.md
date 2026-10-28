# ATLAS SANCTUM
### Open-Source Intelligence Infrastructure for Human Flourishing

**Rooted in Christ. Engineered with wisdom. Governed by truth. Directed toward human flourishing.**

Atlas Sanctum is an open-source technology initiative building intelligence infrastructure for ethical finance, humanitarian coordination, regenerative economics, and sustainable development.

We aim to connect real-world needs, scientific evidence, institutional resources, responsible decisions, and measurable outcomes through interoperable, transparent, and accountable systems.

Our founding conviction is simple:

> Intelligence becomes valuable when it helps people act wisely and serve faithfully.

> **Working code in this repository:** a synthetic, local-only prototype of the Decision Engine, including a seven-stage decision record, evidence and authorization trails, session authentication, and governance tests. It is not deployed and contains no real data. See [Working Prototype](#working-prototype).

---

## Our Mission

To develop open, trustworthy digital infrastructure that helps communities and institutions understand reality, allocate resources responsibly, coordinate effective action, and regenerate the systems upon which life depends.

We envision a world where technology strengthens human dignity, financial systems enable productive opportunity, humanitarian resources reach people in need, and development initiatives can demonstrate their actual impact.

## The Vision

Atlas Sanctum is being developed around a central idea: **the decision should be the fundamental unit of accountable intelligence.**

Rather than building another isolated AI chatbot or dashboard, we aim to connect the complete journey from a real-world problem to a verified outcome.

```text
OBSERVE
   ↓
UNDERSTAND
   ↓
EVALUATE
   ↓
AUTHORIZE
   ↓
EXECUTE
   ↓
VERIFY
   ↓
LEARN
   ↺
```

Every consequential decision should be explainable, evidence-based, appropriately authorized, auditable, and open to correction.

## Core Systems

### 1. Atlas Regenerative Decision Engine

The intelligence layer connecting places, problems, evidence, opportunities, decisions, and outcomes.

- Place-based intelligence and geospatial analysis.
- Evidence synthesis and provenance tracking.
- Alternative evaluation and scenario analysis.
- Decision records and authorization workflows.
- Implementation monitoring and outcome verification.
- Continuous learning from observed results.

### 2. Atlas Ethical Finance

Infrastructure supporting transparent and accountable allocation of financial resources.

- Project and cooperative financing workflows.
- Funding commitments, budgets, and disbursement records.
- Responsible investment and impact analysis.
- Financial-service interoperability.
- Project-level outcome reporting.
- Fair-treatment and accountability safeguards.

### 3. Atlas Humanitarian Network

Technology for improving coordination between humanitarian organizations, local service providers, funders, and affected communities.

- Needs assessment and resource mapping.
- Service coordination and referrals.
- Delivery and procurement tracking.
- Emergency-response situational awareness.
- Community feedback and grievance mechanisms.
- Privacy-conscious reporting and accountability.

### 4. Atlas Regenerative Economy

Intelligence systems supporting ecological restoration, agricultural resilience, and sustainable livelihoods.

- Geospatial and environmental intelligence.
- Agricultural evidence graphs.
- Climate and infrastructure risk analysis.
- Land, water, and ecosystem monitoring.
- Restoration-project evaluation.
- Evidence-based environmental and social reporting.

### 5. Atlas Sustainable Development Intelligence

A shared intelligence layer for development institutions, researchers, enterprises, public-interest organizations, and communities.

- Development observatories.
- Infrastructure and service-gap analysis.
- Evidence-based project prioritization.
- Resource and intervention mapping.
- Program monitoring and evaluation.
- Institutional coordination and research.

---

## Architecture Principles

Atlas Sanctum follows a modular, interoperable architecture designed to connect established technologies rather than unnecessarily recreate them.

| Layer | Responsibility |
|---|---|
| Data and evidence | Collect, validate, contextualize, and trace information. |
| Geospatial intelligence | Connect evidence to locations, ecosystems, infrastructure, and communities. |
| Decision intelligence | Evaluate alternatives, uncertainty, risks, and expected outcomes. |
| Governance and authorization | Define permissions, approvals, accountability, and appeal mechanisms. |
| Execution and coordination | Connect approved decisions to funding, services, and responsible parties. |
| Verification and learning | Compare commitments with delivery and evaluate actual outcomes. |
| Interfaces and APIs | Enable accessible interaction and interoperability across systems. |

### Potential Technology Foundations

We evaluate established open-source technologies according to their maturity, security, licensing, maintainability, interoperability, and suitability for each deployment.

| Domain | Technologies to evaluate |
|---|---|
| Core banking | Apache Fineract |
| Payment interoperability | Mojaloop |
| Humanitarian data collection | KoboToolbox |
| Workflow integration | OpenFn |
| Health information systems | DHIS2 |
| Geospatial databases | PostgreSQL, PostGIS |
| AI and scientific computing | Python, PyTorch, scikit-learn |
| Web applications | TypeScript, React |
| Infrastructure | Docker, automated testing, observability |

These are potential integrations, not claims that every component is already implemented or deployed.

The architecture prioritizes open standards, secure APIs, data portability, modularity, offline-capable workflows, and affordable operation in low-connectivity environments.

## AI and Decision Intelligence

Atlas may use specialized AI agents to support bounded analytical tasks.

| Agent | Responsibility |
|---|---|
| Oracle | Research, evidence synthesis, and source evaluation. |
| Gaia | Environmental intelligence and Earth systems analysis. |
| Solomon | Decision analysis, alternatives, and trade-offs. |
| Aegis | Security, privacy, risk, and assurance. |
| Athena | Strategy, systems thinking, and institutional learning. |
| Leonardo | Engineering, experimentation, and technical design. |
| Builder | Implementation planning, integration, and delivery. |

These roles describe the proposed agent architecture. They do not imply that all agents are currently implemented.

AI outputs must preserve evidence provenance, disclose uncertainty, and remain subject to appropriate human review. Agents must not independently authorize consequential financial, humanitarian, or other high-impact actions.

## Christian Foundation

Atlas Sanctum is rooted in Christian principles that shape its approach to technology and institutional stewardship.

- **Human dignity — Genesis 1:27:** People are never merely data points or optimization targets.
- **Love of neighbour — Matthew 22:39:** Technology should respond to real human needs.
- **Stewardship — Genesis 2:15:** Resources and creation require responsible care.
- **Justice and truth — Micah 6:8:** Decisions should be transparent, fair, and accountable.
- **Faith expressed through service — James 2:17:** Intentions must be connected to tangible action.

Our Christian foundation informs our institutional values without making access to public-interest services conditional on religious identity.

## Principles of Responsible Engineering

1. **Evidence before assertion.** Distinguish verified facts, assumptions, estimates, and hypotheses.
2. **Human dignity before optimization.** Protect agency, privacy, and fair treatment.
3. **Authorization before action.** Consequential decisions require appropriate authority.
4. **Verification before impact claims.** Measure outcomes and disclose limitations.
5. **Open standards before avoidable lock-in.** Enable interoperability and data portability.
6. **Security by design.** Apply least privilege, secure defaults, and appropriate audit controls.
7. **Privacy by design.** Minimize personal data collection and exposure.
8. **Scientific integrity.** Document methodology, uncertainty, and reproducibility.
9. **Sustainable economics.** Build operational models capable of supporting long-term maintenance.
10. **Accountable stewardship.** Make governance, conflicts of interest, and responsibilities explicit.

## Initial Deployment Direction

Our initial development direction is to validate the Atlas Regenerative Decision Engine through a focused development challenge in Kenya.

Potential applications include:

- Water-access reliability.
- Agricultural and climate resilience.
- Community-development project accountability.
- Local infrastructure intelligence.

The first pilot should be selected with participating communities and institutions, based on a clearly defined problem, appropriate data access, a credible implementation pathway, and measurable outcomes.

The objective is to demonstrate a working evidence-to-action cycle before expanding into a broader platform.

## Working Prototype

> **Status:** a working, local-only prototype of the Decision Engine. It is not deployed, has no institutional partner, and contains no real evidence, financial commitments, or measured outcomes. Every record is synthetic and labelled as such.

### What works today

- **Seven-stage lifecycle:** `draft → understanding → evaluated → authorized → executing → verified → learned`, with transitions enforced on the server rather than only in the interface.
- **Seven record classes:** observations, evidence, alternatives, authorizations, resource commitments, executions, and outcomes, plus corrections, lessons, agent contributions, and an append-only activity log.
- **Evidence discipline:** evidence is proposed by one person and accepted by a second; contributors cannot review their own evidence.
- **Authorization discipline:** a named authorizer records scope, conditions, and a conflict-of-interest declaration; the acting authorizer must match the record.
- **Honest outcome classification:** outcomes are marked `observed`, `estimated`, `attributed`, or `uncertain`; attributed claims require a documented method, and estimates are never presented as observed impact.
- **Independent verification:** the verifier must differ from the authorizer.
- **Learning gate:** a decision cannot close until corrections are resolved and a lesson is recorded.
- **Bounded agent assistance:** the Oracle scan is deterministic (no language model), requested by a person, attributed to both the agent and the requester, and changeable only by human review.
- **Session authentication:** named accounts with roles replace the earlier placeholder identity header.
- **End-to-end demonstration:** the synthetic Nakuru water-point reliability decision exercises the full cycle; two additional synthetic decisions show earlier and blocked stages.

### Stack

| Layer | Implementation |
|---|---|
| Runtime | Node.js 24 (required for the built-in `node:sqlite` module) |
| API | Fastify 5, Zod validation, TypeScript (strict, NodeNext) |
| Storage | SQLite via `node:sqlite`; schema in `server/src/schema.sql` |
| Interface | React 19, Vite 7, custom CSS design system |
| Tests | Node's built-in test runner (`node:test`) via `tsx` |

### Run locally

```bash
# Node 24 must be first on PATH; with Homebrew:
export PATH="/opt/homebrew/bin:$PATH"

npm install
npm run seed
npm run dev
```

- Web interface: <http://localhost:5173>
- API: <http://127.0.0.1:8787>

The seed script recreates the database, so **stop the API server before reseeding** and restart it afterwards. SQLite holds the old file open; reseeding underneath a running server leaves it attached to a deleted file.

`npm run seed` writes to `server/data/atlas.db` unless `ATLAS_DB` is set. The server and seed script both honor:

| Variable | Purpose | Default |
|---|---|---|
| `ATLAS_DB` | SQLite database path | `server/data/atlas.db` |
| `PORT` | API port | `8787` |
| `APP_ORIGINS` | Comma-separated browser origins allowed to make state-changing requests | `http://localhost:5173,http://127.0.0.1:5173` |

Useful commands: `npm test` (server governance and authentication tests), `npm run typecheck`, `npm run build`.

### Development accounts

All accounts share the demo password **`atlas-demo-2026`**. These are synthetic development credentials, not production identities.

| Email | Person | Role | Organization |
|---|---|---|---|
| `grace@atlas.test` | Grace Wambui | analyst | Nakuru Community Water Trust (fictional) |
| `peter@atlas.test` | Peter Otieno | analyst | County Water Office (fictional) |
| `ruth@atlas.test` | Ruth Kamau | authorizer | Example Foundation (fictional) |
| `samuel@atlas.test` | Samuel Kipchoge | implementer | Maji Field Services (fictional) |
| `esther@atlas.test` | Esther Njeri | verifier | Independent Verification Lab (fictional) |
| `daniel@atlas.test` | Daniel Mwangi | steward | Atlas Sanctum (fictional) |

Roles are enforced on the server: analysts and stewards advance analysis stages, only an authorizer may authorize, implementers record execution, verifiers record outcomes, and stewards close into learning. The Oracle agent has no account and cannot sign in.

### Authentication model

This is **development authentication**, built from standard mechanisms rather than a claimed production identity system.

- Passwords are hashed with `scrypt` (N=16384, r=8, p=1) using a per-account salt.
- Sessions use opaque 256-bit random tokens. Only a SHA-256 hash of the token is stored in the database.
- The session cookie is `HttpOnly`, `SameSite=Lax`, `Secure` when `NODE_ENV=production`, and expires after 12 hours. Signing out revokes the server-side session.
- Login failures are throttled to five attempts per 15 minutes per IP and email, and errors do not reveal whether an account exists.
- State-changing requests require an allowlisted `Origin` header. Server-to-server clients without an `Origin` are permitted.
- AI agents cannot hold accounts or sessions. Oracle scans are requested by an authenticated person and reviewed by a person.
- The seed script refuses to run when `NODE_ENV=production`.

Not implemented: OIDC/SAML, multi-factor authentication, email verification, password reset or account recovery, invitation flows, account lockout policy beyond the login throttle, and organization-level isolation. Do not deploy this authentication model for real institutional use.

### Tested governance invariants

`npm test` currently runs 18 tests covering:

- unauthenticated access is rejected, while health checks remain public;
- login sets an `HttpOnly` session cookie that authorizes reads and is revoked on logout;
- repeated wrong passwords are throttled and fail generically; expired, disabled, and agent accounts cannot authenticate;
- cross-origin state changes are rejected;
- AI agents cannot authenticate, create, authorize, or advance a decision;
- stages cannot be skipped and unmet requirements are reported explicitly;
- evidence contributors cannot review their own evidence;
- the baseline is immutable once analysis begins;
- authorization requires scope, a matching authorizer, and a conflict declaration;
- execution cannot begin without an approved resource commitment;
- only a verifier may record outcomes, and attributed claims require a method;
- learning is blocked until corrections are resolved and a lesson is recorded;
- Oracle output is advisory: a person requests it, only a person reviews it, and it changes no decision state;
- every stage change is written to the audit log.

### Known limitations

- **Synthetic only.** No real data ingestion, institutional partnership, funding commitment, or field measurement is represented or claimed.
- **Single tenant.** There is no organization scoping; every signed-in account can read every decision.
- **Audit log is append-only by convention, not cryptographically chained.** It records who did what and when, but a database administrator could alter rows. A hash chain is planned.
- **SQLite, not PostgreSQL/PostGIS.** Location data is a single GeoJSON point per decision; there are no spatial queries yet.
- **No offline mode, localization, or formal accessibility audit.** These are explicit requirements, not completed features.
- **No production operations.** There is no container image, CI pipeline, backup/restore procedure, observability, rate limiting beyond login, or deployment hardening.
- **No real agent integration.** The Oracle is a deterministic rule set; no language model or external tool access is used.

### Platform increments

The platform is being built in ordered increments. Only increment 1 is complete.

| # | Increment | Status | Acceptance criterion |
|---|---|---|---|
| 1 | Authenticated sessions replace identity header | **Complete** | Named accounts, role enforcement, server-side sessions, rate limiting, and tests |
| 2 | Organizations and membership scoping | Planned | Every record belongs to an organization; cross-organization access is denied and tested |
| 3 | Tamper-evident audit chain | Planned | Audit events are hash-chained and a verification endpoint detects alteration |
| 4 | Decision links and corrected-claim lifecycle | Planned | Corrections and superseding decisions are linked and visible without overwriting history |
| 5 | Portfolio observatory | Planned | Cross-decision views show stage, evidence, outcome classification, and open corrections honestly |
| 6 | PostgreSQL, PostGIS, and migrations | Planned | Replace SQLite, add spatial queries, and provide reversible migrations and export |
| 7 | Offline-first, localization, accessibility | Planned | Queued offline capture, Swahili/English interface, and a documented WCAG audit |
| 8 | Bounded agent council framework | Planned | Multiple advisory agents with scoped tools, provenance, and mandatory human review |
| 9 | Evidence ingestion adapters | Planned | Provenance-preserving adapters for tools such as KoboToolbox and OpenFn, with consent controls |
| 10 | Production operations and CI | Planned | Containerized deployment, CI, observability, backups, threat model, and production identity integration |

Planned increments are intentions, not delivered capabilities. This table will be updated as each increment is verified.

## Roadmap

*The roadmap below describes institutional maturity. See Working Prototype for what the current code actually implements.*


### Phase 1 — Foundation
- Define the initial problem and intended users.
- Establish the data, governance, and security requirements.
- Evaluate reusable open-source components.
- Design the core evidence and decision-record models.

### Phase 2 — Prototype
- Implement a geospatial evidence interface.
- Build the decision-record and authorization workflow.
- Integrate selected data sources.
- Produce initial reporting and verification capabilities.

### Phase 3 — Pilot
- Work with an authorized institutional partner.
- Establish a baseline and success metrics.
- Test the system against a real operational workflow.
- Evaluate usability, security, reliability, and measured results.

### Phase 4 — Open Infrastructure
- Document reusable components and APIs.
- Publish appropriate code and technical standards.
- Incorporate community and institutional feedback.
- Expand to additional use cases only when justified by evidence.

*This roadmap represents intended work, not a claim that these milestones have been completed.*

## Economic Model

Atlas Sanctum aims to combine an open-source commons with sustainable institutional operations.

Potential funding mechanisms include:

- Implementation and integration contracts.
- Institutional subscriptions and managed deployments.
- Technical support, training, and research services.
- Grants and philanthropic support for public-interest infrastructure.
- Partnerships with organizations pursuing measurable development outcomes.

Open-source availability, appropriate data governance, and long-term maintainability should reinforce one another.

## Contributing

We welcome thoughtful collaboration across:

- Software engineering and distributed systems.
- Artificial intelligence and scientific computing.
- Geospatial intelligence and Earth observation.
- Ethical finance and financial inclusion.
- Humanitarian technology and public-interest infrastructure.
- Agricultural resilience and regenerative economics.
- Security, privacy, governance, and impact evaluation.

Before contributing, please open an issue to discuss the problem, intended users, evidence, proposed approach, and compatibility with the project's principles.

Contributions should prioritize working software, clear documentation, reproducibility, maintainability, and demonstrable usefulness.

## Long-Term Vision

We envision a network of interoperable, locally stewarded intelligence systems connecting community knowledge, scientific evidence, responsible capital, institutional capabilities, and measurable development outcomes.

The ambition is global. The method is disciplined experimentation. The foundation is stewardship. The standard is accountable service.

We do not claim to have solved these challenges. We are building, testing, learning, and collaborating toward practical solutions.

---

## Atlas Sanctum

**Technology. Stewardship. Human flourishing.**

*Observe reality. Understand deeply. Decide wisely. Act responsibly. Verify honestly. Regenerate faithfully.*

