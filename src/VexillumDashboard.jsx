import React, { useState, useEffect, useMemo } from "react";
import {
  Activity, Boxes, ListFilter, ClipboardCheck, FileSignature, BarChart3,
  Play, RotateCcw, Check, X, ChevronRight, AlertTriangle, Lock, Cpu,
  Database, ShieldAlert, ArrowRight, Info, CircleDot, Layers,
  Wrench, GitPullRequest, Send, Clock, Package, TrendingDown
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";

/* ──────────────────────────────────────────────────────────────────────────
   VEXILLUM — dashboard ideation mockup. No backend. All data below is fake.
   Color encoding is meaningful:
     cyan   = deterministic fact (parser, lockfile, artifact inspection)
     violet = model proposal (LLM reasoning, always cited, never committed)
     brass  = brand / active nav only
   ────────────────────────────────────────────────────────────────────────── */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
.vx { --ink:#0a0f1a; --ink2:#0f1626; --ink3:#161f33; --line:#1e293b;
      --brass:#c9a227; --cyan:#22d3ee; --violet:#a78bfa; }
.vx-root { background:var(--ink); color:#e2e8f0; font-family:'Inter',system-ui,sans-serif; }
.vx-display { font-family:'Space Grotesk',system-ui,sans-serif; letter-spacing:-0.02em; }
.vx-mono { font-family:'JetBrains Mono',ui-monospace,monospace; }
.vx-panel { background:var(--ink2); border:1px solid var(--line); }
.vx-panel-2 { background:var(--ink3); border:1px solid var(--line); }
.vx-brass { color:var(--brass); }
.vx-rail-active { background:var(--ink3); box-shadow: inset 2px 0 0 var(--brass); }
.vx-det { color:var(--cyan); }
.vx-inf { color:var(--violet); }
.vx-det-bg { background:rgba(34,211,238,0.10); border:1px solid rgba(34,211,238,0.30); }
.vx-inf-bg { background:rgba(167,139,250,0.10); border:1px solid rgba(167,139,250,0.30); }
.vx-explain { background:rgba(201,162,39,0.07); border-left:2px solid var(--brass); }
.vx-row:hover { background:var(--ink3); }
.vx-scroll::-webkit-scrollbar { width:8px; height:8px; }
.vx-scroll::-webkit-scrollbar-thumb { background:#1e293b; border-radius:4px; }
.vx-scroll::-webkit-scrollbar-track { background:transparent; }
@keyframes vxpulse { 0%,100%{opacity:.35} 50%{opacity:1} }
.vx-pulse { animation: vxpulse 1.1s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .vx-pulse { animation: none; } }
`;

/* ── mock domain data ───────────────────────────────────────────────────── */

const APPS = [
  { id: "APP-1041", name: "Retail Payments API",    exposure: "internet-facing",     tier: 1, team: "Payments Core",   sbom: "build", pkgs: 412 },
  { id: "APP-2270", name: "Wire Transfer Service",  exposure: "internet-facing",     tier: 1, team: "Payments Core",   sbom: "build", pkgs: 388 },
  { id: "APP-3315", name: "Customer Portal",        exposure: "internet-facing",     tier: 1, team: "Digital Channels",sbom: "build", pkgs: 1104 },
  { id: "APP-4408", name: "Loan Origination",       exposure: "internal-authed",     tier: 2, team: "Lending Tech",    sbom: "lockfile", pkgs: 507 },
  { id: "APP-6620", name: "Fraud Scoring Engine",   exposure: "internal-authed",     tier: 1, team: "Risk Platform",   sbom: "build", pkgs: 291 },
  { id: "APP-7734", name: "Branch Ops Dashboard",   exposure: "internal-authed",     tier: 3, team: "Branch Systems",  sbom: "lockfile", pkgs: 646 },
  { id: "APP-5512", name: "Statement Generator",    exposure: "internal-batch",      tier: 3, team: "Doc Services",    sbom: "none",  pkgs: 0 },
  { id: "APP-8850", name: "Nightly Recon Job",      exposure: "internal-batch",      tier: 3, team: "Treasury Ops",    sbom: "lockfile", pkgs: 173 },
];

const PROFILES = [
  {
    cve: "CVE-2021-44228", pkg: "pkg:maven/org.apache.logging.log4j/log4j-core", ver: "2.14.1",
    title: "JNDI lookup allows remote code execution", kev: true, epss: 0.974, cvss: 10.0,
    symbols: ["org.apache.logging.log4j.core.lookup.JndiLookup"],
    entries: ["Logger.info", "Logger.error", "Logger.warn", "Logger.debug"],
    conditions: ["Message lookup substitution enabled (default < 2.15.0)", "Attacker-influenced data reaches any log statement"],
    fixed: ["2.17.1"], cached: true, builtOn: "2026-08-11",
  },
  {
    cve: "CVE-2022-22965", pkg: "pkg:maven/org.springframework/spring-beans", ver: "5.3.15",
    title: "Data binding allows class loader manipulation", kev: true, epss: 0.941, cvss: 9.8,
    symbols: ["org.springframework.beans.CachedIntrospectionResults"],
    entries: ["@RequestMapping handler with POJO parameter binding"],
    conditions: ["Deployed as WAR on Tomcat", "JDK 9 or later", "Spring MVC/WebFlux data binding in use"],
    fixed: ["5.3.18"], cached: true, builtOn: "2026-08-11",
  },
  {
    cve: "CVE-2023-44487", pkg: "pkg:maven/io.netty/netty-codec-http2", ver: "4.1.94.Final",
    title: "HTTP/2 rapid reset enables denial of service", kev: true, epss: 0.883, cvss: 7.5,
    symbols: ["io.netty.handler.codec.http2.Http2FrameCodec"],
    entries: ["Any HTTP/2 server listener"],
    conditions: ["HTTP/2 enabled on a listener reachable from untrusted networks"],
    fixed: ["4.1.100.Final"], cached: true, builtOn: "2026-08-18",
  },
  {
    cve: "CVE-2020-36518", pkg: "pkg:maven/com.fasterxml.jackson.core/jackson-databind", ver: "2.9.8",
    title: "Deeply nested JSON causes stack exhaustion", kev: false, epss: 0.0061, cvss: 7.5,
    symbols: ["com.fasterxml.jackson.databind.ObjectMapper"],
    entries: ["ObjectMapper.readValue", "@RequestBody deserialization"],
    conditions: ["Untrusted JSON parsed without depth limits"],
    fixed: ["2.13.2.1"], cached: true, builtOn: "2026-07-29",
  },
  {
    cve: "CVE-2021-23337", pkg: "pkg:npm/lodash", ver: "4.17.20",
    title: "Command injection via template", kev: false, epss: 0.0139, cvss: 7.2,
    symbols: ["_.template"],
    entries: ["_.template called with user-supplied options"],
    conditions: ["Template compiled from attacker-influenced string"],
    fixed: ["4.17.21"], cached: false, builtOn: null,
  },
  {
    cve: "CVE-2023-45857", pkg: "pkg:npm/axios", ver: "1.5.0",
    title: "XSRF token leaked to third-party host on redirect", kev: false, epss: 0.0042, cvss: 6.5,
    symbols: ["axios.request"],
    entries: ["Any axios call following cross-origin redirects"],
    conditions: ["withCredentials enabled", "Requests can redirect off-origin"],
    fixed: ["1.6.0"], cached: false, builtOn: null,
  },
  {
    cve: "CVE-2024-21907", pkg: "pkg:nuget/Newtonsoft.Json", ver: "12.0.3",
    title: "Malformed input triggers unbounded recursion", kev: false, epss: 0.0035, cvss: 7.5,
    symbols: ["Newtonsoft.Json.JsonConvert"],
    entries: ["JsonConvert.DeserializeObject on untrusted input"],
    conditions: ["Untrusted JSON deserialized without MaxDepth set"],
    fixed: ["13.0.1"], cached: true, builtOn: "2026-08-04",
  },
  {
    cve: "CVE-2023-32681", pkg: "pkg:pypi/requests", ver: "2.28.1",
    title: "Proxy-Authorization header leaked on cross-origin redirect", kev: false, epss: 0.0028, cvss: 6.1,
    symbols: ["requests.sessions.Session"],
    entries: ["Session.request when a proxy is configured"],
    conditions: ["Proxy configured", "Redirects to a different host permitted"],
    fixed: ["2.31.0"], cached: true, builtOn: "2026-08-04",
  },
];

/* assessments: the (app × package × cve) tuples */
const mk = (id, appId, cve, level, status, just, scope, depth, parent, conf, mode, note) => ({
  id, appId, cve, level, status, just, scope, depth, parent, conf, mode, note,
});

const ASSESSMENTS = [
  mk("A-4471","APP-1041","CVE-2021-44228",6,"affected",null,"runtime","transitive","spring-boot-starter-web 2.5.6 → spring-boot-starter-logging",0.96,"escalated","Request headers reach an access-log statement. Internet-facing. KEV."),
  mk("A-4472","APP-2270","CVE-2021-44228",5,"affected",null,"runtime","transitive","spring-boot-starter-web 2.5.6 → spring-boot-starter-logging",0.91,"escalated","Log statements present on authenticated paths; upstream input not yet confirmed attacker-controlled."),
  mk("A-4473","APP-5512","CVE-2021-44228",1,"under_investigation",null,"runtime","transitive","spring-boot-starter-logging 2.5.6",0.44,"escalated","No SBOM for this application. Attribution came from a stale lockfile; presence unverified."),
  mk("A-4474","APP-8850","CVE-2021-44228",3,"under_investigation",null,"runtime","transitive","spring-boot-starter-logging 2.5.6",0.58,"escalated","Entry points referenced but batch job reads only from an internal trusted queue. Below dismissal floor — cannot auto-close."),
  mk("A-4475","APP-6620","CVE-2022-22965",1,"not_affected","vulnerable_code_not_present","runtime","transitive","spring-boot-starter 2.6.3",0.97,"auto","Deployed as an executable JAR, not a WAR on Tomcat. Required precondition not met."),
  mk("A-4476","APP-4408","CVE-2022-22965",5,"affected",null,"runtime","direct","declared in pom.xml",0.93,"escalated","WAR deployment on Tomcat 9, JDK 17, POJO binding on 14 handlers."),
  mk("A-4477","APP-1041","CVE-2023-44487",6,"affected",null,"runtime","transitive","grpc-netty-shaded 1.45.0",0.94,"escalated","HTTP/2 listener exposed through the external gateway."),
  mk("A-4478","APP-6620","CVE-2023-44487",2,"not_affected","vulnerable_code_not_in_execute_path","runtime","transitive","grpc-netty-shaded 1.45.0",0.88,"approved","gRPC used over Unix domain sockets only. No HTTP/2 network listener bound."),
  mk("A-4479","APP-3315","CVE-2020-36518",4,"affected",null,"runtime","transitive","spring-boot-starter-json 2.5.6",0.86,"auto","Untrusted JSON reaches ObjectMapper on public endpoints. Low EPSS — queued, not escalated."),
  mk("A-4480","APP-7734","CVE-2020-36518",1,"not_affected","component_not_present","test","transitive","spring-boot-starter-test 2.5.6",0.99,"auto","Test scope only. Not present in the deployed artifact."),
  mk("A-4481","APP-3315","CVE-2021-23337",2,"not_affected","vulnerable_code_not_present","runtime","transitive","react-scripts 4.0.3 → babel-plugin-lodash",0.92,"auto","Bundle tree-shaken. _.template not present in the shipped bundle."),
  mk("A-4482","APP-7734","CVE-2021-23337",3,"under_investigation",null,"runtime","direct","declared in package.json",0.61,"escalated","_.template referenced in two admin views. Input source not yet traced."),
  mk("A-4483","APP-3315","CVE-2023-45857",4,"affected",null,"runtime","direct","declared in package.json",0.79,"escalated","withCredentials enabled globally on the API client."),
  mk("A-4484","APP-4408","CVE-2024-21907",1,"not_affected","inline_mitigations_already_exist","runtime","direct","declared in .csproj",0.90,"approved","MaxDepth set to 32 in the global serializer settings."),
  mk("A-4485","APP-8850","CVE-2023-32681",1,"not_affected","vulnerable_code_cannot_be_controlled_by_adversary","runtime","direct","declared in requirements.txt",0.94,"auto","No proxy configured in any environment. Precondition unmet."),
  mk("A-4486","APP-2270","CVE-2020-36518",4,"affected",null,"runtime","transitive","spring-boot-starter-json 2.5.6",0.83,"auto","Reaches ObjectMapper on authenticated endpoints."),
];

const STAGES = [
  { key:"ingest",  name:"Ingest",       icon:Database, det:true,
    detail:"Parse vendor exports through format adapters. SARIF, CycloneDX VDR, OSV, and a configurable CSV mapper.",
    inLabel:"vendor reports", outLabel:"normalized findings", inN:412, outN:412,
    explain:"No vendor format survives past this boundary. When the third party changes their export, you write one adapter and nothing downstream moves." },
  { key:"attrib",  name:"Attribution",  icon:Boxes, det:true,
    detail:"Join each package against the inventory to find every consuming application.",
    inLabel:"normalized findings", outLabel:"app × package × CVE", inN:412, outN:3847,
    explain:"This is the step the vendor cannot do for you. It is also where the count explodes — one package report becomes one finding per consuming application." },
  { key:"collapse",name:"Collapse",     icon:Layers, det:true,
    detail:"Group tuples by (package, CVE) to find how many distinct judgments are actually required.",
    inLabel:"app × package × CVE", outLabel:"distinct CVEs", inN:3847, outN:63,
    explain:"The thesis of the whole system. 3,847 things to decide is impossible. 63 is a Tuesday." },
  { key:"profile", name:"Profile",      icon:Cpu, det:false,
    detail:"Build a Vulnerability Profile per CVE: vulnerable symbols, the entry points that reach them, exploit preconditions, and fix paths.",
    inLabel:"distinct CVEs", outLabel:"model calls needed", inN:63, outN:12,
    explain:"51 of the 63 were already profiled in earlier weeks and replay for free. Expensive reasoning scales with distinct CVEs, never with report volume — so this number falls every month." },
  { key:"assess",  name:"Assess",       icon:ShieldAlert, det:true,
    detail:"Apply each profile to each consuming application. Artifact presence, scope, symbol presence, entry-point references, preconditions.",
    inLabel:"app × package × CVE", outLabel:"assessments", inN:3847, outN:3847,
    explain:"Mostly a database join and an artifact inspection. The model only weighs in on whether preconditions are met, and it must cite." },
  { key:"guard",   name:"Guardrails",   icon:Lock, det:true,
    detail:"Reject proposals with no citation, bound severity movement, strip unsupported quotes, enforce the dismissal floor.",
    inLabel:"assessments", outLabel:"passed", inN:3847, outN:3610,
    explain:"237 proposals failed a guardrail and routed to human review rather than being dropped or auto-committed." },
  { key:"commit",  name:"Disposition",  icon:ClipboardCheck, det:true,
    detail:"Write dispositions and cache entries. Escalate anything under the confidence threshold or touching a KEV entry.",
    inLabel:"passed", outLabel:"auto-dispositioned", inN:3847, outN:3610,
    explain:"The model proposed all of these. Deterministic code committed them. That distinction is the entire audit story." },
  { key:"vex",     name:"VEX",          icon:FileSignature, det:true,
    detail:"Emit an OpenVEX statement per application per vulnerability. Append-only ledger, supersession never mutation.",
    inLabel:"auto-dispositioned", outLabel:"statements", inN:3610, outN:3610,
    explain:"This is why the same CVE never gets triaged twice. The decision becomes a durable, machine-readable artifact." },
];

const LADDER = [
  { n:0, label:"Present",             q:"In the dependency tree",                       kind:"fact" },
  { n:1, label:"Shipped",             q:"In the deployed artifact, runtime scope",      kind:"fact" },
  { n:2, label:"Symbol present",      q:"Vulnerable class exists in the package",       kind:"fact" },
  { n:3, label:"Statically referenced",q:"Entry points appear in app or dependency code",kind:"signal" },
  { n:4, label:"Call-graph reachable",q:"A path exists from an entry point",            kind:"analysis" },
  { n:5, label:"Preconditions met",   q:"Required config actually applies here",        kind:"inference" },
  { n:6, label:"Attacker-controllable",q:"Untrusted data reaches the path",             kind:"inference" },
];

const TREND = [
  { w:"Wk 1", exposure:1840, kev:112 }, { w:"Wk 2", exposure:1712, kev:98 },
  { w:"Wk 3", exposure:1495, kev:81 },  { w:"Wk 4", exposure:1268, kev:54 },
  { w:"Wk 5", exposure:1042, kev:37 },  { w:"Wk 6", exposure:864,  kev:22 },
  { w:"Wk 7", exposure:701,  kev:14 },  { w:"Wk 8", exposure:588,  kev:9 },
];

/* remediation campaigns — grouped by fix ACTION, not by finding */
const CAMPAIGNS = [
  {
    id: "RC-01", eco: "maven", kind: "parent_bump",
    action: "spring-boot-starter-parent", from: "2.5.6", to: "2.7.18",
    closes: 1240, kev: 3, apps: ["APP-1041","APP-2270","APP-3315","APP-4408","APP-6620"],
    cves: ["CVE-2021-44228","CVE-2020-36518","CVE-2022-22965"],
    effort: "medium", risk: "medium", eta: "1 sprint",
    why: "One managed-parent bump resolves log4j-core, jackson-databind, and spring-beans in a single change. The parent's BOM already pins fixed versions of all three.",
    caution: null,
  },
  {
    id: "RC-02", eco: "maven", kind: "parent_bump",
    action: "grpc-netty-shaded", from: "1.45.0", to: "1.58.0",
    closes: 388, kev: 1, apps: ["APP-1041","APP-6620"],
    cves: ["CVE-2023-44487"],
    effort: "low", risk: "low", eta: "2 days",
    why: "Shaded netty is invisible to the dependency tree. The only path to a fixed netty-codec-http2 is bumping the shading parent.",
    caution: "Shaded artifact — confirm the fix landed by inspecting the built JAR, not the dependency tree.",
  },
  {
    id: "RC-03", eco: "npm", kind: "override",
    action: "lodash (forced via overrides)", from: "4.17.20", to: "4.17.21",
    closes: 214, kev: 0, apps: ["APP-3315","APP-7734"],
    cves: ["CVE-2021-23337"],
    effort: "low", risk: "high", eta: "1 day",
    why: "react-scripts 4.0.3 pins lodash transitively and no 4.x release moves off it. An override is the only fast path.",
    caution: "An override runs a combination react-scripts never tested. Requires a full test-suite gate and an expiry date. Pair with RC-06 as the durable fix.",
  },
  {
    id: "RC-04", eco: "nuget", kind: "direct_bump",
    action: "Newtonsoft.Json", from: "12.0.3", to: "13.0.1",
    closes: 96, kev: 0, apps: ["APP-4408"],
    cves: ["CVE-2024-21907"],
    effort: "low", risk: "low", eta: "1 day",
    why: "Direct dependency, single major bump, well-documented migration.",
    caution: null,
  },
  {
    id: "RC-05", eco: "npm", kind: "direct_bump",
    action: "axios", from: "1.5.0", to: "1.6.0",
    closes: 41, kev: 0, apps: ["APP-3315"],
    cves: ["CVE-2023-45857"],
    effort: "low", risk: "low", eta: "1 day",
    why: "Direct dependency in package.json. Patch-level behavioural change only.",
    caution: null,
  },
  {
    id: "RC-06", eco: "npm", kind: "replace",
    action: "react-scripts", from: "4.0.3", to: "5.0.1",
    closes: 214, kev: 0, apps: ["APP-3315","APP-7734"],
    cves: ["CVE-2021-23337"],
    effort: "high", risk: "medium", eta: "2–3 sprints",
    why: "The durable fix for the same finding RC-03 patches. Moves off the pinned transitive entirely rather than forcing around it.",
    caution: "Webpack 5 migration. Do not run alongside RC-03 — pick one, and if you take RC-03 first, this becomes the debt-repayment ticket.",
  },
  {
    id: "RC-07", eco: "pypi", kind: "direct_bump",
    action: "requests", from: "2.28.1", to: "2.31.0",
    closes: 33, kev: 0, apps: ["APP-8850"],
    cves: ["CVE-2023-32681"],
    effort: "low", risk: "low", eta: "1 day",
    why: "Direct dependency in requirements.txt.",
    caution: null,
  },
  {
    id: "RC-08", eco: "maven", kind: "no_fix",
    action: "internal-audit-commons", from: "1.4.2", to: "—",
    closes: 58, kev: 0, apps: ["APP-5512"],
    cves: ["CVE-2025-31180"],
    effort: "high", risk: "high", eta: "unscheduled",
    why: "Internal library, last commit 2021, no maintainer. No fixed version exists.",
    caution: "No upstream fix. Options are fork-and-patch, replace, or a documented accepted risk with an owner and a review date.",
  },
];

const TEAM_ROLLUP = [
  { team:"Payments Core",    apps:2, campaigns:["RC-01","RC-02"],        closes:1628, kev:4, tier:1 },
  { team:"Digital Channels", apps:1, campaigns:["RC-01","RC-03","RC-05","RC-06"], closes:1495, kev:1, tier:1 },
  { team:"Lending Tech",     apps:1, campaigns:["RC-01","RC-04"],        closes:1336, kev:1, tier:2 },
  { team:"Risk Platform",    apps:1, campaigns:["RC-01","RC-02"],        closes:1628, kev:4, tier:1 },
  { team:"Branch Systems",   apps:1, campaigns:["RC-03","RC-06"],        closes:214,  kev:0, tier:3 },
  { team:"Treasury Ops",     apps:1, campaigns:["RC-07"],                closes:33,   kev:0, tier:3 },
  { team:"Doc Services",     apps:1, campaigns:["RC-08"],                closes:58,   kev:0, tier:3 },
];

const CACHE_TREND = [
  { w:"Wk 1", hit:12 }, { w:"Wk 2", hit:34 }, { w:"Wk 3", hit:51 }, { w:"Wk 4", hit:63 },
  { w:"Wk 5", hit:71 }, { w:"Wk 6", hit:77 }, { w:"Wk 7", hit:81 }, { w:"Wk 8", hit:81 },
];

/* ── tiny primitives ────────────────────────────────────────────────────── */

const Mono = ({ children, className = "" }) => (
  <span className={`vx-mono ${className}`}>{children}</span>
);

const Chip = ({ children, tone = "slate", className = "" }) => {
  const tones = {
    slate:  "bg-slate-800 text-slate-300 border-slate-700",
    red:    "bg-rose-950 text-rose-300 border-rose-900",
    orange: "bg-orange-950 text-orange-300 border-orange-900",
    green:  "bg-emerald-950 text-emerald-300 border-emerald-900",
    blue:   "bg-sky-950 text-sky-300 border-sky-900",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs border rounded ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
};

const StatusChip = ({ s }) => {
  if (s === "affected") return <Chip tone="red">affected</Chip>;
  if (s === "not_affected") return <Chip tone="green">not affected</Chip>;
  return <Chip tone="orange">investigating</Chip>;
};

const SourceTag = ({ det, children }) => (
  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded ${det ? "vx-det-bg vx-det" : "vx-inf-bg vx-inf"}`}>
    {det ? <Database size={11} /> : <Cpu size={11} />}
    {children}
  </span>
);

const Explain = ({ on, children }) =>
  !on ? null : (
    <div className="vx-explain px-3 py-2 my-2 text-xs text-amber-100 leading-relaxed flex gap-2">
      <Info size={13} className="shrink-0 mt-0.5 vx-brass" />
      <span>{children}</span>
    </div>
  );

const SectionTitle = ({ children, sub }) => (
  <div className="mb-4">
    <h2 className="vx-display text-xl font-semibold text-slate-100">{children}</h2>
    {sub && <p className="text-sm text-slate-500 mt-0.5">{sub}</p>}
  </div>
);

/* ── view: pipeline ─────────────────────────────────────────────────────── */

function Pipeline({ explain }) {
  const [step, setStep] = useState(-1);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (step >= STAGES.length - 1) { setRunning(false); return; }
    const t = setTimeout(() => setStep((s) => s + 1), 620);
    return () => clearTimeout(t);
  }, [running, step]);

  const start = () => { setStep(-1); setRunning(true); setTimeout(() => setStep(0), 60); };
  const reset = () => { setRunning(false); setStep(-1); };
  const done = step >= STAGES.length - 1 && !running;
  const maxN = 3847;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <SectionTitle sub="Batch VNDR-2026-W35 · 412 reports received Monday 06:00 ET">
            Pipeline run
          </SectionTitle>
        </div>
        <div className="flex gap-2">
          <button onClick={start} disabled={running}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded bg-slate-100 text-slate-900 font-medium hover:bg-white disabled:opacity-40">
            <Play size={14} /> {done ? "Run again" : "Run batch"}
          </button>
          <button onClick={reset}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded border border-slate-700 text-slate-300 hover:bg-slate-800">
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* signature element: the fan-out / collapse funnel */}
      <div className="vx-panel rounded-lg p-5 mb-6">
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="vx-display text-sm font-semibold text-slate-300 uppercase tracking-wider">Fan-out, then collapse</h3>
          <span className="text-xs text-slate-500">width = volume at each stage</span>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          The count explodes at attribution and collapses at profiling. Everything expensive happens at the narrowest point.
        </p>
        <div className="space-y-1.5">
          {STAGES.map((s, i) => {
            const active = i <= step;
            const w = Math.max(4, (s.outN / maxN) * 100);
            const peak = s.key === "attrib";
            const trough = s.key === "profile";
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div className="w-28 shrink-0 text-right">
                  <span className={`text-xs vx-display font-medium ${active ? "text-slate-200" : "text-slate-600"}`}>
                    {s.name}
                  </span>
                </div>
                <div className="flex-1 h-7 relative bg-slate-900 rounded-sm overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ease-out ${
                      !active ? "bg-slate-800"
                      : peak ? "bg-rose-900"
                      : trough ? "bg-emerald-800"
                      : s.det ? "bg-cyan-900" : "bg-violet-900"
                    }`}
                    style={{ width: active ? `${w}%` : "0%" }}
                  />
                  <div className="absolute inset-0 flex items-center px-3">
                    <Mono className={`text-xs ${active ? "text-slate-100" : "text-slate-700"}`}>
                      {active ? s.outN.toLocaleString() : "—"}
                    </Mono>
                    <span className={`ml-2 text-xs ${active ? "text-slate-400" : "text-slate-700"}`}>
                      {s.outLabel}
                    </span>
                  </div>
                </div>
                <div className="w-24 shrink-0">
                  {active && <SourceTag det={s.det}>{s.det ? "code" : "model"}</SourceTag>}
                </div>
              </div>
            );
          })}
        </div>
        <Explain on={explain}>
          This shape is the argument. A reviewer looking at 412 reports a week assumes a staffing problem.
          The widest bar says it is actually 3,847 decisions, which is worse. The narrowest bar says only 63
          of them are distinct, and only 12 need new reasoning. That is the difference between impossible and routine.
        </Explain>
      </div>

      {/* stage detail cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {STAGES.map((s, i) => {
          const active = i <= step;
          const current = i === step && running;
          const Icon = s.icon;
          return (
            <div key={s.key}
              className={`vx-panel rounded-lg p-4 transition-opacity duration-300 ${active ? "opacity-100" : "opacity-30"}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded ${s.det ? "vx-det-bg" : "vx-inf-bg"} ${current ? "vx-pulse" : ""}`}>
                  <Icon size={15} className={s.det ? "vx-det" : "vx-inf"} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="vx-display text-sm font-semibold text-slate-200">{s.name}</h4>
                    {active && <Check size={12} className="text-emerald-500" />}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{s.detail}</p>
                  <div className="flex items-center gap-2 mt-2.5 text-xs">
                    <Mono className="text-slate-400">{s.inN.toLocaleString()}</Mono>
                    <ArrowRight size={11} className="text-slate-600" />
                    <Mono className={s.outN < s.inN ? "text-emerald-400" : s.outN > s.inN ? "text-rose-400" : "text-slate-400"}>
                      {s.outN.toLocaleString()}
                    </Mono>
                  </div>
                  <Explain on={explain}>{s.explain}</Explain>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── view: inventory ────────────────────────────────────────────────────── */

function Inventory({ explain }) {
  const covered = APPS.filter(a => a.sbom !== "none").length;
  const pct = Math.round((covered / APPS.length) * 100);

  return (
    <div>
      <SectionTitle sub="Where attribution comes from, and where it does not exist yet">
        Application inventory
      </SectionTitle>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { k: "Attribution coverage", v: `${pct}%`, d: `${covered} of ${APPS.length} applications resolvable`, tone: "text-amber-400" },
          { k: "Packages in inventory", v: "3,521", d: "of 3,600 the vendor scans", tone: "text-slate-100" },
          { k: "Unattributable reports", v: "25", d: "no known consumer — vendor contract lever", tone: "text-rose-400" },
        ].map(c => (
          <div key={c.k} className="vx-panel rounded-lg p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">{c.k}</div>
            <div className={`vx-display text-3xl font-bold ${c.tone}`}>{c.v}</div>
            <div className="text-xs text-slate-500 mt-1">{c.d}</div>
          </div>
        ))}
      </div>

      <Explain on={explain}>
        Unattributable reports are worth tracking separately and loudly. If the vendor is billing for scans of
        packages nobody consumes, that is a renegotiation, not a triage problem.
      </Explain>

      <div className="vx-panel rounded-lg overflow-hidden">
        <div className="overflow-x-auto vx-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="text-left font-medium px-4 py-3">Application</th>
                <th className="text-left font-medium px-4 py-3">Owner</th>
                <th className="text-left font-medium px-4 py-3">Exposure</th>
                <th className="text-left font-medium px-4 py-3">Tier</th>
                <th className="text-left font-medium px-4 py-3">Attribution source</th>
                <th className="text-right font-medium px-4 py-3">Packages</th>
              </tr>
            </thead>
            <tbody>
              {APPS.map(a => (
                <tr key={a.id} className="vx-row border-b border-slate-800 last:border-0">
                  <td className="px-4 py-3">
                    <div className="text-slate-200">{a.name}</div>
                    <Mono className="text-xs text-slate-600">{a.id}</Mono>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{a.team}</td>
                  <td className="px-4 py-3">
                    <Chip tone={a.exposure === "internet-facing" ? "red" : a.exposure === "internal-authed" ? "orange" : "slate"}>
                      {a.exposure}
                    </Chip>
                  </td>
                  <td className="px-4 py-3"><Mono className={a.tier === 1 ? "text-rose-400" : "text-slate-400"}>T{a.tier}</Mono></td>
                  <td className="px-4 py-3">
                    {a.sbom === "build" && <SourceTag det>build SBOM</SourceTag>}
                    {a.sbom === "lockfile" && <Chip tone="orange">lockfile scrape</Chip>}
                    {a.sbom === "none" && <Chip tone="red"><AlertTriangle size={11} /> none</Chip>}
                  </td>
                  <td className="px-4 py-3 text-right"><Mono className="text-slate-300">{a.pkgs || "—"}</Mono></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Explain on={explain}>
        Three attribution sources with three different fidelities. Build-time SBOMs are ground truth. Lockfile
        scrapes miss shaded JARs and container base images. A row with no source means every finding for that
        application is unverifiable, and it should be visible here rather than buried in a confidence score.
      </Explain>
    </div>
  );
}

/* ── view: findings + detail ────────────────────────────────────────────── */

function Ladder({ level, explain }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h4 className="vx-display text-sm font-semibold text-slate-300 uppercase tracking-wider">Reachability</h4>
        <Mono className="text-xs text-slate-500">level {level} of 6</Mono>
      </div>
      <div className="space-y-0">
        {[...LADDER].reverse().map((r) => {
          const reached = r.n <= level;
          const isFloor = r.n === 3;
          return (
            <div key={r.n}>
              {isFloor && (
                <div className="flex items-center gap-2 py-2">
                  <div className="flex-1 border-t border-dashed border-rose-800" />
                  <span className="text-xs text-rose-400 uppercase tracking-wider whitespace-nowrap">
                    dismissal floor
                  </span>
                  <div className="flex-1 border-t border-dashed border-rose-800" />
                </div>
              )}
              <div className={`flex items-start gap-3 py-1.5 px-2 rounded ${reached ? "" : "opacity-35"}`}>
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                  !reached ? "bg-slate-700"
                  : r.kind === "fact" ? "bg-cyan-400"
                  : r.kind === "signal" ? "bg-amber-400"
                  : "bg-violet-400"
                }`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Mono className="text-xs text-slate-500">{r.n}</Mono>
                    <span className={`text-xs font-medium ${reached ? "text-slate-200" : "text-slate-500"}`}>{r.label}</span>
                  </div>
                  <div className="text-xs text-slate-600">{r.q}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Explain on={explain}>
        Nothing below the floor can be auto-closed. Your application never references JndiLookup directly — it calls
        Logger.info, and log4j reaches the vulnerable code internally. A "not statically referenced" result is a reason
        to investigate, never a reason to dismiss.
      </Explain>
    </div>
  );
}

function Findings({ explain }) {
  const [sel, setSel] = useState(ASSESSMENTS[0]);
  const [filter, setFilter] = useState("all");

  const rows = useMemo(() => {
    if (filter === "all") return ASSESSMENTS;
    if (filter === "affected") return ASSESSMENTS.filter(a => a.status === "affected");
    if (filter === "kev") return ASSESSMENTS.filter(a => PROFILES.find(p => p.cve === a.cve)?.kev);
    return ASSESSMENTS.filter(a => a.status === "not_affected");
  }, [filter]);

  const prof = PROFILES.find(p => p.cve === sel.cve);
  const app = APPS.find(a => a.id === sel.appId);

  return (
    <div>
      <SectionTitle sub="One row per consuming application, not one row per package">
        Assessments
      </SectionTitle>

      <div className="flex gap-2 mb-4 flex-wrap">
        {[["all","All"],["affected","Affected"],["kev","KEV-listed"],["clear","Not affected"]].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1.5 text-xs rounded border ${
              filter === k ? "bg-slate-100 text-slate-900 border-slate-100 font-medium"
                           : "border-slate-700 text-slate-400 hover:bg-slate-800"}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 vx-panel rounded-lg overflow-hidden">
          <div className="overflow-x-auto vx-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <th className="text-left font-medium px-3 py-3">Application</th>
                  <th className="text-left font-medium px-3 py-3">Vulnerability</th>
                  <th className="text-left font-medium px-3 py-3">Status</th>
                  <th className="text-right font-medium px-3 py-3">Reach</th>
                  <th className="text-left font-medium px-3 py-3">By</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(a => {
                  const p = PROFILES.find(x => x.cve === a.cve);
                  const active = sel.id === a.id;
                  return (
                    <tr key={a.id} onClick={() => setSel(a)}
                      className={`vx-row border-b border-slate-800 last:border-0 cursor-pointer ${active ? "bg-slate-800" : ""}`}>
                      <td className="px-3 py-2.5">
                        <div className="text-slate-300 text-xs">{APPS.find(x => x.id === a.appId)?.name}</div>
                        <Mono className="text-xs text-slate-600">{a.appId}</Mono>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Mono className="text-xs text-slate-300">{a.cve}</Mono>
                          {p?.kev && <Chip tone="red">KEV</Chip>}
                        </div>
                        <Mono className="text-xs text-slate-600">{p?.pkg.split("/").pop()}@{p?.ver}</Mono>
                      </td>
                      <td className="px-3 py-2.5"><StatusChip s={a.status} /></td>
                      <td className="px-3 py-2.5 text-right">
                        <Mono className={`text-xs ${a.level >= 5 ? "text-rose-400" : a.level >= 3 ? "text-amber-400" : "text-slate-500"}`}>
                          {a.level}
                        </Mono>
                      </td>
                      <td className="px-3 py-2.5">
                        {a.mode === "auto" && <SourceTag det>auto</SourceTag>}
                        {a.mode === "approved" && <Chip tone="green"><Check size={10}/> human</Chip>}
                        {a.mode === "escalated" && <Chip tone="orange">queued</Chip>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* detail */}
        <div className="xl:col-span-2 space-y-4">
          <div className="vx-panel rounded-lg p-4">
            <Mono className="text-xs text-slate-500">{sel.id}</Mono>
            <h3 className="vx-display text-lg font-semibold text-slate-100 mt-1">{prof?.title}</h3>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Mono className="text-xs text-slate-400">{sel.cve}</Mono>
              {prof?.kev && <Chip tone="red">KEV</Chip>}
              <Chip tone="slate">EPSS {prof?.epss}</Chip>
              <Chip tone="slate">CVSS {prof?.cvss}</Chip>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Consuming app</span>
                <span className="text-slate-300 text-right">{app?.name}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Exposure</span>
                <span className="text-slate-300">{app?.exposure}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Scope / depth</span>
                <span className="text-slate-300">{sel.scope} · {sel.depth}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Introduced by</span>
                <Mono className="text-slate-400 text-right">{sel.parent}</Mono>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Fixed in</span>
                <Mono className="text-emerald-400">{prof?.fixed.join(", ")}</Mono>
              </div>
            </div>
          </div>

          <div className="vx-panel rounded-lg p-4">
            <Ladder level={sel.level} explain={explain} />
          </div>

          <div className="vx-panel rounded-lg p-4">
            <h4 className="vx-display text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Evidence chain</h4>
            <div className="space-y-2.5">
              <div>
                <SourceTag det>lockfile</SourceTag>
                <p className="text-xs text-slate-400 mt-1.5">
                  Resolved version <Mono className="text-slate-200">{prof?.ver}</Mono> present in{" "}
                  <Mono className="text-slate-200">{sel.scope}</Mono> scope.
                </p>
              </div>
              <div>
                <SourceTag det>artifact scan</SourceTag>
                <p className="text-xs text-slate-400 mt-1.5">
                  Symbol <Mono className="text-slate-200">{prof?.symbols[0]}</Mono>{" "}
                  {sel.level >= 2 ? "present in the packaged artifact." : "not found in the packaged artifact."}
                </p>
              </div>
              <div>
                <SourceTag det={false}>profile</SourceTag>
                <p className="text-xs text-slate-400 mt-1.5">
                  Entry points that reach it: {prof?.entries.map((e,i) => (
                    <span key={e}><Mono className="text-slate-200">{e}</Mono>{i < prof.entries.length-1 ? ", " : ""}</span>
                  ))}
                </p>
              </div>
              <div>
                <SourceTag det={false}>assessment</SourceTag>
                <p className="text-xs text-slate-400 mt-1.5">{sel.note}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-slate-600">confidence</span>
                  <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${sel.conf > 0.85 ? "bg-violet-400" : "bg-amber-500"}`}
                      style={{ width: `${sel.conf * 100}%` }} />
                  </div>
                  <Mono className="text-xs text-slate-400">{sel.conf.toFixed(2)}</Mono>
                </div>
              </div>
            </div>
            {sel.just && (
              <div className="mt-4 pt-3 border-t border-slate-800">
                <div className="text-xs text-slate-500 mb-1">OpenVEX justification</div>
                <Mono className="text-xs text-emerald-400">{sel.just}</Mono>
              </div>
            )}
            <Explain on={explain}>
              Every row is tagged by origin. Cyan claims came from a parser or an artifact inspection and are facts.
              Violet claims came from the model and carry a confidence. An auditor asking "how did this get closed"
              can see instantly how much of the answer rested on inference.
            </Explain>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── view: review queue ─────────────────────────────────────────────────── */

function Review({ explain }) {
  const queued = ASSESSMENTS.filter(a => a.mode === "escalated");
  const [decided, setDecided] = useState({});

  const reasons = {
    "A-4471": "KEV-listed and reachable at level 6. Policy routes all KEV escalations to a human regardless of confidence.",
    "A-4472": "Proposed 'affected' but could not demonstrate attacker-controlled input. Confidence below auto threshold.",
    "A-4473": "Attribution source is a stale lockfile with no build SBOM. Presence in the artifact is unverified.",
    "A-4474": "Level 3 — below the dismissal floor. Model proposed 'not_affected'; guardrail rejected the downgrade.",
    "A-4476": "Direct dependency, all preconditions met, WAR on Tomcat. High confidence but Tier 2 policy requires sign-off.",
    "A-4477": "KEV-listed, internet-facing HTTP/2 listener. Mandatory review.",
    "A-4482": "Cited evidence did not include a traced input source. Citation guardrail failed.",
    "A-4483": "Confidence 0.79, below the 0.85 auto threshold for internet-facing applications.",
  };

  return (
    <div>
      <SectionTitle sub={`${queued.length} assessments held for human decision — the model proposed, it did not commit`}>
        Review queue
      </SectionTitle>

      <Explain on={explain}>
        This queue is also your labeling pipeline. Every override an analyst makes here is a ground-truth
        label that flows into the eval dataset, so the golden set grows as a side effect of doing the job.
      </Explain>

      <div className="space-y-3">
        {queued.map(a => {
          const p = PROFILES.find(x => x.cve === a.cve);
          const app = APPS.find(x => x.id === a.appId);
          const d = decided[a.id];
          return (
            <div key={a.id} className={`vx-panel rounded-lg p-4 ${d ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <Mono className="text-xs text-slate-500">{a.id}</Mono>
                    <Mono className="text-xs text-slate-300">{a.cve}</Mono>
                    {p?.kev && <Chip tone="red">KEV</Chip>}
                    <StatusChip s={a.status} />
                    <Chip tone={app?.exposure === "internet-facing" ? "red" : "slate"}>{app?.exposure}</Chip>
                  </div>
                  <div className="text-sm text-slate-200">{app?.name}</div>
                  <Mono className="text-xs text-slate-600">{p?.pkg.split("/").pop()}@{p?.ver} · {a.depth}</Mono>

                  <div className="mt-3 flex items-start gap-2">
                    <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-200 leading-relaxed">{reasons[a.id]}</p>
                  </div>

                  <div className="mt-2.5 vx-panel-2 rounded p-2.5">
                    <SourceTag det={false}>model proposal</SourceTag>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{a.note}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {d ? (
                    <Chip tone={d === "approve" ? "green" : "orange"}>
                      {d === "approve" ? "approved" : "overridden"}
                    </Chip>
                  ) : (
                    <>
                      <button onClick={() => setDecided(s => ({ ...s, [a.id]: "approve" }))}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-emerald-900 text-emerald-200 border border-emerald-800 hover:bg-emerald-800">
                        <Check size={12} /> Approve
                      </button>
                      <button onClick={() => setDecided(s => ({ ...s, [a.id]: "override" }))}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-slate-700 text-slate-300 hover:bg-slate-800">
                        <X size={12} /> Override
                      </button>
                    </>
                  )}
                  <Mono className="text-xs text-slate-600 text-center">{a.conf.toFixed(2)}</Mono>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── view: VEX ledger ───────────────────────────────────────────────────── */

function Vex({ explain }) {
  const emitted = ASSESSMENTS.filter(a => a.status === "not_affected");
  const [open, setOpen] = useState(emitted[0]?.id);

  return (
    <div>
      <SectionTitle sub="Append-only. Statements are superseded, never edited.">
        VEX ledger
      </SectionTitle>

      <Explain on={explain}>
        This is why the same CVE is never triaged twice. Next week the vendor sends the same package report again,
        the ledger already holds a justified statement, and it replays for free unless the underlying evidence drifted.
      </Explain>

      <div className="space-y-2">
        {emitted.map(a => {
          const p = PROFILES.find(x => x.cve === a.cve);
          const app = APPS.find(x => x.id === a.appId);
          const isOpen = open === a.id;
          return (
            <div key={a.id} className="vx-panel rounded-lg overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : a.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800">
                <ChevronRight size={14} className={`text-slate-500 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                <Mono className="text-xs text-slate-300">{a.cve}</Mono>
                <span className="text-xs text-slate-400 truncate">{app?.name}</span>
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  <Chip tone="green">not affected</Chip>
                  <Mono className="text-xs text-slate-600 hidden sm:inline">{a.just}</Mono>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-slate-800 p-4 bg-slate-950">
                  <pre className="vx-mono text-xs text-slate-400 overflow-x-auto vx-scroll leading-relaxed">
{`{
  "@context": "https://openvex.dev/ns/v0.2.0",
  "@id": "https://bmo.example/vex/${a.id}",
  "author": "Vexillum (automated) — approved by analyst",
  "timestamp": "2026-08-27T14:22:08Z",
  "statements": [
    {
      "vulnerability": { "name": "${a.cve}" },
      "products": [
        { "@id": "${app?.id}", "identifiers": {
            "purl": "${p?.pkg}@${p?.ver}" } }
      ],
      "status": "not_affected",
      "justification": "${a.just}",
      "impact_statement": "${a.note}",
      "status_notes": "reachability_level=${a.level}; confidence=${a.conf}; mode=${a.mode}"
    }
  ]
}`}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── view: metrics ──────────────────────────────────────────────────────── */

function Metrics({ explain }) {
  const [tab, setTab] = useState("exec");

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <SectionTitle sub="Two audiences, two reports. Never the same slide.">Metrics</SectionTitle>
        <div className="flex rounded overflow-hidden border border-slate-700">
          {[["exec","Executive"],["internal","Internal"]].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 text-xs ${tab === k ? "bg-slate-100 text-slate-900 font-medium" : "text-slate-400 hover:bg-slate-800"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {tab === "exec" ? (
        <>
          <Explain on={explain}>
            No finding counts on this view, deliberately. Leadership does not want to know there are 11,000 findings.
            They want to know whether exposure is falling and whether the things attackers actually use are closed.
          </Explain>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {[
              { k:"Exposure trend", v:"−68%", d:"8 weeks", tone:"text-emerald-400" },
              { k:"KEV exposure closed", v:"92%", d:"9 of 112 remain open", tone:"text-emerald-400" },
              { k:"Tier 1 apps clear", v:"3 of 4", d:"Retail Payments API outstanding", tone:"text-amber-400" },
            ].map(c => (
              <div key={c.k} className="vx-panel rounded-lg p-4">
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">{c.k}</div>
                <div className={`vx-display text-3xl font-bold ${c.tone}`}>{c.v}</div>
                <div className="text-xs text-slate-500 mt-1">{c.d}</div>
              </div>
            ))}
          </div>
          <div className="vx-panel rounded-lg p-5">
            <h3 className="vx-display text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
              Open exposure over time
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="w" stroke="#475569" fontSize={11} />
                <YAxis stroke="#475569" fontSize={11} />
                <Tooltip contentStyle={{ background:"#0f1626", border:"1px solid #1e293b", borderRadius:6, fontSize:12 }} />
                <Line type="monotone" dataKey="exposure" stroke="#22d3ee" strokeWidth={2} dot={false} name="All open" />
                <Line type="monotone" dataKey="kev" stroke="#fb7185" strokeWidth={2} dot={false} name="KEV-listed" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { k:"Collapse ratio", v:"61:1", d:"3,847 tuples → 63 decisions" },
              { k:"Profile cache hit", v:"81%", d:"51 of 63 reused" },
              { k:"Auto-dispositioned", v:"93.8%", d:"237 escalated" },
              { k:"Analyst min / 100", v:"14", d:"was 340 at week 1" },
            ].map(c => (
              <div key={c.k} className="vx-panel rounded-lg p-4">
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">{c.k}</div>
                <div className="vx-display text-2xl font-bold text-slate-100">{c.v}</div>
                <div className="text-xs text-slate-500 mt-1">{c.d}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="vx-panel rounded-lg p-5">
              <h3 className="vx-display text-sm font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Profile cache hit rate
              </h3>
              <p className="text-xs text-slate-500 mb-4">The system gets cheaper every week it runs.</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={CACHE_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="w" stroke="#475569" fontSize={11} />
                  <YAxis stroke="#475569" fontSize={11} unit="%" />
                  <Tooltip contentStyle={{ background:"#0f1626", border:"1px solid #1e293b", borderRadius:6, fontSize:12 }} />
                  <Bar dataKey="hit" radius={[3,3,0,0]}>
                    {CACHE_TREND.map((e,i) => <Cell key={i} fill={i > 4 ? "#34d399" : "#22d3ee"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="vx-panel rounded-lg p-5">
              <h3 className="vx-display text-sm font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Agent accuracy vs golden set
              </h3>
              <p className="text-xs text-slate-500 mb-4">200 human-labeled findings, stratified by ecosystem and class.</p>
              <div className="space-y-4 pt-2">
                {[
                  { k:"Precision", v:0.91, note:"proposals that were correct" },
                  { k:"Recall", v:0.87, note:"true findings it caught" },
                  { k:"Justification accuracy", v:0.78, note:"right status AND right reason" },
                ].map(m => (
                  <div key={m.k}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-300">{m.k}</span>
                      <Mono className="text-slate-200">{m.v.toFixed(2)}</Mono>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${m.v > 0.85 ? "bg-violet-400" : "bg-amber-500"}`} style={{ width:`${m.v*100}%` }} />
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{m.note}</div>
                  </div>
                ))}
              </div>
              <Explain on={explain}>
                Justification accuracy is the one nobody tracks. Getting "not affected" right for the wrong
                reason is a latent failure — the status looks fine until an auditor reads the reasoning.
              </Explain>
            </div>
          </div>

          <div className="vx-panel rounded-lg p-5 mt-4">
            <h3 className="vx-display text-sm font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Vendor report quality
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              False-positive rate by vendor batch. This is a contract conversation, not a triage metric.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { k:"Not affected", v:"71%", tone:"text-amber-400" },
                { k:"Unattributable", v:"6%", tone:"text-rose-400" },
                { k:"Duplicate of prior week", v:"81%", tone:"text-slate-300" },
                { k:"Actionable", v:"23%", tone:"text-emerald-400" },
              ].map(c => (
                <div key={c.k} className="vx-panel-2 rounded p-3">
                  <div className={`vx-display text-xl font-bold ${c.tone}`}>{c.v}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{c.k}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── view: remediation ──────────────────────────────────────────────────── */

const KIND_META = {
  parent_bump: { label:"parent bump", tone:"green",  blurb:"Durable. Stays inside the maintainer's tested matrix." },
  direct_bump: { label:"direct bump", tone:"green",  blurb:"Simplest case. Declared dependency, straight upgrade." },
  override:    { label:"override",    tone:"orange", blurb:"Fast but untested. Needs a test gate and an expiry." },
  replace:     { label:"replace",     tone:"blue",   blurb:"Removes the pinned transitive entirely. Expensive." },
  no_fix:      { label:"no fix",      tone:"red",    blurb:"No upstream release. Fork, replace, or accept with an owner." },
};

function Remediation({ explain }) {
  const [sel, setSel] = useState(CAMPAIGNS[0]);
  const [sort, setSort] = useState("leverage");

  const ranked = useMemo(() => {
    const c = [...CAMPAIGNS];
    if (sort === "leverage") return c.sort((a, b) => b.closes - a.closes);
    if (sort === "kev") return c.sort((a, b) => b.kev - a.kev || b.closes - a.closes);
    const w = { low: 0, medium: 1, high: 2 };
    return c.sort((a, b) => w[a.effort] - w[b.effort] || b.closes - a.closes);
  }, [sort]);

  const total = CAMPAIGNS.reduce((s, c) => s + c.closes, 0);
  const top3 = [...CAMPAIGNS].sort((a, b) => b.closes - a.closes).slice(0, 3).reduce((s, c) => s + c.closes, 0);
  const max = Math.max(...CAMPAIGNS.map(c => c.closes));
  const meta = KIND_META[sel.kind];

  return (
    <div>
      <SectionTitle sub="Grouped by fix action, not by finding. The unit of work for a dev team is a bump, not a ticket.">
        Remediation
      </SectionTitle>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { k:"Open findings", v:total.toLocaleString(), d:"across 8 applications", tone:"text-slate-100" },
          { k:"Closed by top 3 actions", v:`${Math.round((top3/total)*100)}%`, d:`${top3.toLocaleString()} findings`, tone:"text-emerald-400" },
          { k:"Distinct actions", v:String(CAMPAIGNS.length), d:"not 2,284 tickets", tone:"text-amber-400" },
          { k:"Blocked, no upstream fix", v:"1", d:"needs a risk decision", tone:"text-rose-400" },
        ].map(c => (
          <div key={c.k} className="vx-panel rounded-lg p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">{c.k}</div>
            <div className={`vx-display text-2xl font-bold ${c.tone}`}>{c.v}</div>
            <div className="text-xs text-slate-500 mt-1">{c.d}</div>
          </div>
        ))}
      </div>

      <Explain on={explain}>
        This is the view that changes what you send the dev teams. Nobody can act on 2,284 findings. Three
        version bumps closing 80% of them is a sprint commitment somebody can actually say yes to.
      </Explain>

      {/* signature: leverage ranking */}
      <div className="vx-panel rounded-lg p-5 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
          <h3 className="vx-display text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Leverage per action
          </h3>
          <div className="flex rounded overflow-hidden border border-slate-700">
            {[["leverage","Most closed"],["kev","KEV first"],["effort","Easiest first"]].map(([k,l]) => (
              <button key={k} onClick={() => setSort(k)}
                className={`px-2.5 py-1 text-xs ${sort === k ? "bg-slate-100 text-slate-900 font-medium" : "text-slate-400 hover:bg-slate-800"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-5">Bar length = findings this one change closes.</p>

        <div className="space-y-2">
          {ranked.map(c => {
            const m = KIND_META[c.kind];
            const active = sel.id === c.id;
            return (
              <button key={c.id} onClick={() => setSel(c)}
                className={`w-full text-left group ${active ? "" : "opacity-80 hover:opacity-100"}`}>
                <div className="flex items-center gap-3">
                  <div className="w-44 shrink-0 text-right hidden sm:block">
                    <Mono className={`text-xs ${active ? "text-slate-100" : "text-slate-400"}`}>{c.action}</Mono>
                  </div>
                  <div className="flex-1 h-8 relative bg-slate-900 rounded-sm overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${
                      c.kind === "no_fix" ? "bg-rose-900"
                      : c.kind === "override" ? "bg-orange-900"
                      : c.kind === "replace" ? "bg-sky-900"
                      : "bg-emerald-900"
                    } ${active ? "" : "opacity-60"}`}
                      style={{ width:`${Math.max(6,(c.closes/max)*100)}%` }} />
                    <div className="absolute inset-0 flex items-center px-3 gap-2">
                      <Mono className="text-xs text-slate-100">{c.closes.toLocaleString()}</Mono>
                      <span className="text-xs text-slate-400 sm:hidden truncate">{c.action}</span>
                      {c.kev > 0 && <Chip tone="red">{c.kev} KEV</Chip>}
                    </div>
                  </div>
                  <div className="w-24 shrink-0 hidden md:block">
                    <Chip tone={m.tone}>{m.label}</Chip>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* campaign detail */}
        <div className="xl:col-span-3 space-y-4">
          <div className="vx-panel rounded-lg p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <Mono className="text-xs text-slate-500">{sel.id} · {sel.eco}</Mono>
                <h3 className="vx-display text-lg font-semibold text-slate-100 mt-1 flex items-center gap-2 flex-wrap">
                  <Mono>{sel.action}</Mono>
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <Mono className="text-sm text-rose-400">{sel.from}</Mono>
                  <ArrowRight size={14} className="text-slate-600" />
                  <Mono className="text-sm text-emerald-400">{sel.to}</Mono>
                </div>
              </div>
              <Chip tone={meta.tone}>{meta.label}</Chip>
            </div>

            <p className="text-xs text-slate-500 mt-2 italic">{meta.blurb}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800">
              {[
                { k:"Closes", v:sel.closes.toLocaleString(), i:TrendingDown },
                { k:"KEV closed", v:String(sel.kev), i:ShieldAlert },
                { k:"Effort", v:sel.effort, i:Wrench },
                { k:"ETA", v:sel.eta, i:Clock },
              ].map(x => {
                const I = x.i;
                return (
                  <div key={x.k} className="vx-panel-2 rounded p-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <I size={11} /> {x.k}
                    </div>
                    <div className="vx-display text-base font-semibold text-slate-100">{x.v}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4">
              <div className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Why this action</div>
              <p className="text-xs text-slate-400 leading-relaxed">{sel.why}</p>
            </div>

            {sel.caution && (
              <div className="mt-3 flex items-start gap-2 vx-panel-2 rounded p-3 border-amber-900">
                <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200 leading-relaxed">{sel.caution}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Resolves</div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {sel.cves.map(c => <Mono key={c} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">{c}</Mono>)}
              </div>
              <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Applications</div>
              <div className="flex flex-wrap gap-1.5">
                {sel.apps.map(id => {
                  const a = APPS.find(x => x.id === id);
                  return (
                    <span key={id} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {a?.name} <Mono className="text-slate-600">{a?.team}</Mono>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* what actually gets sent */}
          <div className="vx-panel rounded-lg p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="vx-display text-sm font-semibold text-slate-300 uppercase tracking-wider">
                Outbound ticket
              </h4>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-slate-700 text-slate-300 hover:bg-slate-800">
                <Send size={12} /> Send to {APPS.find(a => a.id === sel.apps[0])?.team}
              </button>
            </div>
            <div className="vx-panel-2 rounded p-3.5">
              <div className="flex items-center gap-2 mb-2.5">
                <GitPullRequest size={13} className="text-emerald-400" />
                <Mono className="text-xs text-slate-200">
                  Upgrade {sel.action} {sel.from} → {sel.to}
                </Mono>
              </div>
              <div className="text-xs text-slate-400 leading-relaxed space-y-2">
                <p>
                  Closes <span className="text-slate-200">{sel.closes.toLocaleString()}</span> open findings
                  {sel.kev > 0 && <> including <span className="text-rose-300">{sel.kev} on the CISA KEV catalog</span></>}
                  {" "}across {sel.apps.length} application{sel.apps.length > 1 ? "s" : ""}.
                </p>
                <p className="text-slate-500">
                  Each finding was individually assessed for reachability against this application before being
                  included. Findings judged not reachable are excluded and carry a VEX statement instead.
                </p>
                {sel.caution && <p className="text-amber-300">{sel.caution}</p>}
              </div>
            </div>
            <Explain on={explain}>
              The second paragraph is the credibility line. It tells the developer you did not just forward a
              scanner dump, and it is the reason they will open the next one you send.
            </Explain>
          </div>
        </div>

        {/* team rollup */}
        <div className="xl:col-span-2">
          <div className="vx-panel rounded-lg p-5">
            <h4 className="vx-display text-sm font-semibold text-slate-300 uppercase tracking-wider mb-1">
              By owning team
            </h4>
            <p className="text-xs text-slate-500 mb-4">What each team is actually being asked to do.</p>
            <div className="space-y-2.5">
              {TEAM_ROLLUP.map(t => (
                <div key={t.team} className="vx-panel-2 rounded p-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm text-slate-200">{t.team}</span>
                    <Mono className={`text-xs ${t.tier === 1 ? "text-rose-400" : "text-slate-500"}`}>T{t.tier}</Mono>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                    <span><Mono className="text-slate-300">{t.closes.toLocaleString()}</Mono> findings</span>
                    {t.kev > 0 && <Chip tone="red">{t.kev} KEV</Chip>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {t.campaigns.map(cid => {
                      const c = CAMPAIGNS.find(x => x.id === cid);
                      return (
                        <button key={cid} onClick={() => c && setSel(c)}
                          className={`text-xs px-1.5 py-0.5 rounded border ${
                            sel.id === cid ? "bg-slate-100 text-slate-900 border-slate-100"
                                           : "border-slate-700 text-slate-400 hover:bg-slate-800"}`}>
                          <Mono>{cid}</Mono>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <Explain on={explain}>
              Note that RC-01 appears for four different teams. One coordinated Spring Boot bump across the
              estate is a very different conversation than four teams independently discovering the same CVE.
            </Explain>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── shell ──────────────────────────────────────────────────────────────── */

const NAV = [
  { k:"pipeline",  label:"Pipeline",  icon:Activity },
  { k:"inventory", label:"Inventory", icon:Boxes },
  { k:"findings",  label:"Assessments", icon:ListFilter },
  { k:"review",    label:"Review",    icon:ClipboardCheck, badge:8 },
  { k:"remediate", label:"Remediation", icon:Wrench },
  { k:"vex",       label:"VEX ledger",icon:FileSignature },
  { k:"metrics",   label:"Metrics",   icon:BarChart3 },
];

export default function VexillumDashboard() {
  const [view, setView] = useState("pipeline");
  const [explain, setExplain] = useState(true);

  return (
    <div className="vx">
      <style>{CSS}</style>
      <div className="vx-root min-h-screen flex flex-col lg:flex-row">

        {/* rail */}
        <aside className="lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800 flex lg:flex-col">
          <div className="p-4 lg:border-b border-slate-800 flex items-center gap-2.5 shrink-0">
            <CircleDot size={18} className="vx-brass" />
            <div>
              <div className="vx-display text-base font-bold text-slate-100 leading-none">Vexillum</div>
              <div className="text-xs text-slate-600 mt-0.5 hidden lg:block">package triage console</div>
            </div>
          </div>
          <nav className="flex lg:flex-col overflow-x-auto vx-scroll lg:py-2 flex-1">
            {NAV.map(n => {
              const Icon = n.icon;
              const on = view === n.k;
              return (
                <button key={n.k} onClick={() => setView(n.k)}
                  className={`flex items-center gap-2.5 px-4 py-3 text-sm whitespace-nowrap transition-colors ${
                    on ? "vx-rail-active text-slate-100" : "text-slate-500 hover:text-slate-300"}`}>
                  <Icon size={15} />
                  <span>{n.label}</span>
                  {n.badge && (
                    <span className="ml-auto text-xs px-1.5 py-0.5 rounded bg-amber-900 text-amber-200">{n.badge}</span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="p-4 border-t border-slate-800 hidden lg:block">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={explain} onChange={e => setExplain(e.target.checked)}
                className="accent-amber-500" />
              <span className="text-xs text-slate-400">Explain mode</span>
            </label>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Annotates what each stage is doing and why.
            </p>
          </div>
        </aside>

        {/* main */}
        <main className="flex-1 min-w-0">
          <header className="border-b border-slate-800 px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-500">Batch</span>
              <Mono className="text-slate-300">VNDR-2026-W35</Mono>
              <span className="text-slate-700">·</span>
              <span className="text-slate-500">3,600 packages · 8 applications</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-slate-500">deterministic</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-violet-400" />
                <span className="text-slate-500">model</span>
              </div>
              <label className="flex lg:hidden items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={explain} onChange={e => setExplain(e.target.checked)} className="accent-amber-500" />
                <span className="text-xs text-slate-400">Explain</span>
              </label>
            </div>
          </header>

          <div className="p-5 max-w-7xl">
            {view === "pipeline"  && <Pipeline explain={explain} />}
            {view === "inventory" && <Inventory explain={explain} />}
            {view === "findings"  && <Findings explain={explain} />}
            {view === "review"    && <Review explain={explain} />}
            {view === "remediate" && <Remediation explain={explain} />}
            {view === "vex"       && <Vex explain={explain} />}
            {view === "metrics"   && <Metrics explain={explain} />}
          </div>
        </main>
      </div>
    </div>
  );
}
