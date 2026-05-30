export const prerender = true;

import { getPublications } from "../../lib/publications";
import { toRIS } from "../../lib/citations";
import type { Publication } from "../../lib/types";

export function getStaticPaths() {
  return getPublications().map((pub) => ({
    params: { slug: pub.slug },
    props: { pub },
  }));
}

export function GET({ props }: { props: { pub: Publication } }) {
  return new Response(toRIS(props.pub), {
    headers: { "Content-Type": "application/x-research-info-systems; charset=utf-8" },
  });
}
