import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ErrorNotice } from "../components/ErrorNotice";
import { FreelanceCard } from "../components/FreelanceCard";
import { Loading } from "../components/Loading";
import { PageHeader } from "../components/PageHeader";
import { Pagination } from "../components/Pagination";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { formatMoney } from "../lib/format";

const PER_PAGE = 9;
const EMPTY_FILTERS = { q: "", skill: "", budget_min: "", budget_max: "" };

export default function FreelancePage() {
  const { isEmployerSide } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState(EMPTY_FILTERS);
  const [data, setData] = useState(null);
  const [options, setOptions] = useState({ skills: [], min_budget: null, max_budget: null });
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
    api
      .get("/api/freelance/options/")
      .then((result) => {
        if (active) setOptions(result);
      })
      .catch(() => {
        // The core keyword and budget filters still work without metadata.
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
      .get("/api/freelance/", { ...activeFilters, page, per_page: PER_PAGE })
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

  const results = data?.results || [];
  const count = data?.count || 0;
  const hasFilters = Object.keys(activeFilters).length > 0;
  const selectedSkill = (options.skills || []).find(
    (item) => String(item.id) === String(activeFilters.skill)
  );

  function budgetChip() {
    if (activeFilters.budget_min && activeFilters.budget_max) {
      return `${formatMoney(activeFilters.budget_min)} - ${formatMoney(activeFilters.budget_max)}`;
    }
    if (activeFilters.budget_min) return `At least ${formatMoney(activeFilters.budget_min)}`;
    if (activeFilters.budget_max) return `Up to ${formatMoney(activeFilters.budget_max)}`;
    return null;
  }

  return (
    <>
      <PageHeader
        eyebrow="Short paid projects"
        listing
        title="Freelance work with a clear budget"
        lead="Project briefs from employers, organizations, and cooperatives working on sustainable development. Each listing shows the budget in NPR, duration, deadline, and the skills the client is looking for."
        actions={
          isEmployerSide ? (
            <Link className="btn btn--primary" to="/dashboard/freelance/new">
              Post a freelance project
            </Link>
          ) : (
            <Link className="btn btn--outline" to="/opportunities">
              Browse long-term opportunities
            </Link>
          )
        }
      />

      <section className="section section--tight">
        <div className="container listing-layout">
          <aside className="filter-panel" aria-labelledby="filter-heading">
            <div className="filter-panel__head">
              <h2 id="filter-heading">Filter projects</h2>
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
                  placeholder="Title, brief, client, or organization"
                  maxLength={100}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="skill">
                  Skill
                </label>
                <select className="select" id="skill" value={form.skill} onChange={update("skill")}>
                  <option value="">Any skill</option>
                  {(options.skills || []).map((skill) => (
                    <option value={skill.id} key={skill.id}>
                      {skill.name} ({skill.open_count})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <span className="form-label">Budget in NPR</span>
                <div className="budget-range">
                  <div className="form-field">
                    <label className="budget-range__label" htmlFor="budget_min">
                      From
                    </label>
                    <input
                      className="input"
                      type="number"
                      id="budget_min"
                      value={form.budget_min}
                      onChange={update("budget_min")}
                      min={0}
                      max={999999999}
                      step={1000}
                      inputMode="numeric"
                      placeholder={options.min_budget !== null ? String(Math.trunc(options.min_budget)) : "0"}
                    />
                  </div>
                  <div className="form-field">
                    <label className="budget-range__label" htmlFor="budget_max">
                      To
                    </label>
                    <input
                      className="input"
                      type="number"
                      id="budget_max"
                      value={form.budget_max}
                      onChange={update("budget_max")}
                      min={0}
                      max={999999999}
                      step={1000}
                      inputMode="numeric"
                      placeholder={options.max_budget !== null ? String(Math.trunc(options.max_budget)) : "Any"}
                    />
                  </div>
                </div>
                <p className="help-text">
                  Leave either box empty for no limit. Open projects range from{" "}
                  {formatMoney(options.min_budget)} to {formatMoney(options.max_budget)}.
                </p>
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
              Long-term roles and internships are on the <Link to="/opportunities">opportunities board</Link>.
              Freelancers can submit one proposal per project.
            </p>
          </aside>

          <div className="results-panel" id="results">
            <div className="results-head">
              <p className="results-count">
                {loading
                  ? "Loading projects…"
                  : count === 0
                  ? "No projects match these filters"
                  : (
                      <>
                        Showing <strong>{(page - 1) * PER_PAGE + 1}</strong>–
                        <strong>{Math.min(page * PER_PAGE, count)}</strong> of <strong>{count}</strong> open{" "}
                        {count === 1 ? "project" : "projects"}
                      </>
                    )}
              </p>
              <p className="results-sort">Soonest deadline first</p>
            </div>

            {hasFilters ? (
              <div className="active-filters" aria-label="Active filters">
                <span className="active-filters__label">Active:</span>
                {activeFilters.q ? <span className="chip">Keyword: {activeFilters.q}</span> : null}
                {selectedSkill ? <span className="chip">{selectedSkill.name}</span> : null}
                {budgetChip() ? <span className="chip">{budgetChip()}</span> : null}
              </div>
            ) : null}

            {error ? (
              <ErrorNotice message={error.message} onRetry={() => setSearchParams(new URLSearchParams(queryKey))} />
            ) : loading ? (
              <Loading label="Loading freelance projects…" />
            ) : results.length === 0 ? (
              <EmptyState
                icon="?"
                title="Nothing matches yet"
                text="Try a shorter keyword, a different skill, or a wider budget range. New projects are added as clients publish them."
                action={
                  <button className="btn btn--primary" type="button" onClick={resetFilters}>
                    Clear all filters
                  </button>
                }
              />
            ) : (
              <>
                <div className="opportunity-grid opportunity-grid--two">
                  {results.map((project) => (
                    <FreelanceCard key={project.id} project={project} />
                  ))}
                </div>
                <Pagination page={page} count={count} perPage={PER_PAGE} onPage={goToPage} label="freelance projects" />
              </>
            )}

            <p className="results-footnote">
              Proposals are reviewed by the client who posted the project. Payments and contracts are
              arranged directly between the client and the freelancer.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
