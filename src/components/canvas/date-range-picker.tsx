"use client";

import { useState, useEffect } from "react";

interface DateRangePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showEndDate?: boolean;
}

const months = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

export function DateRangePicker({
  value,
  onChange,
  showEndDate = true,
}: DateRangePickerProps) {
  const [startMonth, setStartMonth] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [endYear, setEndYear] = useState("");
  const [isPresent, setIsPresent] = useState(false);

  // Parse initial value
  useEffect(() => {
    if (!value) return;

    // Try to parse "Jan 2020 - Present" or "Jan 2020 - Mar 2024" or "2020 - 2024"
    const presentMatch = value.match(/present|current|now|теперішній час|зараз/i);
    if (presentMatch) {
      setIsPresent(true);
    }

    // Match patterns like "Jan 2020" or "2020"
    const datePattern = /([A-Za-zА-Яа-яІіЇїЄє]+)?\s*(\d{4})/g;
    const matches = [...value.matchAll(datePattern)];

    if (matches.length >= 1) {
      const [, month1, year1] = matches[0];
      if (month1) {
        const foundMonth = months.find(m =>
          m.label.toLowerCase() === month1.toLowerCase().slice(0, 3)
        );
        if (foundMonth) setStartMonth(foundMonth.value);
      }
      if (year1) setStartYear(year1);
    }

    if (matches.length >= 2 && !presentMatch) {
      const [, month2, year2] = matches[1];
      if (month2) {
        const foundMonth = months.find(m =>
          m.label.toLowerCase() === month2.toLowerCase().slice(0, 3)
        );
        if (foundMonth) setEndMonth(foundMonth.value);
      }
      if (year2) setEndYear(year2);
    }
  }, []);

  // Build output string
  useEffect(() => {
    let result = "";

    if (startYear) {
      if (startMonth) {
        const monthLabel = months.find(m => m.value === startMonth)?.label || "";
        result = `${monthLabel} ${startYear}`;
      } else {
        result = startYear;
      }

      if (showEndDate) {
        if (isPresent) {
          result += " - Present";
        } else if (endYear) {
          if (endMonth) {
            const endMonthLabel = months.find(m => m.value === endMonth)?.label || "";
            result += ` - ${endMonthLabel} ${endYear}`;
          } else {
            result += ` - ${endYear}`;
          }
        }
      }
    }

    onChange(result);
  }, [startMonth, startYear, endMonth, endYear, isPresent, showEndDate, onChange]);

  const selectClass = "h-7 rounded border border-zinc-200 bg-white px-1.5 text-xs text-zinc-700 focus:border-zinc-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <div className="space-y-2">
      {/* Start Date */}
      <div className="flex items-center gap-1.5">
        <select
          value={startMonth}
          onChange={(e) => setStartMonth(e.target.value)}
          className={`${selectClass} w-16`}
        >
          <option value="">Mon</option>
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          value={startYear}
          onChange={(e) => setStartYear(e.target.value)}
          className={`${selectClass} w-[68px]`}
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={y.toString()}>
              {y}
            </option>
          ))}
        </select>

        {showEndDate && (
          <>
            <span className="text-xs text-zinc-400">—</span>

            {/* End Date or Present */}
            {isPresent ? (
              <button
                type="button"
                onClick={() => setIsPresent(false)}
                className="h-7 rounded border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                Present
              </button>
            ) : (
              <>
                <select
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  className={`${selectClass} w-16`}
                >
                  <option value="">Mon</option>
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={endYear}
                  onChange={(e) => setEndYear(e.target.value)}
                  className={`${selectClass} w-[68px]`}
                >
                  <option value="">Year</option>
                  {years.map((y) => (
                    <option key={y} value={y.toString()}>
                      {y}
                    </option>
                  ))}
                </select>
              </>
            )}
          </>
        )}
      </div>

      {/* Present toggle */}
      {showEndDate && !isPresent && (
        <button
          type="button"
          onClick={() => {
            setIsPresent(true);
            setEndMonth("");
            setEndYear("");
          }}
          className="text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          + Current position
        </button>
      )}
    </div>
  );
}

// Simple year picker for education/certifications
interface YearPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function YearPicker({ value, onChange, placeholder }: YearPickerProps) {
  const selectClass = "h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={selectClass}
    >
      <option value="">{placeholder || "Select year"}</option>
      {years.map((y) => (
        <option key={y} value={y.toString()}>
          {y}
        </option>
      ))}
    </select>
  );
}

// Education date range (simpler - just years)
interface YearRangePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function YearRangePicker({ value, onChange }: YearRangePickerProps) {
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");

  // Parse initial value
  useEffect(() => {
    if (!value) return;
    const yearPattern = /(\d{4})/g;
    const matches = value.match(yearPattern);
    if (matches) {
      if (matches[0]) setStartYear(matches[0]);
      if (matches[1]) setEndYear(matches[1]);
    }
  }, []);

  // Build output
  useEffect(() => {
    if (startYear && endYear) {
      onChange(`${startYear} - ${endYear}`);
    } else if (startYear) {
      onChange(startYear);
    } else {
      onChange("");
    }
  }, [startYear, endYear, onChange]);

  const selectClass = "h-7 rounded border border-zinc-200 bg-white px-1.5 text-xs text-zinc-700 focus:border-zinc-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={startYear}
        onChange={(e) => setStartYear(e.target.value)}
        className={`${selectClass} w-[72px]`}
      >
        <option value="">Start</option>
        {years.map((y) => (
          <option key={y} value={y.toString()}>
            {y}
          </option>
        ))}
      </select>
      <span className="text-xs text-zinc-400">—</span>
      <select
        value={endYear}
        onChange={(e) => setEndYear(e.target.value)}
        className={`${selectClass} w-[72px]`}
      >
        <option value="">End</option>
        {years.map((y) => (
          <option key={y} value={y.toString()}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
