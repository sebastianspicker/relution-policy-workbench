/** Public editor-server facade; implementation is split by runtime responsibility. */
export { resolveStaticAssetPath } from "./editor-static-assets.js";
export {
  type EditorServerHandle,
  type EditorServerOptions,
} from "./editor-server-contract.js";
export { startEditorServerRuntime as startEditorServer } from "./editor-server-runtime.js";
