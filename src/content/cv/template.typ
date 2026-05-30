#set page(margin: (x: 0.7in, y: 0.7in))
#set text(font: "Inter", size: 9.5pt, weight: 400, fill: rgb("#1f2937"))
#set par(leading: 0.55em)
#set heading(numbering: none)

#show heading.where(level: 2): it => block(
  spacing: 0.3em,
  above: 0.6em,
  below: 0.2em,
  text(size: 11pt, weight: 700, fill: rgb("#000000"))[#it.body]
)

#show heading.where(level: 3): it => block(
  spacing: 0em,
  text(size: 10pt, weight: 600, fill: rgb("#1f2937"))[#it.body]
)

#show list: it => block(spacing: 0.25em, it)

#show list.item: it => {
  set text(size: 9.5pt)
  [#h(0.25em) • #h(0.35em)] + it.body
}

// Header
#align(center)[
  #text(size: 18pt, weight: 700, tracking: 0.5pt)[Will Pike, MD]
  #v(1pt)
  #text(size: 11pt, weight: 500, fill: rgb("#4b5563"))[Physician-Clinical Informatician]
]

#v(6pt)

