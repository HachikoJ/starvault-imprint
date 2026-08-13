(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StarVaultDomainCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const LICENSE_GROUPS = {
    permissive: new Set(["mit", "apache-2.0", "bsd-2-clause", "bsd-3-clause", "isc", "unlicense", "0bsd", "zlib"]),
    conditional: new Set([
      "mpl-2.0",
      "lgpl-2.1",
      "lgpl-2.1-only",
      "lgpl-2.1-or-later",
      "lgpl-3.0",
      "lgpl-3.0-only",
      "lgpl-3.0-or-later",
      "epl-2.0",
      "eupl-1.2",
      "cc-by-4.0"
    ]),
    distributionCopyleft: new Set([
      "gpl-2.0",
      "gpl-2.0-only",
      "gpl-2.0-or-later",
      "gpl-3.0",
      "gpl-3.0-only",
      "gpl-3.0-or-later"
    ]),
    networkCopyleft: new Set(["agpl-3.0", "agpl-3.0-only", "agpl-3.0-or-later", "sspl-1.0", "osl-3.0"]),
    restricted: new Set(["cc-by-nc-4.0"])
  };

  function stableHash(value = "") {
    let hash = 2166136261;
    for (const character of String(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function normalizedId(value = "") {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72);
  }

  function normalizedQuery(value = "") {
    return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function legacyProfileKey(planId, index, query) {
    const keyBase = `${planId}-${index}-${String(query || "").replace(/\s+/g, " ").trim()}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64);
    return `plan-${keyBase || index}`;
  }

  function explicitProfileId(item = {}) {
    return normalizedId(item.profileId || item.profileKey || item.id || item.key || "");
  }

  function assignProfileIds(planId = "default", queries = [], previousQueries = []) {
    const prior = (Array.isArray(previousQueries) ? previousQueries : []).map((item, index) => ({
      ...item,
      profileId: explicitProfileId(item) || legacyProfileKey(planId, index, item?.query || item?.q || "")
    }));
    const priorByQuery = new Map(prior.map((item) => [normalizedQuery(item.query || item.q), item]).filter(([key]) => key));
    const priorByLabel = new Map(
      prior
        .map((item) => [normalizedQuery(item.labelZh || item.label || item.labelEn || item.name), item])
        .filter(([key]) => key)
    );
    const used = new Set();

    return (Array.isArray(queries) ? queries : []).map((source, index) => {
      const item = typeof source === "string" ? { label: source, query: source } : { ...(source || {}) };
      const query = String(item.query || item.q || "").replace(/\s+/g, " ").trim();
      const label = String(item.labelZh || item.label || item.labelEn || item.name || query).trim();
      const matched = priorByQuery.get(normalizedQuery(query)) || priorByLabel.get(normalizedQuery(label)) || prior[index];
      const generated = `profile-${normalizedId(planId) || "default"}-${stableHash(`${label}|${query}`)}`;
      let profileId = explicitProfileId(item) || explicitProfileId(matched) || generated;
      if (used.has(profileId)) profileId = `${profileId.slice(0, 60)}-${stableHash(`${query}|${index}`)}`;
      used.add(profileId);
      return { ...item, profileId };
    });
  }

  function profileEvidence(profile = {}) {
    const key = normalizedId(profile.profileId || profile.profileKey || profile.key || profile.id || "");
    if (!key) return null;
    return {
      key,
      label: String(profile.labelZh || profile.label || profile.labelEn || "").slice(0, 120),
      query: String(profile.query || profile.q || "").slice(0, 720)
    };
  }

  function mergeProfileMatches(...groups) {
    const matches = new Map();
    for (const group of groups) {
      const entries = Array.isArray(group) ? group : group ? [group] : [];
      for (const entry of entries) {
        const normalized = profileEvidence(entry);
        if (!normalized) continue;
        matches.set(normalized.key, { ...(matches.get(normalized.key) || {}), ...normalized });
      }
    }
    return Array.from(matches.values());
  }

  function projectProfileMatches(project = {}, planId = "") {
    const planMatch = planId ? project.observationPlanMatches?.[planId] || project.observationMatches?.[planId] : null;
    if (planMatch) {
      return mergeProfileMatches(
        planMatch.profileMatches,
        planMatch.profileKey ? { key: planMatch.profileKey, label: planMatch.profileLabel || "" } : null
      );
    }
    return mergeProfileMatches(
      project.profileMatches,
      project.profileKey ? { key: project.profileKey, label: project.profileLabel || "" } : null
    );
  }

  function classifyLicensePolicy(license) {
    const rawKey = license?.spdxId || license?.spdx_id || license?.key || "NOASSERTION";
    const key = String(rawKey || "NOASSERTION").toLowerCase();
    const name = license?.name || rawKey || "No license detected";
    const result = (bucket, label, labelZh, risk, practiceBoundary, practiceBoundaryZh, note) => ({
      key,
      name,
      bucket,
      label,
      labelZh,
      labelEn: label,
      risk,
      practiceBoundary,
      practiceBoundaryZh,
      note
    });

    if (!license || key === "noassertion" || key === "other") {
      return result(
        "unknown-no-license",
        "No license: monitor only",
        "无许可：仅监控",
        82,
        "Monitor and study direction only. Do not copy, modify, or redistribute code before legal review.",
        "只能监控和研究方向。未经人工确认前不要复制、修改或分发代码。",
        "No recognized SPDX license was detected. GitHub public visibility does not grant reuse rights."
      );
    }
    if (LICENSE_GROUPS.permissive.has(key)) {
      return result(
        "permissive-commercial",
        "Low-friction license",
        "低摩擦许可",
        14,
        "Deeper adoption is usually practical with notice preservation.",
        "通常便于深入采用或集成，但要保留版权声明和许可文本。",
        "Keep copyright notices and license text."
      );
    }
    if (LICENSE_GROUPS.conditional.has(key)) {
      return result(
        "conditional-commercial",
        "License with obligations",
        "需履约许可",
        46,
        "Use with architectural separation and license-specific obligations.",
        "可以考虑深入采用，但要按许可证履约，尤其注意文件级开源、链接、署名或再分发义务。",
        "Use may be possible, but redistribution obligations need review."
      );
    }
    if (LICENSE_GROUPS.distributionCopyleft.has(key)) {
      return result(
        "distribution-copyleft",
        "Distribution may require source release",
        "分发需开源",
        70,
        "Distribution may require source release; review obligations before deeper adoption.",
        "如果分发衍生软件，通常要承担同许可证开源义务；深入采用前需复核边界。",
        "Treat as high-friction for closed-source distribution."
      );
    }
    if (LICENSE_GROUPS.networkCopyleft.has(key)) {
      return result(
        "network-copyleft",
        "SaaS source-release risk",
        "SaaS 高风险",
        88,
        "Monitor and study behavior first. Avoid service wrapping without legal review.",
        "网络服务也可能触发源码开放义务。适合先监控和研究，不宜未经复核直接封装服务。",
        "Network copyleft is high-friction for hosted services."
      );
    }
    if (LICENSE_GROUPS.restricted.has(key)) {
      return result(
        "restricted-noncommercial",
        "Restricted use",
        "受限用途",
        90,
        "Monitor only unless the exact license grants your intended use.",
        "默认仅监控。除非人工确认许可允许你的用途，否则不要深入采用。",
        "Some intended uses may be prohibited or restricted."
      );
    }
    return result(
      "manual-review",
      "Manual review first",
      "先人工复核",
      58,
      "Monitor and review exact license text before copying or redistributing.",
      "可以监控，但复制、修改或分发前必须人工阅读完整许可文本。",
      "Recognized as a license, but not in the low-risk allowlist."
    );
  }

  function riskLevel(project = {}) {
    const risk = Number(project.scores?.risk ?? project.scores?.overallRisk ?? project.licensePolicy?.risk ?? 0);
    if (risk >= 60) return "critical";
    if (risk >= 35) return "high";
    if (risk >= 15) return "medium";
    return "low";
  }

  function memoryScore(project = {}, memory = {}) {
    const category = project.category?.key || "other";
    const useCase = project.useCase?.key || "other";
    const language = project.language || "unknown";
    const license = project.licensePolicy?.bucket || "unknown-no-license";
    const risk = riskLevel(project);
    const preferences = memory.preferences || {};
    const negative = memory.negativePreferences || {};
    const positive =
      Number(preferences.categories?.[category] || 0) * 2 +
      Number(preferences.useCases?.[useCase] || 0) * 2.6 +
      Number(preferences.languages?.[language] || 0) * 0.95 +
      Number(preferences.licenses?.[license] || 0) * 0.75 +
      Number(preferences.riskLevels?.[risk] || 0) * 0.55;
    const repositoryPenalty = Number(
      negative.repositories?.[project.fullName] || negative.repositories?.[String(project.fullName || "").toLowerCase()] || 0
    );
    const penalty =
      Number(negative.categories?.[category] || 0) * 2.25 +
      Number(negative.useCases?.[useCase] || 0) * 2.9 +
      Number(negative.languages?.[language] || 0) * 0.8 +
      Number(negative.licenses?.[license] || 0) * 0.65 +
      Number(negative.riskLevels?.[risk] || 0) * 0.55 +
      repositoryPenalty * 3.2;
    const ratio = Number(memory.antiBubble?.explorationRatio ?? 0.25);
    const personalWeight = Math.max(0.55, Math.min(0.95, 1 - ratio * 0.35));
    return Math.max(-28, Math.min(36, (positive - penalty) * personalWeight));
  }

  return {
    assignProfileIds,
    classifyLicensePolicy,
    legacyProfileKey,
    memoryScore,
    mergeProfileMatches,
    normalizedId,
    profileEvidence,
    projectProfileMatches,
    riskLevel,
    stableHash
  };
});
