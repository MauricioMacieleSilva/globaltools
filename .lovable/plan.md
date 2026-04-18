
The user is clarifying that the "definitive vs non-definitive" decision is **purely a pre-configured property of the loss reason itself** — never a runtime choice by the user. My previous plan already reflected this (the `is_definitive` flag is set in admin settings, and the CRM reads it automatically). I'll restate the plan more concisely to confirm alignment and remove any ambiguity.

Key points to reinforce:
1. Admin pre-configures each loss reason with an `is_definitive` flag.
2. User only sees and selects the reason — no toggle/choice about whether it's definitive.
3. System reads the flag and decides the flow automatically.
