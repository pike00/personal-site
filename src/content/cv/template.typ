#set page(margin: (x: 0.65in, y: 0.5in))
#set text(font: "Geist", size: 9.5pt, weight: 400, fill: rgb("#1f2937"))
#set par(leading: 0.55em, justify: false)
#set heading(numbering: none)

#let ink = rgb("#111827")
#let muted = rgb("#6b7280")
#let rule = rgb("#d1d5db")

// Section headings: small, tracked, uppercase, with a hairline rule beneath
#show heading.where(level: 2): it => block(above: 0.9em, below: 0.5em)[
  #text(size: 8.5pt, weight: 600, tracking: 1.5pt, fill: ink)[#upper(it.body)]
  #v(-0.45em)
  #line(length: 100%, stroke: 0.5pt + rule)
]

// Fallback for any level-3 heading not routed through #entry
#show heading.where(level: 3): it => block(above: 0.55em, below: 0.1em,
  text(size: 10pt, weight: 600, fill: ink)[#it.body])

#show list: it => block(spacing: 0.32em, it)
#set list(marker: text(fill: muted)[•], indent: 0.3em, body-indent: 0.5em)
#show link: it => underline(offset: 1.5pt, stroke: 0.4pt + muted)[#it]

// Entry: role/school (bold) + org/degree (muted) on the left,
// date over location (muted, right-aligned) on the right.
// `gap` is the space ABOVE the entry: first entry in a section hugs its
// heading (small gap); later entries get a generous gap to separate groups.
#let _entry(gap, role, org, date, loc) = block(above: gap, below: 0.2em,
  grid(columns: (1fr, auto), column-gutter: 1.2em,
    align(left + top)[
      #text(size: 10pt, weight: 600, fill: ink)[#role]
      #if org != none [ #text(size: 9.5pt, weight: 400, fill: muted)[ #h(0.1em) -- #org] ]
    ],
    align(right + top)[
      #if date != none [ #text(size: 9pt, weight: 500, fill: ink)[#date] ]
      #if loc != none [ #linebreak() #text(size: 8.5pt, fill: muted)[#loc] ]
    ],
  )
)
#let firstentry(role, org, date, loc) = _entry(0em, role, org, date, loc)
#let entry(role, org, date, loc) = _entry(0.9em, role, org, date, loc)

// Masthead
#align(center)[
  #text(size: 21pt, weight: 700, tracking: 0.2pt, fill: ink)[Will Pike, MD]
  #v(-3pt)
  #text(size: 10.5pt, weight: 500, tracking: 0.8pt, fill: muted)[Physician-Clinical Informatician]
]

#v(5pt)
