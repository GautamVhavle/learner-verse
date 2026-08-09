/**
 * Worker entrypoint intentionally accepts only a validated RenderManifestV1.
 * Remotion's renderer is invoked by the job adapter in a later integration;
 * this package contains no evaluator for user JavaScript, paths, or filters.
 */
import type {RenderManifestV1} from "./manifest";
export function validateManifest(manifest: RenderManifestV1): RenderManifestV1 {
  if (manifest.schema_version !== "1.0" || !/^[a-f0-9]{64}$/.test(manifest.input_checksum)) throw new Error("invalid RenderManifestV1");
  return manifest;
}
