// ============================================================================
//  ⚠️  LEGACY — part of the old severity-based (mild/moderate/severe)
//  wound/burn/CPR workflow model. NOT used by the new six-phase procedure
//  workflow engine (see src/data/careWorkflowsMeta.js, WorkflowContext, and
//  pages/WorkflowSelect.jsx). Retained per migration instructions; currently
//  unreferenced by any page or route.
// ============================================================================
// src/hooks/useStepExplanation.js
import { useEffect, useState } from 'react';
import { aiService } from '../services/aiService';

export const useStepExplanation = ({ workflowName, severity, step }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!workflowName || !severity || !step) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    aiService
      .explainStep({ workflowName, severity, step })
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workflowName, severity, step?.id]);

  return { data, loading, error };
};
