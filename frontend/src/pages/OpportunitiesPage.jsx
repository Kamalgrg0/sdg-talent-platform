import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ErrorNotice } from "../components/ErrorNotice";
import { Loading } from "../components/Loading";
import { OpportunityCard } from "../components/OpportunityCard";
import { PageHeader } from "../components/PageHeader";
import { Pagination } from "../components/Pagination";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { OPPORTUNITY_TYPES } from "../lib/format";

const PER_PAGE = 9;
const EMPTY_FILTERS = {
  q: "",
  location: "",
  type: "",
  category: "",
  skill: "",
  sdg: "",
  deadline: "",
  remote: "",
};

const DEADLINE_OPTIONS = [
  { value: "7", label: "Closing in 7 days" },
  { value: "30", label: "Closing in 30 days" },
  { value: "90", label: "Closing in 90 days" },
];

export default function OpportunitiesPage() {
  const { isEmployerSide } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [options, setOptions] = useState({ locations: [], categories: [], types: OPPORTUNITY_TYPES });
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
      api.get("/api/opportunities/options/"),
      api.get("/api/catalog/skills/"),
      api.get("/api/catalog/sdgs/"),
    ])
      .then(([optionData, skillData, sdgData]) => {
        if (!active) return;
        setOptions(optionData);
        setSkills(Array.isArray(skillData) ? skillData : []);
        setSdgs(Array.isArray(sdgData) ? sdgData : []);
      })
      .catch(() => {
        // Filters still work with the core fields if option metadata fails.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get("/api/opportunities/", { ...activeFilters, page, per_page: PER_PAGE })
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
      if (value !== "" && value !== null && value !== undefined) next[key] = value;
    });
    setSearchParams(next, { replace: false });
  }

  function resetFilters() {
    setForm(EMPTY_FILTERS);
    setSearchParams({}, { replace: false });
  }

  function goToPage(nextPage) {
    const next = { ...activeFilters };
    if (nextPage > 1) next.page = String(nextPage);
    setSearchParams(next);
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const sdgName = (id) => {
    const sdg = sdgs.find((item) => String(item.id) === String(id));
    return sdg ? `${sdg.code}: ${sdg.name}` : "";
  };

  const results = data?.results || [];
  const count = data?.count || 0;
  const hasFilters = Object.keys(activeFilters).length > 0;

  return (
    <>
      <PageHeader
        eyebrow="Find your next role"
        listing
        title="Opportunities that move the SDGs forward"
        lead="Jobs, internships, fellowships, volunteer roles, and training from employers and organizations working on sustainable development. Filters run on the server, so the list is always accurate."
        actions={
          isEmployerSide ? (
            <Link className="btn btn--primary" to="/dashboard/opportunities/new">
              Post an opportunity
            </Link>
          ) : (
            <Link className="btn btn--outline" to="/freelance">
              Browse freelance projects
            </Link>
          )
        }
      />

      <section className="section section--tight">
        <div className="container listing-layout">
          <aside className="filter-panel" aria-labelledby="filter-heading">
            <div className="filter-panel__head">
              <h2 id="filter-heading">Filter opportunities</h2>
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
                  placeholder="Title, description, or organization"
                  maxLength={100}
                />
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

              <div className="form-field">
                <label className="form-label" htmlFor="type">
                  Opportunity type
                </label>
                <select className="select" id="type" value={form.type} onChange={update("type")}>
                  <option value="">Any type</option>
                  {(options.types || OPPORTUNITY_TYPES).map((type) => (
                    <option value={type.value} key={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="category">
                  Category
                </label>
                <select className="select" id="category" value={form.category} onChange={update("category")}>
                  <option value="">Any category</option>
                  {(options.categories || []).map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.value} ({option.count})
                    </option>
                  ))}
                </select>
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
                      {skill.open_count ? ` (${skill.open_count})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="sdg">
                  Sustainable Development Goal
                </label>
                <select className="select" id="sdg" value={form.sdg} onChange={update("sdg")}>
                  <option value="">Any SDG</option>
                  {sdgs.map((sdg) => (
                    <option value={sdg.id} key={sdg.id}>
                      {sdg.code}: {sdg.name}
                      {sdg.open_count ? ` (${sdg.open_count})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="deadline">
                  Deadline
                </label>
                <select className="select" id="deadline" value={form.deadline} onChange={update("deadline")}>
                  <option value="">Any deadline</option>
                  {DEADLINE_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="checkbox-row" htmlFor="remote">
                  <input
                    type="checkbox"
                    id="remote"
                    checked={form.remote === "1"}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, remote: event.target.checked ? "1" : "" }))
                    }
                  />
                  Remote only
                </label>
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
              Looking for short project work instead? <Link to="/freelance">Browse freelance projects</Link>.
            </p>
          </aside>

          <div className="results-panel" id="results">
            <div className="results-head">
              <p className="results-count">
                {loading
                  ? "Loading opportunities…"
                  : count === 0
                  ? "No opportunities match these filters"
                  : (
                      <>
                        Showing <strong>{(page - 1) * PER_PAGE + 1}</strong>–
                        <strong>{Math.min(page * PER_PAGE, count)}</strong> of <strong>{count}</strong>{" "}
                        {count === 1 ? "opportunity" : "opportunities"}
                      </>
                    )}
              </p>
              <p className="results-sort">Soonest deadline first</p>
            </div>

            {hasFilters ? (
              <div className="active-filters" aria-label="Active filters">
                <span className="active-filters__label">Active:</span>
                {activeFilters.q ? <span className="chip">Keyword: {activeFilters.q}</span> : null}
                {activeFilters.location ? <span className="chip">{activeFilters.location}</span> : null}
                {activeFilters.type ? (
                  <span className="chip">
                    {(options.types || OPPORTUNITY_TYPES).find((item) => item.value === activeFilters.type)?.label ||
                      activeFilters.type}
                  </span>
                ) : null}
                {activeFilters.category ? <span className="chip">{activeFilters.category}</span> : null}
                {activeFilters.skill ? (
                  <span className="chip">
                    {skills.find((item) => String(item.id) === String(activeFilters.skill))?.name ||
                      `Skill ${activeFilters.skill}`}
                  </span>
                ) : null}
                {activeFilters.sdg ? <span className="chip">{sdgName(activeFilters.sdg)}</span> : null}
                {activeFilters.deadline ? (
                  <span className="chip">
                    {DEADLINE_OPTIONS.find((item) => item.value === activeFilters.deadline)?.label ||
                      `Within ${activeFilters.deadline} days`}
                  </span>
                ) : null}
                {activeFilters.remote ? <span className="chip">Remote only</span> : null}
              </div>
            ) : null}

            {error ? (
              <ErrorNotice message={error.message} onRetry={() => setSearchParams(new URLSearchParams(queryKey))} />
            ) : loading ? (
              <Loading label="Loading opportunities…" />
            ) : results.length === 0 ? (
              <EmptyState
                icon="?"
                title="Nothing matches yet"
                text="Try a shorter keyword, choose a different location, or remove one of the other filters. New opportunities are added regularly."
                action={
                  <button className="btn btn--primary" type="button" onClick={resetFilters}>
                    Clear all filters
                  </button>
                }
              />
            ) : (
              <>
                <div className="opportunity-grid opportunity-grid--two">
                  {results.map((opportunity) => (
                    <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                  ))}
                </div>
                <Pagination page={page} count={count} perPage={PER_PAGE} onPage={goToPage} label="opportunities" />
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
