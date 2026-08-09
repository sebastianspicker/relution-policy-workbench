/** Presents a static, explicitly simulated tour built from the repository's reviewed UI evidence. */
import { useEffect, useMemo, useState, type JSX } from "react";
import { IconBaseline, IconDashboard, IconPolicies, IconSettings } from "../editor/icons.js";
import { DEMO_SCENES, sceneFromHash, type DemoSceneId } from "./demo-scenes.js";
import "./demo.css";

const repositoryUrl = "https://github.com/sebastianspicker/rexp-studio";

export function DemoApp(): JSX.Element {
  const [sceneId, setSceneId] = useState<DemoSceneId>(() => sceneFromHash(window.location.hash));
  const scene = useMemo(() => DEMO_SCENES.find((item) => item.id === sceneId) ?? DEMO_SCENES[0]!, [sceneId]);

  useEffect(() => {
    const updateScene = (): void => setSceneId(sceneFromHash(window.location.hash));
    window.addEventListener("hashchange", updateScene);
    return () => window.removeEventListener("hashchange", updateScene);
  }, []);

  function navigate(next: DemoSceneId): void {
    window.location.hash = `/tour/${next}`;
    setSceneId(next);
  }

  return (
    <div className="app-shell demo-shell" data-theme="studio">
      <a className="skip-link" href="#demo-main">Skip to demo content</a>
      <div className="editor-root demo-root">
        <DemoRail scene={sceneId} onNavigate={navigate} />
        <header className="toolbar demo-toolbar">
          <div className="demo-brand-line">
            <strong>REXP Studio</strong>
            <span className="demo-version">static tour</span>
            <span className="demo-breadcrumb">{scene.label}</span>
          </div>
          <div className="demo-command-preview" aria-label="Simulated command preview">
            <SimulatedCommand label="Save" />
            <SimulatedCommand label="Build archive" primary />
            <SimulatedCommand label="Download" />
          </div>
        </header>
        <div className="provenance-strip demo-provenance" aria-label="Demo provenance">
          <span className="provenance-item"><span className="provenance-label">Mode</span><span className="provenance-value">Static simulation</span></span>
          <span className="provenance-item"><span className="provenance-label">Data</span><span className="provenance-value">Sanitized fixtures</span></span>
          <span className="provenance-item"><span className="provenance-label">Network</span><span className="provenance-value">No product API</span></span>
        </div>
        <main id="demo-main" className="demo-main" tabIndex={-1}>
          <section className="demo-intro" aria-labelledby="demo-title">
            <div>
              <p className="demo-kicker">Static product walkthrough</p>
              <h1 id="demo-title">{scene.heading}</h1>
              <p className="demo-description">{scene.description}</p>
            </div>
            <div className="demo-safety" role="note">
              <strong>Simulation only</strong>
              <span>Command controls are disabled and marked. This page cannot inspect, save, build, download, query, or create tickets.</span>
            </div>
          </section>

          <nav className="demo-scene-tabs" aria-label="Demo scenes">
            {DEMO_SCENES.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="demo-scene-tab"
                aria-current={item.id === scene.id ? "step" : undefined}
                onClick={() => navigate(item.id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <figure className="demo-capture">
            <div className="demo-capture-bar">
              <span>Reviewed repository capture</span>
              <span>Controls inside this image are not interactive</span>
            </div>
            <img src={scene.imageUrl} alt={scene.imageAlt} width="1440" height="1000" />
            <figcaption>{scene.detail}</figcaption>
          </figure>

          <section className="demo-next" aria-label="Run the real product locally">
            <div>
              <h2>Continue in the local workbench</h2>
              <p>The operational editor remains loopback-only and uses its same-origin API. Follow the repository setup to work with real local files.</p>
            </div>
            <a className="btn demo-source-link" href={`${repositoryUrl}#installation`}>Open installation guide</a>
          </section>
        </main>
      </div>
      <footer className="status-bar demo-status">
        <span>Static tour · no editor API · no persistent changes</span>
        <a href={repositoryUrl}>Source on GitHub</a>
      </footer>
    </div>
  );
}

function SimulatedCommand(props: { readonly label: string; readonly primary?: boolean }): JSX.Element {
  return (
    <button type="button" className={props.primary === true ? "btn-primary demo-command" : "demo-command"} disabled>
      {props.label}
      <span>Simulated</span>
    </button>
  );
}

function DemoRail(props: { readonly scene: DemoSceneId; readonly onNavigate: (scene: DemoSceneId) => void }): JSX.Element {
  const items = [
    { id: "overview" as const, label: "Workbench", Icon: IconPolicies },
    { id: "baseline" as const, label: "Baseline", Icon: IconBaseline },
    { id: "policy" as const, label: "Policy", Icon: IconSettings },
    { id: "audit" as const, label: "Device audit", Icon: IconDashboard },
  ];
  return (
    <nav className="app-rail" aria-label="Tour sections">
      <a className="app-rail-brand" href={repositoryUrl} aria-label="REXP Studio repository">
        <span className="app-rail-brand-mark" aria-hidden="true">RX</span>
      </a>
      {items.map(({ id, label, Icon }) => (
        <button key={id} type="button" className="app-rail-btn" aria-current={props.scene === id ? "page" : undefined} title={label} onClick={() => props.onNavigate(id)}>
          <span className="app-rail-icon" aria-hidden="true"><Icon size={20} /></span>
          <span className="app-rail-label">{label}</span>
        </button>
      ))}
      <div className="app-rail-local" aria-label="Static sanitized simulation">
        <span className="app-rail-local-status" aria-hidden="true" />
        <span className="app-rail-local-label">Static · sanitized</span>
      </div>
    </nav>
  );
}
