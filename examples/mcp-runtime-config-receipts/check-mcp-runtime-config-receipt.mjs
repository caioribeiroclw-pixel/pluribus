#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const receiptPath = process.argv[2] || path.join(import.meta.dirname, 'mcp-runtime-config-receipt.json')
const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'))
const errors = []
const warnings = []
let runtimeAlerts = 0

function fieldName(prefix, field) {
  return prefix ? `${prefix}.${field}` : field
}

function requireString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${field} must be a non-empty string`)
  }
}

function requireBoolean(value, field) {
  if (typeof value !== 'boolean') {
    errors.push(`${field} must be boolean`)
  }
}

function requireArray(value, field) {
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array`)
  }
}

function requireStringArray(value, field) {
  requireArray(value, field)
  for (const [index, item] of (value || []).entries()) {
    if (typeof item !== 'string' || item.trim() === '') {
      errors.push(`${field}[${index}] must be a non-empty string`)
    }
  }
}

const runtimeKinds = new Set(['runtime_config'])
const inactiveKinds = new Set(['sample_config', 'disabled_config', 'catalog_example'])
const allowedKinds = new Set([...runtimeKinds, ...inactiveKinds])
const allowedChanges = new Set(['server_added', 'server_removed', 'command_changed', 'env_changed', 'tools_changed', 'unchanged'])

if (receipt.schema !== 'pluribus.mcp_runtime_config_receipt.v1') {
  errors.push('schema must be pluribus.mcp_runtime_config_receipt.v1')
}

requireString(receipt.run_id, 'run_id')
requireString(receipt.generated_at, 'generated_at')
requireString(receipt.repository_ref, 'repository_ref')

if (!Array.isArray(receipt.configs) || receipt.configs.length === 0) {
  errors.push('configs must be a non-empty array')
}

for (const [index, config] of (receipt.configs || []).entries()) {
  const prefix = `configs[${index}]`
  requireString(config.path, fieldName(prefix, 'path'))
  requireString(config.client, fieldName(prefix, 'client'))
  requireString(config.source_kind, fieldName(prefix, 'source_kind'))
  requireString(config.change_kind, fieldName(prefix, 'change_kind'))
  requireBoolean(config.runtime_active, fieldName(prefix, 'runtime_active'))
  requireBoolean(config.permission_surface_changed, fieldName(prefix, 'permission_surface_changed'))
  requireBoolean(config.sample_config_review, fieldName(prefix, 'sample_config_review'))
  requireBoolean(config.should_alert, fieldName(prefix, 'should_alert'))
  requireStringArray(config.loaded_by, fieldName(prefix, 'loaded_by'))

  if (!allowedKinds.has(config.source_kind)) {
    errors.push(`${prefix}.source_kind must be one of ${[...allowedKinds].join(', ')}`)
  }

  if (!allowedChanges.has(config.change_kind)) {
    errors.push(`${prefix}.change_kind must be one of ${[...allowedChanges].join(', ')}`)
  }

  if (runtimeKinds.has(config.source_kind) && config.runtime_active !== true) {
    errors.push(`${prefix}.runtime_active must be true for runtime_config`)
  }

  if (inactiveKinds.has(config.source_kind) && config.runtime_active !== false) {
    errors.push(`${prefix}.runtime_active must be false for ${config.source_kind}`)
  }

  if (config.runtime_active && (!Array.isArray(config.loaded_by) || config.loaded_by.length === 0)) {
    errors.push(`${prefix}.loaded_by must name at least one client when runtime_active is true`)
  }

  if (config.runtime_active && config.permission_surface_changed && config.change_kind !== 'unchanged') {
    runtimeAlerts += 1
    if (config.should_alert !== true) {
      errors.push(`${prefix}.should_alert must be true when an active runtime permission surface changed`)
    }
  }

  if (!config.runtime_active && config.should_alert && !config.sample_config_review) {
    warnings.push(`${config.path || prefix} alerts even though it is not runtime-active; use sample_config_review or suppress as template noise`)
  }

  if (!Array.isArray(config.evidence) || config.evidence.length === 0) {
    errors.push(`${prefix}.evidence must include at least one privacy-safe evidence ref`)
  }

  for (const [evidenceIndex, evidence] of (config.evidence || []).entries()) {
    const evidencePrefix = `${prefix}.evidence[${evidenceIndex}]`
    requireString(evidence.kind, fieldName(evidencePrefix, 'kind'))
    requireString(evidence.ref, fieldName(evidencePrefix, 'ref'))
  }

  const envKeys = config.redacted_env_keys || {}
  requireStringArray(envKeys.required, fieldName(prefix, 'redacted_env_keys.required'))
  requireStringArray(envKeys.present, fieldName(prefix, 'redacted_env_keys.present'))
  requireStringArray(envKeys.missing, fieldName(prefix, 'redacted_env_keys.missing'))
}

if (errors.length > 0) {
  console.error('mcp runtime config receipt invalid:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

const warningLabel = warnings.length === 1 ? 'warning' : 'warnings'
const alertLabel = runtimeAlerts === 1 ? 'alert' : 'alerts'
console.log(`mcp runtime config receipt ok: ${receipt.configs.length} configs checked, ${runtimeAlerts} runtime ${alertLabel}, ${warnings.length} review-noise ${warningLabel}`)
for (const warning of warnings) console.log(`- ${warning}`)
