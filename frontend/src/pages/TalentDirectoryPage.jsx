import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ErrorNotice } from "../components/ErrorNotice";
import { Loading } from "../components/Loading";
import { PageHeader } from "../components/PageHeader";
import { Pagination } from "../components/Pagination";
import { TalentCard } from "../components/TalentCard";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { AVAILABILITY_OPTIONS } from "../lib/format";

const PER_PAGE = 9;
const EMPTY_FILTERS = { q: "", skill: "", sdg: "", availability: "", location: "" };

export default function TalentDirectoryPage() {
  const { user, isTalent } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [options, setOptions] = useState({ locations: [] });
  const [skills, setSkills] = useState([]);
  const [sdgs, setSdgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const queryKey = searchParams.toString();

  const activeFilters = useMemo(() => {
    const filters = {};
    Object.keys(EMPTY_FILTERS).forEach((key) => {
      const value = searchParams.get(key);
      if (value !== null && value !== "") filters[key] = value;
    });
    return filters;
  }, [queryKey]);

  useEffect(() => {
    setForm({ ...EMPTY_FILTERS, ...activeFilters });
  }, [queryKey]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/api/auth/talent/options/"),
      api.get("/api/catalog/skills/"),
      api.get("/api/catalog/sdgs/"),
    ])
      .then(([optionData, skillData, sdgData]) => {
        if (!active) return;
        setOptions(optionData);
        setSkills(Array.isArray(skillData) ? skillData : []);
        setSdgs(Array.isArray(sdgData) ? sdgData : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get("/api/auth/talent/", { ...activeFilters, page, per_page: PER_PAGE })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [queryKey]);

  function update(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    const next = {};
    Object.entries(form).forEach(([key, value]) => {
      if (value) next[key] = value;
    });
    setSearchParams(next);
  }

  function resetFilters() {
    setForm(EMPTY_FILTERS);
    setSearchParams({});
  }

  function goToPage(nextPage) {
    const next = { ...activeFilters };
    if (nextPage > 1) next.page = String(nextPage);
    setSearchParams(next);
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const results = data?.results || [];
  const count = data?.count || 0;
  const hasFilters = Object.keys(activeFilters).length > 0;
  const selectedSdg = sdgs.find((sdg) => String(sdg.id) === String(activeFilters.sdg));

  return (
    <>
      <PageHeader
        eyebrow="Talent directory"
        listing
        title="People building a more sustainable future"
        lead="Students, graduates, freelancers, volunteers, and researchers who want to work on the Sustainable Development Goals. Every profile here is public, and private contact details stay private."
        actions={
          isTalent ? (
            <Link className="btn btn--primary" to="/dashboard/profile">
              Edit your profile
            </Link>
          ) : !user ? (
            <Link className="btn btn--primary" to="/register">
              Join the talent pool
            </Link>
          ) : null
        }
      />

      <section className="section section--tight">
        <div className="container listing-layout">
          <aside className="filter-panel" aria-labelledby="filter-heading">
            <div className="filter-panel__head">
              <h2 id="filter-heading">Filter talent</h2>
              {hasFilters ? (
                <button className="filter-clear" type="button" onClick={resetFilters}>
                  Clear all
                </button>
              ) : null}
            </div>

            <form className="filter-form" onSubmit={applyFilters}>
              <div className="form-field">
                <label className="form-label" htmlFor="q">
                  Keyword
                </label>
                <input
                  className="input"
                  type="search"
                  id="q"
                  value={form.q}
                  onChange={update("q")}
                  placeholder="For example, data analyst"
                  maxLength={100}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="skill">
                  Skill
                </label>
                <select className="select" id="skill" value={form.skill} onChange={update("skill")}>
                  <option value="">Any skill</option>
                  {skills.map((skill) => (
                    <option value={skill.id} key={skill.id}>
                      {skill.name}
                      {skill.talent_count ? ` (${skill.talent_count})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="sdg">
                  SDG priority
                </label>
                <select className="select" id="sdg" value={form.sdg} onChange={update("sdg")}>
                  <option value="">Any SDG</option>
                  {sdgs.map((sdg) => (
                    <option value={sdg.id} key={sdg.id}>
                      {sdg.code}: {sdg.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="availability">
                  Availability
                </label>
                <select className="select" id="availability" value={form.availability} onChange={update("availability")}>
                  <option value="">Any availability</option>
                  {AVAILABILITY_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="location">
                  Location
                </label>
                <select className="select" id="location" value={form.location} onChange={update("location")}>
                  <option value="">Any location</option>
                  {(options.locations || []).map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.value} ({option.count})
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-form__actions">
                <button className="btn btn--primary btn--block" type="submit">
                  Apply filters
                </button>
                <button className="btn btn--ghost btn--block" type="button" onClick={resetFilters}>
                  Reset
                </button>
              </div>
            </form>

            <p className="filter-note">
              Public profiles never show email addresses or phone numbers. Employers can invite talent
              through their own account.
            </p>
          </aside>

          <div className="results-panel" id="results">
            <div className="results-head">
              <p className="results-count">
                {loading
                  ? "Loading talent profiles…"
                  : count === 0
                  ? "No talent profiles match these filters"
                  : (
                      <>
                        Showing <strong>{(page - 1) * PER_PAGE + 1}</strong>–
                        <strong>{Math.min(page * PER_PAGE, count)}</strong> of <strong>{count}</strong> public{" "}
                        {count === 1 ? "profile" : "profiles"}
                      </>
                    )}
              </p>
              <p className="results-sort">Recently updated first</p>
            </div>

            {hasFilters ? (
              <div className="active-filters" aria-label="Active filters">
                <span className="active-filters__label">Active:</span>
                {activeFilters.q ? <span className="chip">Keyword: {activeFilters.q}</span> : null}
                {activeFilters.skill ? (
                  <span className="chip">
                    {skills.find((skill) => String(skill.id) === String(activeFilters.skill))?.name ||
                      `Skill ${activeFilters.skill}`}
                  </span>
                ) : null}
                {selectedSdg ? (
                  <span className="chip">
                    {selectedSdg.code}: {selectedSdg.name}
                  </span>
                ) : null}
                {activeFilters.availability ? (
                  <span className="chip">
                    {AVAILABILITY_OPTIONS.find((option) => option.value === activeFilters.availability)?.label}
                  </span>
                ) : null}
                {activeFilters.location ? <span className="chip">{activeFilters.location}</span> : null}
              </div>
            ) : null}

            {error ? (
              <ErrorNotice message={error.message} onRetry={() => window.location.reload()} />
            ) : loading ? (
              <Loading label="Loading talent profiles…" />
            ) : results.length === 0 ? (
              <EmptyState
                icon="?"
                title="No public profiles match"
                text="Try a broader keyword or remove a filter. Talent profiles become visible when their owners publish them."
                action={
                  <button className="btn btn--primary" type="button" onClick={resetFilters}>
                    Clear all filters
                  </button>
                }
              />
            ) : (
              <>
                <div className="talent-grid">
                  {results.map((profile) => (
                    <TalentCard key={profile.id} profile={profile} />
                  ))}
                </div>
                <Pagination page={page} count={count} perPage={PER_PAGE} onPage={goToPage} label="talent profiles" />
              </>
            )}
          </div>
        </div>
      </section>

      <section className="section who-section" aria-labelledby="who-heading">
        <div className="container">
          <div className="section-head section-head--center">
            <div className="section-head__text">
              <span className="eyebrow">Who can join</span>
              <h2 id="who-heading">The talent pool is open to many paths</h2>
              <p>You do not need a finished career to join. Motivation and skills matter more than a long CV.</p>
            </div>
          </div>

          <div className="who-grid">
            <div className="who-card">
              <h3>Students and graduates</h3>
              <p>Show coursework, projects, and the SDGs you want to work on while you look for your first role.</p>
            </div>
            <div className="who-card">
              <h3>Freelancers and creatives</h3>
              <p>Offer design, writing, development, data, or marketing skills for short project work.</p>
            </div>
            <div className="who-card">
              <h3>Volunteers and researchers</h3>
              <p>Signal your availability for community programmes, field research, and nonprofit initiatives.</p>
            </div>
          </div>

          {!user || isTalent ? (
            <div className="who-cta">
              <p>
                {isTalent
                  ? "You can create or update your public profile at any time."
                  : "Create an account to build a public talent profile."}
              </p>
              <div className="who-cta__actions">
                <Link className="btn btn--primary" to={isTalent ? "/dashboard/profile" : "/register"}>
                  {isTalent ? "Edit your talent profile" : "Join the talent pool"}
                </Link>
                {!isTalent ? (
                  <Link className="btn btn--outline" to="/register">
                    Create an account
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
