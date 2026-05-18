---
name: alkira-radar-rubric
description: Use this skill whenever scoring an account for Alkira fit in the Radar tool. Provides the 1-10 rubric, calibration against brief-gen's 1-5 scale, and the strict JSON output schema each scoring run MUST return.
---

# Alkira Radar Scoring Rubric

You are scoring ONE company at a time on a 1-10 fit scale for Alkira. Apply this rubric uniformly so partners can compare scores across batches and across the Radar and brief-gen tools.

## Scoring Bands

| Score | Meaning | Action implication |
|---|---|---|
| 10 | Active trigger event + clear Alkira use case + open buying window. Hot now. | Brief and reach out this week. |
| 8-9 | Strong fit. Clear use case, multicloud reality, no major lock-in blocker. | Brief and reach out within 2 weeks. |
| 5-7 | Plausible fit, needs discovery. Some signals but unclear timing or use case. | Worth a discovery call, not a cold pitch. |
| 3-4 | Weak fit. Would need an unusual hook to justify partner time. | Park, revisit in a quarter. |
| 1-2 | Wrong size, wrong vertical, OR actively hostile (recent multi-year lock-in with a direct competitor). | Skip. |

## Calibration with brief-gen

Brief-gen scores on 1-5. Radar scores on 1-10. As a rough mapping: `radar_score ≈ 2 × briefgen_score`. A brief-gen 4 ≈ Radar 8. Use this so partners running both tools see consistent signal.

## What moves a score up

- Recently announced multicloud strategy or migration
- Network team hiring (cloud architects, network engineers)
- Mentions of "network sprawl", "VPC peering complexity", "MPLS replacement"
- Existing footprint with Alkira-friendly partners (cloud providers, security vendors that integrate)
- Recent M&A creating cross-network integration problems
- Public commitment to backbone-as-a-service or NaaS narratives
- Compliance/regulatory pressure driving network segmentation

## What moves a score down

- Recent multi-year contract with a direct competitor (Aviatrix, Megaport, etc.)
- Single-cloud commitment language ("all-in on AWS")
- Recent network team layoffs
- Tiny networking footprint (small SaaS startup, no real network problem)
- Company under acquisition (buyer's stack will dominate)

## Output Schema (REQUIRED)

Return EXACTLY ONE JSON object with no other text:

```json
{
  "resolved_name": "Acme Corporation",
  "resolved_domain": "acme.com",
  "score": 8,
  "fit_bullet": "One sentence naming the strongest specific signal.",
  "objection_bullet": "One sentence naming the most likely objection.",
  "action_bullet": "One sentence naming which Alkira use case to lead with.",
  "sources": ["https://...", "https://...", "..."]
}
```

If the company cannot be identified or has no usable public information:

```json
{
  "resolved_name": null,
  "resolved_domain": null,
  "score": null,
  "status": "not_found",
  "error_message": "No public information found for '<name>'. Try adding a domain.",
  "sources": []
}
```

## Bullet Quality Rules

- Name a specific signal with a specific source — not a vague claim
- One sentence each (two short is acceptable for objection)
- No generic phrases like "leading provider", "digital transformation", "leveraging the cloud"
- The action bullet should name an Alkira use case (multicloud backbone, firewall consolidation, extranet, etc.) and tie it to something the company is actually doing
- If you had to disambiguate the name, lead fit_bullet with the assumption ("Assumed Acme Corp, Austin, ~$200M revenue.")
