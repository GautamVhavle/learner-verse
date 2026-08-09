/** Contract mirror for the isolated worker. Keep in sync with the committed JSON Schema. */
export type RenderManifestV1 = {
  schema_version: "1.0";
  input_checksum: string;
  resolution: `${number}x${number}`;
  fps: number;
  locale: string;
  template: string;
  safe_area: Record<"top" | "right" | "bottom" | "left", number>;
  watermark: string;
  assets: Record<string, { asset_id: string; version_id: string; checksum: string; object_key: string; media_type: string }>;
  lessons: Array<{ id: string; title: string; duration_ms: number; scenes: Array<{ id: string; type: string; start_ms: number; duration_ms: number; on_screen_text: string[]; asset_refs: string[] }>; captions: Array<{ start_ms: number; end_ms: number; text: string }>; tracks: Array<{ kind: string; asset_ref?: string; start_ms: number; end_ms: number; volume: number }> }>;
};
