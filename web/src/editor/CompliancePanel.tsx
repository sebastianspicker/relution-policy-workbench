/** Displays filtered compliance findings and applies their remediation through the editor controller. */
import { useEffect, useState, type JSX } from "react";
import { ComplianceControls } from "./compliance-panel-controls.js";
import { ComplianceDetail } from "./compliance-panel-detail.js";
import { ComplianceFeedback } from "./compliance-panel-feedback.js";
import { ComplianceList } from "./compliance-panel-list.js";
import { ALL_COMPLIANCE_STATUSES, filterComplianceResults, type ComplianceFilterStatus } from "./compliance-panel-model.js";
import { ComplianceOverview } from "./compliance-panel-overview.js";
import type { EditorController } from "./types.js";

export function CompliancePanel({ controller }: { readonly controller: EditorController }): JSX.Element {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ComplianceFilterStatus>(ALL_COMPLIANCE_STATUSES);
  const [selectedResultId, setSelectedResultId] = useState<string>();
  const report = controller.complianceReport;
  const filteredResults = filterComplianceResults(report?.results ?? [], controller.complianceSources, query, statusFilter);
  const selectedResult = filteredResults.find((result) => result.id === selectedResultId);

  useEffect(() => {
    if (selectedResultId !== undefined && selectedResult === undefined) {
      setSelectedResultId(undefined);
    }
  }, [selectedResult, selectedResultId]);

  return (
    <div className="inspector-content recommendations-panel">
      <h2>Compliance</h2>
      {controller.policy === undefined ? <p className="empty-state">Select a policy to compare it against the harvested recommendations.</p> : (
        <>
          <ComplianceOverview
            policy={controller.policy}
            sources={controller.complianceSources}
            report={report}
            onToggleSource={controller.toggleComplianceSource}
            onRefresh={() => void controller.refreshCompliance()}
          />
          <ComplianceFeedback report={report} error={controller.complianceError} loading={controller.complianceLoading} />
          {report !== undefined && !controller.complianceLoading ? (
            <>
              <ComplianceControls query={query} status={statusFilter} onQueryChange={setQuery} onStatusChange={setStatusFilter} />
              {selectedResult === undefined ? (
                <ComplianceList results={filteredResults} onSelect={setSelectedResultId} />
              ) : (
                <ComplianceDetail
                  result={selectedResult}
                  onBack={() => setSelectedResultId(undefined)}
                  onApply={(remediationId) => void controller.applyComplianceRemediation(remediationId)}
                />
              )}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
