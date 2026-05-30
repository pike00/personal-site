#set page(margin: (x: 0.75in, y: 0.75in))
#set text(font: "Inter", size: 10pt, weight: 400)
#set par(leading: 0.6em)
#set heading(numbering: none)

#show heading.where(level: 1): it => [
  #text(size: 11pt, weight: 600, fill: rgb("#000000"))[#it.body]
  #line(length: 100%, stroke: 0.5pt + rgb("#d1d5db"))
]

#show heading.where(level: 2): it => [
  #text(size: 10pt, weight: 600, fill: rgb("#1f2937"))[#it.body]
]

#show heading.where(level: 3): it => [
  #text(size: 9.5pt, weight: 500, fill: rgb("#374151"), style: "italic")[#it.body]
]

#show link: it => [
  #underline(offset: 2pt, it.body)
]

#show list: it => block(spacing: 0.4em, it)

#align(center)[
  #text(size: 16pt, weight: 700)[Will Pike, MD]
  #v(2pt)
  #text(size: 10pt, fill: rgb("#6b7280"))[Physician-Clinical Informatician]
]

#v(8pt)

