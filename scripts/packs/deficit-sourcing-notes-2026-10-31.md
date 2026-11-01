# Sourcing notes — federal-deficit-us.json

Built 2026-10-31 (clock read as 2026-10-31 11:11 EDT, Saturday, America/New_York).
Dataset: U.S. federal budget surplus/deficit by fiscal year, millions of nominal dollars,
OMB sign convention (deficit negative). `_danny: false` — not cleared by a human reviewer.

**Bottom line: FY1901–FY2026, 126 consecutive years, no gaps. Nothing before FY1901.
Every number was transcribed from a source I actually fetched. Nothing was estimated,
interpolated, or recalled from memory.**

---

## What I fetched, in order, and what each gave me

### 1. OMB Historical Tables landing page — partial success (link discovery only)
`https://www.whitehouse.gov/omb/budget/historical-tables/`

WebFetch read the page fine and gave me the full asset list. Table 1.1 for the FY2027
budget is at `https://www.whitehouse.gov/wp-content/uploads/2026/04/hist01z1_fy2027.xlsx`,
with a bundle at `hist_fy2027.zip`.

**Then both download routes failed:**

- Shell `curl` to whitehouse.gov: `CONNECT tunnel failed, response 403`. This container's
  egress proxy allow-lists package registries and GitHub only; `whitehouse.gov` is not on
  it. The proxy status endpoint logged the denial (`connect_rejected`, policy denial). Per
  the proxy README I did not retry or route around it.
- WebFetch on the `.xlsx` directly: the tool returned the body as `[binary data]`, so there
  was no text to parse. Same result for `fredgraph.csv`. **WebFetch in this environment
  cannot read binary or attachment-type responses at all** — so python3/openpyxl/pandas were
  never usable, because no bytes ever reached the container.

**No value in the JSON comes from the OMB .xlsx.** I am naming it as a source only for
asset discovery, and said so in `_sources`.

### 2. FRED series FYFSD — SUCCESS, this is the source of every value
`https://fred.stlouisfed.org/data/FYFSD.txt`

The `/data/<ID>.txt` path serves `text/plain`, which WebFetch *can* read. It returned the
complete series with header metadata and every observation line:

- Title: Federal Surplus or Deficit [-]; Source: U.S. Office of Management and Budget
- Release: Fiscal Year Budget Data; Units: **Millions of Dollars**; Frequency: Annual, Fiscal Year
- Date range 1901-06-30 to 2026-09-30; FRED last updated 2026-10-28

So this is OMB Table 1.1's own surplus/deficit column, redistributed by the St. Louis Fed,
already in millions. **No unit conversion was applied to any value.**

**Date-to-fiscal-year mapping.** FRED dates each annual observation at the *end* of the
fiscal year, and the dates confirm it rather than my assuming it: observations run
`1901-06-30 … 1976-06-30` (June 30 year-ends) and then `1977-09-30 … 2026-09-30`
(September 30 year-ends), which is exactly where the fiscal year moved in 1976. So
`1901-06-30` = FY1901 and `2026-09-30` = FY2026. The GPO cross-check in §3 independently
confirms this mapping is right: FY1901 = +63 in both.

### 3. GPO / govinfo HTML Historical Tables — SUCCESS as cross-check and as the pre-1901 answer
`https://www.govinfo.gov/content/pkg/BUDGET-2006-TAB/html/BUDGET-2006-TAB.htm`

GPO published some older Historical Tables editions as HTML, which WebFetch reads as text.
The FY2006 edition's Table 1.1 came through. **This is the source that settled the pre-1901
question** (see "Judgment calls" below).

Editions I tried that returned govinfo "Page Not Found" error pages: `BUDGET-2027-TAB-1.htm`,
`BUDGET-2026-TAB.htm`, `BUDGET-2022-TAB.htm`, `BUDGET-2013-TAB.htm`, `BUDGET-2012-TAB.htm`,
`BUDGET-2011-TAB.htm`, `BUDGET-2010-TAB.htm`. `BUDGET-2007-TAB-1.htm` loaded but was only
front matter (a table of contents), no data rows. **The HTML renderings appear to stop
around the FY2006/FY2007 editions**, which is why my independent annual cross-check cannot
reach past FY2005 and why FY2009 is weakly corroborated.

### 4. Treasury FiscalData API (MTS Table 1) — SUCCESS as cross-check, narrower than expected
`https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_1`

Two gotchas worth recording:

- **WebFetch rejects long URLs.** My first two attempts came back
  `PROXY_REJECTED … url exceeds the maximum fetchable length`. Queries had to be kept to
  roughly 140 characters, which ruled out multi-field filters. I discovered the schema by
  pulling unfiltered rows instead.
- **Opposite sign convention, and whole dollars.** The field is `current_month_dfct_sur_amt`,
  reported in **dollars**, where a **positive** number is a **deficit** (April 2026 reads
  `-215024135197.77`, i.e. a tax-season surplus month). I divided by 1,000,000 and flipped
  the sign before comparing. Nothing from this source was written into the series.

Row shape: for the September statement of a fiscal year, rows are the individual months plus
a `Year-to-Date` row, which is the fiscal-year total.

**Coverage is much shorter than the brief assumed.** `record_date:eq:2009-09-30` returned
zero rows, and sorting ascending put the earliest record at `2015-03-31`. So this endpoint
covers roughly **FY2015 onward, not 1981 onward** — it could not help with 1983 or 2009.

### 5. FRED series MTSDS133FMS (monthly Treasury MTS) — fetched, and it partly DISAGREES
`https://fred.stlouisfed.org/data/MTSDS133FMS.txt`

Treasury Fiscal Service monthly deficit, millions, 1980-10 to 2026-09. I fetched it to try to
reach 1983 and 2009, by summing twelve months myself (auditable arithmetic, not a guess).
Results are in the "Disagreements" section — this one did **not** cleanly confirm, and I did
not let it override the two agreeing annual sources.

### 6. Census "Historical Statistics of the United States" / other pre-1901 sources — not attempted after §3
Once the GPO Table 1.1 showed that OMB itself publishes no annual pre-1901 figures, I stopped
chasing pre-1901 rather than pull individual 19th-century years from a source that would not
match the series' own accounting basis. See "Judgment calls".

---

## Cross-checks

Exact matches, FRED/FYFSD vs GPO FY2006 Table 1.1:

| FY | Value | Verdict |
|---|---|---|
| 1901 | +63 | exact match |
| 1902 | +77 | exact match |
| 1903 | +45 | exact match |
| 1919 | −13,363 | exact match |
| 1943 | −54,554 | exact match |
| 1968 | −25,161 | exact match |
| 1976 | −73,732 | exact match |
| 1983 | −207,802 | exact match |

Exact matches, FRED/FYFSD vs Treasury FiscalData MTS Table 1 Year-to-Date:

| FY | Treasury (dollars) | = millions | File value | Verdict |
|---|---|---|---|---|
| 2020 | 3,131,917,248,888.30 | 3,131,917.2488883 | −3,131,917.2488882998 | exact match |
| 2026 | 1,992,473,224,352.42 | 1,992,473.2243524198 | −1,992,473.2243524201 | exact match |

The FY2020 and FY2026 matches to the cent also **explain the fractional precision** in the
file from FY2015 on: those years are Treasury MTS actuals carried at sub-million precision,
not rounded OMB whole millions.

The FY2026 match additionally proves FY2026 is a **Treasury actual** from the final Monthly
Treasury Statement (fiscal year closed 2026-09-30, statement out before today), **not an OMB
projection** — which was my main worry about including it.

## Disagreements, stated plainly

1. **FY1983 monthly sum is off by 12,448 million.** Summing MTSDS133FMS for Oct-1982 →
   Sep-1983 gives **−195,354** against the annual **−207,802**. That is a ~6% gap. The annual
   figure is confirmed exactly by two independent annual sources (FRED/OMB and GPO), so I
   concluded the as-reported monthly statements of that era do not reconcile to the revised
   annual budget accounts, and treated the monthly sum as non-authoritative. **I did not
   change the value.** Flagged for human review.
2. **FY2009 is only approximately corroborated.** Monthly sum Oct-2008 → Sep-2009 is
   **−1,415,725** against **−1,412,688**: within 3,037 million (0.2%), but not exact. I could
   not reach a second *annual* source for 2009 (GPO HTML stops ~FY2005, Treasury API starts
   ~FY2015). **FY2009 rests on a single source.**
3. **FY2025 differs by 11.9 million.** The FY2025 comparative column of the September 2026
   Treasury statement reads 1,775,369,189,818.35 dollars (1,775,369.1898 million); the file
   carries −1,775,357.2807338701. This is a prior-year restatement. I kept the FRED/OMB
   figure so the whole series stays one vintage.
4. **FY1998, FY2000, FY2004 differ from the FY2006 edition by design.** FY2006 Table 1.1 gave
   +69,200 / +236,151 / −412,144; the current series gives +69,270 / +236,241 / −412,727.
   These are later OMB revisions, so I kept the current values. Worth knowing that the two
   sources agree perfectly for older years and diverge slightly for then-recent ones — that
   is normal budget revision, not a transcription error.

## Judgment calls

- **Pre-1901 omitted entirely, including 1865.** The GPO Table 1.1 fetch showed OMB publishes
  only two aggregate rows before 1901: **1789–1849 = +70** and **1850–1900 = −991** million,
  with no annual breakdown. There is no honest way to turn a 51-year aggregate into annual
  rows, so every year before FY1901 is absent. 1865 therefore could not be cross-checked
  either, and I said so in `_crosschecked` rather than leaving the impression it was verified.
  The brief's canonical title says "1789–2030"; the *table* spans that, but its *annual* rows
  do not.
- **1976 transition quarter omitted.** OMB carries a TQ row for July–September 1976
  (**−14,744** million per the FY2006 edition) from the fiscal-year-end change. It is not a
  fiscal year and has no integer `fy`, so it is not in `series`. FY1976 and FY1977 are both
  present and neither absorbs it — meaning **the series does not sum to the full cumulative
  deficit**; it is short by that quarter. Noted in `_coverage`.
- **Full fetched precision kept, no rounding.** FY2015–FY2026 carry decimals because the
  source does. Rounding would have been me altering fetched data. If the app wants clean
  numbers, round at render time, not in the data file.
- **One series vintage, not a best-of merge.** All 126 values come from FRED/FYFSD. I did not
  splice in Treasury or FY2006-edition numbers where they differed, because a spliced series
  would mix accounting vintages invisibly.

## For a human to double-check

- **FY1913 and FY1914 are both exactly `0`.** That is verbatim what FYFSD returned
  (`0.0000000000` on both lines). Two consecutive exact zeros is odd enough that it should be
  eyeballed against the OMB .xlsx by someone who can open it. I did not alter them.
- **FY1983** — the 12,448 million monthly-vs-annual gap above.
- **FY2009** — single-sourced.
- **The whole series against `hist01z1_fy2027.xlsx`.** My series is OMB data via FRED, not
  read off OMB's own file, because the file was unreachable from here. A spot-check of ~10
  years against the actual spreadsheet on a normal network would close the last gap.

## Files written

- `/home/claude/federal-deficit-us.json`
- `/home/claude/deficit-sourcing-notes.md`

No other file was created or modified. The build script used to emit the JSON lives in this
session's scratchpad at
`/tmp/claude-0/-home-claude/8f73f1df-501e-5596-aa69-b86537e0a159/scratchpad/build_deficit.py`
and asserts on ascending order, duplicate years, and gaps inside the covered range.
