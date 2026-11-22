export function SdgPicker({ sdgs, selected, onChange, max = 5 }) {
  const selectedSet = new Set(selected);

  function toggle(sdgId) {
    if (selectedSet.has(sdgId)) {
      onChange(selected.filter((id) => id !== sdgId));
      return;
    }
    if (selected.length >= max) return;
    onChange([...selected, sdgId]);
  }

  return (
    <fieldset className="form-field form-field--full">
      <legend className="form-label">SDG priorities</legend>
      <p className="help-text">
        Select up to {max} Sustainable Development Goals your work contributes to.
      </p>
      <div className="sdg-picker-grid">
        {sdgs.map((sdg) => {
          const checked = selectedSet.has(sdg.id);
          return (
            <label className={`sdg-picker-item${checked ? " is-selected" : ""}`} key={sdg.id}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(sdg.id)}
                disabled={!checked && selected.length >= max}
              />
              <span>
                <span className="sdg-chip" style={{ "--sdg-color": sdg.color_hex }}>
                  <span className="sdg-dot" aria-hidden="true" />
                  {sdg.code}
                </span>
                <small>{sdg.name}</small>
              </span>
            </label>
          );
        })}
      </div>
      <p className={`picker-count${selected.length > max ? " is-over" : ""}`}>
        {selected.length} / {max} selected
      </p>
    </fieldset>
  );
}
