# Vexillum

**An interactive prototype of an AI-assisted open-source vulnerability triage pipeline.**

🔗 **[See it running →](https://vexillum.chrismcnabb.ai)**

> Every number, application, and finding in this prototype is synthetic. It is a design
> artifact for thinking through an architecture, not a working system connected to real data.

---

## The problem this is about

A large enterprise contracts a vendor to scan its open-source dependencies. The vendor scans 3,600 packages and delivers around 400 reports a week.

Somebody has to read them.

Four hundred reports a week is eighty a day. An eight-hour day is 480 minutes, so that is six minutes per report at a hundred percent triage utilization — which does not exist, because the same person also owes remediation guidance to the development teams and two tiers of metrics to leadership. Realistically it is three or four minutes per report.

Manual triage at that rate is not slow. It is arithmetically impossible.

The usual outcomes are both bad. Either the queue is worked superficially, in which case the dispositions are guesses, or the queue is not worked at all and the organization has bought an expensive way to generate a backlog.

Vexillum is a design for the third option.

---

## The first thing the vendor cannot tell you

A package scanner reports that `log4j-core@2.14.1` contains CVE-2021-44228. That is a fact about a package. It is true everywhere in the world, for everyone, regardless of who uses it.

It is also nearly useless on its own, because the vendor does not have your repositories, your build systems, or your deployment topology. They cannot tell you **which of your applications actually consume that package.**

Without that attribution you cannot do any of the four things the work requires:

- **Validate** — exploitability is a property of the consuming application, not the package
- **Prioritize** — the same CVE in an internet-facing payment service and an internal batch job are different problems
- **Communicate** — you cannot route a finding without knowing whose it is
- **Report** — "exposure" means nothing without knowing what is exposed

So attribution is not a feature of a triage system. It is a **precondition** for one. In the prototype it comes from three sources with three different fidelities: build-time SBOMs are ground truth, lockfile scrapes miss shaded JARs and container base images, and applications with neither are flagged as unverifiable rather than quietly assigned a confidence score.

---

## Fan out, then collapse

Once you can attribute packages to applications, the numbers move in a counterintuitive way.

**The problem first gets worse.** 412 vendor reports join against the inventory and become roughly 3,847 distinct (application × package × vulnerability) tuples, because one vulnerable package is consumed by many applications.

**Then it gets much better.** Those 3,847 tuples collapse to about 63 distinct vulnerabilities, because every Java service in an estate pulls the same Jackson, Spring, and Netty stack. The same CVE arrives dozens of times.

The architectural consequence is the core idea in the whole design: **split the judgment into a universal half and a local half.**

A **Vulnerability Profile** captures everything true about a CVE regardless of who uses it — which symbols are vulnerable, which public entry points reach them, what preconditions an exploit requires, which versions fix it. Advisories state this in inconsistent prose scattered across NVD, GHSA, vendor writeups, and fix commits, which makes extracting it a genuinely good use of a language model. It is done **once per vulnerability, ever**, and cached.

An **Application Assessment** then applies that profile to one consuming application. Is the package in the shipped artifact? What scope? Does the vulnerable symbol exist in the packaged version? Are the entry points referenced? Do the preconditions hold here? That work is largely a database join and an artifact inspection.

The result is that **expensive reasoning scales with the number of distinct vulnerabilities, not with report volume or application count.** In week one the profile cache is empty and everything is work. By week eight, most arriving CVEs already have a profile and replay for free. The system gets cheaper the longer it runs.

---

## Two planes, and why an auditor cares

Everything in the pipeline is one of two things, and the interface colors them differently on purpose.

**Deterministic** work is parsing, normalizing, fingerprinting, dependency resolution, artifact inspection, schema validation, and every write to the datastore. These produce facts. They are reproducible, testable, and cheap.

**Inference** work is the one judgment that genuinely requires reasoning over code and advisory text: is this exploitable in this application, and why.

The rule that follows is absolute: **a model may return a proposal. It may never write to the datastore.**

That is not fastidiousness. In a regulated environment, somebody eventually asks how a particular finding got closed, and the answer has to be a chain in which the model's contribution was a bounded, logged, human-reviewable proposal and every state change was made by deterministic code. Open any assessment in the prototype and the evidence chain is tagged by origin — you can see at a glance how much of a disposition rested on inference.

---

## The dismissal floor

There is a dashed red line on the reachability ladder, and it is the most important detail in the design.

Reachability is not binary. It runs from level 0 (the package is in the dependency tree) through level 6 (attacker-controlled data reaches the vulnerable path). Level 3 is "the vulnerable symbol is statically referenced somewhere in the application or its dependencies," and it is a tempting place to make dismissal decisions because it is cheap to compute.

It would also have missed Log4Shell.

Your application does not reference `JndiLookup`. It calls `logger.info()`, and log4j reaches the vulnerable code several frames down inside its own internals. A naive "does the application reference the vulnerable class" check returns **false** for the most exploited vulnerability of the decade.

So the rule is hard-coded rather than left to a prompt:

> **A static symbol reference may escalate a finding. It may never dismiss one.**

Absence of a reference produces `under_investigation`, never `not_affected`. In the prototype, assessment A-4474 shows this working — the model proposed `not_affected`, the guardrail rejected the downgrade, and it routed to a human instead.

False positives cost an analyst ten minutes. False negatives cost considerably more. The architecture should encode that asymmetry rather than hoping a model respects it.

---

## Decisions become durable artifacts

A disposition that lives only in someone's memory gets re-litigated every scan cycle. So every `not_affected` verdict is emitted as an **OpenVEX** statement — a machine-readable declaration that the product ships the component but is not affected, with a standard justification code and the evidence behind it.

The justification codes map almost exactly onto the triage ladder: `component_not_present`, `vulnerable_code_not_present`, `vulnerable_code_not_in_execute_path`, `vulnerable_code_cannot_be_controlled_by_adversary`, `inline_mitigations_already_exist`.

The ledger is append-only. Statements are superseded, never edited, which means "what did we believe in October and why did it change" is an answerable question.

---

## The unit of work for a developer is a bump, not a ticket

The remediation view groups findings by **fix action** rather than by finding, and the difference is the whole point. In the prototype, 2,284 open findings resolve to eight distinct actions, and the top three close roughly 80% of them.

Nobody can act on 2,284 tickets. "Bump the Spring Boot parent and the gRPC shading parent" is a sprint commitment somebody can say yes to.

The view also makes the patching trade-off explicit, because it is real and people get it wrong in both directions. Two campaigns in the prototype resolve the same lodash vulnerability. One forces a transitive override — fast, but it runs a dependency combination the parent library never tested, so it requires a test gate and an expiry date. The other upgrades the parent entirely — durable, but two to three sprints. Bumping the direct parent is almost always the right first answer; an override is a loan you have to pay back.

And one campaign has no fix at all. An unmaintained internal library, no release since 2021, no fixed version. The system does not pretend otherwise; it routes to fork, replace, or a documented accepted risk with an owner and a review date. Ten well-documented accepted risks beat a hundred ignored tickets.

---

## Metrics are two different reports

Development teams need throughput, backlog aging, false-positive rate by tool, and mean time to remediate. Leadership needs an exposure trend line and an answer about the vulnerabilities attackers are actually using.

These are not the same slide, and collapsing them is a common failure. The executive view in the prototype deliberately shows no finding counts at all. Nobody in a boardroom wants to know there are eleven thousand findings. They want to know whether exposure is falling and whether KEV-listed exposure is closed.

One internal metric is worth calling out separately: **false-positive rate by vendor batch.** If a large share of a vendor's weekly output is not applicable or references packages nobody consumes, that is not a triage problem. That is a contract conversation, and quantifying it is leverage.

---

## What this is and is not

**It is** a clickable design artifact — seven views, synthetic data, no backend — built to make an architecture arguable. Documents hide their weak spots. Interfaces do not.

**It is not** a working system. Nothing here is connected to a scanner, a repository, or a real SBOM. The numbers were chosen to be plausible, not measured.

**Also worth stating plainly:** the reachability levels above 3 are the hard part, and a real implementation should mostly buy that capability rather than build it. Several vendors compete on call-graph reachability analysis, and runtime instrumentation answers a strictly better question than static analysis can — not "could this be called" but "is this actually called in production." The right architecture leaves a clean seam for a real analyzer and is honest in the interface about which level of evidence a given verdict rests on.

---

## Running it locally

```bash
tar -xzf vexillum-console.tar.gz
cd vexillum
npm install
npm run dev
```

Stack: React 18, Vite 5, Tailwind 4, Recharts, Lucide. No backend, no environment variables, no network calls.

---

## Background

I have spent about 25 years in software — roughly the first half building it and the second half securing it — most recently running an application security program covering more than 250 applications with a two-person team. That ratio is what taught me that automation is not an efficiency play, it is the only arrangement in which the math works at all.

This prototype is that lesson applied to the open-source dependency problem, with a language model doing the one part of the work that genuinely needs reasoning, and deterministic code doing everything else.

Comments and disagreement welcome. The reachability model in particular is the part I would most like to be argued with about.

**Chris McNabb** · [chrismcnabb.ai](https://chrismcnabb.ai)
