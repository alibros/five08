#!/usr/bin/env node
/**
 * Checks that every dimension citation in the parts library still resolves.
 *
 * Datasheet URLs rot: manufacturers reorganise, distributors drop old parts. A
 * citation that 404s is worse than none, because the interface still presents
 * the figure as traced.
 *
 * It only fails on definite breakage. Manufacturer and distributor sites sit
 * behind bot protection and will refuse an automated HEAD with 403 or 429 while
 * serving the document perfectly well to a person — reporting those as rot
 * would make this cry wolf every week until nobody read it.
 */
import {catalog} from '../src/catalog.ts';

const TIMEOUT = 20_000;
const GONE = new Set([404, 410]);
const UNVERIFIABLE = new Set([401, 403, 405, 429]);

// One request per document, however many parts cite it.
const byUrl = new Map();
for (const part of catalog) {
  if (!part.source?.url) continue;
  const entry = byUrl.get(part.source.url) ?? {url: part.source.url, parts: []};
  entry.parts.push(part.id);
  byUrl.set(part.source.url, entry);
}

const probe = async url => {
  const attempt = method =>
    fetch(url, {
      method,
      signal: AbortSignal.timeout(TIMEOUT),
      redirect: 'follow',
      headers: {'user-agent': 'Mozilla/5.0 (compatible; five08-citation-check)'},
    });
  try {
    let response = await attempt('HEAD');
    if (UNVERIFIABLE.has(response.status)) response = await attempt('GET');
    return {status: response.status};
  } catch (error) {
    return {status: 0, error: error.message};
  }
};

const results = await Promise.all([...byUrl.values()].map(async entry => ({...entry, ...(await probe(entry.url))})));
const gone = results.filter(r => GONE.has(r.status));
const unverified = results.filter(r => !GONE.has(r.status) && (r.status === 0 || !(r.status >= 200 && r.status < 400)));
const ok = results.length - gone.length - unverified.length;

console.log(`${results.length} document${results.length === 1 ? '' : 's'} cited across ${catalog.length} parts.`);
console.log(`  ${ok} resolved`);

for (const {url, status, error, parts} of unverified)
  console.log(`  could not verify  ${status || error}  ${url}  (${parts.join(', ')})`);

for (const {url, status, parts} of gone)
  console.error(`  GONE  ${status}  ${url}  (${parts.join(', ')})`);

if (gone.length) {
  console.error(`\n${gone.length} cited document${gone.length === 1 ? ' is' : 's are'} no longer there.`);
  console.error('Find it at its new home and update the url, or drop the citation and let the part');
  console.error('fall back to generic — a figure presented as traced has to stay checkable.');
  process.exit(1);
}

if (unverified.length === results.length && results.length > 0) {
  console.error('\nNothing could be reached at all — this looks like a network or proxy problem');
  console.error('rather than link rot. Not treating it as a failure.');
}
console.log('\nNo citation is definitely broken.');
