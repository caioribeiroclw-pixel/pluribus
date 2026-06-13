#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = { out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--original') { args.original = value; i += 1; continue; }
    if (key === '--cleaned') { args.cleaned = value; i += 1; continue; }
    if (key === '--out') { args.out = value; i += 1; continue; }
    if (key === '--help' || key === '-h') { args.help = true; continue; }
    throw new Error(`Unknown argument: ${key}`);
  }
  return args;
}

function usage() {
  return `Usage: node check-semantic-anchors.mjs --original original-paste.md --cleaned cleaned-paste.md [--out receipt.json]\n`;
}

function normalize(value) {
  return value
    .replace(/`+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function approxTokens(value) {
  const chunks = value.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(chunks * 1.33));
}

function extractAnchors(markdown) {
  const anchors = [];
  const lines = markdown.split(/\r?\n/);
  let inFence = false;
  let fenceLang = '';
  let fenceLines = [];

  function push(type, text, extra = {}) {
    const canonical = normalize(text);
    if (!canonical) return;
    anchors.push({ type, text: text.trim(), canonical, ...extra });
  }

  for (const line of lines) {
    const fence = line.match(/^```\s*([\w-]*)/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceLang = fence[1] || 'plain';
        fenceLines = [];
      } else {
        const body = fenceLines.join('\n').trim();
        if (body) push('code_fence', body, { language: fenceLang });
        inFence = false;
        fenceLang = '';
        fenceLines = [];
      }
      continue;
    }

    if (inFence) {
      fenceLines.push(line);
      const sig = line.match(/\b(export\s+)?(async\s+)?(function|class|interface|type|def)\s+[A-Za-z0-9_]+[^;{]*/);
      if (sig) push('api_signature', sig[0]);
      continue;
    }

    if (/^#{1,4}\s+\S/.test(line)) push('heading', line.replace(/^#{1,4}\s+/, ''));
    if (/\b(v?\d+\.\d+(?:\.\d+)?)\b/.test(line) && /\b(version|v\d|deprecated|removed|migration|upgrade|breaking|changed)\b/i.test(line)) {
      push('version_or_migration_note', line);
    }
    if (/\b(never|must|do not|required|preserve|security|constraint)\b/i.test(line)) {
      push('must_keep_policy', line.replace(/^[-*]\s+/, ''));
    }
    const sig = line.match(/\b(export\s+)?(async\s+)?(function|class|interface|type|def)\s+[A-Za-z0-9_]+[^;{]*/);
    if (sig) push('api_signature', sig[0]);
  }

  const seen = new Set();
  return anchors.filter((anchor) => {
    const key = `${anchor.type}:${anchor.canonical}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { process.stdout.write(usage()); return; }
  if (!args.original || !args.cleaned) throw new Error(usage().trim());

  const originalPath = path.resolve(args.original);
  const cleanedPath = path.resolve(args.cleaned);
  const original = fs.readFileSync(originalPath, 'utf8');
  const cleaned = fs.readFileSync(cleanedPath, 'utf8');
  const cleanedCanonical = normalize(cleaned);
  const anchors = extractAnchors(original);
  const preserved = [];
  const missing = [];

  for (const anchor of anchors) {
    const keep = cleanedCanonical.includes(anchor.canonical);
    const compactAnchor = { type: anchor.type, text: anchor.text };
    if (anchor.language) compactAnchor.language = anchor.language;
    (keep ? preserved : missing).push(compactAnchor);
  }

  const before = approxTokens(original);
  const after = approxTokens(cleaned);
  const reduction = Number((((before - after) / before) * 100).toFixed(1));
  const receipt = {
    schema: 'pluribus.semantic_anchor_preservation_receipt.v1',
    source_type: 'paste-cleaning-skill-or-cli-output',
    original_ref: path.basename(originalPath),
    cleaned_ref: path.basename(cleanedPath),
    approximate_tokens_before: before,
    approximate_tokens_after: after,
    approximate_reduction_percent: reduction,
    raw_source_logged: false,
    anchor_detection_policy: [
      'headings',
      'code_fences',
      'api_signatures',
      'version_or_migration_notes',
      'must_keep_policy_lines'
    ],
    anchors_total: anchors.length,
    anchors_preserved: preserved.length,
    anchors_missing: missing.length,
    preserved_anchors: preserved,
    missing_anchors: missing,
    semantic_loss_check_passed: missing.length === 0,
    token_savings_claim_allowed: missing.length === 0 && after < before
  };

  const serialized = `${JSON.stringify(receipt, null, 2)}\n`;
  if (args.out) fs.writeFileSync(path.resolve(args.out), serialized);
  process.stdout.write(serialized);
  if (!receipt.semantic_loss_check_passed) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
