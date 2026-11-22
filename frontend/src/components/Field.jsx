export function Field({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  full = false,
  children,
  className = "",
}) {
  return (
    <div className={`form-field${full ? " form-field--full" : ""}${className ? ` ${className}` : ""}`}>
      {label ? (
        <label className="form-label" htmlFor={htmlFor}>
          {label} {required ? <span className="required">*</span> : null}
        </label>
      ) : null}
      {children}
      {hint ? <p className="help-text">{hint}</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

export function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  error,
  hint,
  full = false,
  disabled = false,
}) {
  return (
    <Field
      label={label}
      htmlFor={name}
      required={required}
      error={error}
      hint={hint}
      full={full}
    >
      <select
        className={`select${error ? " is-invalid" : ""}`}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
