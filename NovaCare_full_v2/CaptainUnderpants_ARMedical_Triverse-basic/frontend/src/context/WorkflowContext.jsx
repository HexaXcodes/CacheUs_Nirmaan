// src/context/WorkflowContext.jsx
// Generic six-phase workflow state. Holds the catalog (from GET /api/workflows)
// and whichever single workflow the user has selected to guide — the SAME
// state shape serves inhaler, BP, insulin, glucose, medication-delivery, and
// home-procedure workflows. No per-workflow branching lives here.
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { workflowService } from '../services/workflowService';

const WorkflowContext = createContext(null);

export const WorkflowProvider = ({ children }) => {
  const [catalog, setCatalog] = useState([]); // GET /api/workflows summary list
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(null);

  const [selectedWorkflow, setSelectedWorkflow] = useState(null); // fully resolved (with steps)
  const [selectedDevice, setSelectedDevice] = useState(null);

  const refreshCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const list = await workflowService.list();
      setCatalog(list);
      return list;
    } catch (err) {
      setCatalogError(err.message || 'Could not load workflows.');
      return [];
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  // Resolve a workflow's full step list (and, for device-variant workflows
  // like inhaler technique, pick the specific device).
  const selectWorkflow = useCallback(async (id, device) => {
    const res = await workflowService.get(id, device);
    setSelectedWorkflow(res);
    setSelectedDevice(res.device || device || null);
    return res;
  }, []);

  const reset = useCallback(() => {
    setSelectedWorkflow(null);
    setSelectedDevice(null);
  }, []);

  return (
    <WorkflowContext.Provider
      value={{
        catalog,
        catalogLoading,
        catalogError,
        refreshCatalog,
        selectedWorkflow,
        selectedDevice,
        selectWorkflow,
        reset
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = () => {
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error('useWorkflow must be used inside <WorkflowProvider>');
  return ctx;
};
