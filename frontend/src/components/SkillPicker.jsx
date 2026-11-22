import { useMemo, useState } from "react";
import { SKILL_LEVELS } from "../lib/format";

export function SkillPicker({
  skills,
  selected,
  levels,
  onChange,
  max = 15,
  title = "Skills",
}) {
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return skills;
    return skills.filter((skill) => {
      const haystack = `${skill.name} ${skill.category || ""}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [skills, query]);

  function toggle(skillId) {
    if (selectedSet.has(skillId)) {
      const next = selected.filter((id) => id !== skillId);
      const nextLevels = { ...levels };
      delete nextLevels[skillId];
      onChange(next, nextLevels);
      return;
    }
    if (selected.length >= max) return;
    onChange([...selected, skillId], { ...levels, [skillId]: levels[skillId] || "beginner" });
  }

  function updateLevel(skillId, level) {
    onChange(selected, { ...levels, [skillId]: level });
  }

  return (
    <fieldset className="form-field form-field--full picker">
      <legend className="form-label">{title}</legend>
      <div className="skills-search">
        <input
          className="input"
          type="search"
          value={query}
          placeholder="Search skills by name or category"
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search skills"
        />
        <span className={`picker-count${selected.length > max ? " is-over" : ""}`}>
          {selected.length} / {max} selected
        </span>
      </div>
      <div className="skill-picker-list">
        {filtered.map((skill) => {
          const checked = selectedSet.has(skill.id);
          return (
            <div className={`skill-picker-item${checked ? " is-selected" : ""}`} key={skill.id}>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(skill.id)}
                  disabled={!checked && selected.length >= max}
                />
                <span>
                  {skill.name}
                  {skill.category ? <span className="small text-muted"> · {skill.category}</span> : null}
                </span>
              </label>
              <select
                className="select"
                value={levels[skill.id] || "beginner"}
                onChange={(event) => updateLevel(skill.id, event.target.value)}
                disabled={!checked}
                aria-label={`Level for ${skill.name}`}
              >
                {SKILL_LEVELS.map((level) => (
                  <option value={level.value} key={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
        {filtered.length === 0 ? (
          <p className="small text-muted">No skills match “{query}”.</p>
        ) : null}
      </div>
      <p className="help-text">Choose up to {max} skills. Levels are shown on your public profile.</p>
    </fieldset>
  );
}
