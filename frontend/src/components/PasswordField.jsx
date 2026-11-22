import { useState } from "react";
import { Field } from "./Field";

export function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete = "current-password",
  required = true,
  hint,
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} htmlFor={id} required={required} error={error} hint={hint}>
      <div className="password-input">
        <input
          className={`input${error ? " is-invalid" : ""}`}
          type={visible ? "text" : "password"}
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
        />
        <button
          className="password-toggle"
          type="button"
          aria-controls={id}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </Field>
  );
}
