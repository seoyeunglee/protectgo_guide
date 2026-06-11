import "@idbrnd/design-system/style.css";
import "./styles/tokens-bridge.css";
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import KBEntryList from "./screens/01-KBEntryList";
import KBEntryEditor from "./screens/02-KBEntryEditor";
import GuideHome from "./screens/03-GuideHome";
import GuideEntryDetail from "./screens/04-GuideEntryDetail";
import TemplateSelector from "./screens/05-TemplateSelector";
import SourceChangeChecklist from "./screens/06-SourceChangeChecklist";
import BuildStatus from "./screens/07-BuildStatus";
import InspectionPanel from "./inspection/InspectionPanel";

export default function App() {
  const [screen, setScreen] = useState("kb-list");
  const [selectedEntryId, setSelectedEntryId] = useState(null);

  function navigate(screenId, params = {}) {
    if (params.entryId !== undefined) setSelectedEntryId(params.entryId);
    setScreen(screenId);
  }

  const commonProps = { onNavigate: navigate, selectedEntryId };

  return (
    <div
      data-idb-component
      style={{ display: "flex", height: "100vh", fontFamily: "var(--default)" }}
    >
      <Sidebar currentScreen={screen} onNavigate={navigate} />
      <div
        style={{
          flex: 1,
          overflow: "auto",
          background: "var(--semantic-natural-extra-light)",
        }}
      >
        {screen === "kb-list" && <KBEntryList {...commonProps} />}
        {screen === "kb-editor" && <KBEntryEditor {...commonProps} />}
        {screen === "guide-home" && <GuideHome {...commonProps} />}
        {screen === "guide-detail" && <GuideEntryDetail {...commonProps} />}
        {screen === "template" && <TemplateSelector {...commonProps} />}
        {screen === "checklist" && <SourceChangeChecklist {...commonProps} />}
        {screen === "build" && <BuildStatus {...commonProps} />}
      </div>
      <InspectionPanel onNavigate={navigate} />
    </div>
  );
}
