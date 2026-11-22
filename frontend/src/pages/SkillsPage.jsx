import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ErrorNotice } from "../components/ErrorNotice";
import { InlineLoading, Loading } from "../components/Loading";
import { OpportunityCard } from "../components/OpportunityCard";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const MAX_SKILLS = 5;

function groupByCategory(skills) {
  const groups = new Map();
  (skills || []).forEach((skill) => {
    const key = skill.category || "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(skill);
  });
  return Array.from(groups.entries())
    .map(([name, items]) => ({ name, skills: items }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default function SkillsPage() {
  const { user, isTalent } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [catalogue, setCatalogue] = useState([]);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState(null);
  const [search, setSearch] = useState(searchParams.get("q") || "");

  const [sdgs, setSdgs] = useState([]);
  const [profileSkills, setProfileSkills] = useState([]);

  const [selectedIds, setSelectedIds] = useState(() => {
    const raw = searchParams.get("skills") || "";
    return raw
      .split(",")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
      .slice(0, MAX_SKILLS);
  });
  const [recommendation, setRecommendation] = useState(null);
  const [matches, setMatches] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);

  const activeQuery = searchParams.get("q") || "";

  useEffect(() => {
    let active = true;
    setCatalogueLoading(true);
    setCatalogueError(null);
    api
      .get("/api/catalog/skills/", activeQuery ? { q: activeQuery } : {})
      .then((skills) => {
        if (active) setCatalogue(Array.isArray(skills) ? skills : []);
      })
      .catch((err) => {
        if (active) setCatalogueError(err);
      })
      .finally(() => {
        if (active) setCatalogueLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeQuery]);

  useEffect(() => {
    let active = true;
    api
      .get("/api/catalog/sdgs/")
      .then((data) => {
        if (active) setSdgs(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isTalent) return undefined;
    let active = true;
    api
      .get("/api/auth/profile/")
      .then((profile) => {
        if (active) setProfileSkills((profile?.skills || []).slice(0, MAX_SKILLS));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isTalent, user?.id]);

  const grouped = useMemo(() => groupByCategory(catalogue), [catalogue]);
  const selectedSkills = useMemo(() => {
    const byId = new Map(catalogue.map((s) => [s.id, s]));
    return selectedIds.map((id) => byId.get(id)).filter(Boolean);
  }, [catalogue, selectedIds]);
  const totalSkills = catalogue.length;

  function toggleSkill(id) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= MAX_SKILLS) return current;
      return [...current, id];
    });
  }

  function clearSelection() {
    setSelectedIds([]);
    setRecommendation(null);
    setMatches([]);
    setRecError(null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("skills");
        return next;
      },
      { replace: true }
    );
  }

  async function runRecommender(ids = selectedIds) {
    const clean = (ids || [])
      .filter((id) => Number.isInteger(id))
      .slice(0, MAX_SKILLS);
    if (clean.length === 0) {
      setRecommendation(null);
      setMatches([]);
      return;
    }
    setRecLoading(true);
    setRecError(null);
    setMatchLoading(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("skills", clean.join(","));
        return next;
      },
      { replace: true }
    );
    try {
      const rec = await api.get("/api/catalog/recommendations/", {
        skills: clean.join(","),
      });
      setRecommendation(rec);
      const responses = await Promise.all(
        clean.map((skillId) =>
          api
            .get("/api/opportunities/", { skill: skillId, per_page: 50 })
            .catch(() => ({ results: [] }))
        )
      );
      const merged = new Map();
      responses.forEach((resp) => {
        (resp?.results || []).forEach((item) => {
          if (!merged.has(item.id)) merged.set(item.id, item);
        });
      });
      setMatches(Array.from(merged.values()).slice(0, 12));
    } catch (err) {
      setRecError(err);
    } finally {
      setRecLoading(false);
      setMatchLoading(false);
    }
  }

  function applyProfileSkills() {
    const ids = profileSkills.map((s) => s.id).filter(Boolean).slice(0, MAX_SKILLS);
    setSelectedIds(ids);
    runRecommender(ids);
  }

  function onSearchSubmit(event) {
    event.preventDefault();
    const next = {};
    if (search.trim()) next.q = search.trim();
    if (selectedIds.length) next.skills = selectedIds.join(",");
    setSearchParams(next);
  }

  useEffect(() => {
    if (selectedIds.length > 0) {
      runRecommender(selectedIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Skill catalogue"
        title="Find the skills that move work forward"
        lead="Browse the skills used across opportunities and talent profiles, pick up to five you have, and get transparent, rule-based suggestions for what to learn next and which roles to explore."
        actions={
          <Link className="btn btn--primary" to="/opportunities">
            Browse opportunities
          </Link>
        }
      />

      <section className="section section--tight">
        <div className="container">
          <div className="notice notice--info" style={{ marginBottom: "1.5rem" }}>
            <p>
              <strong>Rule-based suggestions.</strong> The suggestion tool below is
              transparent and rule-based — never AI or machine learning. It looks at
              skills that commonly appear alongside the ones you select in published
              opportunities.
            </p>
          </div>

          <div className="recommender-layout">
            <aside className="filter-panel" aria-labelledby="picker-heading">
              <div className="filter-panel__head">
                <h2 id="picker-heading">Choose your skills</h2>
                {selectedIds.length > 0 ? (
                  <button className="filter-clear" type="button" onClick={clearSelection}>
                    Clear
                  </button>
                ) : null}
              </div>

              <form className="filter-form" onSubmit={onSearchSubmit}>
                <div className="form-field">
                  <label className="form-label" htmlFor="skill-search">
                    Search the catalogue
                  </label>
                  <input
                    id="skill-search"
                    className="input"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name or category"
                  />
                </div>
                <button className="btn btn--outline btn--block" type="submit">
                  Search
                </button>
              </form>

              {isTalent && profileSkills.length > 0 ? (
                <button
                  className="btn btn--ghost btn--block"
                  type="button"
                  onClick={applyProfileSkills}
                  style={{ marginTop: "1rem" }}
                >
                  Use skills from my profile
                </button>
              ) : null}

              <div style={{ marginTop: "1rem" }}>
                <p className="small text-muted">
                  Selected: <strong>{selectedIds.length}</strong> / {MAX_SKILLS}
                </p>
                {selectedSkills.length > 0 ? (
                  <div className="tag-list" style={{ marginTop: "0.5rem" }}>
                    {selectedSkills.map((skill) => (
                      <button
                        type="button"
                        key={skill.id}
                        className="tag tag--selected"
                        onClick={() => toggleSkill(skill.id)}
                      >
                        {skill.name} ×
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="small text-muted" style={{ marginTop: "0.5rem" }}>
                    Pick skills from the catalogue to get suggestions.
                  </p>
                )}
                <button
                  className="btn btn--primary btn--block"
                  type="button"
                  onClick={() => runRecommender()}
                  disabled={selectedIds.length === 0 || recLoading}
                  style={{ marginTop: "1rem" }}
                >
                  {recLoading ? "Finding suggestions…" : "Get suggestions"}
                </button>
                {selectedIds.length >= MAX_SKILLS ? (
                  <p className="help-text" style={{ marginTop: "0.5rem" }}>
                    Maximum {MAX_SKILLS} skills. Remove one to add another.
                  </p>
                ) : null}
              </div>
            </aside>

            <div className="results-panel">
              {recError ? (
                <ErrorNotice message={recError.message} onRetry={() => runRecommender()} />
              ) : null}

              {recommendation ? (
                <section className="recommender-results" aria-live="polite">
                  <div className="section-head">
                    <div className="section-head__text">
                      <span className="eyebrow">
                        {recommendation.label || "Rule-based suggestions"}
                      </span>
                      <h2>Skills often needed alongside yours</h2>
                      <p className="small text-muted">{recommendation.disclaimer}</p>
                    </div>
                  </div>

                  {(recommendation.results || []).length === 0 ? (
                    <EmptyState
                      icon="?"
                      title="No related skills found yet"
                      text="Try selecting different skills. Suggestions improve as more opportunities are published."
                    />
                  ) : (
                    <div className="card-grid">
                      {(recommendation.results || []).map((skill) => (
                        <article className="card" key={skill.id}>
                          <div className="card-body">
                            <div className="dashboard-card-head">
                              <h3 className="card-title">{skill.name}</h3>
                              {skill.category ? (
                                <span className="badge badge--slate">{skill.category}</span>
                              ) : null}
                            </div>
                            {skill.description ? (
                              <p className="small text-muted">{skill.description}</p>
                            ) : null}
                            {skill.reason ? (
                              <p className="small" style={{ marginTop: "0.5rem" }}>
                                <strong>Why:</strong> {skill.reason}
                              </p>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: "2rem" }}>
                    <div className="section-head">
                      <div className="section-head__text">
                        <h2>Matched opportunities</h2>
                        <p className="small text-muted">
                          Open opportunities that ask for at least one of the skills you
                          selected.
                        </p>
                      </div>
                    </div>
                    {matchLoading ? (
                      <InlineLoading label="Finding matching opportunities…" />
                    ) : matches.length === 0 ? (
                      <EmptyState
                        icon="?"
                        title="No open matches right now"
                        text="Try different skills or browse all opportunities."
                        action={
                          <Link className="btn btn--outline" to="/opportunities">
                            Browse opportunities
                          </Link>
                        }
                      />
                    ) : (
                      <div className="opportunity-grid opportunity-grid--two">
                        {matches.map((item) => (
                          <OpportunityCard key={item.id} opportunity={item} />
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              ) : (
                <div className="empty-state">
                  <h3>Pick skills to see suggestions</h3>
                  <p>
                    Select up to {MAX_SKILLS} skills from the catalogue, then run the
                    rule-based recommender to see related skills and matching
                    opportunities.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section section--muted">
        <div className="container">
          <div className="section-head">
            <div className="section-head__text">
              <span className="eyebrow">Catalogue</span>
              <h2>Browse all skills</h2>
              <p>
                {totalSkills} skills across {grouped.length} categories.
              </p>
            </div>
          </div>

          {catalogueError ? (
            <ErrorNotice message={catalogueError.message} />
          ) : catalogueLoading ? (
            <Loading label="Loading skills…" />
          ) : grouped.length === 0 ? (
            <EmptyState
              icon="?"
              title="No skills found"
              text="Try a different search term."
            />
          ) : (
            <div className="dashboard-stack">
              {grouped.map((group) => (
                <div className="card" key={group.name}>
                  <div className="card-body">
                    <div className="dashboard-card-head">
                      <h3 className="dashboard-card-title">{group.name}</h3>
                      <span className="badge badge--slate">{group.skills.length}</span>
                    </div>
                    <div className="tag-list" style={{ marginTop: "0.75rem" }}>
                      {group.skills.map((skill) => {
                        const selected = selectedIds.includes(skill.id);
                        const disabled = !selected && selectedIds.length >= MAX_SKILLS;
                        return (
                          <button
                            type="button"
                            key={skill.id}
                            className={`tag ${selected ? "tag--selected" : ""}`}
                            onClick={() => toggleSkill(skill.id)}
                            disabled={disabled}
                            title={skill.description || skill.name}
                          >
                            {skill.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {sdgs.length > 0 ? (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div className="section-head__text">
                <span className="eyebrow">Sustainable Development Goals</span>
                <h2>Explore work by SDG</h2>
              </div>
            </div>
            <div className="sdg-grid">
              {sdgs.map((sdg) => (
                <Link
                  className="sdg-card"
                  to={`/opportunities?sdg=${sdg.id}`}
                  style={{ "--sdg-color": sdg.color_hex }}
                  key={sdg.id}
                >
                  <span className="sdg-card__number">
                    {Number(String(sdg.code).replace(/\D/g, "")) || sdg.id}
                  </span>
                  <span className="sdg-card__body">
                    <span className="sdg-card__name">{sdg.name}</span>
                    <span className="sdg-card__count">
                      {sdg.open_count || 0} open{" "}
                      {(sdg.open_count || 0) === 1 ? "opportunity" : "opportunities"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
