import React, { useState, useEffect, useRef } from "react";

export interface NumericInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number;
  onChange: (val: number) => void;
  allowZero?: boolean;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  onFocus,
  onBlur,
  className = "",
  allowZero = false,
  placeholder = "0",
  ...props
}) => {
  const [str, setStr] = useState<string>(() => {
    if (value === 0 && !allowZero) return "";
    return String(value);
  });
  const [isFocused, setIsFocused] = useState(false);
  const lastEmittedRef = useRef<number>(value);

  // Sync from outside prop if changed externally (e.g. Reset, Load Estimate, Presets)
  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      lastEmittedRef.current = value;
      if (value === 0 && !allowZero && !isFocused) {
        setStr("");
      } else {
        setStr(String(value));
      }
    }
  }, [value, allowZero, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setStr(raw);

    if (raw === "" || raw === "-") {
      lastEmittedRef.current = 0;
      onChange(0);
      return;
    }

    const num = parseFloat(raw);
    if (!isNaN(num)) {
      lastEmittedRef.current = num;
      onChange(num);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Select all on focus for fast overtyping
    e.target.select();
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (str === "" || isNaN(parseFloat(str))) {
      const fallback = allowZero ? 0 : 0;
      setStr(String(fallback));
      lastEmittedRef.current = fallback;
      onChange(fallback);
    } else {
      const num = parseFloat(str);
      setStr(String(num));
      lastEmittedRef.current = num;
      onChange(num);
    }
    if (onBlur) onBlur(e);
  };

  return (
    <input
      type="number"
      value={str}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  );
};
