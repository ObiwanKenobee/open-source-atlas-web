# Decision Engine — Working Prototype

**An evidence-disciplined decision lifecycle for accountable, verifiable, and continuously improving action.**

The Decision Engine is a working, local-only prototype exploring how consequential decisions can move from initial observations through evidence review, evaluation, authorization, execution, independent verification, and learning.

It is designed around a simple principle:

> A decision should not be treated as complete merely because someone made it or an action was taken. Its reasoning, authority, execution, outcomes, and lessons should remain accountable to review.

The prototype demonstrates how these principles can be enforced through structured records, server-side lifecycle transitions, separation of responsibilities, explicit uncertainty, and human oversight of automated assistance.

## Status and Evidence Boundary

**Status: Working local prototype**

This repository demonstrates a functioning decision lifecycle. It is not a deployed production system.

- **Deployment:** Local-only.
- **Institutional partners:** None established.
- **Real-world evidence:** None included.
- **Financial commitments:** None represented.
- **Measured outcomes:** None established.
- **Demonstration data:** Entirely synthetic and labelled as such.

The demonstration is intended to validate workflow design and governance controls—not to establish real-world effectiveness, institutional adoption, or measurable impact.

## What Works Today

### 1. Seven-stage decision lifecycle

Every decision follows a defined lifecycle:

`draft → understanding → evaluated → authorized → executing → verified → learned`

Lifecycle transitions are enforced on the server rather than relying solely on interface behaviour.

This provides a structured sequence from problem definition to documented learning, with progression governed by the decision's state and applicable controls.

### 2. Structured decision records

The system supports seven primary record classes:

| Record | Purpose |
|---|---|
| Observations | Describe what is reported or identified. |
| Evidence | Record supporting information subject to review. |
| Alternatives | Document potential courses of action. |
| Authorizations | Capture accountable approval and its conditions. |
| Resource commitments | Record resources committed to a decision. |
| Executions | Document the implementation of an authorized decision. |
| Outcomes | Record results and their evidence classification. |

Additional records support corrections, lessons, agent contributions, and an append-only activity log.

Together, these records provide the foundation for reconstructing the decision process rather than preserving only its final conclusion.

### 3. Two-person evidence review

Evidence is proposed by one person and accepted by another.

Contributors cannot review their own evidence, creating a basic separation between submission and acceptance.

This control is intended to reduce conflicts of interest and prevent the system from treating an unreviewed contribution as accepted evidence.

### 4. Explicit authorization and accountability

Authorization records capture:

- The named authorizer.
- The approved scope.
- Applicable conditions.
- A conflict-of-interest declaration.

The acting authorizer must match the authorizer recorded in the decision.

This makes responsibility explicit instead of treating approval as an anonymous or implicit system event.

### 5. Honest outcome classification

Outcomes are classified using four distinct labels:

- `observed` — recorded as an observed outcome.
- `estimated` — based on an estimate rather than direct observation.
- `attributed` — claims an outcome is attributable to the decision and requires a documented attribution method.
- `uncertain` — the available information does not justify a stronger conclusion.

These classifications help distinguish what was observed from what was estimated, what is claimed to have resulted from an intervention, and what remains uncertain.

An estimate is never presented as observed impact. Attribution requires a documented method and should not be confused with definitive causal proof.

### 6. Independent verification

The verifier must be different from the authorizer.

This introduces a distinct verification role and prevents the same person from authorizing a decision and serving as its verifier.

The control establishes role separation within the prototype; it does not, by itself, establish the broader independence or competence of a verifier in a real institution.

### 7. Learning before closure

A decision cannot enter the completed learning stage until:

- Corrections have been resolved.
- A lesson has been recorded.

This makes learning a required part of the lifecycle rather than an optional retrospective.

The intended outcome is a decision record that preserves not only what happened, but also what was corrected and what should inform future decisions.

### 8. Bounded, human-supervised agent assistance

The prototype includes an **Oracle scan** with deliberately limited behaviour.

- The scan is deterministic and does not use a language model.
- A person must request it.
- The contribution is attributed to both the agent and the requesting person.
- Its output can be changed only through human review.

The Oracle is therefore a bounded decision-support mechanism, not an autonomous authority empowered to approve, execute, or independently validate consequential decisions.

### 9. Session authentication and named roles

Named accounts and roles replace the earlier placeholder identity header.

This allows actions to be associated with named users and their assigned roles rather than relying on a user identity supplied through a simple placeholder header.

This feature should not be interpreted as a completed security audit or proof of production-grade authentication.

## End-to-End Demonstration

The prototype includes three synthetic decision scenarios:

**1. Nakuru water-point reliability**

Exercises the complete decision lifecycle, from initial drafting through the learning stage.

The scenario demonstrates how observations, evidence review, alternatives, authorization, resource commitments, execution, verification, outcome classification, corrections, and lessons fit into one decision process.

**2. Earlier-stage decision**

Demonstrates a decision that remains within an earlier lifecycle stage.

**3. Blocked-stage decision**

Demonstrates a decision that encounters a lifecycle or governance constraint rather than progressing as though the required conditions had been met.

All three scenarios use synthetic data. They are workflow demonstrations, not evidence of an actual Nakuru intervention, an institutional partnership, or improved water-point reliability.

## Design Principles

The prototype embodies six principles:

1. **Evidence before confidence** — conclusions should reflect the quality and limitations of their supporting evidence.
2. **Authority before action** — consequential execution should follow explicit authorization.
3. **Separation of responsibilities** — evidence acceptance, authorization, and verification should not collapse into one unchecked role.
4. **Uncertainty before false precision** — observed, estimated, attributed, and uncertain outcomes must remain distinguishable.
5. **Human accountability for agent assistance** — automated contributions remain attributable, bounded, and subject to human review.
6. **Learning before closure** — corrections and lessons are part of the decision lifecycle, not optional additions.

## What This Prototype Does Not Yet Establish

A functioning workflow is an important engineering milestone, but it is not sufficient evidence of institutional readiness.

The current prototype does not establish:

- Production deployment or operational availability.
- Independent security or penetration-test results.
- Institutional adoption or partner validation.
- The truth of any real-world evidence.
- The effectiveness of an actual intervention.
- The causal impact of a decision on a real-world outcome.
- Financial commitments or realized economic, social, or ecological benefits.
- Production readiness for high-stakes decision-making.

The prototype's controls demonstrate intended process behaviour within its current scope. Their robustness under adversarial conditions, operational scale, and real institutional environments remains to be independently validated.

## Why It Matters

Many decision-support systems focus on recommendations, predictions, or dashboards. The Decision Engine explores a complementary question:

**How do we make the complete journey from evidence to action—and from action to verified learning—accountable and inspectable?**

The answer explored here is a structured decision lifecycle with explicit records, controlled transitions, named responsibility, separation of roles, transparent outcome classifications, and mandatory learning.

Within the broader Atlas Sanctum vision, this is a foundational building block for decision intelligence: helping people and institutions understand what is happening, examine available evidence, compare alternatives, authorize responsible action, assess results, and learn from experience.

The present implementation is a prototype of that governance model, not yet a validated civilizational-scale decision infrastructure.

## Repository Boundary

This README describes the capabilities and limitations demonstrated by the current prototype. Installation instructions, deployment architecture, API contracts, test coverage, and production operating procedures are intentionally not specified here because they have not been established in this description.

As the implementation evolves, those details should be documented against the actual codebase and verified behaviour.

---

**Project:** Atlas Sanctum Decision Engine  
**Stage:** Working prototype  
**Data:** Synthetic  
**Deployment:** Local-only  
**Institutional validation:** Not yet established

*Build decisions that can be examined, actions that can be verified, and institutions that can learn.*
