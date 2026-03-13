# Policy Engine

**Lightweight ABAC (Attribute-Based Access Control) for Frontend**

## Overview

The Policy Engine provides a simple, declarative way to evaluate pre-conditions for access control based on context attributes (tenant, client, project, environment) and session state.

## Responsibilities

- Evaluate context-based policies (requires tenant/client/project/env)
- Compose multiple policy results (first-deny strategy)
- Provide deterministic PolicyResult with safe details (no PII/tokens)
- Emit minimal observability events on denials

## Non-responsibilities (Hard Boundaries)

- **NO RBAC logic** → delegate to `@hub/permission-rbac`
- **NO HTTP/IO** → operates on snapshots only
- **NO UI rendering** → pure decision logic
- **NO complex DSL** → simple declarative policies only
- **NO domain business rules** → only generic pre-conditions

## Core Concepts

### PolicyResult

Every policy evaluation returns a `PolicyResult`:

```typescript
{
  decision: 'allow' | 'deny',
  policyId: string,
  reason?: PolicyReason,
  detailsSafe?: Record<string, unknown>
}
```

### Policy Reason Codes

- `contextMissing` → Required context attribute absent (tenant/client/project)
- `envMismatch` → Environment key mismatch
- `policyConfigInvalid` → Policy configuration error (dev)
- `unknownPolicyId` → PolicyId not found (dev)

### Safe Details

Details never include:
- Tokens or credentials
- Full claims objects
- Sensitive user data (PII)

Details may include:
- Boolean flags (`hasProject: true/false`)
- Required field names (`requiredField: 'projectId'`)
- Environment keys (non-sensitive identifiers)

## Usage

```typescript
import { PolicyEngineService } from '@hub/policy-engine';

const result = policyEngine.evaluate(
  'route.tool-pip',
  [{ policyId: 'requiresProject' }],
  contextSnapshot,
  sessionSnapshot
);

if (result.decision === 'deny') {
  // Handle denial: route guard, UI state, etc.
  console.log('Denied:', result.reason, result.detailsSafe);
}
```

## Available Policies

- `requiresTenant` → Deny if `tenantId` missing
- `requiresClient` → Deny if `clientId` missing  
- `requiresProject` → Deny if `projectId` missing
- `envIsProdOnly` → Deny if `environmentKey !== 'prod'`

## Architecture Integration

- **Access Decision Service**: consumes PolicyResult for route/action decisions
- **Guards**: check PolicyResult.decision
- **Observability**: receives minimal events on deny
- **Error Model**: maps config errors to StandardError

## Composition Strategy

**First-deny**: Evaluation stops at the first policy that denies. This is predictable, performant, and clear for users.

## Testing

```bash
nx test policy-engine
```

Tests cover:
- Individual policy allow/deny scenarios
- Composition with multiple policies
- Unknown policyId handling
- Safe details validation (no PII leakage)
