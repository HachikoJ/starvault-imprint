const NX_PLAN_TERMS = ["UGNX", "Siemens NX", "NXOpen", "NX Open", "UGOpen", "Unigraphics", "UG NX"];

function normalizeDomainText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[_./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactDomainText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function repositoryDomainText(repo = {}) {
  return [
    repo.fullName,
    repo.name,
    repo.owner,
    repo.description,
    repo.homepage,
    repo.language,
    ...(Array.isArray(repo.topics) ? repo.topics : []),
    repo.category?.key,
    repo.category?.label,
    repo.useCase?.key,
    repo.useCase?.label,
    repo.useCase?.labelZh,
    repo.useCase?.summaryZh
  ]
    .filter(Boolean)
    .join(" ");
}

function isNxObservationNeed(text = "") {
  const normalized = normalizeDomainText(text);
  const compact = compactDomainText(text);
  return (
    /\bug\s*nx\b/.test(normalized) ||
    /\bsiemens\s+nx\b/.test(normalized) ||
    /\bnx\s*open\b/.test(normalized) ||
    /\bunigraphics\b/.test(normalized) ||
    compact.includes("ugnx") ||
    /nxopen(?!api|gl)/.test(compact)
  );
}

function nxPlanTermsForText(text = "") {
  return isNxObservationNeed(text) ? NX_PLAN_TERMS.slice() : [];
}

function nxDirectSignals(text = "") {
  const normalized = normalizeDomainText(text);
  const compact = compactDomainText(text);
  const signals = [];
  if (compact.includes("ugnx") || /\bug\s+nx\b/.test(normalized)) signals.push("UGNX");
  if (/\bsiemens\s+nx\b/.test(normalized)) signals.push("Siemens NX");
  if (/\bnxopen(?!api|gl)/.test(normalized)) signals.push("NXOpen");
  if (/\bnx\s+open\b/.test(normalized) && unigraphicsContextSignals(text).some((signal) => signal !== "NX")) signals.push("NXOpen");
  if (/\bugopen\b/.test(normalized) || compact.includes("ugopen")) signals.push("UGOpen");
  if (/\bugs\s+nx\b/.test(normalized)) signals.push("UGS NX");
  if (/\bnx\s+(?:cad|cam|cae|journal|plugin|extension|addon|workbench|postprocessor|post\s+processor)\b/.test(normalized)) signals.push("NX workflow");
  if (/\b(?:cad|cam|cae)\s+(?:for|in|with)\s+nx\b/.test(normalized)) signals.push("NX CAD/CAM");
  if (/\bunigraphics\s+nx\b|\bnx\s+unigraphics\b/.test(normalized)) signals.push("Unigraphics NX");
  return Array.from(new Set(signals));
}

function unigraphicsContextSignals(text = "") {
  const normalized = normalizeDomainText(text);
  const signals = [];
  const checks = [
    ["NX", /\bnx\b/],
    ["CAD", /\bcad\b|computer aided design|computer aided drafting|computer aided manufacturing/],
    ["CAM", /\bcam\b|\bcnc\b|post\s*processor|postbuilder|post\s*configurator|\bmom\b|\btcl\b/],
    ["CAE", /\bcae\b|simulation|finite element|fea\b/],
    ["UG/Open", /\bugopen\b|ug\s*open|\bugs\b|\bgrip\b/],
    ["Siemens", /\bsiemens\b|\bteamcenter\b/],
    ["CAD format", /\bprt\b|parasolid|\bjt\b|iges|\bstep\b|stl\b/],
    ["NX automation", /journal|plugin|extension|addon|workbench|automation|batch|parametric/]
  ];
  for (const [label, pattern] of checks) {
    if (pattern.test(normalized)) signals.push(label);
  }
  return signals;
}

function isGenericUnigraphicsCollision(text = "") {
  const normalized = normalizeDomainText(text);
  return /\bunigraphics\b|\bunigrapic\b/.test(normalized) && (
    /computer graphics sphere|graphics librar|opengl|raylib|raylib cpp|sdl2|sfml|sokol|video player|videoplayer|mbed os|nucleo/.test(normalized) ||
    /\bfirst repository\b|ukrainian schools|training institute|software training|graphic designing/.test(normalized)
  );
}

function isLowValueNxContainer(text = "") {
  const normalized = normalizeDomainText(text);
  return /virtual museum|training institute|software training|github profile|awesome mechanical engineering resources/.test(normalized);
}

function nxCadMatchedTerms(value = "") {
  const text = typeof value === "string" ? value : repositoryDomainText(value);
  const direct = nxDirectSignals(text);
  const normalized = normalizeDomainText(text);
  const context = /\bunigraphics\b|\bunigrapic\b/.test(normalized) ? unigraphicsContextSignals(text) : [];
  return Array.from(new Set([...direct, ...context]));
}

function isNxCadText(value = "") {
  const direct = nxDirectSignals(value);
  if (direct.length) return true;

  const normalized = normalizeDomainText(value);
  if (!/\bunigraphics\b|\bunigrapic\b/.test(normalized)) return false;
  if (isGenericUnigraphicsCollision(value) || isLowValueNxContainer(value)) return false;
  return unigraphicsContextSignals(value).length > 0;
}

function isNxCadRepository(repo = {}) {
  return isNxCadText(repositoryDomainText(repo));
}

function focusedSpecificPlanKeywords(text = "", fallbackTerms = []) {
  if (!isNxObservationNeed(text)) return [];
  const fallback = (Array.isArray(fallbackTerms) ? fallbackTerms : [])
    .map((term) => String(term || "").trim())
    .filter((term) => term && /^(ugnx|ug\s*nx|siemens\s+nx|nx\s*open|nxopen|ugopen|unigraphics)$/i.test(term));
  return Array.from(new Set([...fallback, ...NX_PLAN_TERMS]));
}

module.exports = {
  focusedSpecificPlanKeywords,
  isNxCadRepository,
  isNxCadText,
  isNxObservationNeed,
  nxCadMatchedTerms,
  nxPlanTermsForText,
  repositoryDomainText
};
